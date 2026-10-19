"""Build the separate touchscreen dashboard and a safe, self-contained local demo."""

import argparse
import base64
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

DEMO = r"""
const products = [
  {id: 1, barcode: 2000000000015, name: "Voorbeeld havermelk", description: "Ongezoet, houdbaar, 1 liter",
    manufacturer: "Demo merk", category_id: 1, store_id: 1,
    category: "Zuivel en alternatieven", store: "Demo winkel", unit: "pak"},
  {id: 2, barcode: 2000000000022, name: "Voorbeeld volkoren pasta", description: "Volkoren penne, 500 gram",
    manufacturer: "Demo merk", category_id: 2, store_id: 1,
    category: "Pasta en rijst", store: "Demo winkel", unit: "zak"},
  {id: 3, barcode: 2000000000039, name: "Voorbeeld koffie", manufacturer: "Demo merk",
    category_id: 2, store_id: 1, category: "Pasta en rijst", store: "Demo winkel", unit: "pak"}
];
const categories = [{id: 1, category: "Zuivel en alternatieven"}, {id: 2, category: "Pasta en rijst"}];
const stores = [{id: 1, store: "Demo winkel"}, {id: 2, store: "Andere demo winkel"}];
const locations = [{id: 1, location: "Voorraadkast"}, {id: 2, location: "Keuken"}];
let stock = [
  {id: 1, product_id: 1, quantity: 3, location_id: 1, location: "Voorraadkast"},
  {id: 2, product_id: 2, quantity: 2, location_id: 2, location: "Keuken"}
];
const shopping = [
  {id: 1, product_id: 1, product: "Voorbeeld havermelk", quantity: 2},
  {id: 2, product_id: 2, product: "Voorbeeld volkoren pasta", quantity: 1},
  {id: 3, product_id: null, product: "Voorbeeld afwasborstel", quantity: 1, is_ad_hoc: 1}
];
const queue = [];
const state = (entity_id, attribute, rows) => ({entity_id, state: String(rows.length), attributes: {[attribute]: rows}});
const states = () => [
  state("sensor.vh_inventory_products", "products", products),
  state("sensor.vh_inventory_stock", "stock", stock),
  state("sensor.vh_inventory_shopping", "shopping", shopping),
  state("sensor.vh_inventory_scan_queue", "scan_queue", queue),
  state("sensor.vh_inventory_categories", "categories", categories),
  state("sensor.vh_inventory_stores", "stores", stores),
  state("sensor.vh_inventory_locations", "locations", locations)
];
const mock = {
  connected: true,
  services: {pyscript: {vh_inventory_scan_enqueue: {}, vh_inventory_save_product_details: {},
    vh_inventory_adjust_shopping: {}, vh_inventory_delete: {}, vh_inventory_add_stock: {},
    vh_inventory_update_stock: {}, vh_inventory_update_stock_product: {},
    vh_inventory_adjust_stock: {}, vh_inventory_set_stock_field: {}, vh_inventory_set_product_field: {},
    vh_inventory_save_stock_details: {}},
    script: {vh_print_inventory: {}}},
  async callService(domain, service, data) {
    if (domain === "script" && service === "vh_print_inventory") {
      window.touchscreenDemo.printRequests += 1;
      return;
    }
    if (domain !== "pyscript") throw new Error("Unexpected demo domain");
    await new Promise((resolve) => setTimeout(resolve, 180));
    if (service === "vh_inventory_save_stock_details") {
      const row = stock.find((item) => item.id === data.id);
      const product = products.find((item) => item.id === data.product_id);
      if (!row || !product || row.product_id !== product.id) throw new Error("Demo product link changed");
      const productFields = ["name", "barcode", "manufacturer", "unit", "category_id", "store_id"];
      const current = {...product, location_id: row.location_id ?? null, quantity: row.quantity,
        manufacturer: product.manufacturer || "", unit: product.unit || ""};
      for (const [field, value] of Object.entries(data.expected)) {
        if (current[field] !== value) throw new Error("Demo details changed");
      }
      for (const [field, value] of Object.entries(data.changes)) {
        if (!productFields.includes(field) && !["location_id", "quantity"].includes(field)) {
          throw new Error("Unexpected demo edit field");
        }
      }
      for (const [field, value] of Object.entries(data.changes)) {
        (productFields.includes(field) ? product : row)[field] = value;
      }
      if ("store_id" in data.changes) product.store = stores.find((item) => item.id === product.store_id)?.store || "";
      if ("category_id" in data.changes) product.category = categories.find((item) => item.id === product.category_id)?.category || "";
      if ("location_id" in data.changes) row.location = locations.find((item) => item.id === row.location_id)?.location || "";
      stock = stock.filter((item) => item.quantity > 0);
      publishDemo();
      return;
    }
    if (service === "vh_inventory_set_product_field") {
      const product = products.find((item) => item.id === data.id);
      if (!product || data.field !== "store") throw new Error("Unexpected demo product field update");
      const store = stores.find((item) => item.store === data.value);
      if (data.value !== "(none)" && !store) throw new Error("Demo store not found");
      product.store_id = store?.id ?? null;
      product.store = store?.store || "";
      publishDemo();
      return;
    }
    if (["vh_inventory_add_stock", "vh_inventory_update_stock", "vh_inventory_update_stock_product",
      "vh_inventory_adjust_stock", "vh_inventory_set_stock_field"].includes(service) ||
      (service === "vh_inventory_delete" && data.table === "stock")) {
      const row = stock.find((item) => item.id === data.id);
      const product = products.find((item) => data.product != null
        ? item.name === data.product : item.id === row?.product_id);
      const location = locations.find((item) => item.location === data.location);
      if (service === "vh_inventory_add_stock") {
        if (!product) throw new Error("Demo product not found");
        const existing = stock.find((item) => item.product_id === product.id &&
          (item.location_id ?? null) === (location?.id ?? null));
        if (existing) existing.quantity += data.quantity;
        else stock.push({id: Math.max(0, ...stock.map((item) => item.id)) + 1,
          product_id: product.id, location_id: location?.id ?? null,
          location: location?.location || "", quantity: data.quantity});
      } else if (service === "vh_inventory_update_stock_product") {
        if (!product) throw new Error("Demo product not found");
        Object.assign(product, {barcode: data.barcode ? Number(data.barcode) : null,
          manufacturer: data.manufacturer, unit: data.unit,
          category_id: categories.find((item) => item.category === data.category)?.id ?? null,
          category: data.category === "(none)" ? "" : data.category});
      } else {
        if (!row) throw new Error("Demo stock row not found");
        if (service === "vh_inventory_delete") stock = stock.filter((item) => item !== row);
        if (service === "vh_inventory_adjust_stock") row.quantity = Math.max(0, row.quantity + data.delta);
        if (service === "vh_inventory_update_stock") {
          if (!product) throw new Error("Demo product not found");
          Object.assign(row, {product_id: product.id, location_id: location?.id ?? null,
            location: location?.location || "", quantity: data.quantity});
        }
        if (service === "vh_inventory_set_stock_field") {
          if (data.field === "category") {
            product.category_id = categories.find((item) => item.category === data.value)?.id ?? null;
            product.category = data.value === "(none)" ? "" : data.value;
          } else {
            const target = locations.find((item) => item.location === data.value);
            const existing = stock.find((item) => item !== row && item.product_id === row.product_id &&
              (item.location_id ?? null) === (target?.id ?? null));
            if (existing) {
              existing.quantity += row.quantity;
              stock = stock.filter((item) => item !== row);
            } else {
              row.location_id = target?.id ?? null;
              row.location = target?.location || "";
            }
          }
        }
      }
      stock = stock.filter((item) => item.quantity > 0);
      publishDemo();
      return;
    }
    if (service === "vh_inventory_adjust_shopping" || service === "vh_inventory_delete") {
      const index = shopping.findIndex((item) => item.id === data.id);
      if (index < 0) throw new Error("Demo shopping row not found");
      if (service === "vh_inventory_delete") {
        if (data.table !== "shopping_list") throw new Error("Unexpected demo delete table");
        shopping.splice(index, 1);
      } else {
        shopping[index].quantity += data.delta;
        if (shopping[index].quantity <= 0) shopping.splice(index, 1);
      }
      publishDemo();
      return;
    }
    if (service === "vh_inventory_save_product_details") {
      const product = products.find((item) => item.id === data.id);
      if (!product) throw new Error("Demo product not found");
      for (const [field, value] of Object.entries(data.changes)) {
        if (field === "location_id") {
          const rows = stock.filter((item) => item.product_id === product.id);
          if (!rows.length) throw new Error("Demo product has no stock");
          rows[0].quantity = rows.reduce((total, item) => total + item.quantity, 0);
          rows[0].location_id = value;
          rows[0].location = locations.find((item) => item.id === value)?.location || "";
          stock = stock.filter((item) => item.product_id !== product.id || item === rows[0]);
        } else {
          product[field] = value;
          if (field === "category_id") product.category = categories.find((item) => item.id === value)?.category || "";
          if (field === "store_id") product.store = stores.find((item) => item.id === value)?.store || "";
        }
      }
      publishDemo();
      return;
    }
    if (service !== "vh_inventory_scan_enqueue") throw new Error("Unexpected demo service");
    const product = products.find((item) => String(item.barcode) === data.barcode.replace(/^0+(?=\d)/, ""));
    if (!product) {
      queue.push({barcode: data.barcode, state: "Unknown"});
      return;
    }
    let row = stock.find((item) => item.product_id === product.id);
    if (data.action === "Add") {
      if (!row) { row = {id: Math.max(0, ...stock.map((item) => item.id)) + 1,
        product_id: product.id, quantity: 0, location_id: 1, location: "Voorraadkast"}; stock.push(row); }
      row.quantity += 1;
      const index = shopping.findIndex((item) => item.product_id === product.id);
      if (index >= 0) shopping.splice(index, 1);
    } else {
      if (row) row.quantity = Math.max(0, row.quantity - 1);
      if (!row || row.quantity === 0) {
        stock = stock.filter((item) => item.quantity > 0);
        if (!shopping.some((item) => item.product_id === product.id)) shopping.push({
          id: Math.max(0, ...shopping.map((item) => item.id)) + 1,
          product_id: product.id, product: product.name, quantity: 1});
      }
    }
    publishDemo();
  },
  async callWS(message) {
    if (message.type !== "get_states") throw new Error("Unexpected demo command");
    return structuredClone(states());
  }
};
const dashboard = document.createElement("vh-inventory-touchscreen-dashboard");
dashboard.setConfig(CARD_CONFIG);
const card = dashboard._cards.scan;
const shoppingCard = dashboard._cards.shopping;
const inventoryCard = dashboard._cards.inventory;
const publishDemo = () => {
  mock.states = Object.fromEntries(structuredClone(states()).map((item) => [item.entity_id, item]));
  dashboard.hass = mock;
};
publishDemo();
document.querySelector("#app").append(dashboard);
const scanDemo = (barcode) => {
  const input = card.shadowRoot.querySelector("#barcode");
  input.value = barcode;
  card.shadowRoot.querySelector("#scan-form").requestSubmit();
};
document.querySelector("#demo-one").onclick = () => scanDemo("2000000000015");
document.querySelector("#demo-two").onclick = () => scanDemo("2000000000022");
document.querySelector("#demo-unknown").onclick = () => scanDemo("9999999999999");
window.touchscreenDemo = {dashboard, card, shoppingCard, inventoryCard, mock, states, scanDemo, publishDemo, printRequests: 0};
"""


