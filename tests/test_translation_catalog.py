"""Shared catalog validation and safe dashboard-consumer checks."""

import ast
import copy
import json
from pathlib import Path
import re
import tempfile
import unittest

from build_touchscreen import build
from translation_catalog import load_translations, SECTIONS


ROOT = Path(__file__).resolve().parents[1]


class TranslationCatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.catalogs = {
            code: {
                "__code__": code, "__name__": name,
                "generic": {"Save": value},
                "main": {"Main only": "Main"},
                "touchscreen": {"Touch only": "Touch"},
            }
            for code, name, value in (("en", "English", "Save"), ("nl", "Nederlands", "Opslaan"))
        }

    def write(self):
        for code, catalog in self.catalogs.items():
            (self.directory / f"{code}.json").write_text(json.dumps(catalog), encoding="utf-8")

    def assert_invalid(self, fragment):
        self.write()
        with self.assertRaisesRegex(ValueError, fragment):
            load_translations("touchscreen", self.directory)

    def test_scopes_share_generic_without_metadata_or_other_dashboard(self):
        self.write()
        for scope, present, absent in (
            ("main", "Main only", "Touch only"), ("touchscreen", "Touch only", "Main only")
        ):
            maps, names, keys = load_translations(scope, self.directory)
            self.assertEqual(names, {"English": "en", "Nederlands": "nl"})
            self.assertEqual(maps["nl"]["Save"], "Opslaan")
            self.assertIn(present, maps["nl"])
            self.assertNotIn(absent, maps["nl"])
            self.assertEqual(set(keys), {"Save", present})

    def test_unknown_surface_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unsupported"):
            load_translations("unknown", self.directory)

    def test_both_supported_languages_are_required(self):
        del self.catalogs["nl"]
        self.assert_invalid("English and Dutch")

    def test_unknown_top_level_fields_and_flat_catalogs_are_rejected(self):
        self.catalogs["nl"]["Save"] = "Opslaan"
        self.assert_invalid("expected language metadata")

    def test_language_code_must_match_filename(self):
        self.catalogs["nl"]["__code__"] = "en"
        self.assert_invalid("language metadata")

    def test_language_names_must_be_unique_nonempty_strings(self):
        for value in ("English", "", " ", None):
            with self.subTest(value=value):
                self.catalogs["nl"]["__name__"] = value
                self.assert_invalid("language metadata")

    def test_sections_must_be_objects(self):
        self.catalogs["nl"]["main"] = []
        self.assert_invalid("must be an object")

    def test_translation_values_must_be_nonempty_strings(self):
        for value in ("", " ", None, 1, []):
            with self.subTest(value=value):
                self.catalogs["nl"]["generic"]["Save"] = value
                self.assert_invalid("invalid translation")

    def test_source_keys_must_not_be_blank(self):
        self.catalogs["nl"]["generic"][" "] = "Value"
        self.assert_invalid("invalid translation")

    def test_cross_section_duplicate_keys_are_rejected(self):
        self.catalogs["nl"]["main"]["Save"] = "Opslaan"
        self.assert_invalid("one section only")

    def test_raw_duplicate_json_keys_are_rejected(self):
        self.write()
        (self.directory / "nl.json").write_text('{"__code__":"nl","__code__":"nl"}', encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Duplicate translation key"):
            load_translations("main", self.directory)

    def test_missing_keys_and_different_section_placement_are_rejected(self):
        for move in (False, True):
            with self.subTest(move=move):
                catalog = copy.deepcopy(self.catalogs)
                value = self.catalogs["nl"]["touchscreen"].pop("Touch only")
                if move:
                    self.catalogs["nl"]["main"]["Touch only"] = value
                self.assert_invalid("keys/sections differ")
                self.catalogs = catalog

    def test_actual_catalogs_have_three_identical_sections_and_reuse_shared_words(self):
        main, _, _ = load_translations("main")
        touchscreen, _, _ = load_translations("touchscreen")
        for code in ("en", "nl"):
            catalog = json.loads((ROOT / "translations" / f"{code}.json").read_text(encoding="utf-8"))
            self.assertEqual(list(catalog), ["__code__", "__name__", *SECTIONS])
            for key in ("Add", "Use", "Save", "Cancel", "Language", "Products"):
                self.assertIn(key, catalog["generic"])
            for key, value in catalog["generic"].items():
                self.assertEqual(main[code][key], value)
                self.assertEqual(touchscreen[code][key], value)
            self.assertTrue(set(catalog["main"]).isdisjoint(touchscreen[code]))
            self.assertTrue(set(catalog["touchscreen"]).isdisjoint(main[code]))

    def test_template_placeholders_match_english(self):
        catalogs = [json.loads((ROOT / "translations" / f"{code}.json").read_text(encoding="utf-8"))
                    for code in ("en", "nl")]
        for section in SECTIONS:
            for key, english in catalogs[0][section].items():
                pattern = r"\{[A-Za-z_][A-Za-z_0-9]*\}"
                self.assertEqual(sorted(re.findall(pattern, english)),
                                 sorted(re.findall(pattern, catalogs[1][section][key])), key)

    def test_main_loader_and_script_can_be_evaluated_without_running_builder(self):
        tree = ast.parse((ROOT / "mk_dash.py").read_text(encoding="utf-8-sig"))
        loader = next(node for node in tree.body if isinstance(node, ast.FunctionDef)
                      and node.name == "_load_translations")
        script = next(node for node in tree.body if isinstance(node, ast.Assign)
                      and any(isinstance(target, ast.Name) and target.id == "_I18N_JS" for target in node.targets))
        context = {"load_translations": load_translations, "_TRANS_DIR": ROOT / "translations", "json": json}
        exec(compile(ast.Module(body=[loader], type_ignores=[]), "main-loader", "exec"), context)
        maps, names, keys = context["_load_translations"]()
        self.assertEqual(maps, load_translations("main")[0])
        context.update(I18N_MAP=maps, I18N_LANGS=names, I18N_KEYS=keys)
        exec(compile(ast.Module(body=[script], type_ignores=[]), "main-script", "exec"), context)
        self.assertIn("VH-INVENTORY-TOUCHSCREEN-DASHBOARD", context["_I18N_JS"])
        self.assertIn("input_select.vh_language", context["_I18N_JS"])
        self.assertNotIn('"Touchscreen inventory"', context["_I18N_JS"])

    def test_touchscreen_build_embeds_scoped_maps_and_shared_selector(self):
        build(self.directory)
        dashboard = json.loads((self.directory / "dashboard.json").read_text(encoding="utf-8"))
        card = dashboard["views"][0]["cards"][0]
        maps, names, _ = load_translations("touchscreen")
        self.assertEqual(card["translations"], maps)
        self.assertEqual(card["language_names"], names)
        self.assertEqual(card["kitchen"], {
            "worktop": "light.z_keuken_werkblad", "ceiling": "light.z_keuken_plafond",
            "speaker": "media_player.keuken",
            "ledstripWarm": "automation.keuken_werkblad_ledstrip_warm",
            "ledstripCold": "automation.keuken_werkblad_ledstrip_koud",
            "ledstripOff": "automation.werkblad_ledstrip_uit",
            "ledstripPower": "switch.tf04_switch",
            "worktopAutoOff": "automation.keuken_werkblad_auto_off_if_forgotten",
        })
        self.assertIn("input_select.vh_language",
                      [field["entity"] for section in card["configuration"]["sections"] for field in section["fields"]])


if __name__ == "__main__":
    unittest.main()
