"""Build the separate touchscreen dashboard and a safe, self-contained local demo."""

import argparse
import ast
import base64
import json
import re
from pathlib import Path
from translation_catalog import load_translations

ROOT = Path(__file__).resolve().parent


def configuration_schema():
    """Read literal Setup definitions without executing the networked main builder."""
    tree = ast.parse((ROOT / "mk_dash.py").read_text(encoding="utf-8-sig"))
    assignments = {target.id: node.value for node in tree.body if isinstance(node, ast.Assign)
                   for target in node.targets if isinstance(target, ast.Name)}

    def item(node, key):
        return next(value for name, value in zip(node.keys, node.values)
                    if isinstance(name, ast.Constant) and name.value == key)

    def fields(name):
        return ast.literal_eval(item(assignments[name], "entities"))

    groups = [
        ("application", "Application settings", ["lang_card"], []),
        ("tts", "TTS announcements", ["_tts_setting_rows"], ["_tts_msg_hint"]),
        ("notifications", "Mobile notifications", ["_notify_setting_rows"], ["_tts_msg_hint"]),
        ("handheld", "Handheld scanner", ["_handheld_setting_rows"], []),
        ("ai", "Smart (AI) matching", ["_ai_match_setting_rows", "_ai_match_health_rows"],
         ["_ai_match_hint", "_ai_match_health_hint"]),
        ("similarity", "Similarity checking", ["_similarity_setting_rows"], ["_similarity_msg_hint"]),
        ("alternatives", "Alternative in stock", ["_alt_stock_setting_rows"], ["_alt_stock_msg_hint"]),
    ]
    sections = [{"id": key, "title": title, "fields": [field for name in names for field in fields(name)],
                 "hints": [ast.literal_eval(item(assignments[name], "content")).strip("*") for name in hints]}
                for key, title, names, hints in groups]
    sections[0]["fields"].append({
        "entity": "input_boolean.vh_touchscreen_fullscreen",
        "name": "Full screen (Keuken Touchscreen)",
        "icon": "mdi:fullscreen",
    })
    has_scanner = ast.literal_eval(assignments["SCANNER01_HAS"])
    lacks_barcode = ast.literal_eval(assignments["BARCODE_LACKS"])
    scanner_sections = [{"title": "Device", "rows": [
        {"name": "State", "entities": [None, None, "sensor.scanner_01_state"]}]}]
    for title, rows in ast.literal_eval(assignments["SCANNER_SETTINGS"]):
        result = []
        for row in rows:
            name, domain, suffix = row[:3]
            overrides = row[3] if len(row) > 3 else {}
            result.append({"name": name, "entities": [
                overrides.get("e1", f"{domain}.barcode_01_{suffix}") if suffix not in lacks_barcode else None,
                overrides.get("e2", f"{domain}.barcode_02_{suffix}") if suffix not in lacks_barcode else None,
                overrides.get("es1", f"{domain}.scanner_01_{suffix}")
                if suffix in has_scanner or "es1" in overrides else None,
            ]})
        scanner_sections.append({"title": title, "rows": result})
    return {"version": 1, "sections": sections, "scanners": {
        "devices": ["Barcode-01", "Barcode-02", "Scanner-01"], "sections": scanner_sections}}


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
for (const product of products) Object.assign(product, {
  almost_out: 0, auto_add_enabled: 1, auto_add_threshold: 2, auto_add_quantity: 1,
});
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
const newsNow = Date.now();
const newsHeadlines = [
  ["NOS", "Voorbeeld: Kamer bespreekt plannen voor beter openbaar vervoer"],
  ["NU.nl", "Voorbeeld: Meer Nederlanders kiezen de fiets voor korte ritten"],
  ["Omroep Brabant", "Voorbeeld: Buurtbewoners openen samen een nieuwe moestuin"],
  ["NOS", "Voorbeeld: Musea organiseren een weekend vol activiteiten"],
  ["NU.nl", "Voorbeeld: Tips om thuis minder energie te gebruiken"],
  ["Omroep Brabant", "Voorbeeld: Vrijwilligers knappen wandelroutes in de regio op"],
].map(([source, title], index) => ({ source, title,
  summary: "Dit is een fictief RSS-voorbeeld om het lezen binnen de nieuwskaart te testen. "
    + "Terug naar de koppen sluit dit voorbeeld. Er wordt geen artikel van een nieuwswebsite geladen.",
  url: null,
  published_at: new Date(newsNow - (index + 1) * 5 * 60000).toISOString() }));
