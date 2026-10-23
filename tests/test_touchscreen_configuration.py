"""Source parity checks without importing the networked main dashboard builder."""

import ast
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from build_touchscreen import build, configuration_schema
from translation_catalog import load_translations


ROOT = Path(__file__).resolve().parents[1]


class ConfigurationSchemaTests(unittest.TestCase):
    def setUp(self):
        self.tree = ast.parse((ROOT / "mk_dash.py").read_text(encoding="utf-8-sig"))
        self.assignments = {
            target.id: node.value for node in self.tree.body if isinstance(node, ast.Assign)
            for target in node.targets if isinstance(target, ast.Name)
        }
        self.schema = configuration_schema()

    def test_application_groups_preserve_every_main_setup_field(self):
        setup = self.assignments["setup_tab"]
        card = next(value for key, value in zip(setup.keys, setup.values) if key.value == "card")
        cards = next(value for key, value in zip(card.keys, card.values) if key.value == "cards")
        self.assertEqual([node.id for node in cards.elts], [
            "app_settings_card", "tts_card", "notify_card", "handheld_card",
            "ai_match_card", "similarity_card", "alt_stock_card", "scanner_card",
        ])
        sources = [
            ["lang_card"], ["_tts_setting_rows"], ["_notify_setting_rows"],
            ["_handheld_setting_rows"], ["_ai_match_setting_rows", "_ai_match_health_rows"],
            ["_similarity_setting_rows"], ["_alt_stock_setting_rows"],
        ]
        for section, names in zip(self.schema["sections"], sources):
            expected = []
            for name in names:
                card = self.assignments[name]
                entities = next(value for key, value in zip(card.keys, card.values)
                                if isinstance(key, ast.Constant) and key.value == "entities")
                expected.extend(ast.literal_eval(entities))
            if section["id"] == "application":
                expected.append({
                    "entity": "input_boolean.vh_touchscreen_fullscreen",
                    "name": "Full screen (Keuken Touchscreen)", "icon": "mdi:fullscreen",
                })
            self.assertEqual(section["fields"], expected)
        self.assertEqual(len(self.schema["sections"]), len(sources))

    def test_scanner_matrix_preserves_capabilities_overrides_and_blank_cells(self):
        source = ast.literal_eval(self.assignments["SCANNER_SETTINGS"])
        supported = ast.literal_eval(self.assignments["SCANNER01_HAS"])
        lacks = ast.literal_eval(self.assignments["BARCODE_LACKS"])
        sections = self.schema["scanners"]["sections"]
        self.assertEqual(sections[0]["rows"][0]["entities"], [None, None, "sensor.scanner_01_state"])
        self.assertEqual(len(sections), len(source) + 1)
        for section, (title, rows) in zip(sections[1:], source):
            self.assertEqual(section["title"], title)
            self.assertEqual(len(section["rows"]), len(rows))
            for actual, definition in zip(section["rows"], rows):
                name, domain, suffix, *extra = definition
                overrides = extra[0] if extra else {}
                expected = [
                    overrides.get("e1", f"{domain}.barcode_01_{suffix}") if suffix not in lacks else None,
                    overrides.get("e2", f"{domain}.barcode_02_{suffix}") if suffix not in lacks else None,
                    overrides.get("es1", f"{domain}.scanner_01_{suffix}")
                    if suffix in supported or "es1" in overrides else None,
                ]
                self.assertEqual(actual, {"name": name, "entities": expected})
        entities = [entity for section in sections for row in section["rows"] for entity in row["entities"]]
        self.assertIn("switch.scanner_01_display", entities)
        self.assertNotIn("switch.scanner_01_print_inventory_list", entities)

    def test_schema_is_unique_versioned_serializable_and_never_connects(self):
        with patch("urllib.request.urlopen", side_effect=AssertionError("Network forbidden")):
            schema = configuration_schema()
        self.assertEqual(schema["version"], 1)
        self.assertEqual(json.loads(json.dumps(schema)), schema)
        entities = [field["entity"] for section in schema["sections"] for field in section["fields"]]
        entities += [entity for section in schema["scanners"]["sections"]
                     for row in section["rows"] for entity in row["entities"] if entity]
        self.assertEqual(len(entities), 98)
        self.assertEqual(len(entities), len(set(entities)))

    def test_fullscreen_hides_both_bars_only_on_touchscreen_and_restores_helper_state(self):
        with tempfile.TemporaryDirectory() as directory, patch("builtins.print"):
            build(Path(directory))
            dashboard = json.loads((Path(directory) / "dashboard.json").read_text(encoding="utf-8"))
        template = "{{ is_state('input_boolean.vh_touchscreen_fullscreen', 'on') }}"
        self.assertEqual(dashboard["kiosk_mode"], {
            "hide_header": template, "hide_sidebar": template,
        })
        main_kiosk = ast.literal_eval(next(
            value for node in ast.walk(self.tree) if isinstance(node, ast.Dict)
            for key, value in zip(node.keys, node.values)
            if isinstance(key, ast.Constant) and key.value == "kiosk_mode"))
        self.assertEqual(main_kiosk, {
            "hide_header": "{{ is_state('input_boolean.vh_kiosk_mode', 'on') }}",
        })
        package = (ROOT / "packages" / "vh_inventory.yaml").read_text(encoding="utf-8")
        helper = package.split("  vh_touchscreen_fullscreen:\n", 1)[1].split("\n  vh_", 1)[0]
        self.assertIn("icon: mdi:fullscreen", helper)
        self.assertNotIn("initial:", helper)

    def test_source_labels_and_hints_are_translated_in_both_languages(self):
        keys = [value for section in self.schema["sections"]
                for value in [section["title"], *section["hints"], *[f["name"] for f in section["fields"]]]]
        keys += [value for section in self.schema["scanners"]["sections"]
                 for value in [section["title"], *[row["name"] for row in section["rows"]]]]
        for language in ("en", "nl"):
            translations = load_translations("touchscreen")[0][language]
            for key in keys:
                self.assertIn(key, translations, f"{language}: {key}")


if __name__ == "__main__":
    unittest.main()
