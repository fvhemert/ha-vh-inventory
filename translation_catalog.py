"""Load validated shared and dashboard-specific translation sections."""

import json
from pathlib import Path


SECTIONS = ("generic", "main", "touchscreen")


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate translation key: {key}")
        result[key] = value
    return result


def load_translations(surface, directory=None):
    if surface not in ("main", "touchscreen"):
        raise ValueError(f"Unsupported dashboard translation scope: {surface}")
    directory = Path(directory) if directory is not None else Path(__file__).resolve().parent / "translations"
    maps, languages, catalogs = {}, {}, {}
    for file in sorted(directory.glob("*.json")):
        catalog = json.loads(file.read_text(encoding="utf-8"), object_pairs_hook=_unique_object)
        if not isinstance(catalog, dict) or set(catalog) != {"__code__", "__name__", *SECTIONS}:
            raise ValueError(f"{file.name}: expected language metadata and generic/main/touchscreen sections")
        code, name = catalog["__code__"], catalog["__name__"]
        if code != file.stem or not isinstance(name, str) or not name.strip() or name in languages:
            raise ValueError(f"{file.name}: invalid or duplicate language metadata")
        seen, flattened = set(), {}
        for section in SECTIONS:
            entries = catalog[section]
            if not isinstance(entries, dict):
                raise ValueError(f"{file.name}: {section} must be an object")
            for key, value in entries.items():
                if not key.strip() or not isinstance(value, str) or not value.strip():
                    raise ValueError(f"{file.name}: invalid translation in {section}: {key}")
                if key in seen:
                    raise ValueError(f"{file.name}: {key} belongs in one section only")
                seen.add(key)
            if section in ("generic", surface):
                flattened.update(entries)
        catalogs[code] = {section: set(catalog[section]) for section in SECTIONS}
        maps[code], languages[name] = flattened, code
    if not {"en", "nl"}.issubset(maps):
        raise ValueError("English and Dutch translation catalogs are required")
    for code, sections in catalogs.items():
        if sections != catalogs["en"]:
            raise ValueError(f"{code}: translation keys/sections differ from English")
    keys = {key: 1 for strings in maps.values() for key in strings}
    return maps, languages, keys