const configurationEntities = new Map([
  ...CARD_CONFIG.configuration.sections.flatMap((section) => section.fields.map((field) => [field.entity, null])),
  ...CARD_CONFIG.configuration.scanners.sections.flatMap((section) => section.rows.flatMap((row) =>
    row.entities.filter(Boolean).map((entity) => [entity, null]))),
  ["input_text.vh_tts_media_players", null], ["input_text.vh_notify_devices", null],
]);
for (const entity of configurationEntities.keys()) {
  const domain = entity.split(".")[0];
  const numeric = ["number", "input_number"].includes(domain);
  const text = ["text", "input_text"].includes(domain);
  const select = ["select", "input_select"].includes(domain);
  configurationEntities.set(entity, {entity_id: entity,
    state: ["input_boolean", "switch", "light"].includes(domain) ? "off" :
      entity === "input_select.vh_language" ? "Nederlands" :
      numeric ? "1" : select ? "Demo A" : text ? "" : "0",
    attributes: numeric ? {min: 0, max: 100, step: 1} : text ? {min: 0, max: 255, mode: "text"} :
      select ? {options: entity === "input_select.vh_language" ? ["English", "Nederlands"] : ["Demo A", "Demo B"]} : {}});
}
const kitchenEntities = new Map([
  ...["ledstripWarm", "ledstripCold", "ledstripOff", "ledstripPower", "worktopAutoOff"].map((key) =>
    [CARD_CONFIG.kitchen[key], {entity_id: CARD_CONFIG.kitchen[key], state: key === "worktopAutoOff" ? "off" : "on",
      attributes: {}}]),
  ...["worktop", "ceiling"].map((key) => [CARD_CONFIG.kitchen[key], {
    entity_id: CARD_CONFIG.kitchen[key], state: "on", attributes: {
      brightness: 128, color_temp_kelvin: 3000, min_color_temp_kelvin: 2202, max_color_temp_kelvin: 6535,
      supported_color_modes: ["color_temp"], supported_features: 40,
    }}]),
  [CARD_CONFIG.kitchen.speaker, {entity_id: CARD_CONFIG.kitchen.speaker, state: "paused", attributes: {
    supported_features: 8321599, volume_level: 0.14, is_volume_muted: false,
    media_title: "Demo track", media_artist: "Demo artist", source: "Demo radio",
    source_list: ["Demo radio", "Other demo radio"], group_members: [CARD_CONFIG.kitchen.speaker],
  }}],
]);
const state = (entity_id, attribute, rows) => ({entity_id, state: String(rows.length), attributes: {[attribute]: rows}});
const states = () => [
  state("sensor.vh_inventory_products", "products", products),
  state("sensor.vh_inventory_stock", "stock", stock),
  state("sensor.vh_inventory_shopping", "shopping", shopping),
  state("sensor.vh_inventory_scan_queue", "scan_queue", queue),
  state("sensor.vh_inventory_categories", "categories", categories),
  state("sensor.vh_inventory_stores", "stores", stores),
  state("sensor.vh_inventory_locations", "locations", locations),
  {entity_id: "sensor.vh_touchscreen_news", state: "ready", attributes: {
    headlines: newsHeadlines, updated_at: new Date(newsNow).toISOString(), sample: true}},
  ...configurationEntities.values(), ...kitchenEntities.values()
];
const demoAlternatives = new Map();
const mock = {
  connected: true,
  services: {pyscript: {vh_inventory_scan_enqueue: {}, vh_inventory_touchscreen_scan: {},
    vh_inventory_touchscreen_shopping_decision: {},
    vh_inventory_touchscreen_create_product: {}, vh_inventory_touchscreen_lookup: {}, vh_inventory_save_product_details: {},
    vh_inventory_adjust_shopping: {}, vh_inventory_delete: {fields: {require_unused: {}, expected_value: {}}}, vh_inventory_add_stock: {},
    vh_inventory_update_stock: {}, vh_inventory_update_stock_product: {},
    vh_inventory_adjust_stock: {}, vh_inventory_set_stock_field: {}, vh_inventory_set_product_field: {},
    vh_inventory_save_stock_details: {}, vh_inventory_shopping_toggle: {},
    vh_inventory_stock_add_by_product: {}, vh_inventory_add_product: {}, vh_inventory_update_product: {},
    vh_inventory_add_location: {}, vh_inventory_add_category: {}, vh_inventory_add_store: {},
    vh_inventory_update_simple: {}, vh_inventory_tts_toggle_player: {}, vh_inventory_notify_toggle_device: {}},
    script: {vh_print_inventory: {}, vh_print_shopping: {}},
    mealie: {get_recipes: {}, get_recipe: {}},
    input_boolean: {turn_on: {}, turn_off: {}}, switch: {turn_on: {}, turn_off: {}},
    light: {turn_on: {}, turn_off: {}},
    automation: {trigger: {fields: {skip_condition: {}}}, turn_on: {}, turn_off: {}},
    media_player: {media_play: {}, media_pause: {}, media_previous_track: {}, media_next_track: {},
      volume_set: {}, volume_mute: {}, select_source: {}},
    input_text: {set_value: {}}, text: {set_value: {}},
    input_number: {set_value: {}}, number: {set_value: {}},
    input_select: {select_option: {}}, select: {select_option: {}},
    notify: {mobile_app_demo_device: {name: "Demo device"}}},
  async callService(domain, service, data) {
    if (kitchenEntities.has(data.entity_id)) {
      const row = kitchenEntities.get(data.entity_id);
      if (data.entity_id.split(".")[0] !== domain || !mock.services[domain]?.[service]) {
        throw new Error("Unexpected demo kitchen service");
      }
      if (service === "trigger") {
        if (domain !== "automation" || data.skip_condition !== true) throw new Error("Unexpected demo preset request");
        row.attributes.last_triggered = new Date().toISOString();
      } else if (domain === "switch" || domain === "automation") {
        row.state = service === "turn_off" ? "off" : "on";
      } else if (domain === "light") {
        row.state = service === "turn_off" ? "off" : "on";
        if (data.brightness_pct != null) row.attributes.brightness = Math.round(data.brightness_pct / 100 * 255);
        if (data.color_temp_kelvin != null) row.attributes.color_temp_kelvin = data.color_temp_kelvin;
      } else if (service === "media_play" || service === "media_pause") row.state = service === "media_play" ? "playing" : "paused";
      else if (service === "volume_set") row.attributes.volume_level = data.volume_level;
      else if (service === "volume_mute") row.attributes.is_volume_muted = data.is_volume_muted;
      else if (service === "select_source") row.attributes.source = data.source;
      else row.attributes.media_title = service === "media_next_track" ? "Next demo track" : "Previous demo track";
      publishDemo(); return;
    }
    if (configurationEntities.has(data.entity_id)) {
      const row = configurationEntities.get(data.entity_id);
      if (data.entity_id.split(".")[0] !== domain || !mock.services[domain]?.[service]) {
        throw new Error("Unexpected demo setting service");
      }
      row.state = service === "turn_on" ? "on" : service === "turn_off" ? "off" :
        String(service === "select_option" ? data.option : data.value);
      if (/_print_(inventory|shopping)_list$/.test(data.entity_id) && service === "turn_on") {
        window.touchscreenDemo.printRequests += 1;
      }
      publishDemo(); return;
    }
    if (domain === "pyscript" && ["vh_inventory_tts_toggle_player", "vh_inventory_notify_toggle_device"].includes(service)) {
      const speakers = service === "vh_inventory_tts_toggle_player";
      const row = configurationEntities.get(speakers ? "input_text.vh_tts_media_players" : "input_text.vh_notify_devices");
      const value = speakers ? data.player : data.device;
      const tokens = row.state.split(",").filter(Boolean);
      row.state = (tokens.includes(value) ? tokens.filter((token) => token !== value) : [...tokens, value]).join(",");
      publishDemo(); return;
    }
    if (domain === "script" && ["vh_print_inventory", "vh_print_shopping"].includes(service)) {
      window.touchscreenDemo.printRequests += 1;
      return;
    }
    if (domain !== "pyscript") throw new Error("Unexpected demo domain");
    await new Promise((resolve) => setTimeout(resolve, 180));
    const references = {locations: [locations, "location"], categories: [categories, "category"], stores: [stores, "store"]};
    const addReference = {vh_inventory_add_location: "locations", vh_inventory_add_category: "categories",
      vh_inventory_add_store: "stores"}[service];
    if (addReference) {
      const [rows, field] = references[addReference];
      rows.push({id: Math.max(0, ...rows.map((row) => row.id)) + 1, [field]: data[field]});
      publishDemo(); return;
    }
    if (service === "vh_inventory_update_simple") {
      const [rows, field] = references[data.table] || [];
      const row = rows?.find((item) => item.id === data.id);
      if (!row) throw new Error("Demo reference not found");
      row[field] = data.value;
      for (const product of products) {
        if (product[`${field}_id`] === row.id) product[field] = row[field];
      }
      for (const item of stock) {
        if (field === "location" && item.location_id === row.id) item.location = row[field];
      }
      publishDemo(); return;
    }
    if (["vh_inventory_add_product", "vh_inventory_update_product"].includes(service)) {
      let row = products.find((item) => item.id === data.id);
      if (service === "vh_inventory_add_product") {
        if (products.some((item) => item.name.toLowerCase() === data.name.toLowerCase())) throw new Error("Demo duplicate name");
        row = {id: Math.max(0, ...products.map((item) => item.id)) + 1};
        products.push(row);
      }
      if (!row) throw new Error("Demo product not found");
      for (const field of ["name", "barcode", "manufacturer", "description", "unit",
        "auto_add_enabled", "auto_add_threshold", "auto_add_quantity"]) row[field] = data[field];
      row.category_id = categories.find((item) => item.category === data.category)?.id ?? null;
      row.store_id = stores.find((item) => item.store === data.store)?.id ?? null;
      row.category = data.category === "(none)" ? "" : data.category;
      row.store = data.store === "(none)" ? "" : data.store;
      publishDemo(); return;
    }
    if (service === "vh_inventory_delete" && (data.table === "products" || references[data.table])) {
      if (data.table === "products") {
        const index = products.findIndex((row) => row.id === data.id);
        if (index < 0) throw new Error("Demo product not found");
        products.splice(index, 1);
        stock = stock.filter((row) => row.product_id !== data.id);
        for (let index = shopping.length - 1; index >= 0; index -= 1) {
          if (shopping[index].product_id === data.id) shopping.splice(index, 1);
        }
      } else {
        const [rows, field] = references[data.table];
        const index = rows.findIndex((row) => row.id === data.id);
        if (index < 0 || data.require_unused !== true || rows[index][field] !== data.expected_value ||
            (field === "location" ? stock : products).some((row) => row[`${field}_id`] === data.id)) {
          throw new Error("Demo reference changed or in use");
        }
        rows.splice(index, 1);
      }
      publishDemo(); return;
    }
    if (service === "vh_inventory_stock_add_by_product") {
      const product = products.find((item) => item.id === data.product_id);
      if (!product) throw new Error("Demo product not found");
      const existing = stock.filter((item) => item.product_id === product.id).sort((a, b) => a.id - b.id)[0];
      if (existing) existing.quantity += 1;
      else stock.push({id: Math.max(0, ...stock.map((item) => item.id)) + 1,
        product_id: product.id, quantity: 1, location_id: null, location: ""});
      publishDemo();
      return;
    }
    if (service === "vh_inventory_shopping_toggle") {
      const product = products.find((item) => item.id === data.product_id);
      if (!product) throw new Error("Demo product not found");
      if (shopping.some((item) => item.product_id === product.id)) {
        for (let index = shopping.length - 1; index >= 0; index -= 1) {
          if (shopping[index].product_id === product.id) shopping.splice(index, 1);
        }
      } else {
        shopping.push({id: Math.max(0, ...shopping.map((item) => item.id)) + 1,
          product_id: product.id, product: product.name, quantity: 1});
      }
      publishDemo();
      return;
    }
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
      if (!product) throw new Error("Demo product not found");
      if (["store", "category"].includes(data.field)) {
        const rows = data.field === "store" ? stores : categories;
        const reference = rows.find((item) => item[data.field] === data.value);
        if (data.value !== "(none)" && !reference) throw new Error("Demo reference not found");
        product[`${data.field}_id`] = reference?.id ?? null;
        product[data.field] = reference?.[data.field] || "";
      } else if (["auto_add_threshold", "auto_add_quantity"].includes(data.field)) {
        product[data.field] = Number(data.value);
      } else throw new Error("Unexpected demo product field update");
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
      queue.push({id: Math.max(0, ...queue.map((item) => item.id)) + 1,
        barcode: data.barcode, action: data.action, state: "Unknown"});
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
    if (message.type === "call_service") {
      if (message.domain === "pyscript" && message.service === "vh_inventory_touchscreen_lookup" &&
          message.return_response === true) {
        const barcode = message.service_data.barcode;
        if (barcode === "9999999999998") throw new Error("Synthetic online lookup failure");
        return {response: {product_id: null, online_incomplete: barcode === "9999999999997", truncated: false,
          suggestion: barcode === "9999999999999" ? {
            name: "Voorbeeld online product", description: "Niet opgeslagen voorbeeld", manufacturer: "Demo fabrikant", unit: "pak",
          } : null}};
      }
      if (message.domain === "pyscript" && message.service === "vh_inventory_touchscreen_create_product" &&
          message.return_response === true) {
        const {barcode, mode, details, scan_id} = message.service_data;
        const pending = queue.find((row) => row.id === scan_id && Number(row.barcode) === Number(barcode) &&
          row.action === "Add" && row.state === "Unknown");
        if (!["Lookup", "Add"].includes(mode) || !details.name.trim() ||
            products.some((row) => Number(row.barcode) === Number(barcode) ||
              row.name.toLocaleLowerCase() === details.name.toLocaleLowerCase()) ||
            mode === "Add" && scan_id !== null && !pending || mode === "Lookup" && (scan_id !== null || details.location_id !== null)) {
          throw new Error("Invalid demo registration");
        }
        const id = Math.max(0, ...products.map((row) => row.id)) + 1;
        const {location_id, ...metadata} = details;
        products.push({...metadata, id, barcode: Number(barcode), almost_out: 0,
          category: categories.find((row) => row.id === details.category_id)?.category || "",
          store: stores.find((row) => row.id === details.store_id)?.store || ""});
        if (mode === "Add") {
          stock.push({id: Math.max(0, ...stock.map((row) => row.id)) + 1, product_id: id, quantity: 1,
            location_id, location: locations.find((row) => row.id === location_id)?.location || ""});
          if (pending) queue.splice(queue.indexOf(pending), 1);
        }
        publishDemo();
        return {response: {product_id: id, quantity: mode === "Add" ? 1 : 0}};
      }
      if (message.domain === "mealie" && message.return_response === true &&
          message.service_data.config_entry_id === "demo-mealie") {
        const recipes = [
          {recipe_id: "00000000-0000-4000-8000-000000000001", slug: "demo-pasta", name: "Voorbeeld groentepasta", image: "demo",
            description: "Een eenvoudig voorbeeldrecept voor de lokale demo.", recipe_servings: 2, total_time: "25 min",
            ingredients: [{display: "200 g pasta"}, {display: "300 g groente"}, {display: "1 el olijfolie"}],
            instructions: [{text: "Kook de pasta volgens de verpakking."},
              {text: "Bak de groente in de olijfolie. Meng met de pasta."}],
            notes: [{title: "Tip", text: "Gebruik groente naar keuze."}]},
          {recipe_id: "demo-soep", slug: "demo-soep", name: "Voorbeeld tomatensoep",
            description: "Alleen voorbeelddata, niet verbonden met Mealie.", recipe_servings: 2,
            ingredients: [{display: "400 g tomaten"}, {display: "250 ml groentebouillon"}],
            instructions: [{text: "Kook de tomaten in de bouillon en pureer de soep."}], notes: []},
        ];
        if (message.service === "get_recipes" && message.service_data.result_limit === -1) {
          return {response: {recipes: {items: recipes}}};
        }
        if (message.service === "get_recipe") {
          const recipe = recipes.find((item) => item.recipe_id === message.service_data.recipe_id);
          if (!recipe) throw new Error("Demo recipe not found");
          return {response: {recipe}};
        }
        throw new Error("Unexpected demo Mealie action");
      }
      if (message.domain === "pyscript" && message.service === "vh_inventory_touchscreen_shopping_decision" &&
          message.return_response === true) {
        const data = message.service_data;
        const product = products.find(item => item.id === data.product_id);
        if (!product || typeof data.add_to_shopping !== "boolean") throw new Error("Invalid demo shopping choice");
        const rows = stock.filter(row => row.product_id === product.id).sort((a, b) => a.id - b.id);
        const snapshot = rows.map(({id, quantity, location_id}) => ({id, quantity, location_id: location_id ?? null}));
        if (JSON.stringify(data.expected_stock) !== JSON.stringify(snapshot) ||
            data.expected_almost_out !== product.almost_out) throw new Error("Demo stock changed");
        const listed = shopping.some(row => row.product_id === product.id);
        if (data.add_to_shopping && !listed) shopping.push({
          id: Math.max(0, ...shopping.map(row => row.id)) + 1, product_id: product.id,
          product: product.name, quantity: product.auto_add_quantity || 1,
        });
        publishDemo();
        return {response: {outcome: data.add_to_shopping ? "shopping_added" : "shopping_kept",
          product_id: product.id, quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
          almost_out: product.almost_out, stock: snapshot,
          on_shopping: listed || data.add_to_shopping, shopping_added: data.add_to_shopping && !listed}};
      }
      if (message.domain !== "pyscript" || message.service !== "vh_inventory_touchscreen_scan" ||
          message.return_response !== true) throw new Error("Unexpected demo response service");
      const data = message.service_data;
      const product = products.find((item) => data.product_id != null ? item.id === data.product_id :
        String(item.barcode) === data.barcode.replace(/^0+(?=\d)/, ""));
      if (!product) {
        if (data.action === "AlmostOut") throw new Error("Register product first");
        await this.callService("pyscript", "vh_inventory_scan_enqueue", data);
        publishDemo();
        return {response: {outcome: "notfound", product_id: null}};
      }
      if (!["Add", "Use", "AlmostOut"].includes(data.action)) throw new Error("Invalid demo action");
      const rows = stock.filter((row) => row.product_id === product.id).sort((a, b) => a.id - b.id);
      const snapshot = () => stock.filter((row) => row.product_id === product.id).sort((a, b) => a.id - b.id)
        .map(({id, quantity, location_id}) => ({id, quantity, location_id: location_id ?? null}));
      if (data.expected_stock && JSON.stringify(data.expected_stock) !== JSON.stringify(snapshot()) ||
          data.expected_almost_out != null && data.expected_almost_out !== product.almost_out) {
        throw new Error("Demo stock changed");
      }
      const before = rows.reduce((sum, row) => sum + row.quantity, 0);
      const listed = shopping.some((row) => row.product_id === product.id);
      let outcome;
      let empty = false;
      if (data.action === "AlmostOut" && product.almost_out) outcome = "already_almost_out";
      else if (data.action === "Use" && product.almost_out) {
        product.almost_out = 0;
        outcome = "already_counted";
      } else {
        const candidates = data.action === "Add" ? rows : rows.filter((row) => row.quantity > 0);
        const selected = data.stock_id != null ? candidates.find((row) => row.id === data.stock_id) :
          candidates.find((row) => row.location_id == null) || (candidates.length === 1 ? candidates[0] : null);
        if (data.action === "Add") {
          if (selected) selected.quantity += 1;
          else stock.push({id: Math.max(0, ...stock.map((row) => row.id)) + 1,
            product_id: product.id, location_id: null, quantity: 1});
          outcome = "add";
        } else {
          if (!selected && before > 0) throw new Error("Select a demo stock location");
          if (selected) selected.quantity -= 1;
          else empty = true;
          outcome = data.action === "AlmostOut" ? "almost_out" : empty ? "shopping" : "use";
          if (data.action === "AlmostOut") product.almost_out = 1;
        }
      }
      const total = stock.filter((row) => row.product_id === product.id).reduce((sum, row) => sum + row.quantity, 0);
      const eligible = !listed && (empty || total < before && product.auto_add_enabled &&
        product.auto_add_threshold > 0 && total < product.auto_add_threshold);
      const alternatives = data.confirm_alternatives && eligible ? (demoAlternatives.get(product.id) || [])
        .map(id => ({product_id: id, product: products.find(item => item.id === id).name,
          quantity: stock.filter(row => row.product_id === id).reduce((sum, row) => sum + row.quantity, 0)}))
        .filter(row => row.quantity > 0) : [];
      if (total > before) {
        for (let index = shopping.length - 1; index >= 0; index -= 1) {
          if (shopping[index].product_id === product.id) shopping.splice(index, 1);
        }
      } else if (eligible && !alternatives.length) {
        shopping.push({id: Math.max(0, ...shopping.map((row) => row.id)) + 1,
          product_id: product.id, product: product.name, quantity: product.auto_add_quantity || 1});
      }
      if (!total) stock = stock.filter((row) => row.product_id !== product.id);
      const on_shopping = shopping.some((row) => row.product_id === product.id);
      publishDemo();
      return {response: {outcome, product_id: product.id, quantity: total,
        ...(data.confirm_alternatives ? {alternatives} : {}),
        almost_out: product.almost_out, stock: snapshot(), on_shopping,
        shopping_added: on_shopping && !listed, audio_requested: true}};
    }
    if (message.type === "config/entity_registry/list") return [
      {platform: "sonos", entity_id: "media_player.demo_speaker"}];
    if (message.type !== "get_states") throw new Error("Unexpected demo command");
    return structuredClone(states());
  }
};
const dashboard = document.createElement("vh-inventory-touchscreen-dashboard");
dashboard.setConfig(CARD_CONFIG);
const card = dashboard._cards.scan;
const shoppingCard = dashboard._cards.shopping;
const inventoryCard = dashboard._cards.inventory;
const quickShoppingCard = dashboard._cards["quick-shopping"];
const quickStockCard = dashboard._cards["quick-stock"];
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
const milkScenario = () => {
  if (card._busy || card._saving || card._dirty() || card._hasPendingShoppingChoice()) return false;
  card._closeResult();
  for (const [id, barcode, name, quantity] of [
    [501, 1234567890, "Halvolle melk", 1],
    [502, 987654321, "Halfvolle melk Houdbaar", 2],
    [503, 9576385644, "Magere melk", 2],
  ]) {
    const product = {id, barcode, name, manufacturer: "Demo", description: "", unit: "pak",
      category_id: null, store_id: null, almost_out: 0,
      auto_add_enabled: 1, auto_add_threshold: 1, auto_add_quantity: 1};
    const index = products.findIndex(row => row.id === id);
    if (index < 0) products.push(product); else products[index] = product;
    stock = stock.filter(row => row.product_id !== id);
    stock.push({id, product_id: id, quantity, location_id: null});
    for (let i = shopping.length - 1; i >= 0; i--) if (shopping[i].product_id === id) shopping.splice(i, 1);
  }
  // Fixed synthetic semantic result; the offline preview never calls an AI agent.
  demoAlternatives.set(501, [502]);
  card._mode = "Use";
  dashboard._switchPage("scan");
  publishDemo();
  return true;
};
document.querySelector("#demo-milk").onclick = () => {
  if (milkScenario()) scanDemo("1234567890");
};
window.touchscreenDemo = {dashboard, card, shoppingCard, inventoryCard, quickShoppingCard, quickStockCard,
  milkScenario,
  configurationCard: dashboard._cards.configuration,
  managementCards: Object.fromEntries(["products", "locations", "categories", "stores"].map((page) => [page, dashboard._cards[page]])),
  mock, states, scanDemo, publishDemo, printRequests: 0};