def build(output):
    translations = {}
    for language in ("en", "nl"):
        translations[language] = json.loads(
            (ROOT / "translations" / f"{language}.json").read_text(encoding="utf-8")
        )
    config = {
        "type": "custom:vh-inventory-touchscreen-dashboard",
        "language": "nl",
        "theme": "dark",
        "logo": "/local/van-hemert-logo-hi.png",
        "translations": translations,
    }
    dashboard = {
        "title": "Keuken Touchscreen",
        "views": [{
            "title": "Scannen",
            "path": "scan",
            "icon": "mdi:barcode-scan",
            "panel": True,
            "cards": [config],
        }],
    }
    source = (ROOT / "www" / "vh-inventory-touchscreen.js").read_text(encoding="utf-8")
    theme = re.search(r"const VH_TOUCHSCREEN_THEME = `(.+?)`;", source, re.S)
    if not theme:
        raise ValueError("Touchscreen theme not found.")
    # Escape script delimiters in translation data, even though the inputs are local.
    logo = base64.b64encode((ROOT / "www" / "van-hemert-logo-hi.png").read_bytes()).decode("ascii")
    preview_config = {**config, "logo": f"data:image/png;base64,{logo}"}
    config_json = json.dumps(preview_config, ensure_ascii=True).replace("<", r"\u003c")
    preview = """<!doctype html>
<html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Keuken Touchscreen | Lokale demo</title>
<link rel="icon" href="data:,">
<script>
  (() => {
    const param = new URLSearchParams(window.location.search).get("scoutTheme");
    const theme =
      param || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  })();
</script>
<style>THEME_CSS
body { margin: 0; height: 100dvh; display: flex; flex-direction: column;
  background: var(--cp-bg); color: var(--cp-text);
  font-family: "Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif; }
.demo { display: flex; flex-shrink: 0; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 32px;
  background: var(--cp-bg-elevated); border-bottom: 1px solid var(--cp-border); font-size: 14px; }
.demo strong { color: var(--cp-accent); }
#app { flex: 1; min-height: 0; }
#app > vh-inventory-touchscreen-dashboard { height: 100%; }
.demo button { cursor: pointer; border: 1px solid var(--cp-border-strong); border-radius: 10px;
  padding: 8px 12px; font: inherit; color: var(--cp-text); background: var(--cp-surface); }
</style></head><body>
<div class="demo"><strong>LOKALE DEMO</strong><span>Alleen voorbeelddata. Geen verbinding met Home Assistant.</span>
<button id="demo-one">Scan havermelk</button><button id="demo-two">Scan pasta</button>
<button id="demo-unknown">Onbekende barcode</button>
<span>Of scan/type 2000000000015 of 2000000000022 + Enter.</span></div>
<div id="app"></div><script>CARD_SOURCE</script>
<script>const CARD_CONFIG = CONFIG_JSON;
CARD_CONFIG.theme = document.documentElement.getAttribute("data-theme");
DEMO_SOURCE</script></body></html>
"""
    preview = preview.replace("THEME_CSS", theme.group(1)).replace("CARD_SOURCE", source)
    preview = preview.replace("CONFIG_JSON", config_json).replace("DEMO_SOURCE", DEMO)
    output.mkdir(parents=True, exist_ok=True)
    (output / "preview.html").write_text(preview, encoding="utf-8")
    (output / "dashboard.json").write_text(
        json.dumps(dashboard, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Preview: {output / 'preview.html'}")
    print(f"Dashboard: {output / 'dashboard.json'}")
    print("Local files only. No Home Assistant connection or deployment.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / ".copilot" / "touchscreen")
    build(parser.parse_args().output)
