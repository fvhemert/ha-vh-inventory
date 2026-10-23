# ha-vh-inventory

A home **inventory & grocery system** for Home Assistant. Track what you own, where it's
stored, how much you have, and what you need to buy — driven by barcode scanning or manual
entry, with a fully multi-language UI (English / Nederlands), thermal-printer support, and
optional decoupled Dutch voice announcements (Chime TTS on Sonos) and mobile push
notifications. A hands-free **handheld scanner** (an ESPHome/MQTT barcode reader) can add or
consume stock directly, switched between **Add** and **Use** mode from the Inventory tab.
Two dedicated **[Large screen barcode scanners](docs/SCANNER.md)** (ESP32/ESPHome touchscreen
devices) are also supported for a full on-device scan-and-print experience.
Smart **duplicate & alternative detection** helps keep the list clean: an Add-mode scan that
looks like a product already on your shopping list, or a Use-mode scan that empties a product
while a similar one is still in stock, raises an interactive **Yes/No pop-up** on the scanner
(with optional voice prompt) so you decide what ends up on the list.
For items you need before you know the barcode, exact description, or manufacturer, the
Shopping tab also supports **Ad-Hoc products**: add a name and quantity directly to the
shopping list without creating an incomplete Products record. When a later Add-mode scan
resolves to a similar product, the originating scanner asks whether to remove that exact
Ad-Hoc entry.
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

> **Network thermal printing:** in **Settings → Devices & services → ESC/POS Thermal
> Printer → Configure**, enable **Keep persistent connection**. VH-Inventory uses separate
> styled header, body, and footer sections; Keep Alive keeps them on one ordered TCP stream.
> The print scripts are queued so repeated button presses cannot overlap.

Full step-by-step instructions are in the **[Installation Guide](docs/INSTALLATION.md)**.

## Documentation

- **[ThinkSmart Hub 500 LED ring](hardware/ThinkSmart-Hub-500-LED/README.md)**:
  optional Windows control of the Keuken TS device's physical LED ring, with
  green/red/white/off presets and Home Assistant MQTT discovery. Includes the
  scripts, libusb DLL with license/source, and the
  [Word installation guide](hardware/ThinkSmart-Hub-500-LED/ThinkSmart_Hub_500_LED_Installation_Guide.docx).
