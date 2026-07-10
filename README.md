# ha-vh-inventory

A home **inventory & grocery system** for Home Assistant. Track what you own, where it's
stored, how much you have, and what you need to buy — driven by barcode scanning or manual
entry, with a fully multi-language UI (English / Nederlands), thermal-printer support, and
optional decoupled Dutch voice announcements (Chime TTS on Sonos) and mobile push
notifications. A hands-free **handheld scanner** (an ESPHome/MQTT barcode reader) can add or
consume stock directly, switched between **Add** and **Use** mode from the Inventory tab.
Searching any table matches on **product name or barcode**. The inventory stays tidy:
products that run out (stock 0) drop off the list automatically while staying on your
shopping list.

> ## ⚠️ Disclaimer
>
> This project is a **work in progress** and provided **as-is**. Use it **at your own risk** —
> there is **no support, warranty, or guarantee** of any kind from my side, and I take no
> responsibility for any issues, data loss, or damage resulting from its use.
>
> That said, **feedback is very welcome** — feel free to open an issue or share suggestions.
>
> If you reuse this solution (in whole or in part), please be so kind as to **add a reference
> back to this repository** as the source. 🙏

## Quick start

1. **Backend** — copy `pyscript/apps/vh_inventory/__init__.py` to
   `/config/pyscript/apps/vh_inventory/__init__.py` (requires the
   [pyscript](https://github.com/custom-components/pyscript) integration).
2. **Package** — copy `packages/vh_inventory.yaml` to `/config/packages/vh_inventory.yaml`.
3. **Config** — merge the blocks from [`configuration.example.yaml`](configuration.example.yaml)
   into your `/config/configuration.yaml` (package link + the required `recorder:` exclude),
   then restart Home Assistant.
4. **Theme** *(optional)* — copy `themes/vh_inventory.yaml` to `/config/themes/`.
5. **Dashboard** — on your workstation:
   ```bash
   pip install websocket-client
   # PowerShell: $env:HA_HOST=...; $env:HA_TOKEN=...
   export HA_HOST="192.168.1.50:8123"
   export HA_TOKEN="<your Long-Lived Access Token>"
   python mk_dash.py            # expect: save: True
   ```
   Open `http://<your-ha>/vh-inventory/main`.

Full step-by-step instructions are in the **[Installation Guide](docs/INSTALLATION.md)**.

## Documentation

- 📦 **[Installation Guide](docs/INSTALLATION.md)** — install on a fresh Home Assistant
  server: pyscript backend, custom Lovelace cards, configuration package, database, and
  the dashboard builder.
- 📖 **[Product Manual](docs/PRODUCT-MANUAL.md)** — how the system works, with
  screenshots: tabs, scanning workflow, quick shopping, quick inventory, shopping list,
  per-store and per-category thermal printing, auto-add, and language switching.
- 🗑️ **[Uninstall Guide](docs/UNINSTALL.md)** — cleanly remove the solution: dashboard,
  files, `configuration.yaml` blocks, entities, recorder history, and shared dependencies.

## Repository layout

The tree mirrors the Home Assistant `/config` folder, so installing is mostly a matter of
copying each folder to the matching location under `/config`:

| Path in this repo | Copy to | What it is |
|---|---|---|
| `pyscript/apps/vh_inventory/__init__.py` | `/config/pyscript/apps/vh_inventory/__init__.py` | Backend app: creates the DB, exposes `sensor.vh_inventory_*`, and all read/write services |
| `packages/vh_inventory.yaml` | `/config/packages/vh_inventory.yaml` | The solution package: input helpers, scripts, template sensors |
| `themes/vh_inventory.yaml` | `/config/themes/vh_inventory.yaml` | Optional dashboard theme |
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

## License

Released under the [MIT License](LICENSE).
