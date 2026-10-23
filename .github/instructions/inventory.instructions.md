---
applyTo: "**"
---
# Inventory and touchscreen contributor instructions

Workstreams: general

## Architecture and documentation

- The main tabbed dashboard at `/vh-inventory/main` is built by `mk_dash.py`.
- Keuken Touchscreen is separate at `/keuken-touchscreen/scan`; shopping and
  inventory use `#shopping` and `#inventory` within one full-width view.
- Its implementation is `www/vh-inventory-touchscreen.js`. Translations are in
  `translations/en.json` and `translations/nl.json`.
- `build_touchscreen.py` creates a synthetic offline preview and dashboard JSON
  under ignored `.copilot/touchscreen/`. It does not connect to or deploy to HA.
- Read `docs/TOUCHSCREEN.md` before changing touchscreen behavior or installation.
  Keep `docs/INSTALLATION.md` and `docs/PRODUCT-MANUAL.md` consistent.
- The product manual's data-model section lists every table/column and embeds
  `docs/diagrams/database-schema.png`; SVG and editable Excalidraw are alongside it.
  Update the reference and diagram when schema definitions actually change.

## Database invariants

- `DB_SCHEMA` in `pyscript/apps/vh_inventory/__init__.py` is the schema source of
  truth. `_ensure_schema()` handles migrations/indexes/triggers; new tables also
  need `DB_SCHEMA_ORDER`. Do not change schema or links for a UI-only change.
- Product metadata belongs to `products`. Location/quantity belongs to a `stock`
  row. Renaming in the full inventory editor preserves both IDs and never writes
  `stock.product_id` or creates a replacement product.
- Full inventory edits use `vh_inventory_save_stock_details`: dirty fields only,
  original-value checks inside `BEGIN IMMEDIATE`, and atomic product/selected-stock/
  history writes. Shopping reconciliation and publication happen after commit.
- Scanner detail saves use `vh_inventory_save_product_details`; a location change
  there relocates all stock, unlike the selected-row inventory editor.
- Shopping actions use the shopping-row ID. Ad-hoc rows have no product ID;
  never require a catalogue join to keep them visible.
- Scan queue barcode matching and history entity references are logical links,
  not foreign keys. Do not assume declared references enable SQLite enforcement.
- Keep native `@pyscript_compile` on functions passed to `task.executor` and their
  pure database call chain.

## Interaction and safety

- New/recreated scan cards default to read-only Opzoeken. Add/Use must be explicit.
- Keep the five 104px top-right controls stationary on every page: Home, Recipes,
  Lighting, Shopping and hamburger, with equal 74.8px glyphs. Reserve heading
  clearance, including recipe cook mode; wrap into three rows at widths up to 600px.
  Home opens the combined scan page; Shopping opens the separate shopping list.
  Use the shared guarded routes and preserve drafts, filters and last scan.
- Product in the full editor is free text. Keep the field rows Barcode/Product,
  Fabrikant/Winkel, Categorie/Eenheid, Locatie/Aantal, with aligned Opslaan/Afbreken.
- Serialize writes and verify fresh data before/after changes. Never retry an
  uncertain write or print automatically, or treat missing data as an empty list.
- Use the synthetic preview for mutations. Live stock edits, prints, backend
  reloads and deployment require explicit approval. Preserve the main dashboard.
- Frontend files use the current HA session. Do not embed tokens or load external
  assets. Keep runtime databases, backups, credentials and `.copilot/` out of Git.
- Do not open the active SQLite database over a network share. Use supported
  services and consistent backups; follow the installation guide for restoration.

## Local checks

Run from the repository root, without Home Assistant credentials:

```powershell
node --check www\vh-inventory-touchscreen.js
node --test tests\touchscreen.test.cjs
python -m unittest discover -s tests -p test_touchscreen_details.py
python build_touchscreen.py
```

These checks use mocks and temporary SQLite databases. Physical touchscreen and
USB/Bluetooth scanner checks still need the target hardware and an agreed test.
