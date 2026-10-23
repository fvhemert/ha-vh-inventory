"""Public RSS headlines for the touchscreen, independent of inventory services."""

import datetime
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
import time
from urllib.parse import urlsplit, urlunsplit
import xml.etree.ElementTree as ET

import requests


NEWS_ENTITY = "sensor.vh_touchscreen_news"
NEWS_FEEDS = {
    "NOS": "https://feeds.nos.nl/nosnieuwsalgemeen",
    "NU.nl": "https://www.nu.nl/rss/Algemeen",
    "Omroep Brabant": "https://www.omroepbrabant.nl/rss",
}
NEWS_MAX_BYTES = 512 * 1024
NEWS_HOSTS = {
    "NOS": ("nos.nl", "www.nos.nl"),
    "NU.nl": ("nu.nl", "www.nu.nl"),
    "Omroep Brabant": ("omroepbrabant.nl", "www.omroepbrabant.nl"),
}


@pyscript_compile
def _news_url(value, source):
    if (not isinstance(value, str) or not value or len(value) > 2048
            or "\\" in value or any(char.isspace() or ord(char) < 32 for char in value)):
        return None
    try:
        parts = urlsplit(value)
        if (parts.scheme != "https" or parts.hostname not in NEWS_HOSTS.get(source, ())
                or parts.username is not None or parts.password is not None
                or parts.port not in (None, 443)):
            return None
        return urlunsplit(("https", parts.hostname, parts.path or "/", parts.query, ""))
    except ValueError:
        return None


