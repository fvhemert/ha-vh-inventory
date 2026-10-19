"""Exercise the real SQLite save helper without importing Home Assistant services."""

import ast
from contextlib import closing
import datetime
from pathlib import Path
import sqlite3
import tempfile
from types import SimpleNamespace
import unittest


SOURCE = Path(__file__).resolve().parents[1] / "pyscript" / "apps" / "vh_inventory" / "__init__.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))
FUNCTIONS = {"_conn", "_save_product_details", "_save_stock_details", "_hist_row", "_purge_history", "_months_ago"}
SCHEMA = ast.literal_eval(next(
    node.value for node in TREE.body if isinstance(node, ast.Assign)
    and any(isinstance(target, ast.Name) and target.id == "DB_SCHEMA" for target in node.targets)
))


class ProductDetailsTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = str(Path(self.directory.name) / "inventory.db")
        namespace = {
            "sqlite3": sqlite3, "datetime": datetime, "DB_PATH": self.path,
            "HISTORY_RETENTION_MONTHS": 3, "NONE": "(none)", "pyscript_compile": lambda function: function,
        }
        functions = [node for node in TREE.body
                     if isinstance(node, ast.FunctionDef) and node.name in FUNCTIONS]
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(SOURCE), "exec"), namespace)
        self.save = namespace["_save_product_details"]
        self.save_stock = namespace["_save_stock_details"]
        self.namespace = namespace
        with closing(sqlite3.connect(self.path)) as conn, conn:
            for table, columns in SCHEMA.items():
                conn.execute("CREATE TABLE %s (%s)" % (
                    table, ",".join("%s %s" % column for column in columns)))
            for table, column in (("categories", "category"), ("stores", "store"), ("locations", "location")):
                conn.executemany("INSERT INTO %s(id,%s) VALUES(?,?)" % (table, column),
                                 [(1, "First"), (2, "Second"), (3, "Third")])
            conn.execute(
                "INSERT INTO products(id,barcode,name,description,manufacturer,unit,"
                "auto_add_enabled,auto_add_threshold,auto_add_quantity,category_id,store_id)"
                "VALUES(1,123,'Demo product','Keep description','Demo','pak',1,2,4,1,1)")
            conn.execute("INSERT INTO products(id,name) VALUES(2,'Other product')")
            conn.executemany("INSERT INTO stock(id,product_id,location_id,quantity) VALUES(?,?,?,?)",
                             [(1, 1, 1, 3), (2, 1, 2, 2), (3, 2, 1, 9)])
            conn.execute("INSERT INTO shopping_list(product_id,quantity) VALUES(1,4)")

    def rows(self, table):
        with closing(sqlite3.connect(self.path)) as conn, conn:
            return conn.execute("SELECT * FROM %s ORDER BY id" % table).fetchall()

    def execute(self, sql):
        with closing(sqlite3.connect(self.path)) as conn, conn:
            conn.execute(sql)

    def test_patch_preserves_unedited_fields_and_inventory(self):
        product = self.rows("products")[0]
        stock, shopping = self.rows("stock"), self.rows("shopping_list")
        self.save(1, {"manufacturer": "Updated", "unit": "", "category_id": 2, "store_id": None},
                  {"manufacturer": "Demo", "unit": "pak", "category_id": 1, "store_id": 1})
        updated = self.rows("products")[0]
        self.assertEqual(updated[4:6], ("Updated", ""))
        self.assertEqual(updated[9:], (2, None))
        self.assertEqual(updated[:4] + updated[6:9], product[:4] + product[6:9])
        self.assertEqual(self.rows("stock"), stock)
        self.assertEqual(self.rows("shopping_list"), shopping)
        self.assertEqual(len(self.rows("history")), 1)

    def test_location_merge_preserves_quantity_shopping_and_other_products(self):
        shopping = self.rows("shopping_list")
        self.save(1, {"location_id": 2}, {"location_id": ["1", "2"]})
        self.assertEqual(self.rows("stock"), [(2, 1, 2, 5), (3, 2, 1, 9)])
        self.assertEqual(self.rows("shopping_list"), shopping)

    def test_relocation_to_new_or_unassigned_location(self):
        self.save(1, {"location_id": 3}, {"location_id": ["1", "2"]})
        self.assertEqual(self.rows("stock")[0], (1, 1, 3, 5))
        self.save(1, {"location_id": None}, {"location_id": ["3"]})
        self.assertEqual(self.rows("stock")[0], (1, 1, None, 5))
        self.save(1, {"location_id": 1}, {"location_id": [""]})
        self.assertEqual(self.rows("stock")[0], (1, 1, 1, 5))

    def test_combined_save_is_atomic_including_history(self):
        product, stock = self.rows("products"), self.rows("stock")
        self.execute("CREATE TRIGGER fail_history BEFORE INSERT ON history "
                     "BEGIN SELECT RAISE(ABORT, 'test failure'); END")
        with self.assertRaises(sqlite3.IntegrityError):
            self.save(1, {"manufacturer": "Rollback", "location_id": 2},
                      {"manufacturer": "Demo", "location_id": ["1", "2"]})
        self.assertEqual(self.rows("products"), product)
        self.assertEqual(self.rows("stock"), stock)

    def test_conflicts_or_invalid_references_abort_all_edits(self):
        product, stock = self.rows("products"), self.rows("stock")
        for changes, expected in [
            ({"manufacturer": "New", "unit": "New"}, {"manufacturer": "Demo", "unit": "stale"}),
            ({"manufacturer": "New", "location_id": 2}, {"manufacturer": "Demo", "location_id": ["1"]}),
            ({"manufacturer": "New", "category_id": 999}, {"manufacturer": "Demo", "category_id": 1}),
            ({"manufacturer": "New", "store_id": 999}, {"manufacturer": "Demo", "store_id": 1}),
            ({"manufacturer": "New", "location_id": 999}, {"manufacturer": "Demo", "location_id": ["1", "2"]}),
        ]:
            with self.subTest(changes=changes):
                with self.assertRaises(ValueError):
                    self.save(1, changes, expected)
                self.assertEqual(self.rows("products"), product)
                self.assertEqual(self.rows("stock"), stock)
                self.assertEqual(self.rows("history"), [])

    def test_zero_stock_never_creates_phantom_rows(self):
        self.execute("DELETE FROM stock WHERE product_id=1")
        with self.assertRaisesRegex(ValueError, "without existing stock"):
            self.save(1, {"location_id": 1}, {"location_id": []})
        self.assertEqual(len(self.rows("stock")), 1)
        self.save(1, {"manufacturer": "Allowed"}, {"manufacturer": "Demo"})
        self.assertEqual(self.rows("products")[0][4], "Allowed")
        self.execute("INSERT INTO stock(product_id,quantity) VALUES(1,0)")
        with self.assertRaisesRegex(ValueError, "without existing stock"):
            self.save(1, {"location_id": 1}, {"location_id": [""]})

    def test_new_live_quantities_and_unedited_fields_are_preserved(self):
        self.execute("UPDATE products SET description='Concurrent edit',auto_add_quantity=8 WHERE id=1")
        self.execute("UPDATE stock SET quantity=7 WHERE id=1")
        self.save(1, {"manufacturer": "New", "location_id": 2},
                  {"manufacturer": "Demo", "location_id": ["1", "2"]})
        self.assertEqual(self.rows("stock")[0][3], 9)
        self.assertEqual(self.rows("products")[0][3], "Concurrent edit")
        self.assertEqual(self.rows("products")[0][8], 8)

    def test_null_text_can_be_completed_and_unknown_products_are_rejected(self):
        self.save(2, {"manufacturer": "New", "unit": "stuk"}, {"manufacturer": "", "unit": ""})
        self.assertEqual(self.rows("products")[1][4:6], ("New", "stuk"))
        with self.assertRaisesRegex(ValueError, "no longer exists"):
            self.save(999, {"manufacturer": "New"}, {"manufacturer": ""})

    def test_input_validation_cannot_update_unrequested_fields(self):
        before = self.rows("products"), self.rows("stock")
        for pid, changes, expected in [
            (None, {"unit": "bad"}, {"unit": "pak"}),
            (True, {"unit": "bad"}, {"unit": "pak"}),
            ("1 OR 1=1", {"unit": "bad"}, {"unit": "pak"}),
            (1, {}, {}),
            (1, {"name": "bad"}, {"name": "Demo product"}),
            (1, {"manufacturer": "x" * 256}, {"manufacturer": "Demo"}),
            (1, {"unit": None}, {"unit": "pak"}),
            (1, {"category_id": "2"}, {"category_id": 1}),
            (1, {"store_id": True}, {"store_id": 1}),
            (1, {"location_id": 2}, {"location_id": "1,2"}),
            (1, {"unit": "bad"}, {}),
        ]:
            with self.subTest(changes=changes, pid=pid):
                with self.assertRaises(ValueError):
                    self.save(pid, changes, expected)
                self.assertEqual((self.rows("products"), self.rows("stock")), before)

    def test_executor_call_chain_is_native_compiled(self):
        for node in TREE.body:
            if isinstance(node, ast.FunctionDef) and node.name in FUNCTIONS:
                self.assertIn("pyscript_compile", [ast.unparse(item) for item in node.decorator_list])

    def test_stock_edit_updates_existing_ids_without_schema_or_link_changes(self):
        with closing(sqlite3.connect(self.path)) as conn:
            schema = conn.execute("SELECT type,name,sql FROM sqlite_master ORDER BY name").fetchall()
        original = self.rows("products")[0]
        shopping = self.rows("shopping_list")
        totals = self.save_stock(1, 1, {"name": "Renamed demo", "barcode": 456, "manufacturer": "New",
                              "unit": "box", "category_id": 2, "store_id": 2, "location_id": 3, "quantity": 7},
                        {"name": "Demo product", "barcode": 123, "manufacturer": "Demo", "unit": "pak",
                         "category_id": 1, "store_id": 1, "location_id": 1, "quantity": 3})
        updated = self.rows("products")[0]
        self.assertEqual(totals, (5, 9))
        self.assertEqual(updated[:3], (1, 456, "Renamed demo"))
        self.assertEqual(updated[3], original[3])
        self.assertEqual(updated[6:9], original[6:9])
        self.assertEqual(self.rows("stock"), [(1, 1, 3, 7), (2, 1, 2, 2), (3, 2, 1, 9)])
        self.assertEqual(self.rows("shopping_list"), shopping)
        self.assertEqual(len(self.rows("products")), 2)
        self.assertEqual(len(self.rows("history")), 1)
        with closing(sqlite3.connect(self.path)) as conn:
            self.assertEqual(conn.execute("SELECT type,name,sql FROM sqlite_master ORDER BY name").fetchall(), schema)

    def test_stock_edit_rejects_conflicts_wrong_links_and_existing_destinations(self):
        for pid, changes, expected in [
            (2, {"name": "Renamed"}, {"name": "Other product", "quantity": 3, "location_id": 1}),
            (1, {"name": "Renamed"}, {"name": "Stale", "quantity": 3, "location_id": 1}),
            (1, {"unit": "box"}, {"unit": "pak", "quantity": 4, "location_id": 1}),
            (1, {"unit": "box"}, {"unit": "pak", "quantity": 3, "location_id": 2}),
            (1, {"location_id": 2}, {"quantity": 3, "location_id": 1}),
            (1, {"name": "Other product"}, {"name": "Demo product", "quantity": 3, "location_id": 1}),
            (1, {"store_id": 999}, {"store_id": 1, "quantity": 3, "location_id": 1}),
        ]:
            with self.subTest(changes=changes, expected=expected):
                before = self.rows("products"), self.rows("stock"), self.rows("history")
                with self.assertRaises(ValueError):
                    self.save_stock(1, pid, changes, expected)
                self.assertEqual((self.rows("products"), self.rows("stock"), self.rows("history")), before)

    def test_stock_edit_rolls_back_product_stock_and_history_together(self):
        self.execute("CREATE TRIGGER fail_history BEFORE INSERT ON history "
                     "BEGIN SELECT RAISE(ABORT, 'test failure'); END")
        before = self.rows("products"), self.rows("stock")
        with self.assertRaises(sqlite3.IntegrityError):
            self.save_stock(1, 1, {"name": "Rollback", "quantity": 8},
                            {"name": "Demo product", "quantity": 3, "location_id": 1})
        self.assertEqual((self.rows("products"), self.rows("stock")), before)
        self.assertEqual(self.rows("history"), [])

    def test_stock_edit_preserves_unedited_concurrent_fields_and_other_locations(self):
        self.execute("UPDATE products SET description='Concurrent',auto_add_quantity=8 WHERE id=1")
        self.execute("UPDATE stock SET quantity=12 WHERE id=2")
        self.save_stock(1, 1, {"name": "Renamed"}, {"name": "Demo product", "quantity": 3, "location_id": 1})
        self.assertEqual(self.rows("products")[0][3], "Concurrent")
        self.assertEqual(self.rows("products")[0][8], 8)
        self.assertEqual(self.rows("stock")[1], (2, 1, 2, 12))

    def test_stock_edit_clear_fields_and_zero_quantity_preserve_product_links(self):
        self.save_stock(1, 1, {"barcode": None, "store_id": None, "location_id": None, "quantity": 0},
                        {"barcode": 123, "store_id": 1, "location_id": 1, "quantity": 3})
        self.assertEqual(self.rows("stock")[0], (1, 1, None, 0))
        self.assertEqual(self.rows("products")[0][1], None)
        self.assertEqual(self.rows("products")[0][10], None)
        self.assertEqual(self.rows("shopping_list")[0][1], 1)

    def test_stock_edit_invalid_inputs_and_duplicate_barcodes_never_write(self):
        self.execute("UPDATE products SET barcode=456 WHERE id=2")
        for changes, extra in [
            ({}, {}), ({"product_id": 2}, {"product_id": 1}),
            ({"id": 5}, {"id": 1}), ({"description": "Overwrite"}, {"description": "Keep description"}),
            ({"name": ""}, {"name": "Demo product"}), ({"name": " "}, {"name": "Demo product"}),
            ({"name": "x" * 256}, {"name": "Demo product"}), ({"name": "(none)"}, {"name": "Demo product"}),
            ({"quantity": -1}, {}), ({"quantity": 1.5}, {}), ({"quantity": True}, {}),
            ({"quantity": 100000}, {}), ({"barcode": 10**15}, {"barcode": 123}),
            ({"barcode": 456}, {"barcode": 123}), ({"store_id": True}, {"store_id": 1}),
        ]:
            with self.subTest(changes=changes):
                before = self.rows("products"), self.rows("stock"), self.rows("history")
                with self.assertRaises(ValueError):
                    self.save_stock(1, 1, changes, {"quantity": 3, "location_id": 1, **extra})
                self.assertEqual((self.rows("products"), self.rows("stock"), self.rows("history")), before)

    def test_stock_edit_rejects_invalid_identifiers_and_incomplete_expectations(self):
        before = self.rows("products"), self.rows("stock"), self.rows("history")
        for rid, pid, expected in [
            (None, 1, {"quantity": 3, "location_id": 1}),
            (True, 1, {"quantity": 3, "location_id": 1}),
            ("1 OR 1=1", 1, {"quantity": 3, "location_id": 1}),
            (1, False, {"quantity": 3, "location_id": 1}),
            (999, 1, {"quantity": 3, "location_id": 1}),
            (1, 1, {"quantity": 3}), (1, 1, {"quantity": True, "location_id": 1}),
        ]:
            with self.subTest(rid=rid, pid=pid, expected=expected):
                with self.assertRaises(ValueError):
                    self.save_stock(rid, pid, {"quantity": 5}, expected)
                self.assertEqual((self.rows("products"), self.rows("stock"), self.rows("history")), before)

    def test_stock_edit_service_reconciles_only_the_linked_product_and_publishes_once(self):
        events = []
        self.namespace.update(
            service=lambda function: function,
            task=SimpleNamespace(executor=lambda function, *args: function(*args)),
            _reconcile_shopping=lambda before, after: events.append(("reconcile", before, after)),
            _publish=lambda: events.append(("publish",)))
        node = next(node for node in TREE.body
                    if isinstance(node, ast.FunctionDef) and node.name == "vh_inventory_save_stock_details")
        exec(compile(ast.Module(body=[node], type_ignores=[]), str(SOURCE), "exec"), self.namespace)
        save = self.namespace["vh_inventory_save_stock_details"]
        save(1, 1, {"name": "Renamed", "quantity": 7},
             {"name": "Demo product", "quantity": 3, "location_id": 1})
        self.assertEqual(events, [("reconcile", {1: 5}, {1: 9}), ("publish",)])
        events.clear()
        with self.assertRaises(ValueError):
            save(1, 1, {"store_id": 999}, {"store_id": 1, "quantity": 7, "location_id": 1})
        self.assertEqual(events, [])


if __name__ == "__main__":
    unittest.main()
