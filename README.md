# ha-vh-inventory

A home **inventory & grocery system** for Home Assistant. Track what you own, where it's
stored, how much you have, and what you need to buy — driven by barcode scanning or manual
entry, with a fully multi-language UI (English / Nederlands) and thermal-printer support.

## Documentation

- 📦 **[Installation Guide](docs/INSTALLATION.md)** — install on a fresh Home Assistant
  server: pyscript backend, custom Lovelace cards, configuration package, database, and
  the dashboard builder.
- 📖 **[Product Manual](docs/PRODUCT-MANUAL.md)** — how the system works, with
  screenshots: tabs, scanning workflow, quick add, inventory, shopping list, per-store and
  per-category thermal printing, auto-add, and language switching.

## Repository layout

The tree mirrors the Home Assistant `/config` folder, so installing is mostly a matter of
copying each folder to the matching location under `/config`:

| Path in this repo | Copy to | What it is |
|---|---|---|
| `pyscript/apps/vh_inventory/__init__.py` | `/config/pyscript/apps/vh_inventory/__init__.py` | Backend app: creates the DB, exposes `sensor.vh_inventory_*`, and all read/write services |
| `packages/vh_inventory.yaml` | `/config/packages/vh_inventory.yaml` | The solution package: input helpers, scripts, template sensors |
| `themes/vh_woonkamer.yaml` | `/config/themes/vh_woonkamer.yaml` | Optional dashboard theme |
| `translations/*.json` | (next to `mk_dash.py`) | Build-time inputs for the multi-language layer |
| `mk_dash.py` | your workstation | Builds and publishes the Lovelace dashboard over WebSocket |
| `configuration.example.yaml` | merge into `/config/configuration.yaml` | The only additions your root config needs (see below) |

## Configuration

All of the solution's own configuration lives in the dedicated package file
`packages/vh_inventory.yaml`. Your `configuration.yaml` only needs to *link* to it, plus one
required `recorder:` exclude (recorder is a single-instance integration and cannot live in a
package). See **[`configuration.example.yaml`](configuration.example.yaml)** for the exact,
copy-ready blocks and the Installation Guide for details.

## Architecture (in brief)

| Layer | What | Where |
|---|---|---|
| Data | SQLite database (self-creating schema) | `/config/vh_inventory.db` |
| Backend | pyscript app (sensors + services) + config package (helpers + scripts) | `pyscript/apps/vh_inventory/__init__.py`, `packages/vh_inventory.yaml` |
| Frontend | Tabbed Lovelace dashboard built by `mk_dash.py`, with a live JS translation layer | URL path `/vh-inventory` |

## Multi-language

UI strings live in `translations/*.json` (`en.json`, `nl.json`). Every UI string must be
registered there — never hardcode display text. To add a language, drop a new
`translations/<code>.json`, add its name to `input_select.vh_language`, and rebuild the
dashboard. See the Installation Guide, section 10.