- **[Database reference](docs/PRODUCT-MANUAL.md#11-data-model-reference)**: all eight
  application tables, all columns, declared foreign keys, logical barcode/history
  references, SQLite's internal sequence table, and an embedded diagram.
  [SVG](docs/diagrams/database-schema.svg) |
  [PNG](docs/diagrams/database-schema.png) |
  [Editable Excalidraw](docs/diagrams/database-schema.excalidraw).
- **[Keuken Touchscreen](docs/TOUCHSCREEN.md)**: a
  separate 1920 x 1080 scan dashboard with USB/Bluetooth keyboard-scanner input,
  available at `/keuken-touchscreen/scan`. Current frontend:
  `20261023-home-shortcut1`; backend: `20261023-alt-stock-batch1`.
  Its twelve views remain separate from the original dashboard.
  **Home**, **Recepten**, **Verlichting**, **Boodschappenlijst**, and the hamburger
  appear at the top right in equal 104px buttons with 74.8px icons. Home returns
  to **Boodschappenlijst en voorraad**; the shopping shortcut opens the separate
  shopping list. Selected icons are black on pink, and Recepten uses an outlined
  open book. Narrow screens wrap the buttons without covering page headings.
  The hamburger starts with **Boodschappenlijst en voorraad**, **Recepten**,
  **Keuken**, then shopping, quick actions, **Configuratie**, and **Onderhoud**.
  Onderhoud contains inventory, products, locations, categories and stores.
  Pending scans, shopping decisions and unsaved edits guard every route.
  Scan modes are **Opzoeken**, **Toevoegen**, **Bijna op**, **Verbruikt**, with
  read-only Opzoeken selected initially. Name search also works in Bijna op and
  Verbruikt; selecting a product does not change stock until explicitly confirmed.
  Product edits and unknown-product registration require an explicit save.
  Bijna op counts a package early; repeated Bijna op and the later Verbruikt
  acknowledgement never count it twice. Restocking retains the marker.
  When Verbruikt would add shopping and equivalent products remain in stock,
  the touchscreen shows alternatives and asks whether to add the consumed product.
  Stock is already deducted once. The choice does not time out; its two buttons
  only decide shopping. One semantic AI request uses the existing matching policy,
  with explicit milk-type exclusions. Touchscreen actions never open ESPHome
  shopping prompts; physical scanners retain their own behavior.
  Idle product details show Dutch news refreshed every 15 minutes. Headlines open
  short RSS previews inside the card, without external windows or publisher pages.
  **Keuken - Verlichting en muziek** provides Werkblad/Plafond lighting, Ledstrip
  presets, and native Sonos playback, volume, mute and local radio-favorite logos.
  The Verlichting shortcut only opens this view; it does not control a device.
  **Recepten** is a read-only Mealie browser with search, photos and ingredients,
  preparation and notes. Its overview refreshes every 30 seconds while visible;
  open recipes are left alone. Cook mode enlarges preparation steps, while the
  navigation stays available. The Recepten shortcut returns to the overview.
  Shopping, quick shopping/stock, inventory and management retain explicit
  confirmations, row-ID-safe edits and uncertain-write recovery without retries.
  Shopping and inventory have confirmed print actions.
  Both dashboards share English/Nederlands and household settings. Touchscreen
  fullscreen is independent of the original dashboard. No credentials are embedded
  in the frontend; Mealie credentials stay in Home Assistant.
  The [touchscreen guide](docs/TOUCHSCREEN.md) covers installation, all workflows,
  synthetic offline previews and validation. Deployment and live mutations require
  approval; never repeat an uncertain scan without checking stock first.
- 📦 **[Installation Guide](docs/INSTALLATION.md)** — install on a fresh Home Assistant
  server: pyscript backend, custom Lovelace cards, configuration package, database, and
  the dashboard builder.
- 📖 **[Product Manual](docs/PRODUCT-MANUAL.md)** — how the system works, with
  screenshots: tabs, scanning workflow, quick shopping, quick inventory, shopping list,
  per-store and per-category thermal printing, auto-add, and language switching.
- 🗑️ **[Uninstall Guide](docs/UNINSTALL.md)** — cleanly remove the solution: dashboard,
  files, `configuration.yaml` blocks, entities, recorder history, and shared dependencies.
- 📡 **[Large screen barcode scanners](docs/SCANNER.md)** — the two ESP32/ESPHome
  touchscreen scanners (Barcode-01 / Barcode-02) that feed the system: hardware, build
  environment, wiring, user flow, and GM67 configuration.
- 🖨️ **[Small screen barcode scanner with printer](docs/SCANNER-SMALL.md)** — an
  ESP8266/ESPHome scanner with an OLED display and integrated thermal printer (scanner-01):
  photo, controls, user flow, and device state model.

## Repository layout

The tree mirrors the Home Assistant `/config` folder, so installing is mostly a matter of
copying each folder to the matching location under `/config`:

| Path in this repo | Copy to | What it is |
|---|---|---|
| `pyscript/apps/vh_inventory/__init__.py` | `/config/pyscript/apps/vh_inventory/__init__.py` | Backend app: creates the DB, exposes `sensor.vh_inventory_*`, and all read/write services |
| `pyscript/vh_touchscreen_news.py` | `/config/pyscript/vh_touchscreen_news.py` (optional) | Isolated Dutch RSS worker for idle touchscreen news; no inventory writes |
| `packages/vh_inventory.yaml` | `/config/packages/vh_inventory.yaml` | The solution package: input helpers, scripts, template sensors |
| `themes/vh_inventory.yaml` | `/config/themes/vh_inventory.yaml` | Optional dashboard theme |
| `translations/*.json` | (next to `mk_dash.py`) | Build-time inputs for the multi-language layer |
| `translation_catalog.py` | next to both dashboard builders | Loads the shared, main-dashboard and touchscreen translation sections |
| `mk_dash.py` | your workstation | Builds and publishes the Lovelace dashboard over WebSocket |
| `build_touchscreen.py` | your workstation | Generates the optional touchscreen configuration and synthetic offline preview; never deploys |
| `www/` | `/config/www/` (optional) | Touchscreen module, logo, icon attribution and local radio-favorite artwork |
| `configuration.example.yaml` | merge into `/config/configuration.yaml` | The only additions your root config needs (see below) |

Two optional folders hold the **Large screen barcode scanners** (ESPHome) — they are *not*
copied into `/config` and are only needed if you build the physical scanners:

| Path in this repo | What it is |
|---|---|
| `esphome/` | ESPHome device firmware for **Barcode-01** and **Barcode-02** (flash with ESPHome; needs your `secrets.yaml`) |
| `hardware/` | Hardware reference: ESP32 pinouts, GM67 manual, MSP2401 display, EPSON TM-T20III printer docs & tooling |

See the **[Large screen barcode scanners guide](docs/SCANNER.md)** for details.

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
| Touchscreen | Separate full-width dashboard generated locally by `build_touchscreen.py` | `/keuken-touchscreen/scan`, dedicated module under `www/` |
| News | Optional isolated RSS cache/publication worker, without stock or shopping changes | `pyscript/vh_touchscreen_news.py` |

## Multi-language

UI strings live in `translations/*.json` (`en.json`, `nl.json`). Every UI string must be
registered there — never hardcode display text. To add a language, drop a new
`translations/<code>.json`, add its name to `input_select.vh_language`, and rebuild the
dashboard. See the Installation Guide, section 10.

## License

Released under the [MIT License](LICENSE).

## Thank you

This project stands on the shoulders of two open-source solutions that inspired me to build
VH-Inventory:

- **[Blaine Venturine](https://github.com/blaineventurine)** — for
  [Simple Inventory](https://github.com/blaineventurine/simple_inventory).
- **[Matt Fryer](https://github.com/MattFryer)** — for
  [HA-Mealie-Barcode-Scanner](https://github.com/MattFryer/HA-Mealie-Barcode-Scanner).

Thank you both for sharing your work with the community.
