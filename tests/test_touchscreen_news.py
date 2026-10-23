"""Offline RSS, cache and isolated-publication checks. No Home Assistant access."""

from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

import requests


SOURCE = Path(__file__).resolve().parents[1] / "pyscript" / "vh_touchscreen_news.py"


def feed():
    return b"""<?xml version="1.0"?><rss version="2.0"><channel>
    <item><title>Older &amp; safe</title><pubDate>Fri, 23 Oct 2026 07:00:00 GMT</pubDate></item>
    <item><title>Newest</title><pubDate>Fri, 23 Oct 2026 10:00:00 +0200</pubDate></item>
    <item><title>Newest</title><pubDate>Fri, 23 Oct 2026 08:00:00 GMT</pubDate></item>
    <item><title>Invalid date</title><pubDate>not a date</pubDate></item>
    <item><title>No timezone</title><pubDate>Fri, 23 Oct 2026 09:00:00</pubDate></item>
    </channel></rss>"""


class NewsTests(unittest.TestCase):
    def setUp(self):
        self.state = SimpleNamespace(exist=Mock(return_value=False), getattr=Mock(), set=Mock())
        self.log = SimpleNamespace(warning=Mock())
        self.namespace = {
            "pyscript_compile": lambda f: f, "time_trigger": lambda *args: lambda f: f,
            "task": SimpleNamespace(unique=Mock(), executor=lambda f, *args: f(*args)),
            "state": self.state, "log": self.log,
        }
        exec(compile(SOURCE.read_text("utf-8"), str(SOURCE), "exec"), self.namespace)

    def response(self, content=None, **headers):
        response = Mock()
        response.status_code = 200
        response.headers = {"Content-Type": "application/rss+xml; charset=UTF-8", **headers}
        response.iter_content.return_value = [feed() if content is None else content]
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        return response

    def fresh(self):
        with patch.object(requests, "get", return_value=self.response()):
            return self.namespace["_news_refresh"](None)

    def test_rss_selects_two_distinct_newest_titles_and_normalizes_timezones(self):
        rows = self.namespace["_news_parse"](feed(), "NOS")
        self.assertEqual([row["title"] for row in rows], ["Newest", "Older & safe"])
        self.assertEqual(rows[0]["published_at"], "2026-10-23T08:00:00+00:00")
        self.assertEqual(set(rows[0]), {"source", "title", "published_at", "url", "summary"})

    def test_dtd_entities_and_external_references_are_rejected_in_utf8_and_utf16(self):
        for declaration in [
            '<!DOCTYPE rss [<!ENTITY x "expanded">]>',
            '<!DOCTYPE rss SYSTEM "file:///example-private-file">',
            '<!DOCTYPE rss [<!ENTITY % x SYSTEM "https://example.invalid/entity">%x;]>',
        ]:
            for encoding in ("utf-8", "utf-16"):
                content = (declaration + "<rss><channel/></rss>").encode(encoding)
                with self.subTest(declaration=declaration, encoding=encoding), self.assertRaisesRegex(ValueError, "DTDs"):
                    self.namespace["_news_parse"](content, "NOS")

    def test_malformed_incomplete_wrong_format_oversized_and_unknown_sources_fail(self):
        for content in [b"<rss>", b"<html/>", b"<rss><channel/></rss>",
                        b"x" * (self.namespace["NEWS_MAX_BYTES"] + 1)]:
            with self.subTest(content=content[:30]), self.assertRaises((ValueError, SyntaxError)):
                self.namespace["_news_parse"](content, "NOS")
        with self.assertRaises(ValueError):
            self.namespace["_news_parse"](feed(), "Unknown")

    def test_fetch_uses_only_fixed_https_sources_and_bounded_verified_requests(self):
        for source, url in self.namespace["NEWS_FEEDS"].items():
            with patch.object(requests, "get", return_value=self.response()) as get:
                self.assertEqual(len(self.namespace["_news_fetch"](source, url)), 2)
                args, options = get.call_args
                self.assertEqual(args, (url,))
                self.assertTrue(url.startswith("https://"))
                self.assertEqual(options["timeout"], (5, 5))
                self.assertFalse(options["allow_redirects"])
                self.assertTrue(options["stream"])
                self.assertNotIn("verify", options)
                self.assertNotIn("auth", options)
        with patch.object(requests, "get") as get, self.assertRaises(ValueError):
            self.namespace["_news_fetch"]("NOS", "http://127.0.0.1/private")
        get.assert_not_called()

    def test_http_redirects_html_and_declared_or_streamed_oversize_fail(self):
        variants = [
            self.response(**{"Content-Length": str(self.namespace["NEWS_MAX_BYTES"] + 1)}),
            self.response(**{"Content-Length": "-1"}),
            self.response(**{"Content-Type": "text/html"}),
            self.response(b"x" * (self.namespace["NEWS_MAX_BYTES"] + 1)),
        ]
        redirect = self.response()
        redirect.status_code = 301
        variants.append(redirect)
        for response in variants:
            with self.subTest(headers=response.headers, status=response.status_code):
                with patch.object(requests, "get", return_value=response), self.assertRaises(ValueError):
                    self.namespace["_news_fetch"]("NOS", self.namespace["NEWS_FEEDS"]["NOS"])

    def test_download_deadline_is_enforced_before_accepting_more_bytes(self):
        with patch.object(requests, "get", return_value=self.response()):
            with patch.object(self.namespace["time"], "monotonic", side_effect=[0, 21]):
                with self.assertRaisesRegex(ValueError, "deadline"):
                    self.namespace["_news_fetch"]("NOS", self.namespace["NEWS_FEEDS"]["NOS"])

    def test_fresh_refresh_publishes_six_plain_headlines_and_source_timestamps(self):
        status, attributes, failures, invalid = self.fresh()
        self.assertEqual(status, "ready")
        self.assertEqual(len(attributes["headlines"]), 6)
        self.assertEqual(set(attributes["source_updated_at"]), set(self.namespace["NEWS_FEEDS"]))
        self.assertEqual(failures, {})
        self.assertFalse(invalid)
        self.assertFalse(attributes["sample"])

    def test_partial_failure_retains_only_that_sources_cache_without_mutating_it(self):
        _, previous, _, _ = self.fresh()
        original = repr(previous)
        fetch = self.namespace["_news_fetch"]
        def selected(source, url):
            if source == "NU.nl":
                raise requests.Timeout("synthetic timeout, not included in output")
            return fetch(source, url)
        self.namespace["_news_fetch"] = selected
        with patch.object(requests, "get", return_value=self.response()):
            status, attributes, failures, invalid = self.namespace["_news_refresh"](previous)
        self.assertEqual(status, "stale")
        self.assertEqual(len(attributes["headlines"]), 6)
        self.assertEqual(attributes["failed_sources"], ["NU.nl"])
        self.assertEqual(failures, {"NU.nl": "Timeout"})
        self.assertEqual(attributes["source_updated_at"]["NU.nl"], previous["source_updated_at"]["NU.nl"])
        self.assertEqual(repr(previous), original)
        self.assertFalse(invalid)

    def test_initial_partial_feed_failure_names_missing_source(self):
        def selected(source, url):
            if source == "Omroep Brabant":
                raise ValueError("synthetic invalid feed")
            return self.namespace["_news_parse"](feed(), source)
        self.namespace["_news_fetch"] = selected
        status, attributes, _, _ = self.namespace["_news_refresh"](None)
        self.assertEqual(status, "stale")
        self.assertEqual(len(attributes["headlines"]), 4)
        self.assertEqual(attributes["failed_sources"], ["Omroep Brabant"])

    def test_total_failure_is_explicit_with_and_without_cache(self):
        _, previous, _, _ = self.fresh()
        with patch.object(requests, "get", side_effect=requests.ConnectionError("synthetic")):
            for cache in (None, previous):
                status, attributes, failures, invalid = self.namespace["_news_refresh"](cache)
                self.assertEqual(status, "stale" if cache else "unavailable")
                self.assertEqual(len(attributes["headlines"]), 6 if cache else 0)
                self.assertEqual(attributes["updated_at"], cache["updated_at"] if cache else None)
                self.assertEqual(set(failures), set(self.namespace["NEWS_FEEDS"]))
                self.assertFalse(invalid)

    def test_sample_or_malformed_cache_is_discarded_explicitly(self):
        for change in ("sample", "date", "rows", "row", "source_dates"):
            _, previous, _, _ = self.fresh()
            if change == "sample":
                previous["sample"] = True
            if change == "date":
                previous["updated_at"] = "invalid"
            if change == "rows":
                previous["headlines"] = None
            if change == "row":
                previous["headlines"][0]["title"] = None
            if change == "source_dates":
                previous["source_updated_at"] = None
            with patch.object(requests, "get", side_effect=requests.Timeout("synthetic")):
                status, attributes, _, invalid = self.namespace["_news_refresh"](previous)
            self.assertEqual(status, "unavailable")
            self.assertEqual(attributes["headlines"], [])
            self.assertTrue(invalid)

    def test_recovery_clears_stale_and_failed_sources(self):
        _, previous, _, _ = self.fresh()
        previous["failed_sources"] = ["NOS"]
        with patch.object(requests, "get", return_value=self.response()):
            status, attributes, failures, invalid = self.namespace["_news_refresh"](previous)
        self.assertEqual((status, attributes["failed_sources"], failures, invalid), ("ready", [], {}, False))

    def test_worker_only_publishes_news_and_logs_failure_categories_not_feed_content(self):
        with patch.object(requests, "get", side_effect=requests.Timeout("do not log raw feed text")):
            self.namespace["vh_touchscreen_news_update"]()
        self.namespace["task"].unique.assert_called_once_with("news_refresh", kill_me=True)
        self.state.set.assert_called_once()
        entity, status, attributes = self.state.set.call_args.args
        self.assertEqual((entity, status), ("sensor.vh_touchscreen_news", "unavailable"))
        self.assertEqual(len(attributes["failed_sources"]), 3)
        self.assertEqual(self.log.warning.call_count, 3)
        self.assertNotIn("do not log", repr(self.log.warning.call_args_list))

    def test_summary_is_bounded_plain_text_without_scripts_styles_images_or_remote_requests(self):
        html = ('<p>First &amp; second.</p><script>do_not_keep()</script>'
                '<style>do_not_keep</style><template>do_not_keep</template>'
                '<p>Last<br>line<img src="https://example.invalid/image"></p>')
        with patch.object(requests, "get") as get:
            summary = self.namespace["_news_summary"](html)
        self.assertEqual(summary, "First & second. Last line")
        get.assert_not_called()
        long = self.namespace["_news_summary"]("<p>" + "Word " * 200 + "</p>")
        self.assertLessEqual(len(long), 600)
        self.assertTrue(long.endswith("..."))

    def test_publisher_urls_require_matching_https_host_and_no_credentials_or_custom_ports(self):
        for value in (
            "javascript:alert(1)", "http://nos.nl/article", "https://nos.nl.example.invalid/article",
            "https://example.invalid/nos.nl", "https://www.nu.nl/article", "https://user:secret@nos.nl/article",
            "https://@nos.nl/article", "https://nos.nl:8123/article", "https://nos.nl:bad/article",
            "https://nos.nl\\@example.invalid/article", "https://nos.nl/\narticle", None, {},
        ):
            self.assertIsNone(self.namespace["_news_url"](value, "NOS"), repr(value))
        self.assertEqual(self.namespace["_news_url"]("https://NOS.nl:443/artikel/1#fragment", "NOS"),
                         "https://nos.nl/artikel/1")
        self.assertIsNone(self.namespace["_news_url"]("https://nos.nl/article", "Unknown"))

    def test_rss_metadata_uses_description_not_full_article_content(self):
        content = feed().replace(b"<title>Newest</title>", b"""<title>Newest</title>
            <link>https://nos.nl/artikel/1</link>
            <description>&lt;p&gt;Short syndicated preview.&lt;/p&gt;</description>
            <content>Not part of the preview</content>""")
        row = self.namespace["_news_parse"](content, "NOS")[0]
        self.assertEqual(row["url"], "https://nos.nl/artikel/1")
        self.assertEqual(row["summary"], "Short syndicated preview.")

    def test_missing_or_unsafe_links_are_explicitly_absent_not_guessed(self):
        row = self.namespace["_news_parse"](feed(), "NOS")[0]
        self.assertIsNone(row["url"])
        self.assertEqual(row["summary"], "")
        content = feed().replace(b"<title>Newest</title>",
                                 b"<title>Newest</title><link>https://example.invalid/story</link>")
        self.assertIsNone(self.namespace["_news_parse"](content, "NOS")[0]["url"])

    def test_legacy_cache_is_compatible_and_cached_metadata_is_revalidated(self):
        _, previous, _, _ = self.fresh()
        for row in previous["headlines"]:
            row.pop("url", None)
            row.pop("summary", None)
        previous["headlines"][0]["url"] = "javascript:alert(1)"
        previous["headlines"][0]["summary"] = "<p>Cached safe text.</p>"
        with patch.object(requests, "get", side_effect=requests.Timeout("synthetic")):
            status, attributes, _, invalid = self.namespace["_news_refresh"](previous)
        self.assertEqual(status, "stale")
        self.assertFalse(invalid)
        self.assertEqual(len(attributes["headlines"]), 6)
        self.assertTrue(all(row["url"] is None for row in attributes["headlines"]))
        self.assertTrue(any(row["summary"] == "Cached safe text." for row in attributes["headlines"]))


if __name__ == "__main__":
    unittest.main()