@pyscript_compile
def _news_summary(value):
    if not value:
        return ""
    chunks = []

    class PlainText(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.skipped = []

        def handle_starttag(self, tag, attrs):
            if tag in ("script", "style", "template"):
                self.skipped.append(tag)
            elif not self.skipped and tag in ("p", "br", "div", "li"):
                chunks.append(" ")

        def handle_endtag(self, tag):
            if self.skipped and self.skipped[-1] == tag:
                self.skipped.pop()
            elif not self.skipped and tag in ("p", "div", "li"):
                chunks.append(" ")

        def handle_data(self, data):
            if not self.skipped:
                chunks.append(data)

    parser = PlainText()
    parser.feed(value)
    parser.close()
    summary = " ".join("".join(chunks).split())
    return summary[:597].rstrip() + "..." if len(summary) > 600 else summary


@pyscript_compile
def _news_timestamp(value):
    if not isinstance(value, str):
        raise ValueError("Missing news timestamp")
    stamp = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if stamp.tzinfo is None:
        raise ValueError("News timestamp requires a timezone")
    return stamp


@pyscript_compile
def _news_parse(content, source):
    if source not in NEWS_FEEDS or not isinstance(content, bytes) or len(content) > NEWS_MAX_BYTES:
        raise ValueError("Invalid feed input")

    class NoDTD(ET.TreeBuilder):
        def doctype(self, name, pubid, system):
            raise ValueError("Feed DTDs are not allowed")

    root = ET.fromstring(content, parser=ET.XMLParser(target=NoDTD()))
    channel = root.find("channel") if root.tag == "rss" else None
    if channel is None:
        raise ValueError("Expected an RSS channel")
    rows = []
    seen = set()
    for item in channel.findall("item"):
        title_node = item.find("title")
        title = " ".join("".join(title_node.itertext()).split()) if title_node is not None else ""
        try:
            published = parsedate_to_datetime(item.findtext("pubDate", ""))
            if published.tzinfo is None:
                raise ValueError("Missing publication timezone")
        except (TypeError, ValueError, OverflowError):
            continue
        if not title or len(title) > 300 or title in seen:
            continue
        seen.add(title)
        rows.append({
            "source": source, "title": title,
            "published_at": published.astimezone(datetime.timezone.utc).isoformat(),
            "url": _news_url(item.findtext("link", "").strip(), source),
            "summary": _news_summary(item.findtext("description", "")),
        })
    rows.sort(key=lambda row: _news_timestamp(row["published_at"]), reverse=True)
    if len(rows) < 2:
        raise ValueError("Feed needs two valid, distinct headlines")
    return rows[:2]


@pyscript_compile
def _news_fetch(source, url):
    if NEWS_FEEDS.get(source) != url:
        raise ValueError("Unexpected feed URL")
    deadline = time.monotonic() + 20
    with requests.get(
        url, timeout=(5, 5), stream=True, allow_redirects=False,
        headers={"Accept": "application/rss+xml, application/xml, text/xml",
                 "Accept-Encoding": "identity"},
    ) as response:
        response.raise_for_status()
        if response.status_code != 200:
            raise ValueError("Feed redirects are not allowed")
        mime = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if mime not in ("application/rss+xml", "application/xml", "text/xml"):
            raise ValueError("Unexpected feed content type")
        length = response.headers.get("Content-Length")
        if length is not None and not 0 <= int(length) <= NEWS_MAX_BYTES:
            raise ValueError("Feed exceeds size limit")
        content = bytearray()
        # Check even slow-drip responses before another byte is accepted.
        for chunk in response.iter_content(chunk_size=1):
            if time.monotonic() > deadline:
                raise ValueError("Feed download deadline exceeded")
            content.extend(chunk)
            if len(content) > NEWS_MAX_BYTES:
                raise ValueError("Feed exceeds size limit")
    return _news_parse(bytes(content), source)


@pyscript_compile
def _news_refresh(previous):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    attributes = {
        "friendly_name": "VH Touchscreen News", "icon": "mdi:newspaper",
        "headlines": [], "updated_at": None, "last_attempt_at": now,
        "failed_sources": [], "source_updated_at": {}, "sample": False,
    }
    failures = {}
    invalid_cache = False
    cache = {}
    if previous:
        try:
            _news_timestamp(previous.get("updated_at"))
            if previous.get("sample") is True or not isinstance(previous.get("headlines"), list):
                raise ValueError("Invalid news cache")
            for row in previous["headlines"]:
                if (not isinstance(row, dict) or row.get("source") not in NEWS_FEEDS
                        or not isinstance(row.get("title"), str) or not row["title"].strip()
                        or len(row["title"]) > 300):
                    raise ValueError("Invalid cached headline")
                _news_timestamp(row.get("published_at"))
                cache.setdefault(row["source"], []).append({
                    **{key: row[key] for key in ("source", "title", "published_at")},
                    "url": _news_url(row.get("url"), row["source"]),
                    "summary": _news_summary(row.get("summary", "")),
                })
            attributes["updated_at"] = previous["updated_at"]
            for source in NEWS_FEEDS:
                stamp = previous.get("source_updated_at", {}).get(source)
                if stamp is not None:
                    _news_timestamp(stamp)
                    attributes["source_updated_at"][source] = stamp
        except (TypeError, ValueError, AttributeError):
            cache = {}
            attributes["updated_at"] = None
            attributes["source_updated_at"] = {}
            invalid_cache = True
    for source, url in NEWS_FEEDS.items():
        try:
            rows = _news_fetch(source, url)
            attributes["updated_at"] = now
            attributes["source_updated_at"][source] = now
        except (requests.RequestException, ValueError, ET.ParseError, OSError) as error:
            failures[source] = type(error).__name__
            rows = sorted(cache.get(source, []), key=lambda row: _news_timestamp(row["published_at"]),
                          reverse=True)[:2]
        attributes["headlines"].extend(rows)
    attributes["headlines"].sort(key=lambda row: _news_timestamp(row["published_at"]), reverse=True)
    attributes["failed_sources"] = list(failures)
    status = "unavailable" if not attributes["headlines"] else ("stale" if failures else "ready")
    return status, attributes, failures, invalid_cache


@time_trigger("startup", "period(0, 15min)")
def vh_touchscreen_news_update():
    task.unique("news_refresh", kill_me=True)
    previous = state.getattr(NEWS_ENTITY) if state.exist(NEWS_ENTITY) else None
    status, attributes, failures, invalid_cache = task.executor(_news_refresh, previous)
    state.set(NEWS_ENTITY, status, attributes)
    if invalid_cache:
        log.warning("Touchscreen news: invalid cached data discarded")
    for source, reason in failures.items():
        log.warning(f"Touchscreen news: {source} refresh failed ({reason}); cached data only if available")
