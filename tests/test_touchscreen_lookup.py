"""Exercise the actual read-only touchscreen resolver without importing HA."""

import ast
import json
from pathlib import Path
import sqlite3
from types import SimpleNamespace
import unittest
from unittest.mock import Mock


SOURCE = Path(__file__).resolve().parents[1] / "pyscript" / "apps" / "vh_inventory" / "__init__.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))
FUNCTIONS = {
    "vh_inventory_touchscreen_lookup", "_product_id_for_barcode", "_resolve_barcode",
    "_lookup_off", "_lookup_upc", "_lookup_upcdb", "_strip_lang_prefix",
}


class TouchscreenLookupTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.addCleanup(self.db.close)
        self.db.row_factory = sqlite3.Row
        self.db.execute("CREATE TABLE products(id INTEGER PRIMARY KEY, barcode INTEGER)")
        self.db.execute("INSERT INTO products VALUES(1,123)")
        self.db.commit()
        self.db.set_authorizer(lambda action, *_: sqlite3.SQLITE_OK if action in {
            sqlite3.SQLITE_SELECT, sqlite3.SQLITE_READ, sqlite3.SQLITE_FUNCTION,
        } else sqlite3.SQLITE_DENY)
        self.request = Mock()
        self.namespace = dict(
            service=lambda **_: lambda function: function,
            _fetch_one_sql=lambda sql, args: self.db.execute(sql, args).fetchone(),
            task=SimpleNamespace(executor=lambda function, *args, **kwargs: function(*args, **kwargs)),
            requests=SimpleNamespace(get=self.request), log=Mock(), json=json,
            _cfg=lambda key, default="": default, _HTTP_UA="synthetic-test",
            _HTTP_TIMEOUT=1, _MAX_CATEGORIES=5,
            _OFF_PROVIDERS=[("openfoodfacts", "https://example.invalid")],
            _OFF_FIELDS="product_name", _UPC_URL="https://example.invalid/upc",
            _UPCDB_URL_BASE="https://example.invalid/upcdb/",
        )
        functions = [node for node in TREE.body
                     if isinstance(node, ast.FunctionDef) and node.name in FUNCTIONS]
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(SOURCE), "exec"), self.namespace)
        self.lookup = self.namespace["vh_inventory_touchscreen_lookup"]

    def test_known_product_reads_catalogue_without_contacting_providers(self):
        self.assertEqual(self.lookup("000123"),
                         {"product_id": 1, "suggestion": None, "online_incomplete": False})
        self.request.assert_not_called()

    def test_online_hit_returns_only_supported_draft_fields_without_any_database_writes(self):
        self.request.return_value = SimpleNamespace(status_code=200, json=lambda: {
            "status": 1, "product": {"product_name": "Demo product", "brands": "Demo maker",
                                     "generic_name": "Demo details", "quantity": "250 g",
                                     "image_url": "https://example.invalid/untrusted-image",
                                     "categories": "en:example"},
        })
        before = self.db.total_changes
        result = self.lookup("000999")
        self.assertEqual(result["suggestion"], {
            "name": "Demo product", "description": "Demo details",
            "manufacturer": "Demo maker", "unit": "250 g",
        })
        self.assertFalse(result["online_incomplete"])
        self.assertFalse(result["truncated"])
        self.assertEqual(self.db.total_changes, before)
        self.assertEqual(self.db.execute("SELECT id,barcode FROM products").fetchall()[0]["barcode"], 123)
        self.assertEqual(self.db.execute("SELECT count(*) FROM products").fetchone()[0], 1)
        self.assertIn("/000999.json", self.request.call_args.args[0])

    def test_true_miss_is_distinct_from_timeout_http_failure_and_rate_limit(self):
        cases = [
            (SimpleNamespace(status_code=200, json=lambda: {"status": 0, "code": "OK", "items": []}), False),
            (SimpleNamespace(status_code=404), False),
            (SimpleNamespace(status_code=503), True),
            (SimpleNamespace(status_code=429), True),
            (TimeoutError("synthetic failure"), True),
        ]
        for response, incomplete in cases:
            with self.subTest(response=response):
                self.request.reset_mock()
                self.request.side_effect = response if isinstance(response, Exception) else None
                self.request.return_value = response
                result = self.lookup("999")
                self.assertIsNone(result["suggestion"])
                self.assertEqual(result["online_incomplete"], incomplete)
                self.assertEqual(self.db.execute("SELECT count(*) FROM products").fetchone()[0], 1)

    def test_later_provider_hit_survives_an_earlier_provider_failure(self):
        self.request.side_effect = [
            TimeoutError("synthetic failure"),
            SimpleNamespace(status_code=200, json=lambda: {
                "code": "OK", "items": [{"title": "Demo from UPC", "size": "box"}],
            }),
        ]
        result = self.lookup("999")
        self.assertEqual(result["suggestion"]["name"], "Demo from UPC")
        self.assertTrue(result["online_incomplete"])

    def test_overlong_online_text_is_bounded_and_explicitly_flagged_for_review(self):
        self.namespace["_resolve_barcode"] = Mock(return_value={"name": "N" * 256, "description": "D" * 900})
        result = self.lookup("999")
        self.assertTrue(result["truncated"])
        self.assertEqual(len(result["suggestion"]["name"]), 255)
        self.assertEqual(len(result["suggestion"]["description"]), 255)

    def test_malformed_provider_json_is_an_error_not_a_successful_miss(self):
        self.request.return_value = SimpleNamespace(
            status_code=200, json=Mock(side_effect=ValueError("synthetic malformed JSON")))
        with self.assertRaises(ValueError):
            self.lookup("999")
        self.assertEqual(self.db.execute("SELECT count(*) FROM products").fetchone()[0], 1)

    def test_invalid_barcodes_never_contact_providers(self):
        for barcode in (None, 999, "", "12x", "１２３", "9" * 16, " 999"):
            with self.subTest(barcode=barcode), self.assertRaises(ValueError):
                self.lookup(barcode)
        self.request.assert_not_called()

    def test_existing_resolver_keeps_legacy_call_shape_without_error_reporting(self):
        off = self.namespace["_lookup_off"] = Mock(return_value=None)
        upcdb = self.namespace["_lookup_upcdb"] = Mock(return_value=None)
        upc = self.namespace["_lookup_upc"] = Mock(return_value={"name": "Legacy demo"})
        self.assertEqual(self.namespace["_resolve_barcode"]("999"), {"name": "Legacy demo"})
        off.assert_called_once_with("openfoodfacts", "https://example.invalid", "999")
        upcdb.assert_called_once_with("999")
        upc.assert_called_once_with("999")


if __name__ == "__main__":
    unittest.main()