"""


def build(output):
    translations, language_names, _ = load_translations("touchscreen")
    config = {
        "type": "custom:vh-inventory-touchscreen-dashboard",
        "language": "nl",
        "theme": "dark",
        "news": {"enabled": True},
        "logo": "/local/van-hemert-logo-hi.png",
        "translations": translations,
        "language_names": language_names,
        "configuration": configuration_schema(),
        "recipes": {"config_entry_id": "", "image_origin": ""},
        "kitchen": {
            "worktop": "light.z_keuken_werkblad",
            "ceiling": "light.z_keuken_plafond",
            "speaker": "media_player.keuken",
            "ledstripWarm": "automation.keuken_werkblad_ledstrip_warm",
            "ledstripCold": "automation.keuken_werkblad_ledstrip_koud",
            "ledstripOff": "automation.werkblad_ledstrip_uit",
            "ledstripPower": "switch.tf04_switch",
            "worktopAutoOff": "automation.keuken_werkblad_auto_off_if_forgotten",
        },
    }
    dashboard = {
        "title": "Keuken Touchscreen",
        "kiosk_mode": {
            "hide_header": "{{ is_state('input_boolean.vh_touchscreen_fullscreen', 'on') }}",
            "hide_sidebar": "{{ is_state('input_boolean.vh_touchscreen_fullscreen', 'on') }}",
        },
        "views": [{
            "title": "Scannen",
            "path": "scan",
            "icon": "mdi:barcode-scan",
            "panel": True,
            "cards": [config],
        }],
    }
    source = (ROOT / "www" / "vh-inventory-touchscreen.js").read_text(encoding="utf-8")
    preview_source = source
    for artwork in sorted((ROOT / "www" / "vh-radio-favorites").glob("*")):
        mime = {".png": "image/png", ".jpg": "image/jpeg"}[artwork.suffix]
        encoded = base64.b64encode(artwork.read_bytes()).decode("ascii")
        preview_source = preview_source.replace(
            f"/local/vh-radio-favorites/{artwork.name}", f"data:{mime};base64,{encoded}"
        )
    theme = re.search(r"const VH_TOUCHSCREEN_THEME = `(.+?)`;", source, re.S)
    if not theme:
        raise ValueError("Touchscreen theme not found.")
    # Escape script delimiters in translation data, even though the inputs are local.
    logo = base64.b64encode((ROOT / "www" / "van-hemert-logo-hi.png").read_bytes()).decode("ascii")
    preview_config = {**config, "logo": f"data:image/png;base64,{logo}",
                      "recipes": {"config_entry_id": "demo-mealie"}}
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
<button id="demo-milk">Demo: melk verbruiken</button>
<span>Of scan/type 2000000000015 of 2000000000022 + Enter.</span></div>
<div id="app"></div><script>CARD_SOURCE</script>
<script>const CARD_CONFIG = CONFIG_JSON;
CARD_CONFIG.theme = document.documentElement.getAttribute("data-theme");
CARD_CONFIG.recipes.image_origin = window.location.origin;
DEMO_SOURCE</script></body></html>
"""
    preview = preview.replace("THEME_CSS", theme.group(1)).replace("CARD_SOURCE", preview_source)
    preview = preview.replace("CONFIG_JSON", config_json).replace("DEMO_SOURCE", DEMO)
    output.mkdir(parents=True, exist_ok=True)
    photo_folder = output / "api" / "media" / "recipes" / "00000000-0000-4000-8000-000000000001" / "images"
    photo_folder.mkdir(parents=True, exist_ok=True)
    photo = base64.b64decode(
        "UklGRmYAAABXRUJQVlA4IFoAAADQBgCdASqgAHAAPqlUp08mJKOiIIgAwBUJaW7hdUAAT22IvEFRz2xF4gqOe2Iv"
        "EFRz2xF4gqOe2IvEFRz2tAAA/v1mv/qqnr8bv73LRVL3qRFmpJvCAAAAAAA="
    )
    for size in ("tiny-original.webp", "original.webp"):
        (photo_folder / size).write_bytes(photo)
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
