"""Real SQLite transitions and response-service behavior, without Home Assistant."""

import ast
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
import datetime
import json
from pathlib import Path
import re
import sqlite3
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock

from jinja2 import Environment, StrictUndefined

SOURCE = Path(__file__).resolve().parents[1] / "pyscript" / "apps" / "vh_inventory" / "__init__.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))
CONSTANTS = {
    target.id: ast.literal_eval(node.value)
    for node in TREE.body if isinstance(node, ast.Assign)
    for target in node.targets if isinstance(target, ast.Name)
    and target.id in {"DB_SCHEMA", "DB_SCHEMA_ORDER"}
}
FUNCTIONS = {
    "_conn", "_hist_row", "_purge_history", "_months_ago", "_purge_zero_stock_rows",
    "_touchscreen_stock_change", "_fetch_one_sql", "_insert_id", "_log_history",
    "_product_id_for_barcode", "_total_stock", "_reconcile_shopping", "_ensure_on_shopping",
    "vh_inventory_touchscreen_scan", "_ensure_schema",
    "_find_instock_alternative", "_find_instock_alternatives", "vh_inventory_touchscreen_shopping_decision",
    "_touchscreen_variant_conflict", "_exec", "_product_totals",
    "vh_inventory_adjust_stock", "vh_inventory_delete",
    "_match_meta_str",
    "_backup_db_before_adhoc_migration", "_backup_db_before_almost_out_migration",
}


class AlmostOutTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = str(Path(self.directory.name) / "inventory.db")
        self.events = []
        self.legacy = Mock(return_value="notfound")
        self.namespace = dict(
            CONSTANTS, sqlite3=sqlite3, datetime=datetime, re=re, DB_PATH=self.path,
            HISTORY_RETENTION_MONTHS=3, NONE="(none)", pyscript_compile=lambda f: f,
            service=lambda function=None, **options: function if function is not None else lambda f: f,
            task=SimpleNamespace(executor=lambda f, *args: f(*args), create=Mock()),
            state=SimpleNamespace(get=lambda entity: "English"),
            event=SimpleNamespace(fire=lambda name, **data: self.events.append((name, data))),
            log=SimpleNamespace(info=Mock(), warning=Mock(), error=Mock()),
            _publish=Mock(), _alt_stock_enabled=lambda: False,
            _announce_shopping_add=Mock(), _announce_scan_used=Mock(),
            _check_shopping_similarity=Mock(), vh_inventory_scan_enqueue=self.legacy,
        )
        functions = [node for node in TREE.body if isinstance(node, ast.FunctionDef) and node.name in FUNCTIONS]
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(SOURCE), "exec"), self.namespace)
        self.namespace["_ensure_schema"]()
        self.execute("INSERT INTO products(id,barcode,name,auto_add_enabled,auto_add_threshold,auto_add_quantity) "
                     "VALUES(1,123,'Demo product',1,2,4)")
        self.execute("INSERT INTO products(id,name) VALUES(2,'Other product')")
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(1,1,2)")
        self.scan = self.namespace["vh_inventory_touchscreen_scan"]
        self.change = self.namespace["_touchscreen_stock_change"]

    def execute(self, sql):
        with closing(sqlite3.connect(self.path)) as conn, conn:
            conn.execute(sql)

    def rows(self, table):
        with closing(sqlite3.connect(self.path)) as conn:
            return conn.execute("SELECT * FROM %s ORDER BY id" % table).fetchall()

    def total(self):
        return self.namespace["_total_stock"](1)

    def flag(self):
        with closing(sqlite3.connect(self.path)) as conn:
            return conn.execute("SELECT almost_out FROM products WHERE id=1").fetchone()[0]

    def test_first_repeat_confirm_and_next_use(self):
        first = self.scan(barcode="000123", action="AlmostOut")
        self.assertEqual((first["quantity"], first["almost_out"], first["outcome"]), (1, 1, "almost_out"))
        self.assertTrue(first["shopping_added"])
        self.assertEqual(self.rows("shopping_list")[0][2], 4)
        repeat = self.scan(product_id=1, action="AlmostOut")
        self.assertEqual((repeat["quantity"], repeat["almost_out"], repeat["outcome"]), (1, 1, "already_almost_out"))
        confirm = self.scan(product_id=1, action="Use")
        self.assertEqual((confirm["quantity"], confirm["almost_out"], confirm["outcome"]), (1, 0, "already_counted"))
        ordinary = self.scan(product_id=1, action="Use")
        self.assertEqual((ordinary["quantity"], ordinary["almost_out"], ordinary["outcome"]), (0, 0, "use"))
        self.assertEqual(self.rows("stock"), [])
        self.assertEqual(len(self.events), 3)
        self.namespace["_announce_shopping_add"].assert_called_once_with(1, suppress_tts=True)
        self.assertEqual(self.events[-1][1]["quantity"], 1)
        self.assertTrue(self.events[-1][1]["on_shopping"])
        self.assertEqual(self.rows("scan_queue"), [])

    def test_restock_keeps_pending_until_used_and_removes_shopping_normally(self):
        self.scan(product_id=1, action="AlmostOut")
        for _ in range(3):
            result = self.scan(product_id=1, action="Add")
            self.assertEqual(result["almost_out"], 1)
        self.assertEqual(self.total(), 4)
        self.assertEqual(self.rows("shopping_list"), [])
        result = self.scan(product_id=1, action="Use")
        self.assertEqual((result["quantity"], result["almost_out"]), (4, 0))
        self.scan(product_id=1, action="Use")
        self.assertEqual(self.total(), 3)

    def test_zero_stock_pending_confirmation_does_not_readd_removed_shopping(self):
        self.execute("DELETE FROM stock")
        first = self.scan(product_id=1, action="AlmostOut")
        self.assertEqual((first["quantity"], first["almost_out"]), (0, 1))
        self.assertTrue(first["shopping_added"])
        self.execute("DELETE FROM shopping_list")
        for action in ("AlmostOut", "Use"):
            result = self.scan(product_id=1, action=action)
            self.assertEqual(result["quantity"], 0)
            self.assertFalse(result["on_shopping"])
        self.assertEqual(self.flag(), 0)
        self.assertEqual(self.rows("stock"), [])

    def test_threshold_is_strict_and_disabled_auto_add_is_respected(self):
        self.execute("UPDATE stock SET quantity=3")
        result = self.scan(product_id=1, action="AlmostOut")
        self.assertEqual(result["quantity"], 2)
        self.assertFalse(result["on_shopping"])
        self.scan(product_id=1, action="Use")
        self.execute("UPDATE products SET auto_add_enabled=0")
        self.assertFalse(self.scan(product_id=1, action="AlmostOut")["on_shopping"])

    def test_ordinary_use_retains_existing_announcement(self):
        self.scan(product_id=1, action="Use")
        self.namespace["_announce_scan_used"].assert_called_once_with(1, 1)
        self.namespace["_announce_shopping_add"].assert_called_once_with(1, suppress_tts=False)
        self.assertEqual(self.events, [])

    def test_multiple_locations_require_selection_without_partial_change(self):
        self.execute("UPDATE stock SET location_id=1")
        self.execute("INSERT INTO stock(id,product_id,quantity,location_id) VALUES(2,1,3,2)")
        before = self.rows("stock")
        with self.assertRaisesRegex(ValueError, "Multiple stock locations"):
            self.scan(product_id=1, action="AlmostOut")
        self.assertEqual(self.rows("stock"), before)
        self.assertEqual(self.flag(), 0)
        self.assertEqual(self.rows("history"), [])
        self.scan(product_id=1, stock_id=2, action="Use")
        self.assertEqual(self.rows("stock"), [(1, 1, 1, 2), (2, 1, 2, 2)])

    def test_pending_confirmation_across_locations_changes_no_quantity(self):
        self.execute("UPDATE products SET almost_out=1")
        self.execute("INSERT INTO stock(id,product_id,quantity,location_id) VALUES(2,1,3,2)")
        before = self.rows("stock")
        self.scan(product_id=1, stock_id=2, action="Use")
        self.assertEqual(self.rows("stock"), before)
        self.assertEqual(self.flag(), 0)

    def test_stale_snapshots_and_malformed_inputs_fail_before_history(self):
        invalid = [
            (True, "Use", {}), (1, "Lookup", {}), (999, "Use", {}),
            (1, "Use", {"expected_stock": []}),
            (1, "Use", {"expected_almost_out": 1}),
            (1, "Use", {"expected_almost_out": True}),
            (1, "Use", {"stock_id": 999}),
            (1, "Add", {"stock_id": 1}),
            (1, "Use", {"expected_stock": [{"id": 1, "quantity": True, "location_id": None}]}),
        ]
        stock = self.rows("stock")
        for product_id, action, options in invalid:
            with self.subTest(options=options, action=action), self.assertRaises(ValueError):
                self.change(product_id, action, **options)
        self.assertEqual(self.rows("stock"), stock)
        self.assertEqual(self.rows("history"), [])
        self.assertEqual(self.flag(), 0)

    def test_history_failure_rolls_back_stock_and_flag(self):
        self.execute("CREATE TRIGGER fail_history BEFORE INSERT ON history "
                     "BEGIN SELECT RAISE(ABORT,'test history failure'); END")
        for action in ("AlmostOut", "Add", "Use"):
            with self.subTest(action=action), self.assertRaises(sqlite3.IntegrityError):
                self.change(1, action)
            self.assertEqual(self.total(), 2)
            self.assertEqual(self.flag(), 0)
        self.assertEqual(self.rows("shopping_list"), [])

    def test_concurrent_almost_out_counts_only_once(self):
        with ThreadPoolExecutor(max_workers=8) as executor:
            results = list(executor.map(lambda _: self.change(1, "AlmostOut"), range(8)))
        self.assertEqual(sum(result["outcome"] == "almost_out" for result in results), 1)
        self.assertEqual((self.total(), self.flag()), (1, 1))
        self.assertEqual(len(self.rows("history")), 8)

    def test_response_scope_unknown_registration_and_validation(self):
        self.assertEqual(self.scan(barcode="999", action="Add"), {"outcome": "notfound", "product_id": None})
        self.assertEqual(self.scan(barcode="999", action="Use"), {"outcome": "notfound", "product_id": None})
        self.legacy.assert_not_called()
        for options in (
            {"barcode": "999", "action": "AlmostOut"}, {"barcode": "１２３", "action": "Use"},
            {"barcode": "123", "product_id": 1, "action": "Add"},
            {"barcode": "123", "action": "Lookup"}, {"action": "Use"},
        ):
            with self.subTest(options=options), self.assertRaises(ValueError):
                self.scan(**options)
        self.assertEqual(self.total(), 2)
        self.assertEqual(self.flag(), 0)
        self.assertEqual(self.legacy.call_count, 0)

    def test_audio_failure_is_explicit_without_reverting_consumption(self):
        self.namespace["event"].fire = Mock(side_effect=RuntimeError("Test audio failure"))
        result = self.scan(product_id=1, action="AlmostOut")
        self.assertFalse(result["audio_requested"])
        self.namespace["log"].error.assert_called_once()
        self.assertEqual((self.total(), self.flag()), (1, 1))
        self.namespace["_publish"].assert_called_once()

    def enable_alternatives(self):
        self.execute("UPDATE products SET barcode=1234567890,name='Halvolle melk',auto_add_threshold=1 WHERE id=1")
        self.execute("UPDATE stock SET quantity=1 WHERE product_id=1")
        self.execute("UPDATE products SET barcode=987654321,name='Halfvolle melk Houdbaar' WHERE id=2")
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(2,2,2)")
        self.execute("INSERT INTO products(id,barcode,name) VALUES(3,9576385644,'Magere melk')")
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(3,3,2)")
        self.equivalents = {"Halfvolle melk Houdbaar"}
        self.namespace.update(
            _alt_stock_enabled=lambda: True, _ai_match_enabled=lambda: True,
            _alt_stock_threshold=lambda: 90,
            _name_similarity=Mock(side_effect=AssertionError("Semantic decisions must not use lexical scores")),
            _announce_alt_stock=Mock(), _raise_alt_stock_popup=Mock())
        self.namespace["_ai_same_product"] = Mock(side_effect=lambda scanned, candidates, multiple=False:
            ([name for name in candidates if name in self.equivalents] if multiple else
             next((name for name in candidates if name in self.equivalents), None), 99, 12, True))
        return self.scan(barcode="1234567890", action="Use", confirm_alternatives=True)

    def resolve_alternatives(self, add):
        return self.namespace["vh_inventory_touchscreen_shopping_decision"](
            product_id=1, add_to_shopping=add, expected_stock=[], expected_almost_out=0)

    def test_use_offers_semantic_equivalents_without_adding_or_opening_esphome_popup(self):
        result = self.enable_alternatives()
        self.assertEqual((result["quantity"], result["outcome"], result["on_shopping"]), (0, "use", False))
        self.assertEqual([(row["product_id"], row["product"], row["quantity"], row["method"])
                          for row in result["alternatives"]], [(2, "Halfvolle melk Houdbaar", 2, "AI")])
        self.assertEqual(self.rows("stock"), [(2, 2, None, 2), (3, 3, None, 2)])
        self.assertEqual(self.rows("shopping_list"), [])
        self.namespace["_name_similarity"].assert_not_called()
        self.namespace["_raise_alt_stock_popup"].assert_not_called()
        self.namespace["_announce_alt_stock"].assert_not_called()

    def test_yes_adds_original_product_at_configured_quantity_without_second_consumption(self):
        self.enable_alternatives()
        result = self.resolve_alternatives(True)
        self.assertTrue(result["shopping_added"])
        self.assertEqual((result["product_id"], result["quantity"], result["on_shopping"]), (1, 0, True))
        self.assertEqual(self.rows("shopping_list")[0][1:3], (1, 4))
        self.assertEqual(self.total(), 0)
        self.assertEqual(sum(row[5].startswith("Touchscreen Use:") for row in self.rows("history")), 1)
        self.resolve_alternatives(True)
        self.assertEqual(len(self.rows("shopping_list")), 1)
        self.assertEqual(self.rows("shopping_list")[0][2], 4)

    def test_plus_jumbo_threshold_two_prompts_at_one_and_zero_without_repeating_consumption(self):
        self.execute("UPDATE products SET barcode=8718989823139,name='Houdbare Magere Melk (PLUS)' WHERE id=1")
        self.execute("UPDATE products SET barcode=8718452136247,name='Houdbare Magere Melk (JUMBO)' WHERE id=2")
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(2,2,2)")
        self.namespace.update(
            _alt_stock_enabled=lambda: True, _ai_match_enabled=lambda: True,
            _alt_stock_threshold=lambda: 80,
            _name_similarity=Mock(side_effect=AssertionError("Must use semantic matching")),
            _ai_same_product=Mock(return_value=(["Houdbare Magere Melk (JUMBO)"], 100, 1817, True)),
            _announce_alt_stock=Mock(), _raise_alt_stock_popup=Mock())
        for before, add in ((2, False), (1, True)):
            result = self.scan(product_id=1, action="Use", confirm_alternatives=True,
                               expected_stock=[dict(id=1, quantity=before, location_id=None)],
                               expected_almost_out=0)
            self.assertEqual(result["quantity"], before - 1)
            self.assertFalse(result["on_shopping"])
            self.assertEqual([(row["product_id"], row["product"], row["quantity"])
                              for row in result["alternatives"]],
                             [(2, "Houdbare Magere Melk (JUMBO)", 2)])
            choice = self.namespace["vh_inventory_touchscreen_shopping_decision"](
                product_id=1, add_to_shopping=add,
                expected_stock=result["stock"], expected_almost_out=0)
            self.assertEqual(choice["quantity"], before - 1)
            self.assertEqual(choice["on_shopping"], add)
        self.assertEqual(self.rows("shopping_list")[0][1:3], (1, 4))
        self.assertEqual(self.rows("stock"), [(2, 2, None, 2)])
        self.assertEqual(sum(row[5].startswith("Touchscreen Use:") for row in self.rows("history")), 2)
        self.assertEqual(self.namespace["_ai_same_product"].call_count, 2)
        self.namespace["_raise_alt_stock_popup"].assert_not_called()

    def test_no_leaves_scanned_item_off_list_without_second_consumption(self):
        self.enable_alternatives()
        result = self.resolve_alternatives(False)
        self.assertEqual((result["quantity"], result["on_shopping"], result["shopping_added"]), (0, False, False))
        self.assertEqual(self.rows("shopping_list"), [])
        self.assertEqual(self.total(), 0)
        self.assertEqual(sum(row[5].startswith("Touchscreen Use:") for row in self.rows("history")), 1)
        self.assertEqual(self.rows("history")[-1][2], "alt-keep")

    def test_multiple_equivalents_use_the_existing_semantic_matcher_not_a_second_heuristic(self):
        self.enable_alternatives()
        self.execute("INSERT INTO products(id,name) VALUES(4,'Andere halfvolle zuivelverpakking')")
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(4,4,5)")
        self.equivalents.add("Andere halfvolle zuivelverpakking")
        with closing(self.namespace["_conn"]()) as conn:
            matches = self.namespace["_find_instock_alternatives"](conn, 1, "Halvolle melk")
        self.assertEqual([(row["product_id"], row["quantity"]) for row in matches], [(2, 2), (4, 5)])
        self.assertTrue(all(row["method"] == "AI" for row in matches))
        self.namespace["_name_similarity"].assert_not_called()

    def test_no_semantic_match_keeps_normal_auto_add_and_ai_no_is_authoritative(self):
        self.enable_alternatives()
        self.equivalents.clear()
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(1,1,1)")
        result = self.scan(product_id=1, action="Use", confirm_alternatives=True)
        self.assertEqual(result["alternatives"], [])
        self.assertTrue(result["shopping_added"])
        self.namespace["_name_similarity"].assert_not_called()

    def test_ai_error_uses_same_explicit_fallback_as_esphome(self):
        self.enable_alternatives()
        self.namespace["_ai_same_product"] = Mock(return_value=(None, 0, 12, False))
        self.namespace["_name_similarity"] = Mock(side_effect=lambda a, b: 98 if b in self.equivalents else 0)
        with closing(self.namespace["_conn"]()) as conn:
            matches = self.namespace["_find_instock_alternatives"](conn, 1, "Halvolle melk")
        self.assertEqual([(row["product_id"], row["method"]) for row in matches], [(2, "AI-fallback")])

    def test_no_option_does_not_remove_a_shopping_entry_added_by_another_client(self):
        self.enable_alternatives()
        self.execute("INSERT INTO shopping_list(product_id,quantity) VALUES(1,7)")
        self.assertTrue(self.resolve_alternatives(False)["on_shopping"])
        self.assertEqual(self.rows("shopping_list")[0][2], 7)
        self.assertEqual(self.total(), 0)

    def test_shopping_added_during_matching_supersedes_the_deferred_choice(self):
        self.enable_alternatives()
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(1,1,1)")
        match = self.namespace["_ai_same_product"]
        added = []
        def concurrent_add(scanned, candidates, **options):
            if not added:
                self.execute("INSERT INTO shopping_list(product_id,quantity) VALUES(1,7)")
                added.append(True)
            return match(scanned, candidates, **options)
        self.namespace["_ai_same_product"] = concurrent_add
        result = self.scan(product_id=1, action="Use", confirm_alternatives=True)
        self.assertEqual((result["quantity"], result["on_shopping"], result["alternatives"]), (0, True, []))
        self.assertEqual(self.rows("shopping_list")[0][2], 7)

    def test_stale_shopping_choice_and_bad_inputs_cannot_change_stock_or_shopping(self):
        self.enable_alternatives()
        before = self.rows("history")
        for add in (False, True):
            with self.assertRaisesRegex(ValueError, "Stock changed"):
                self.namespace["vh_inventory_touchscreen_shopping_decision"](
                    product_id=1, add_to_shopping=add,
                    expected_stock=[{"id": 1, "quantity": 1, "location_id": None}], expected_almost_out=0)
        with self.assertRaises(ValueError):
            self.namespace["vh_inventory_touchscreen_shopping_decision"](product_id=1, add_to_shopping="yes")
        with self.assertRaises(ValueError):
            self.namespace["vh_inventory_touchscreen_shopping_decision"](product_id=1, add_to_shopping=True)
        self.assertEqual(self.rows("history"), before)
        self.assertEqual(self.rows("shopping_list"), [])
        self.assertEqual(self.total(), 0)

    def test_history_failure_rolls_back_only_shopping_decision_not_recorded_consumption(self):
        self.enable_alternatives()
        self.execute("CREATE TRIGGER fail_history BEFORE INSERT ON history "
                     "BEGIN SELECT RAISE(ABORT,'test history failure'); END")
        with self.assertRaises(sqlite3.IntegrityError):
            self.resolve_alternatives(True)
        self.assertEqual(self.rows("shopping_list"), [])
        self.assertEqual(self.total(), 0)

    def test_concurrent_yes_choices_are_idempotent_and_never_decrease_stock_again(self):
        self.enable_alternatives()
        with ThreadPoolExecutor(max_workers=6) as executor:
            results = list(executor.map(lambda _: self.change(
                1, "ShoppingAdd", expected_stock=[], expected_almost_out=0), range(6)))
        self.assertEqual(sum(row["shopping_added"] for row in results), 1)
        self.assertEqual(len(self.rows("shopping_list")), 1)
        self.assertEqual(self.total(), 0)

    def test_existing_esphome_reconciliation_keeps_single_match_and_physical_popup(self):
        self.enable_alternatives()
        self.namespace["_ai_same_product"].reset_mock()
        self.namespace["_reconcile_shopping"]({1: 1}, {1: 0}, device="barcode-02")
        self.namespace["_ai_same_product"].assert_called_once()
        self.namespace["_raise_alt_stock_popup"].assert_called_once_with(
            1, "Halvolle melk", "Halfvolle melk Houdbaar", 2, "barcode-02")
        self.assertEqual(self.rows("shopping_list"), [])

    def test_touchscreen_vetoes_conflicting_milk_types_before_ai_even_if_agent_would_accept_them(self):
        self.enable_alternatives()
        self.execute("UPDATE products SET name='Houdbare Magere Melk (PLUS)' WHERE id=1")
        self.execute("UPDATE products SET name='Houdbare magere melk (JUMBO)' WHERE id=2")
        self.execute("UPDATE products SET name='Halfvolle melk' WHERE id=3")
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(1,1,2)")
        self.execute("UPDATE products SET auto_add_threshold=2 WHERE id=1")
        self.namespace["_ai_same_product"] = Mock(
            side_effect=lambda scanned, candidates, multiple=False:
                ([candidates[0]] if multiple else candidates[0], 100, 12, True))
        for before in (2, 1):
            result = self.scan(
                product_id=1, action="Use", confirm_alternatives=True,
                expected_stock=[dict(id=1, quantity=before, location_id=None)], expected_almost_out=0)
            self.assertEqual(result["quantity"], before - 1)
            self.assertEqual([row["product"] for row in result["alternatives"]],
                             ["Houdbare magere melk (JUMBO)"])
            self.assertIn("touchscreen choice", self.rows("history")[-1][5])
            self.assertNotIn("Halfvolle melk", self.rows("history")[-1][5])
            choice = self.namespace["vh_inventory_touchscreen_shopping_decision"](
                product_id=1, add_to_shopping=False,
                expected_stock=result["stock"], expected_almost_out=0)
            self.assertEqual(choice["quantity"], before - 1)
            self.assertFalse(choice["on_shopping"])
        self.assertEqual(self.namespace["_ai_same_product"].call_count, 2)
        self.assertTrue(all(call.args[1] == ["Houdbare magere melk (JUMBO)"]
                            for call in self.namespace["_ai_same_product"].call_args_list))
        self.namespace["_raise_alt_stock_popup"].assert_not_called()

    def test_touchscreen_variant_veto_also_applies_to_fallback_and_both_directions(self):
        self.enable_alternatives()
        conflict = self.namespace["_touchscreen_variant_conflict"]
        for a, b in (("Magere melk", "Halfvolle melk"), ("half-volle melk", "Volle melk"),
                     ("Melk half vol", "Melk mager"), ("volle melk", "magere melk")):
            self.assertTrue(conflict(a, b))
            self.assertTrue(conflict(b, a))
        self.assertFalse(conflict("Magere melk PLUS", "Houdbare MAGERE melk JUMBO"))
        self.assertFalse(conflict("Magere melk", "Melk"))
        self.execute("UPDATE products SET name='Magere melk' WHERE id=1")
        self.execute("UPDATE products SET name='Houdbare magere melk' WHERE id=2")
        self.execute("UPDATE products SET name='Halfvolle melk' WHERE id=3")
        self.namespace["_ai_same_product"] = Mock(return_value=(None, 0, 12, False))
        self.namespace["_name_similarity"] = Mock(return_value=100)
        with closing(self.namespace["_conn"]()) as conn:
            matches = self.namespace["_find_instock_alternatives"](conn, 1, "Magere melk")
        self.assertEqual([(row["product_id"], row["method"]) for row in matches], [(2, "AI-fallback")])
        self.assertTrue(all(call.args[1] != "Halfvolle melk"
                            for call in self.namespace["_name_similarity"].call_args_list))

    def test_touchscreen_almost_out_and_quick_stock_reconcile_without_any_physical_prompt(self):
        self.enable_alternatives()
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(1,1,2)")
        self.execute("UPDATE products SET auto_add_threshold=2 WHERE id=1")
        self.namespace["_ai_same_product"].reset_mock()
        result = self.scan(product_id=1, action="AlmostOut")
        self.assertTrue(result["on_shopping"])
        self.assertEqual((result["quantity"], result["almost_out"]), (1, 1))
        self.scan(product_id=1, action="Use")
        self.execute("DELETE FROM shopping_list")
        result = self.scan(product_id=1, action="Use")
        self.assertEqual(result["quantity"], 0)
        self.assertTrue(result["on_shopping"])
        self.namespace["_ai_same_product"].assert_not_called()
        self.namespace["_raise_alt_stock_popup"].assert_not_called()

    def test_touchscreen_add_never_schedules_the_scanner_similarity_popup(self):
        self.scan(barcode="123", action="Add")
        self.namespace["task"].create.assert_not_called()
        self.namespace["_check_shopping_similarity"].assert_not_called()

    def test_touchscreen_quantity_adjustment_and_deletion_opt_out_of_scanner_prompts(self):
        self.enable_alternatives()
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(1,1,2)")
        self.execute("UPDATE products SET auto_add_threshold=2 WHERE id=1")
        self.namespace["_ai_same_product"].reset_mock()
        self.namespace["vh_inventory_adjust_stock"](id=1, delta=-1, check_alternatives=False)
        self.assertEqual(self.total(), 1)
        self.assertEqual(self.rows("shopping_list")[0][2], 4)
        self.execute("DELETE FROM shopping_list")
        self.namespace["vh_inventory_delete"](table="stock", id=1, check_alternatives=False)
        self.assertEqual(self.total(), 0)
        self.assertEqual(self.rows("shopping_list")[0][2], 4)
        self.namespace["_ai_same_product"].assert_not_called()
        self.namespace["_raise_alt_stock_popup"].assert_not_called()

    def test_legacy_stock_adjustment_keeps_physical_popup_and_rejects_invalid_opt_out(self):
        self.enable_alternatives()
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(1,1,1)")
        self.namespace["_raise_alt_stock_popup"].reset_mock()
        for invalid in ("false", 0, None):
            with self.assertRaises(ValueError):
                self.namespace["vh_inventory_adjust_stock"](id=1, delta=-1, check_alternatives=invalid)
            with self.assertRaises(ValueError):
                self.namespace["vh_inventory_delete"](table="stock", id=1, check_alternatives=invalid)
        self.assertEqual(self.total(), 1)
        self.namespace["vh_inventory_adjust_stock"](id=1, delta=-1)
        self.assertEqual(self.rows("shopping_list"), [])
        self.namespace["_raise_alt_stock_popup"].assert_called_once()

    def test_empty_use_offers_equivalents_without_inventing_a_stock_decrement(self):
        self.enable_alternatives()
        result = self.scan(product_id=1, action="Use", confirm_alternatives=True)
        self.assertEqual((result["before"], result["quantity"], result["outcome"]), (0, 0, "shopping"))
        self.assertEqual(len(result["alternatives"]), 1)
        self.assertEqual(self.rows("shopping_list"), [])

    def test_multiple_equivalents_require_only_one_ai_request_and_record_all_matches(self):
        self.enable_alternatives()
        self.execute("INSERT INTO products(id,name) VALUES(4,'Andere halfvolle zuivelverpakking')")
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(4,4,5)")
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(1,1,1)")
        self.equivalents.add("Andere halfvolle zuivelverpakking")
        self.namespace["_ai_same_product"].reset_mock()
        result = self.scan(product_id=1, action="Use", confirm_alternatives=True)
        self.assertEqual([row["product_id"] for row in result["alternatives"]], [2, 4])
        self.namespace["_ai_same_product"].assert_called_once()
        self.assertEqual(self.namespace["_ai_same_product"].call_args.kwargs, {"multiple": True})
        self.assertIn("Halfvolle melk Houdbaar", self.rows("history")[-1][5])
        self.assertIn("Andere halfvolle zuivelverpakking", self.rows("history")[-1][5])
        self.assertEqual(self.total(), 0)

    def test_interpreted_scan_helpers_do_not_use_unsupported_generator_expressions(self):
        for node in TREE.body:
            if not isinstance(node, ast.FunctionDef) or node.name not in FUNCTIONS | {
                "_ai_same_product", "_parse_ai_json", "_extract_speech"}:
                continue
            if any(isinstance(item, ast.Name) and item.id == "pyscript_compile"
                   for item in node.decorator_list):
                continue
            with self.subTest(function=node.name):
                self.assertFalse(any(isinstance(child, ast.GeneratorExp) for child in ast.walk(node)),
                                 "Pyscript interpreted functions do not support generator expressions")

    def ai_fixture(self, response):
        scope = dict(
            json=json, time=SimpleNamespace(monotonic=Mock(side_effect=[10, 10.025, 10.026])),
            service=SimpleNamespace(call=Mock(return_value={"speech": {"plain": {"speech": response}}})),
            _ai_match_policy=lambda: "Same brand variants only; different milk types must not match.",
            _ai_match_agent=lambda: "conversation.synthetic",
            _ai_counter_inc=Mock(), _ai_call_ok=Mock(), _set_ai_degraded=Mock(),
            _announce_ai_degraded=Mock(), log=SimpleNamespace(warning=Mock()))
        functions = [node for node in TREE.body if isinstance(node, ast.FunctionDef)
                     and node.name in {"_ai_same_product", "_parse_ai_json", "_extract_speech"}]
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(SOURCE), "exec"), scope)
        return scope

    def test_real_ai_parser_batches_all_candidates_in_one_request_and_preserves_original_names(self):
        scope = self.ai_fixture(json.dumps({"matches": ["milk jumbo", "MILK PLUS", "Milk Jumbo"],
                                           "confidence": 97}))
        result = scope["_ai_same_product"]("Milk", ["Milk Jumbo", "Milk PLUS"], multiple=True)
        self.assertEqual((result[0], result[1], result[3]), (["Milk Jumbo", "Milk PLUS"], 97, True))
        scope["service"].call.assert_called_once()
        self.assertIn('"matches"', scope["service"].call.call_args.kwargs["text"])
        scope["_set_ai_degraded"].assert_not_called()

    def test_batch_no_match_is_authoritative_but_malformed_or_invented_matches_use_explicit_fallback(self):
        for response, ok in [
            ('{"matches":[],"confidence":100}', True),
            ('{"match":"Milk Jumbo"}', False), ('{"matches":"Milk Jumbo"}', False),
            ('{"matches":[7]}', False), ('{"matches":["Unknown product"]}', False),
            ('not JSON', False),
        ]:
            with self.subTest(response=response):
                scope = self.ai_fixture(response)
                result = scope["_ai_same_product"]("Milk", ["Milk Jumbo"], multiple=True)
                self.assertEqual(result[3], ok)
                scope["service"].call.assert_called_once()
                self.assertEqual(scope["_set_ai_degraded"].called, not ok)
                self.assertEqual(scope["log"].warning.called, not ok)

    def test_legacy_ai_single_match_contract_and_prompt_remain_unchanged(self):
        scope = self.ai_fixture('{"match":"milk jumbo","confidence":99}')
        result = scope["_ai_same_product"]("Milk", ["Milk Jumbo"])
        self.assertEqual((result[0], result[1], result[3]), ("Milk Jumbo", 99, True))
        self.assertNotIn('"matches"', scope["service"].call.call_args.kwargs["text"])
        empty = self.ai_fixture("")
        self.assertEqual(empty["_ai_same_product"]("Milk", [], multiple=True), ([], 0, 0, True))
        empty["service"].call.assert_not_called()

    def test_disabled_alternatives_preserve_auto_add_without_calling_the_matcher(self):
        self.enable_alternatives()
        self.namespace["_ai_same_product"].reset_mock()
        self.namespace["_alt_stock_enabled"] = lambda: False
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(1,1,1)")
        result = self.scan(product_id=1, action="Use", confirm_alternatives=True)
        self.assertEqual(result["alternatives"], [])
        self.assertTrue(result["shopping_added"])
        self.namespace["_ai_same_product"].assert_not_called()

    def test_auto_add_disabled_or_threshold_not_crossed_does_not_offer_alternatives(self):
        self.enable_alternatives()
        self.namespace["_ai_same_product"].reset_mock()
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(1,1,3)")
        result = self.scan(product_id=1, action="Use", confirm_alternatives=True)
        self.assertEqual((result["quantity"], result["alternatives"], result["on_shopping"]), (2, [], False))
        self.execute("UPDATE products SET auto_add_enabled=0 WHERE id=1")
        self.execute("UPDATE stock SET quantity=1 WHERE product_id=1")
        result = self.scan(product_id=1, action="Use", confirm_alternatives=True)
        self.assertEqual((result["quantity"], result["alternatives"], result["on_shopping"]), (0, [], False))
        self.namespace["_ai_same_product"].assert_not_called()

    def test_already_listed_product_does_not_prompt_or_increase_its_shopping_quantity(self):
        self.enable_alternatives()
        self.execute("INSERT INTO stock(id,product_id,quantity) VALUES(1,1,1)")
        self.execute("INSERT INTO shopping_list(product_id,quantity) VALUES(1,7)")
        self.namespace["_ai_same_product"].reset_mock()
        result = self.scan(product_id=1, action="Use", confirm_alternatives=True)
        self.assertEqual(result["alternatives"], [])
        self.assertFalse(result["shopping_added"])
        self.assertEqual(self.rows("shopping_list")[0][2], 7)
        self.namespace["_ai_same_product"].assert_not_called()

    def test_almost_out_acknowledgement_never_consumes_again_or_opens_a_new_choice(self):
        self.enable_alternatives()
        self.execute("UPDATE products SET almost_out=1 WHERE id=1")
        self.namespace["_ai_same_product"].reset_mock()
        result = self.scan(product_id=1, action="Use", confirm_alternatives=True)
        self.assertEqual((result["outcome"], result["quantity"], result["alternatives"]), ("already_counted", 0, []))
        self.namespace["_ai_same_product"].assert_not_called()

    def test_confirmation_opt_in_is_strictly_validated_before_stock_changes(self):
        before = self.rows("stock")
        for action, option in [("Use", "yes"), ("Use", 1), ("Add", True), ("AlmostOut", True)]:
            with self.assertRaises(ValueError):
                self.scan(product_id=1, action=action, confirm_alternatives=option)
        self.assertEqual(self.rows("stock"), before)
        self.assertEqual(self.rows("history"), [])

    def test_suppressing_duplicate_speech_keeps_mobile_event_and_legacy_event_shape(self):
        node = next(node for node in TREE.body if isinstance(node, ast.FunctionDef)
                    and node.name == "_announce_shopping_add")
        self.namespace["_product_name_mfr"] = lambda pid: ("Demo product", "")
        exec(compile(ast.Module(body=[node], type_ignores=[]), str(SOURCE), "exec"), self.namespace)
        self.namespace["_announce_shopping_add"](1, suppress_tts=True)
        self.namespace["_announce_shopping_add"](1)
        self.assertEqual(self.events, [
            ("vh_inventory_announce", {"kind": "shopping_add", "product": "Demo product", "suppress_tts": True}),
            ("vh_inventory_announce", {"kind": "shopping_add", "product": "Demo product"}),
        ])

    def test_migration_online_backup_and_default_are_idempotent(self):
        self.execute("ALTER TABLE products DROP COLUMN almost_out")
        before = self.rows("products")
        self.namespace["_ensure_schema"]()
        backups = list(Path(self.directory.name).glob("inventory.db.pre-almost-out-*"))
        self.assertEqual(len(backups), 1)
        with closing(sqlite3.connect(backups[0])) as conn:
            self.assertEqual(conn.execute("PRAGMA integrity_check").fetchone(), ("ok",))
            self.assertEqual(conn.execute("SELECT * FROM products ORDER BY id").fetchall(), before)
            self.assertNotIn("almost_out", [row[1] for row in conn.execute("PRAGMA table_info(products)")])
        self.assertEqual(self.flag(), 0)
        self.namespace["_ensure_schema"]()
        self.assertEqual(len(list(Path(self.directory.name).glob("inventory.db.pre-almost-out-*"))), 1)
        self.assertEqual([row[:-1] for row in self.rows("products")], before)

    def test_migration_backup_failure_aborts_schema_change(self):
        self.execute("ALTER TABLE products DROP COLUMN almost_out")
        self.namespace["_backup_db_before_almost_out_migration"] = Mock(side_effect=OSError("Backup unavailable"))
        with self.assertRaisesRegex(OSError, "Backup unavailable"):
            self.namespace["_ensure_schema"]()
        with closing(sqlite3.connect(self.path)) as conn:
            self.assertNotIn("almost_out", [row[1] for row in conn.execute("PRAGMA table_info(products)")])


class AlmostOutSpeechTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        package = (SOURCE.parents[3] / "packages" / "vh_inventory.yaml").read_text(encoding="utf-8")
        cls.automation = package.split("  - id: vh_inventory_announce\n", 1)[1].split("\n  - id:", 1)[0]
        cls.message = cls.automation.split("      message: >-\n", 1)[1].split("\n    actions:", 1)[0]
        cls.gate = re.search(r"value_template: >-\n(.*?)\n    variables:", cls.automation, re.S)[1]
        cls.environment = Environment(undefined=StrictUndefined)

    def render(self, template, data, enabled=True):
        return self.environment.from_string(template).render(
            trigger=SimpleNamespace(event=SimpleNamespace(data=data)), product="Demo product",
            states=lambda entity: "40" if entity == "input_number.vh_tts_volume" else "unknown",
            is_state=lambda entity, value: enabled,
        ).strip()

    def test_bilingual_outcomes_quantity_and_all_shopping_statuses(self):
        for language in ("nl", "en"):
            for outcome in ("almost_out", "already_almost_out", "already_counted"):
                for status in ("added", "listed", "absent"):
                    data = dict(kind="touchscreen_almost_out", language=language, quantity=0,
                                outcome=outcome, shopping_added=status == "added", on_shopping=status != "absent")
                    with self.subTest(language=language, outcome=outcome, status=status):
                        result = self.render(self.message, data)
                        self.assertIn("Demo product", result)
                        self.assertIn("0", result)
                        expected = {
                            ("en", "added"): "Added to the shopping list.",
                            ("en", "listed"): "Already on the shopping list.",
                            ("en", "absent"): "Not on the shopping list.",
                            ("nl", "added"): "Toegevoegd aan de boodschappenlijst.",
                            ("nl", "listed"): "Staat al op de boodschappenlijst.",
                            ("nl", "absent"): "Staat niet op de boodschappenlijst.",
                        }[language, status]
                        self.assertIn(expected, result)
                        if outcome != "almost_out":
                            self.assertIn("not been reduced again" if language == "en" else "niet opnieuw verlaagd", result)

    def test_existing_gates_volume_and_speech_suppression(self):
        for enabled in (True, False):
            self.assertEqual(self.render(self.gate, {"kind": "touchscreen_almost_out"}, enabled), str(enabled))
        self.assertEqual(self.render(self.gate, {"kind": "shopping_add", "suppress_tts": True}), "False")
        self.assertEqual(self.render(self.gate, {"kind": "shopping_add"}), "True")
        self.assertIn("entity_id: input_boolean.vh_tts_enabled", self.automation)
        self.assertIn("states('input_text.vh_tts_media_players')", self.automation)
        self.assertIn("input_number.vh_tts_volume", self.automation)
        self.assertIn("announce: true", self.automation)
        self.assertEqual(self.render("{{ states('input_number.vh_tts_volume') | float(40) / 100 }}", {}), "0.4")

    def test_legacy_speech_branch_remains_available(self):
        result = self.render(self.message, {"kind": "scan_used", "quantity": 2})
        self.assertEqual(result, "Demo product verbruikt, nog 2 op voorraad.")


if __name__ == "__main__":
    unittest.main()
