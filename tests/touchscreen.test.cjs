const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const translations = Object.fromEntries(["en", "nl"].map((language) => [
  language, JSON.parse(fs.readFileSync(path.join(root, "translations", `${language}.json`), "utf8")),
]));
const source = fs.readFileSync(path.join(root, "www", "vh-inventory-touchscreen.js"), "utf8");

function setup(overrides = {}) {
  const elements = new Map();
  const errors = [];
  const navigationWindow = {
    location: { pathname: "/keuken-touchscreen/scan", search: "", hash: "" },
    history: { state: { keep: true }, replaceState(state, title, url) {
      navigationWindow.location.hash = url.includes("#") ? url.slice(url.indexOf("#")) : "";
      this.state = state;
    } },
    addEventListener() {}, removeEventListener() {},
  };
  const context = vm.createContext({
    HTMLElement: class {
      constructor() { this.isConnected = true; }
      attachShadow() { this.shadowRoot = { querySelector: () => null }; }
    },
    customElements: { get: (name) => elements.get(name), define: (name, value) => elements.set(name, value) },
    console: { error: (...args) => errors.push(args) },
    requestAnimationFrame: () => {},
    window: navigationWindow,
  });
  vm.runInContext(source, context);
  const Card = elements.get("vh-inventory-touchscreen");
  const card = new Card();
  card._config = { translations, language: "nl" };
  const calls = [];
  card.hass = {
    connected: true,
    services: { pyscript: { vh_inventory_scan_enqueue: {}, vh_inventory_save_product_details: {} } },
    async callService(...args) { calls.push(args); },
    async callWS() { return sampleStates(); },
    ...overrides,
  };
  return { card, calls, errors, Card, context, ShoppingCard: elements.get("vh-inventory-shopping-touchscreen"),
    StockCard: elements.get("vh-inventory-stock-touchscreen"),
    DashboardCard: elements.get("vh-inventory-touchscreen-dashboard"), navigationWindow };
}

function sampleStates({ quantity = 3, product = true, unresolved = false } = {}) {
  const sensor = (suffix, attribute, rows) => ({
    entity_id: `sensor.vh_inventory_${suffix}`, state: String(rows.length),
    attributes: { [attribute]: rows },
  });
  return [
    sensor("products", "products", product ? [{
      id: 1, barcode: 123, name: "Demo product", manufacturer: "Demo", unit: "pak",
      category_id: 1, store_id: 1, description: "Keep description",
      auto_add_enabled: 1, auto_add_threshold: 2, auto_add_quantity: 4,
    }] : []),
    sensor("stock", "stock", quantity ? [
      { id: 1, product_id: 1, quantity, location_id: 1, location: "Keuken" },
      { id: 2, product_id: 1, quantity: 2, location_id: 2, location: "Kast" },
    ] : []),
    sensor("shopping", "shopping", [{ product_id: 1, quantity: 1 }, { product_id: 2, quantity: 7 }]),
    sensor("scan_queue", "scan_queue", unresolved ? [{ barcode: "000123", state: "Unknown" }] : []),
    sensor("categories", "categories", [{ id: 1, category: "Demo category" }, { id: 2, category: "Other" }]),
    sensor("stores", "stores", [{ id: 1, store: "Demo store" }, { id: 2, store: "Other store" }]),
    sensor("locations", "locations", [{ id: 1, location: "Keuken" }, { id: 2, location: "Kast" }]),
  ];
}

test("new and recreated cards default to read-only lookup without a service call", async () => {
  const { card, calls, Card } = setup();
  assert.equal(card._mode, "Lookup");
  await card._enqueue("000123");
  assert.equal(calls.length, 0);
  assert.equal(card._result.mode, "Lookup");
  card._mode = "Add";
  assert.equal(new Card()._mode, "Lookup");
});

test("scan uses the existing service, with independent Add mode and no ESPHome device", async () => {
  const { card, calls } = setup();
  card._mode = "Add";
  await card._enqueue("000123");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "pyscript");
  assert.equal(calls[0][1], "vh_inventory_scan_enqueue");
  assert.equal(calls[0][2].barcode, "000123");
  assert.equal(calls[0][2].action, "Add");
  assert.equal(calls[0][2].device, undefined);
  assert.equal(card._result.product.name, "Demo product");
  assert.equal(card._result.stock, 5);
  assert.equal(card._result.shopping, 1);
  assert.equal(Array.from(card._result.locations).join(","), "Keuken,Kast");
});

test("lookup reads product details and quantities without calling any service or altering sensor data", async () => {
  const states = sampleStates();
  const original = JSON.stringify(states);
  const commands = [];
  const { card, calls } = setup({
    async callWS(message) { commands.push(message.type); return states; },
  });
  card._mode = "Lookup";
  await card._enqueue("000123");
  assert.equal(calls.length, 0);
  assert.deepEqual(commands, ["get_states"]);
  assert.equal(JSON.stringify(states), original);
  assert.equal(card._result.product.name, "Demo product");
  assert.equal(card._result.barcode, "000123");
  assert.equal(card._result.stock, 5);
  assert.equal(card._result.shopping, 1);
  assert.equal(card._result.mode, "Lookup");
  assert.equal(card._notice.title, "Product found");
});

test("unknown lookup is read-only and does not need or create a scan-queue row", async () => {
  const states = sampleStates({ product: false }).filter((item) => !item.entity_id.endsWith("scan_queue"));
  const original = JSON.stringify(states);
  const { card, calls } = setup({ async callWS() { return states; } });
  card._mode = "Lookup";
  await card._enqueue("123");
  assert.equal(calls.length, 0);
  assert.equal(card._result.product, null);
  assert.equal(card._result.stock, null);
  assert.equal(card._notice.title, "Product not found");
  assert.equal(card._notice.detail, "Barcode not in the product catalogue. Nothing was changed.");
  assert.equal(card._blocked, false);
  assert.equal(JSON.stringify(states), original);
});

test("lookup works with zero stock and without the scan mutation service", async () => {
  const { card, calls } = setup({
    services: {},
    async callWS() { return sampleStates({ quantity: 0 }); },
  });
  card._mode = "Lookup";
  assert.equal(card._available(), true);
  await card._enqueue("123");
  assert.equal(calls.length, 0);
  assert.equal(card._result.stock, 0);
  assert.equal(card._result.shopping, 1);
});

test("lookup failures do not claim uncertain stock changes or block a later lookup", async () => {
  const { card, calls, errors } = setup({ async callWS() { throw new Error("Read failed"); } });
  card._mode = "Lookup";
  await card._enqueue("123");
  assert.equal(calls.length, 0);
  assert.equal(card._blocked, false);
  assert.equal(card._result, null);
  assert.equal(card._notice.title, "Lookup failed");
  assert.equal(errors.length, 1);
  card._hass.callWS = async () => sampleStates();
  await card._enqueue("123");
  assert.equal(card._notice.title, "Product found");
  assert.equal(calls.length, 0);
});

test("missing lookup sensor data fails explicitly without invoking a service", async () => {
  const { card, calls } = setup({ async callWS() { return []; } });
  card._mode = "Lookup";
  await card._enqueue("123");
  assert.equal(card._notice.title, "Lookup failed");
  assert.equal(card._blocked, false);
  assert.equal(calls.length, 0);
});

test("offline, invalid, and card-editor lookups never send a service call", async () => {
  const { card, calls } = setup();
  card._mode = "Lookup";
  await card._enqueue("not-a-barcode");
  assert.equal(card._notice.title, "Invalid barcode");
  card._hass.connected = false;
  await card._enqueue("123");
  assert.equal(card._notice.title, "Scan not accepted");
  card._hass.connected = true;
  card.preview = true;
  await card._enqueue("123");
  assert.equal(card._notice.title, "Scan not accepted");
  assert.equal(calls.length, 0);
});

test("mixed queued Add, Lookup, Use requests invoke only the two captured mutation modes", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const actions = [];
  let reads = 0;
  const { card } = setup({
    async callService(domain, service, data) { actions.push(data.action); await gate; },
    async callWS() { reads += 1; return sampleStates(); },
  });
  card._mode = "Add";
  const done = card._enqueue("123");
  card._mode = "Lookup";
  card._enqueue("123");
  card._mode = "Use";
  card._enqueue("123");
  release();
  await done;
  assert.deepEqual(actions, ["Add", "Use"]);
  assert.equal(reads, 3);
  assert.equal(card._result.mode, "Use");
});

test("repeated scans are serialized, not debounced, and retain their original mode", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const actions = [];
  let active = 0;
  let peak = 0;
  const { card } = setup({
    async callService(domain, service, data) {
      active += 1;
      peak = Math.max(peak, active);
      actions.push(data.action);
      await gate;
      active -= 1;
    },
  });
  card._mode = "Add";
  const done = card._enqueue("123");
  card._mode = "Use";
  card._enqueue("123");
  card._mode = "Add";
  card._enqueue("123");
  release();
  await done;
  assert.deepEqual(actions, ["Add", "Use", "Add"]);
  assert.equal(peak, 1);
  assert.equal(card._queue.length, 0);
});

test("zero stock is a real result, not an empty value", async () => {
  const { card } = setup({ async callWS() { return sampleStates({ quantity: 0 }); } });
  card._mode = "Use";
  await card._enqueue("123");
  assert.equal(card._result.stock, 0);
  assert.equal(card._result.shopping, 1);
  assert.equal(card._result.mode, "Use");
});

test("unknown barcode clears the previous product and shows manual follow-up", async () => {
  const { card } = setup();
  card._mode = "Add";
  await card._enqueue("123");
  card._hass.callWS = async () => sampleStates({ product: false, unresolved: true });
  await card._enqueue("000123");
  assert.equal(card._result.product, null);
  assert.equal(card._result.stock, null);
  assert.equal(card._notice.title, "Product not found");
  assert.equal(card._blocked, false);
});

test("invalid or excessively long input never reaches Home Assistant", async () => {
  const { card, calls } = setup();
  for (const value of ["", " ", "abc", "123x", "1.2", "-1", "1234567890123456", "1234567890123456789", "<script>"]) {
    await card._enqueue(value);
    assert.equal(card._notice.title, "Invalid barcode");
  }
  assert.equal(calls.length, 0);
});

test("offline and unavailable service reject scans without invoking the backend", async () => {
  for (const override of [{ connected: false }, { services: {} }]) {
    const { card, calls } = setup(override);
    card._mode = "Add";
    await card._enqueue("123");
    assert.equal(calls.length, 0);
    assert.equal(card._notice.title, "Scan not accepted");
  }
});

test("Home Assistant card-editor previews cannot mutate inventory", async () => {
  const { card, calls } = setup();
  card.preview = true;
  await card._enqueue("123");
  assert.equal(calls.length, 0);
});

test("queue overflow is rejected explicitly rather than silently losing scans", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const { card } = setup({ async callService() { await gate; } });
  card._mode = "Add";
  const done = card._enqueue("123");
  for (let i = 0; i < 20; i += 1) card._enqueue("123");
  card._enqueue("123");
  assert.equal(card._queue.length, 20);
  assert.equal(card._notice.title, "Scan not accepted");
  assert.equal(card._notice.detail, "Wait for the queued scans, then scan again.");
  release();
  await done;
});

test("a service error blocks further scans, discards queued scans, and never retries", async () => {
  let fail;
  const gate = new Promise((resolve, reject) => { fail = reject; });
  const { card, errors } = setup({ async callService() { await gate; } });
  card._mode = "Add";
  const done = card._enqueue("123");
  card._enqueue("123");
  fail(new Error("Disconnected after submission"));
  await done;
  assert.equal(card._blocked, true);
  assert.equal(card._queue.length, 0);
  assert.equal(card._result, null);
  assert.equal(card._notice.title, "Scan result uncertain");
  assert.match(card._notice.rawDetail, /1\./);
  assert.equal(errors.length, 1);
  card._hass.callService = async () => assert.fail("Must not retry");
  await card._enqueue("123");
});

test("failure to refresh data is treated as uncertain even after service success", async () => {
  const { card, calls } = setup({ async callWS() { throw new Error("Refresh failed"); } });
  card._mode = "Add";
  await card._enqueue("123");
  assert.equal(calls.length, 1);
  assert.equal(card._blocked, true);
});

test("missing or invalid sensor data cannot masquerade as zero stock or unknown product", async () => {
  for (const states of [[], sampleStates({ product: false }), sampleStates({ quantity: "bad" })]) {
    const { card } = setup({ async callWS() { return states; } });
    card._mode = "Add";
    await card._enqueue("123");
    assert.equal(card._blocked, true);
    assert.equal(card._result, null);
  }
});

test("navigating away discards buffered scans but allows an in-flight call to settle", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const { card, calls } = setup();
  card._hass.callService = async (...args) => { calls.push(args); await gate; };
  card._mode = "Add";
  const done = card._enqueue("123");
  card._enqueue("123");
  card.isConnected = false;
  release();
  await done;
  assert.equal(calls.length, 1);
});

test("draft editing never writes, survives hass updates, and reverting all fields clears dirty state", async () => {
  const { card, calls } = setup();
  card._mode = "Lookup";
  await card._enqueue("123");
  assert.equal(card._dirty(), false);
  card._editField("manufacturer", "Changed");
  card._editField("category_id", "2");
  assert.equal(card._dirty(), true);
  card.hass = { ...card._hass };
  assert.equal(card._draft.values.manufacturer, "Changed");
  assert.equal(card._draft.original.manufacturer, "Demo");
  card._editField("manufacturer", "Demo");
  card._editField("category_id", "1");
  assert.equal(card._dirty(), false);
  await card._saveDetails();
  assert.equal(calls.length, 0);
});

test("pending drafts pause new scans and discard restores the original values without writing", async () => {
  const { card, calls } = setup();
  card._mode = "Lookup";
  await card._enqueue("123");
  card._editField("unit", "doos");
  await card._enqueue("999");
  assert.equal(card._notice.detail, "Save or discard your edits before scanning.");
  assert.equal(card._result.barcode, "123");
  assert.equal(calls.length, 0);
  card._resetDraft();
  assert.equal(card._draft.values.unit, "pak");
  assert.equal(card._dirty(), false);
});

test("save submits only dirty fields and original values, then verifies the result", async () => {
  const states = sampleStates();
  const baseline = JSON.parse(JSON.stringify(states));
  const { card, calls } = setup({
    async callWS() { return structuredClone(states); },
    async callService(domain, service, data) {
      calls.push([domain, service, structuredClone(data)]);
      Object.assign(states[0].attributes.products[0], data.changes);
    },
  });
  card._mode = "Lookup";
  await card._enqueue("123");
  card._editField("manufacturer", "Updated");
  card._editField("store_id", "");
  await card._saveDetails();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], "vh_inventory_save_product_details");
  assert.equal(JSON.stringify(calls[0][2]), JSON.stringify({
    id: 1, changes: { manufacturer: "Updated", store_id: null },
    expected: { manufacturer: "Demo", store_id: 1 },
  }));
  assert.equal(card._result.product.manufacturer, "Updated");
  assert.equal(card._dirty(), false);
  assert.equal(card._editNotice, "Product details saved.");
  const product = states[0].attributes.products[0];
  for (const field of ["barcode", "name", "description", "auto_add_enabled", "auto_add_threshold", "auto_add_quantity"]) {
    assert.equal(product[field], baseline[0].attributes.products[0][field]);
  }
  assert.deepEqual(states.slice(1), baseline.slice(1));
});

test("location save explicitly relocates all stock and sends all original locations", async () => {
  const states = sampleStates();
  const { card, calls } = setup({
    async callWS() { return structuredClone(states); },
    async callService(domain, service, data) {
      calls.push([domain, service, structuredClone(data)]);
      states[1].attributes.stock = [{ id: 2, product_id: 1, quantity: 5, location_id: 2, location: "Kast" }];
    },
  });
  card._mode = "Lookup";
  await card._enqueue("123");
  assert.equal(card._draft.original.location_id, "__multiple__");
  card._editField("location_id", "2");
  await card._saveDetails();
  assert.equal(calls[0][2].changes.location_id, 2);
  assert.deepEqual(calls[0][2].expected.location_id, ["1", "2"]);
  assert.equal(card._result.stock, 5);
  assert.equal(card._dirty(), false);
});

test("zero stock allows metadata editing but never creates a location draft", async () => {
  const { card, calls } = setup({ async callWS() { return sampleStates({ quantity: 0 }); } });
  card._mode = "Lookup";
  await card._enqueue("123");
  card._editField("location_id", "1");
  assert.equal(card._dirty(), false);
  card._editField("unit", "doos");
  assert.equal(card._dirty(), true);
  assert.equal(card._draft.values.location_id, "");
  assert.equal(calls.length, 0);
});

test("saving disables duplicate saves, editing, and queued scans until completion", async () => {
  let finish;
  const gate = new Promise((resolve) => { finish = resolve; });
  const states = sampleStates();
  const { card, calls } = setup({
    async callWS() { return structuredClone(states); },
    async callService(...args) {
      calls.push(args);
      await gate;
      states[0].attributes.products[0].unit = "doos";
    },
  });
  card._mode = "Lookup";
  await card._enqueue("123");
  card._editField("unit", "doos");
  const done = card._saveDetails();
  assert.equal(card._saving, true);
  await card._saveDetails();
  card._editField("unit", "must not replace");
  await card._enqueue("123");
  assert.equal(card._draft.values.unit, "doos");
  assert.equal(calls.length, 1);
  finish();
  await done;
  assert.equal(card._saving, false);
  assert.equal(card._dirty(), false);
});

test("rejected writes, refresh failures, and unverified saves retain drafts and never claim success", async () => {
  for (const failure of ["write", "refresh", "unchanged"]) {
    const { card, errors } = setup();
    card._mode = "Lookup";
    await card._enqueue("123");
    card._editField("manufacturer", "Retain me");
    if (failure === "write") card._hass.callService = async () => { throw new Error("Rejected"); };
    if (failure === "refresh") card._hass.callWS = async () => { throw new Error("Disconnected"); };
    await card._saveDetails();
    assert.equal(card._draft.values.manufacturer, "Retain me");
    assert.equal(card._dirty(), true);
    assert.equal(card._saving, false);
    assert.match(card._editNotice, /could not be saved or verified/);
    assert.equal(errors.length, 1);
  }
});

test("unknown, offline, preview, busy, blocked, or missing-service products cannot be edited or saved", async () => {
  for (const condition of ["unknown", "offline", "preview", "busy", "blocked", "missing-service"]) {
    const { card, calls } = setup();
    card._mode = "Lookup";
    await card._enqueue("123");
    if (condition === "unknown") { card._result.product = null; card._resetDraft(); }
    if (condition === "offline") card._hass.connected = false;
    if (condition === "preview") card.preview = true;
    if (condition === "busy") card._busy = true;
    if (condition === "blocked") card._blocked = true;
    if (condition === "missing-service") card._hass.services = {};
    card._editField("manufacturer", "Not allowed");
    await card._saveDetails();
    assert.equal(card._dirty(), false);
    assert.equal(calls.length, 0);
  }
});

test("live reference lists take priority and unavailable lists do not fall back to stale data", async () => {
  const { card } = setup();
  card._mode = "Lookup";
  await card._enqueue("123");
  assert.equal(card._referenceRows("stores").length, 2);
  card._hass.states = { "sensor.vh_inventory_stores": { state: "1", attributes: { stores: [{ id: 3, store: "New" }] } } };
  assert.equal(card._referenceRows("stores")[0].id, 3);
  card._hass.states["sensor.vh_inventory_stores"].state = "unavailable";
  assert.equal(card._referenceRows("stores"), null);
});

test("scan header hides idle readiness but retains busy, editing, and error indicators", () => {
  for (const state of ["focused", "unfocused", "busy", "saving", "dirty", "offline", "blocked"]) {
    const { card } = setup();
    const indicator = { dataset: {} };
    const text = {};
    card.shadowRoot.querySelector = (selector) => selector === "#connection" ? indicator : text;
    card.shadowRoot.activeElement = state === "focused" ? { id: "barcode" } : null;
    card._busy = state === "busy";
    card._saving = state === "saving";
    card._dirty = () => state === "dirty";
    card._blocked = state === "blocked";
    card._hass.connected = state !== "offline";
    card._updateReady();
    assert.equal(indicator.hidden, ["focused", "unfocused"].includes(state), state);
    if (state === "busy" || state === "saving") assert.equal(indicator.dataset.state, "busy");
    if (state === "offline" || state === "blocked") assert.equal(indicator.dataset.state, "error");
    assert.ok(text.textContent);
  }
});

test("neither page renders the redundant footer text or waiting-scan counter", () => {
  assert.doesNotMatch(source, /<footer\b|id="queue-status"|data-i18n="Touchscreen inventory"/);
  assert.doesNotMatch(source, /data-i18n="Use the page buttons to switch between scanning and shopping\."/);
});

test("all static touchscreen UI strings are registered in both translation maps", () => {
  const keys = new Set([
    ...Array.from(source.matchAll(/data-i18n="([^"]+)"/g), (match) => match[1]),
    ...Array.from(source.matchAll(/(?:title|detail): "([^"]+)"/g), (match) => match[1]),
    ...Array.from(source.matchAll(/this\._t\("([^"]+)"\)/g), (match) => match[1]),
    ...Array.from(source.matchAll(/this\._status = "([^"]+)"/g), (match) => match[1]),
  ]);
  for (const key of keys) {
    for (const language of ["en", "nl"]) assert.ok(translations[language][key], `${language}: ${key}`);
  }
});

function setupShopping() {
  const { ShoppingCard, calls, errors } = setup();
  const card = new ShoppingCard();
  card._config = { translations, language: "nl" };
  let states = [
    { entity_id: "sensor.vh_inventory_products", state: "2", attributes: { products: [
      { id: 1, name: "Z Demo milk", category: "Dairy", store: "Demo shop" },
      { id: 2, name: "A Demo pasta", category: "Pasta", store: "Other shop" },
    ] } },
    { entity_id: "sensor.vh_inventory_shopping", state: "3", attributes: { shopping: [
      { id: 10, product_id: 1, product: "Z Demo milk", quantity: 2 },
      { id: 11, product_id: 2, product: "A Demo pasta", quantity: 1 },
      { id: 12, product_id: null, product: "Demo ad-hoc", is_ad_hoc: 1, quantity: 1 },
    ] } },
    { entity_id: "sensor.vh_inventory_stock", state: "1", attributes: { stock: [
      { id: 1, product_id: 1, quantity: 8 },
    ] } },
  ];
  card.hass = {
    connected: true, states: Object.fromEntries(states.map((row) => [row.entity_id, row])),
    services: { pyscript: { vh_inventory_adjust_shopping: {}, vh_inventory_delete: {} } },
    async callService(domain, service, data) {
      calls.push([domain, service, structuredClone(data)]);
      const list = states[1].attributes.shopping;
      const index = list.findIndex((row) => row.id === data.id);
      if (index < 0) throw new Error("No such row");
      if (service === "vh_inventory_delete") list.splice(index, 1);
      else list[index].quantity += data.delta;
    },
    async callWS(message) { assert.equal(message.type, "get_states"); return structuredClone(states); },
  };
  return { card, calls, errors, states, replaceStates(value) { states = value; } };
}

test("shopping page joins category/store, preserves ad-hoc rows and distinct row ids, sorts by name", () => {
  const { card, calls } = setupShopping();
  const rows = card._rows();
  assert.equal(Array.from(rows, (row) => row.id).join(","), "11,12,10");
  assert.equal(rows[0].category, "Pasta");
  assert.equal(rows[0].store, "Other shop");
  assert.equal(rows[1].adhoc, true);
  assert.equal(rows[1].category, translations.nl["Ad-Hoc item"]);
  assert.equal(calls.length, 0);
});

test("shopping empty list is distinct from missing, unavailable, and corrupt data", () => {
  const { card, states } = setupShopping();
  states[1].attributes.shopping = [];
  assert.equal(card._rows().length, 0);
  states[1].state = "unavailable";
  assert.throws(() => card._rows(), /Missing shopping data/);
  states[1].state = "1";
  states[1].attributes.shopping = [{ id: 1, quantity: "bad" }];
  assert.throws(() => card._rows(), /Invalid shopping row/);
  states[1].attributes.shopping = [{ id: 1, quantity: 1, product: "Same" }, { id: 1, quantity: 1, product: "Same" }];
  assert.throws(() => card._rows(), /Invalid shopping row/);
  delete card._states.sensor;
  delete card._states["sensor.vh_inventory_products"];
  assert.throws(() => card._rows(), /Missing shopping data/);
});

test("shopping increments and decrements call only shopping row services and preserve stock", async () => {
  const { card, states, calls } = setupShopping();
  const inventory = JSON.stringify(states[2]);
  await card._change(10, 1);
  assert.equal(card._rows().find((row) => row.id === 10).quantity, 3);
  await card._change(10, -1);
  assert.equal(card._rows().find((row) => row.id === 10).quantity, 2);
  assert.deepEqual(calls, [
    ["pyscript", "vh_inventory_adjust_shopping", { id: 10, delta: 1 }],
    ["pyscript", "vh_inventory_adjust_shopping", { id: 10, delta: -1 }],
  ]);
  assert.equal(JSON.stringify(states[2]), inventory);
  assert.equal(card._status, "Shopping list updated. Stock is unchanged.");
});

test("removal and decrementing the last unit require confirmation before deleting only the shopping row", async () => {
  for (const action of ["remove", -1]) {
    const { card, calls, states } = setupShopping();
    const original = JSON.stringify(states);
    await card._change(11, action);
    assert.equal(card._confirmId, 11);
    assert.equal(calls.length, 0);
    assert.equal(JSON.stringify(states), original);
    await card._change(11, "remove");
    assert.deepEqual(calls, [["pyscript", "vh_inventory_delete", { table: "shopping_list", id: 11 }]]);
    assert.equal(card._rows().some((row) => row.id === 11), false);
    assert.equal(card._confirmId, null);
  }
});

test("ad-hoc items use their shopping row id for changes and confirmed removal", async () => {
  const { card, calls } = setupShopping();
  await card._change(12, 1);
  assert.equal(card._rows().find((row) => row.id === 12).quantity, 2);
  card._requestRemove(12);
  await card._change(12, "remove");
  assert.equal(card._rows().some((row) => row.id === 12), false);
  assert.equal(calls[0][2].id, 12);
  assert.equal(calls[1][2].table, "shopping_list");
});

test("duplicate product names do not mix shopping rows; ad-hoc quantity cap blocks increment", async () => {
  const { card, states, calls } = setupShopping();
  states[0].attributes.products[1].name = "Z Demo milk";
  states[1].attributes.shopping[2].quantity = 99999;
  await card._change(12, 1);
  assert.equal(calls.length, 0);
  await card._change(11, 1);
  assert.equal(calls[0][2].id, 11);
  assert.equal(card._rows().find((row) => row.id === 10).quantity, 2);
});

test("shopping actions are serialized and rapid clicks are not queued or retried", async () => {
  const { card, calls } = setupShopping();
  const original = card._hass.callService;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  card._hass.callService = async (...args) => { await gate; await original(...args); };
  const done = card._change(10, 1);
  assert.equal(card._busy, true);
  await card._change(10, 1);
  await card._refresh();
  release();
  await done;
  assert.equal(calls.length, 1);
  assert.equal(card._busy, false);
});

test("shopping write errors, stale readback and refresh errors block writes until explicit successful refresh", async () => {
  for (const failure of ["write", "stale", "read"]) {
    const { card, errors, states } = setupShopping();
    const originalRead = card._hass.callWS;
    if (failure === "write") card._hass.callService = async () => { throw new Error("Rejected"); };
    if (failure === "stale") card._hass.callService = async () => {};
    if (failure === "read") card._hass.callWS = async () => { throw new Error("Disconnected"); };
    await card._change(10, 1);
    assert.equal(card._blocked, true);
    assert.equal(card._busy, false);
    assert.match(card._status, /uncertain/);
    assert.equal(errors.length, 1);
    card._hass.callService = async () => assert.fail("Must not retry mutation");
    await card._change(10, 1);
    card._hass.callWS = async () => { throw new Error("Read failed"); };
    await card._refresh();
    assert.equal(card._blocked, true);
    card._hass.callWS = originalRead;
    await card._refresh();
    assert.equal(card._blocked, false);
    assert.equal(card._rows().length, states[1].attributes.shopping.length);
  }
});

test("offline, preview, missing services, blocked state and invalid actions never write shopping", async () => {
  for (const condition of ["offline", "preview", "service", "blocked", "action"]) {
    const { card, calls } = setupShopping();
    if (condition === "offline") card._hass.connected = false;
    if (condition === "preview") card.preview = true;
    if (condition === "service") card._hass.services = {};
    if (condition === "blocked") card._blocked = true;
    await card._change(10, condition === "action" ? 4 : 1);
    assert.equal(calls.length, 0);
  }
});

test("live hass updates refresh the shopping data without invoking services", () => {
  const { card, states, calls } = setupShopping();
  const refreshed = structuredClone(states);
  refreshed[1].attributes.shopping = [];
  card.hass = { ...card._hass, states: Object.fromEntries(refreshed.map((row) => [row.entity_id, row])) };
  assert.equal(card._rows().length, 0);
  assert.equal(calls.length, 0);
});

test("shopping page has one accessible title without the article count or explanatory text", () => {
  const { ShoppingCard } = setup();
  const card = new ShoppingCard();
  card.setAttribute = () => {};
  card.shadowRoot.querySelector = () => ({ addEventListener() {} });
  card.shadowRoot.querySelectorAll = () => [];
  card._render = () => {};
  card.setConfig({ translations, language: "nl" });
  const html = card.shadowRoot.innerHTML;
  assert.equal((html.match(/<h[1-6]\b[^>]*data-i18n="Shopping"/g) || []).length, 1);
  assert.match(html, /<h1 id="shopping-title" data-i18n="Shopping">/);
  assert.match(html, /<section class="panel" aria-labelledby="shopping-title">/);
  assert.doesNotMatch(html, /shopping-count|shopping-toolbar/);
  assert.doesNotMatch(html, /Quantity changes affect only the shopping list, not stock\./);
  assert.match(html, /id="shopping-status" role="status" aria-live="polite"/);
  assert.match(html, /\.panel \{ padding-top: 16px; \}/);
  assert.match(html, /#shopping-status:empty \{ display: none; \}/);
});

test("shopping refresh is hidden normally and appears only for errors or recovery", async () => {
  const { card, states, calls } = setupShopping();
  states[1].attributes.shopping = [];
  const nodes = new Map();
  card.shadowRoot.querySelector = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, { dataset: {}, replaceChildren() {} });
    return nodes.get(selector);
  };
  const refresh = card.shadowRoot.querySelector("#shopping-refresh");
  card._render();
  assert.equal(refresh.hidden, true);
  card._busy = true;
  card._status = "Updating shopping list";
  card._render();
  assert.equal(refresh.hidden, true);
  card._busy = false;
  card._status = "Shopping list updated. Stock is unchanged.";
  card._render();
  assert.equal(refresh.hidden, true);

  states[1].state = "unavailable";
  card._render();
  assert.equal(refresh.hidden, false);
  assert.equal(refresh.disabled, false);
  states[1].state = "0";
  card._hass.connected = false;
  card._render();
  assert.equal(refresh.hidden, false);
  assert.equal(refresh.disabled, true);
  card._hass.connected = true;
  card._render();
  assert.equal(refresh.hidden, true);

  card._blocked = true;
  card._render();
  assert.equal(refresh.hidden, false);
  const read = card._hass.callWS;
  card._hass.callWS = async () => { throw new Error("Read failed"); };
  await card._refresh();
  assert.equal(refresh.hidden, false);
  assert.equal(refresh.disabled, false);
  let resolveRead;
  card._hass.callWS = () => new Promise((resolve) => { resolveRead = resolve; });
  const recovery = card._refresh();
  assert.equal(refresh.hidden, false);
  assert.equal(refresh.disabled, true);
  resolveRead(await read({ type: "get_states" }));
  await recovery;
  assert.equal(card._blocked, false);
  assert.equal(refresh.hidden, true);
  assert.equal(calls.length, 0);
});

function setupInventory() {
  const { StockCard, calls, errors } = setup();
  const card = new StockCard();
  card._config = { translations, language: "nl" };
  card._buildEditor = () => {};
  const states = sampleStates();
  states[0].attributes.products[0].name = "Caf\u00e9 Demo";
  states[0].attributes.products.push({ id: 2, name: "Other product", barcode: 456,
    manufacturer: "", unit: "", category_id: 2 });
  states[1].attributes.stock.push({ id: 3, product_id: 2, location_id: null, quantity: 0 });
  const publish = () => {
    card.hass = { ...card._hass, states: Object.fromEntries(structuredClone(states).map((s) => [s.entity_id, s])) };
  };
  card._hass = {
    connected: true,
    services: { pyscript: Object.fromEntries(
      ["add_stock", "update_stock", "update_stock_product", "adjust_stock", "set_stock_field", "set_product_field",
        "save_stock_details", "delete"]
        .map((name) => [`vh_inventory_${name}`, {}])), script: { vh_print_inventory: {} } },
    async callWS(message) { assert.equal(message.type, "get_states"); return structuredClone(states); },
    async callService(domain, service, data) {
      calls.push([domain, service, structuredClone(data)]);
      if (domain === "script") return;
      const stock = states[1].attributes.stock;
      const products = states[0].attributes.products;
      const row = stock.find((s) => s.id === data.id);
      const product = products.find((p) => data.product != null ? p.name === data.product : p.id === row?.product_id);
      const lid = states[6].attributes.locations.find((l) => l.location === data.location)?.id ?? null;
      if (service === "vh_inventory_save_stock_details") {
        const linked = products.find((p) => p.id === data.product_id);
        assert.equal(row.product_id, linked.id);
        const productFields = ["name", "barcode", "manufacturer", "unit", "category_id", "store_id"];
        for (const [field, value] of Object.entries(data.changes)) {
          (productFields.includes(field) ? linked : row)[field] = value;
        }
        if ("store_id" in data.changes) linked.store = states[5].attributes.stores.find((s) => s.id === linked.store_id)?.store || "";
      } else if (service === "vh_inventory_set_product_field") {
        assert.equal(data.field, "store");
        const selected = products.find((p) => p.id === data.id);
        const store = states[5].attributes.stores.find((s) => s.store === data.value);
        Object.assign(selected, { store_id: store?.id ?? null, store: store?.store || "" });
      } else if (service === "vh_inventory_adjust_stock") row.quantity = Math.max(0, row.quantity + data.delta);
      else if (service === "vh_inventory_delete") {
        assert.equal(data.table, "stock");
        stock.splice(stock.indexOf(row), 1);
      } else if (service === "vh_inventory_add_stock") {
        const existing = stock.find((s) => s.product_id === product.id && (s.location_id ?? null) === lid);
        if (existing) existing.quantity += data.quantity;
        else stock.push({ id: Math.max(...stock.map((s) => s.id)) + 1,
          product_id: product.id, location_id: lid, quantity: data.quantity });
      } else if (service === "vh_inventory_update_stock") {
        Object.assign(row, { product_id: product.id, location_id: lid, quantity: data.quantity });
      } else if (service === "vh_inventory_update_stock_product") {
        Object.assign(product, { barcode: data.barcode ? Number(data.barcode) : null,
          manufacturer: data.manufacturer, unit: data.unit,
          category_id: states[4].attributes.categories.find((c) => c.category === data.category)?.id ?? null });
      } else if (service === "vh_inventory_set_stock_field") {
        if (data.field === "category") {
          product.category_id = states[4].attributes.categories.find((c) => c.category === data.value)?.id ?? null;
        } else {
          const target = states[6].attributes.locations.find((l) => l.location === data.value)?.id ?? null;
          const other = stock.find((s) => s.id !== row.id && s.product_id === row.product_id &&
            (s.location_id ?? null) === target);
          if (other) { other.quantity += row.quantity; stock.splice(stock.indexOf(row), 1); }
          else row.location_id = target;
        }
      } else assert.fail(`Unexpected service ${service}`);
    },
  };
  publish();
  return { card, calls, errors, states, publish };
}

test("inventory includes only positive stock per location, sorted by name, with accent-insensitive name/barcode filters", () => {
  const { card, calls } = setupInventory();
  assert.deepEqual(Array.from(card._rows(), (r) => r.id), [1, 2]);
  card._search = " CAFE ";
  assert.equal(card._rows().length, 2);
  card._search = "23";
  assert.equal(card._rows().length, 2);
  card._search = "absent";
  assert.equal(card._rows().length, 0);
  card._search = "";
  card._category = "2";
  assert.equal(card._rows().length, 0);
  card._category = "1";
  assert.equal(card._rows().length, 2);
  card._category = "none";
  assert.equal(card._rows().length, 0);
  assert.equal(calls.length, 0);
});

test("inventory store comes from the catalogue, updates live, and missing stores display Unassigned", () => {
  const { card, calls, states, publish } = setupInventory();
  const product = states[0].attributes.products[0];
  product.store = "Demo store";
  states[1].attributes.stock[0].store = "Stale stock store";
  publish();
  assert.deepEqual(Array.from(card._rows(), (r) => r.store), ["Demo store", "Demo store"]);
  product.store = "Another demo store";
  publish();
  assert.ok(card._rows().every((r) => r.store === "Another demo store"));
  for (const empty of ["", null, undefined]) {
    product.store = empty;
    publish();
    assert.ok(card._rows().every((r) => r.store === card._t("Unassigned")));
  }
  assert.equal(calls.length, 0);
});

test("inventory store dropdown updates the product across locations and can clear it without changing stock", async () => {
  const { card, calls, states } = setupInventory();
  const stock = JSON.stringify(states[1].attributes.stock);
  const original = { ...states[0].attributes.products[0] };
  await card._setField(2, "store", "2");
  assert.equal(card._blocked, false);
  assert.equal(calls[0][1], "vh_inventory_set_product_field");
  assert.deepEqual(calls[0][2], { id: 1, field: "store", value: "Other store" });
  assert.ok(card._rows().every((r) => r.store_id === 2 && r.store === "Other store"));
  assert.deepEqual(states[0].attributes.products[0], { ...original, store_id: 2, store: "Other store" });
  await card._setField(1, "store", "");
  assert.equal(calls[1][2].value, "(none)");
  assert.ok(card._rows().every((r) => r.store_id === null && r.store === card._t("Unassigned")));
  assert.equal(JSON.stringify(states[1].attributes.stock), stock);
});

test("inventory store dropdown rejects missing, ambiguous and concurrently changed stores before writing", async () => {
  for (const failure of ["missing", "ambiguous", "stale", "unavailable", "service"]) {
    const { card, calls, states, publish } = setupInventory();
    if (failure === "ambiguous") states[5].attributes.stores[1].store = states[5].attributes.stores[0].store;
    if (failure === "unavailable") states[5].state = "unavailable";
    if (failure === "service") delete card._hass.services.pyscript.vh_inventory_set_product_field;
    publish();
    if (failure === "stale") {
      card._hass.callWS = async () => {
        const fresh = structuredClone(states);
        fresh[0].attributes.products[0].store_id = 2;
        return fresh;
      };
    }
    await card._setField(1, "store", failure === "missing" ? "999" : "2");
    assert.equal(calls.length, 0, failure);
    if (failure === "stale") assert.equal(card._blocked, true);
  }
});

test("unverified inventory store writes block further changes instead of retrying", async () => {
  const { card, calls } = setupInventory();
  card._hass.callService = async (...args) => { calls.push(args); };
  await card._setField(1, "store", "2");
  assert.equal(calls.length, 1);
  assert.equal(card._blocked, true);
  assert.match(card._status, /uncertain/);
  await card._setField(1, "store", "2");
  assert.equal(calls.length, 1);
});

test("inventory unavailable and malformed data never masquerade as an empty inventory or allow writes", async () => {
  for (const corrupt of ["missing", "unavailable", "duplicate", "quantity", "orphan", "barcode", "store"]) {
    const { card } = setupInventory();
    if (corrupt === "missing") delete card._states.sensor;
    if (corrupt === "missing") delete card._states["sensor.vh_inventory_stock"];
    if (corrupt === "unavailable") card._states["sensor.vh_inventory_stock"].state = "unavailable";
    if (corrupt === "duplicate") card._states["sensor.vh_inventory_stock"].attributes.stock.push(
      structuredClone(card._states["sensor.vh_inventory_stock"].attributes.stock[0]));
    if (corrupt === "quantity") card._states["sensor.vh_inventory_stock"].attributes.stock[0].quantity = -1;
    if (corrupt === "orphan") card._states["sensor.vh_inventory_stock"].attributes.stock[0].product_id = 999;
    if (corrupt === "barcode") card._states["sensor.vh_inventory_products"].attributes.products[0].barcode = {};
    if (corrupt === "store") card._states["sensor.vh_inventory_products"].attributes.products[0].store = {};
    assert.throws(() => card._rows());
    assert.equal(card._canAct(), false);
    card._hass.callService = async () => assert.fail("Invalid data must not write");
    await card._change(1, 1);
  }
});

test("inventory +/- uses stock row services and last-unit removal requires confirmation", async () => {
  const { card, calls } = setupInventory();
  await card._change(1, 1);
  await card._change(1, -1);
  assert.equal(card._data().stock[0].quantity, 3);
  await card._change(2, -1);
  await card._change(2, -1);
  assert.equal(calls.length, 3);
  assert.ok(card._confirmation);
  await card._confirmation.run();
  assert.equal(card._rows().some((r) => r.id === 2), false);
  assert.equal(calls[3][1], "vh_inventory_adjust_stock");
  assert.equal(calls[3][2].delta, -1);
});

test("inventory delete confirms the exact stock row and does not delete its product", async () => {
  const { card, calls, states } = setupInventory();
  const products = JSON.stringify(states[0]);
  await card._remove(1);
  assert.equal(calls.length, 0);
  await card._change(2, 1);
  assert.equal(calls.length, 0);
  await card._confirmation.run();
  assert.deepEqual(calls, [["pyscript", "vh_inventory_delete", { table: "stock", id: 1 }]]);
  assert.equal(card._data().stock.some((r) => r.id === 1), false);
  assert.equal(JSON.stringify(states[0]), products);
});

test("inventory category updates the product and moving location merges rows without changing totals", async () => {
  const { card, calls } = setupInventory();
  await card._setField(1, "category", "2");
  assert.equal(card._data().products[0].category_id, 2);
  assert.equal(card._rows().filter((r) => r.category_id === 2).length, 2);
  await card._setField(1, "location", "2");
  assert.equal(card._data().stock.filter((r) => r.product_id === 1).length, 1);
  assert.equal(card._data().stock.find((r) => r.id === 2).quantity, 5);
  assert.deepEqual(calls[1][2], { id: 1, field: "location", value: "Kast" });
  await card._setField(2, "location", "");
  assert.equal(card._data().stock.find((r) => r.id === 2).location_id, null);
});

test("inventory add can restock a zero-stock product or increment an existing location", async () => {
  const { card, calls } = setupInventory();
  card._openEditor();
  Object.assign(card._editor.values, { product_id: "2", location_id: "1", quantity: "4" });
  await card._save();
  assert.equal(card._editor, null);
  assert.equal(card._rows().find((r) => r.product_id === 2).quantity, 4);
  card._openEditor();
  Object.assign(card._editor.values, { product_id: "1", location_id: "1", quantity: "2" });
  await card._save();
  assert.equal(card._data().stock.find((r) => r.id === 1).quantity, 5);
  assert.equal(calls[0][1], "vh_inventory_add_stock");
  assert.equal(calls[1][2].quantity, 2);
});

test("inventory full edit saves stock and linked product fields without changing unrelated settings", async () => {
  const { card, calls } = setupInventory();
  card._openEditor(1);
  Object.assign(card._editor.values, { quantity: "6", barcode: "000789", manufacturer: "New demo", unit: "box", category_id: "2" });
  await card._save();
  assert.equal(card._blocked, false);
  assert.equal(card._editor, null);
  assert.equal(card._data().stock[0].quantity, 6);
  const product = card._data().products[0];
  assert.equal(product.barcode, 789);
  assert.equal(product.manufacturer, "New demo");
  assert.equal(product.category_id, 2);
  assert.equal(product.auto_add_quantity, 4);
  assert.deepEqual(calls.map((c) => c[1]), ["vh_inventory_save_stock_details"]);
  assert.deepEqual(Object.keys(calls[0][2].changes).sort(), ["barcode", "category_id", "manufacturer", "quantity", "unit"]);
});

test("inventory full edit renames the same product ID and cannot relink stock through draft product_id", async () => {
  const { card, calls, states } = setupInventory();
  const stock = JSON.stringify(states[1].attributes.stock);
  const other = JSON.stringify(states[0].attributes.products[1]);
  card._openEditor(1);
  Object.assign(card._editor.values, { product_id: "2", name: "Renamed demo" });
  await card._save();
  assert.equal(card._blocked, false);
  assert.equal(card._data().products[0].id, 1);
  assert.equal(card._data().products[0].name, "Renamed demo");
  assert.equal(JSON.stringify(states[1].attributes.stock), stock);
  assert.equal(JSON.stringify(states[0].attributes.products[1]), other);
  assert.equal(calls[0][2].product_id, 1);
  assert.deepEqual(calls[0][2].changes, { name: "Renamed demo" });
  assert.deepEqual(calls.map((c) => c[1]), ["vh_inventory_save_stock_details"]);
});

test("unchanged inventory editor saves send no write and keep all IDs and fields intact", async () => {
  const { card, calls } = setupInventory();
  const before = JSON.stringify(card._data());
  card._openEditor(1);
  await card._save();
  assert.equal(calls.length, 0);
  assert.equal(card._editor, null);
  assert.equal(JSON.stringify(card._data()), before);
});

test("inventory editor validates product names and text lengths without writing", async () => {
  for (const [field, value] of [["name", ""], ["name", " "], ["name", "(none)"],
    ["name", "x".repeat(256)], ["manufacturer", "x".repeat(256)], ["unit", "x".repeat(256)]]) {
    const { card, calls } = setupInventory();
    card._openEditor(1);
    card._editor.values[field] = value;
    await card._save();
    assert.equal(calls.length, 0);
    assert.ok(card._editor);
    assert.match(card._status, /product name/);
  }
});

test("ID-based inventory edits preserve concurrent fields that were not edited", async () => {
  const { card, calls, states } = setupInventory();
  card._openEditor(1);
  card._editor.values.name = "Renamed demo";
  states[0].attributes.products[0].unit = "Concurrent unit";
  await card._save();
  assert.equal(card._blocked, false);
  assert.equal(states[0].attributes.products[0].unit, "Concurrent unit");
  assert.deepEqual(calls[0][2].changes, { name: "Renamed demo" });
});

test("inventory editor drafts the current store and saves or clears it only on explicit Save", async () => {
  for (const value of ["2", ""]) {
    const { card, calls, states } = setupInventory();
    const stock = JSON.stringify(states[1].attributes.stock);
    card._openEditor(1);
    assert.equal(card._editor.values.store_id, "1");
    card._editor.values.store_id = value;
    assert.equal(calls.length, 0);
    assert.equal(states[0].attributes.products[0].store_id, 1);
    await card._save();
    assert.equal(card._blocked, false);
    assert.equal(card._editor, null);
    assert.equal(states[0].attributes.products[0].store_id, value ? 2 : null);
    assert.equal(JSON.stringify(states[1].attributes.stock), stock);
    assert.deepEqual(calls.map((c) => c[1]), ["vh_inventory_save_stock_details"]);
    assert.deepEqual(calls[0][2].changes, { store_id: value ? 2 : null });
  }
});

test("inventory editor can save stock, metadata and store together", async () => {
  const { card, calls } = setupInventory();
  card._openEditor(1);
  Object.assign(card._editor.values, { quantity: "7", unit: "box", store_id: "2" });
  await card._save();
  assert.equal(card._blocked, false);
  assert.equal(card._data().stock[0].quantity, 7);
  assert.equal(card._data().products[0].unit, "box");
  assert.equal(card._data().products[0].store_id, 2);
  assert.deepEqual(calls.map((c) => c[1]), ["vh_inventory_save_stock_details"]);
  assert.deepEqual(calls[0][2].changes, { unit: "box", store_id: 2, quantity: 7 });
});

test("inventory editor rejects missing, invalid and stale store choices before any write", async () => {
  for (const failure of ["missing", "invalid", "stale"]) {
    const { card, calls, states } = setupInventory();
    card._openEditor(1);
    card._editor.values.store_id = failure === "missing" ? "999" : failure === "invalid" ? "abc" : "2";
    if (failure === "stale") states[0].attributes.products[0].store_id = 2;
    await card._save();
    assert.equal(calls.length, 0, failure);
    assert.ok(card._editor);
    assert.equal(card._blocked, failure === "stale");
  }
});

test("lost atomic inventory editor response retains the draft and blocks repeat writes", async () => {
  const { card, calls, states } = setupInventory();
  const service = card._hass.callService;
  card._hass.callService = async (...args) => {
    await service(...args);
    throw new Error("Save response lost");
  };
  card._openEditor(1);
  Object.assign(card._editor.values, { quantity: "7", store_id: "2" });
  await card._save();
  assert.equal(card._blocked, true);
  assert.equal(card._editor.values.store_id, "2");
  assert.equal(states[1].attributes.stock[0].quantity, 7);
  assert.equal(states[0].attributes.products[0].store_id, 2);
  assert.match(card._status, /uncertain/);
  await card._save();
  assert.equal(calls.length, 1);
});

test("unchanged inventory product fields do not invoke the product update service; zero quantity requires confirmation", async () => {
  const { card, calls } = setupInventory();
  card._openEditor(1);
  card._editor.values.quantity = "0";
  await card._save();
  assert.equal(calls.length, 0);
  assert.ok(card._confirmation);
  await card._confirmation.run();
  assert.equal(card._rows().some((r) => r.id === 1), false);
  assert.deepEqual(calls.map((c) => c[1]), ["vh_inventory_save_stock_details"]);
  assert.deepEqual(calls[0][2].changes, { quantity: 0 });
});

test("invalid inventory quantities/barcodes never write or close the editor", async () => {
  for (const value of ["-1", "1.5", "", "100000", "abc"]) {
    const { card, calls } = setupInventory();
    card._openEditor(1);
    card._editor.values.quantity = value;
    await card._save();
    assert.equal(calls.length, 0);
    assert.ok(card._editor);
    assert.match(card._status, /valid quantity/);
  }
  const { card, calls } = setupInventory();
  card._openEditor(1);
  card._editor.values.barcode = "not-a-barcode";
  await card._save();
  assert.equal(calls.length, 0);
});

test("inventory rejects duplicate names, conflicting destinations and duplicate barcodes without writing", async () => {
  for (const conflict of ["name", "destination", "barcode", "reference"]) {
    const { card, calls, states, publish } = setupInventory();
    card._openEditor(1);
    if (conflict === "name") card._editor.values.name = "Other product";
    if (conflict === "destination") card._editor.values.location_id = "2";
    if (conflict === "barcode") card._editor.values.barcode = "456";
    if (conflict === "reference") card._editor.values.location_id = "999";
    await card._save();
    assert.equal(calls.length, 0, conflict);
    assert.equal(card._blocked, false);
    assert.ok(card._status);
    assert.ok(card._editor);
  }
});

test("inventory preflight detects row and metadata conflicts and stale removal confirmations", async () => {
  for (const conflict of ["row", "metadata", "confirmation"]) {
    const { card, calls, states } = setupInventory();
    if (conflict === "confirmation") {
      await card._remove(1);
      states[1].attributes.stock[0].quantity = 9;
      await card._confirmation.run();
    } else {
      card._openEditor(1);
      card._editor.values.unit = "new";
      if (conflict === "row") states[1].attributes.stock[0].quantity = 9;
      else states[0].attributes.products[0].unit = "concurrent";
      await card._save();
    }
    assert.equal(calls.length, 0);
    assert.equal(card._blocked, true);
  }
});

test("failed inventory writes/readback and lost responses block retries and preserve drafts", async () => {
  for (const failure of ["write", "stale", "readback", "response"]) {
    const { card, calls, errors } = setupInventory();
    const service = card._hass.callService;
    const read = card._hass.callWS;
    let reads = 0;
    if (failure === "write") card._hass.callService = async () => { throw new Error("Rejected"); };
    if (failure === "stale") card._hass.callService = async () => {};
    if (failure === "readback") card._hass.callWS = async (message) => {
      if (++reads === 2) throw new Error("Read failed");
      return read(message);
    };
    if (failure === "response") card._hass.callService = async (...args) => {
      await service(...args);
      throw new Error("Response lost after commit");
    };
    card._openEditor(1);
    Object.assign(card._editor.values, { quantity: "7", unit: "new" });
    await card._save();
    assert.equal(card._blocked, true, failure);
    assert.ok(card._editor);
    assert.match(card._status, /uncertain/);
    assert.equal(errors.length, 1);
    const count = calls.length;
    await card._save();
    assert.equal(calls.length, count);
    await card._refresh();
    assert.equal(card._blocked, true);
    card._editor = null;
    card._hass.callWS = read;
    await card._refresh();
    assert.equal(card._blocked, false);
  }
});

test("inventory operations serialize without queued or repeated writes", async () => {
  const { card, calls } = setupInventory();
  const service = card._hass.callService;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  card._hass.callService = async (...args) => { await gate; await service(...args); };
  const pending = card._change(1, 1);
  await card._change(1, 1);
  card._openEditor();
  await card._print();
  release();
  await pending;
  assert.equal(calls.length, 1);
});

test("inventory quantity caps and unavailable preflight reads never send a write", async () => {
  const { card, calls, states, publish } = setupInventory();
  states[1].attributes.stock[0].quantity = 99999;
  publish();
  await card._change(1, 1);
  assert.equal(calls.length, 0);
  card._hass.callWS = async () => { throw new Error("Preflight unavailable"); };
  await card._change(1, -1);
  assert.equal(calls.length, 0);
  assert.equal(card._blocked, true);
  assert.match(card._status, /unavailable/);
});

test("temporary unavailable inventory data does not leave a stale error status after sensors recover", () => {
  const { card, states, publish, errors } = setupInventory();
  states[1].state = "unavailable";
  publish();
  assert.equal(card._canAct(), false);
  assert.ok(errors.length > 0);
  states[1].state = "3";
  publish();
  assert.equal(card._canAct(), true);
  assert.equal(card._status, "");
});

test("offline, preview, blocked or unavailable inventory services never mutate or print", async () => {
  for (const state of ["offline", "preview", "blocked", "service"]) {
    const { card, calls } = setupInventory();
    if (state === "offline") card._hass.connected = false;
    if (state === "preview") card.preview = true;
    if (state === "blocked") card._blocked = true;
    if (state === "service") card._hass.services = {};
    await card._change(1, 1);
    await card._setField(1, "location", "");
    await card._remove(1);
    card._openEditor();
    await card._print();
    assert.equal(calls.length, 0);
    assert.equal(card._editor, null);
  }
});

test("inventory print uses only the existing full-list script and never claims physical printing succeeded", async () => {
  const { card, calls, states } = setupInventory();
  const original = JSON.stringify(states);
  card._search = "absent";
  card._category = "2";
  await card._print();
  assert.deepEqual(calls, [["script", "vh_print_inventory", {}]]);
  assert.equal(JSON.stringify(states), original);
  assert.match(card._status, /request sent/);
  card._hass.callService = async () => { throw new Error("Printer request failed"); };
  await card._print();
  assert.equal(card._blocked, true);
  assert.match(card._status, /uncertain/);
});

test("inventory live sensor changes preserve local filters and unsaved drafts without calling services", () => {
  const { card, states, publish, calls } = setupInventory();
  card._search = "cafe";
  card._category = "1";
  card._openEditor(1);
  card._editor.values.manufacturer = "Keep draft";
  states[1].attributes.stock[0].quantity = 4;
  publish();
  assert.equal(card._search, "cafe");
  assert.equal(card._category, "1");
  assert.equal(card._editor.values.manufacturer, "Keep draft");
  assert.equal(calls.length, 0);
});

test("dashboard creates one shared bottom navigation outside the scrolling pages", () => {
  const { DashboardCard, context } = setup();
  const element = () => ({
    children: [], dataset: {}, attributes: {},
    append(child) { this.children.push(child); },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener() {}, setConfig() {}, _t: (key) => key,
  });
  context.document = { createElement: element, createTextNode: (text) => text };
  const dashboard = new DashboardCard();
  dashboard.setAttribute = () => {};
  const pages = element();
  const bottom = element();
  dashboard.shadowRoot.querySelector = (selector) => selector === ".pages" ? pages : bottom;
  dashboard.shadowRoot.querySelectorAll = () => bottom.children[0]?.children || [];
  dashboard.setConfig({ translations, language: "nl" });
  assert.equal(pages.children.length, 3);
  assert.equal(bottom.children.length, 1);
  assert.equal(bottom.children[0].className, "page-navigation");
  assert.equal(bottom.children[0].children.length, 3);
  assert.match(dashboard.shadowRoot.innerHTML, /grid-template-rows: minmax\(0, 1fr\) auto/);
  assert.match(dashboard.shadowRoot.innerHTML, /\.pages \{[^}]*overflow-y: auto/);
  assert.match(dashboard.shadowRoot.innerHTML, /\.page-navigation button \{[^}]*height: 68px;[^}]*box-sizing: border-box;[^}]*line-height: 1\.2;/);
});

function setupNavigation() {
  const { DashboardCard, navigationWindow } = setup();
  const dashboard = new DashboardCard();
  let focusCount = 0;
  const makeCard = () => ({
    _busy: false, _saving: false, _queue: [], _confirmId: null, _notice: {},
    _dirty: () => false, _render() {}, _focusInput() { focusCount += 1; },
  });
  const buttons = ["scan", "shopping", "inventory"].map((page) => ({
    dataset: { page }, setAttribute(key, value) { this[key] = value; },
  }));
  dashboard.shadowRoot.querySelectorAll = () => buttons;
  const scan = makeCard();
  const shopping = makeCard();
  const inventory = makeCard();
  inventory._editor = null;
  dashboard._cards = { scan, shopping, inventory };
  dashboard._renderNavigation();
  return { dashboard, scan, shopping, inventory, buttons, navigationWindow, focusCount: () => focusCount };
}

test("in-page navigation switches existing cards, hides the scanner and highlights the active page", () => {
  const { dashboard, scan, shopping, buttons, navigationWindow, focusCount } = setupNavigation();
  assert.equal(scan.hidden, false);
  assert.equal(shopping.hidden, true);
  shopping._confirmId = 10;
  dashboard._switchPage("shopping");
  assert.equal(dashboard._page, "shopping");
  assert.equal(scan.hidden, true);
  assert.equal(shopping.hidden, false);
  assert.equal(shopping._confirmId, null);
  assert.equal(buttons[1]["aria-pressed"], "true");
  assert.equal(buttons[0]["aria-pressed"], "false");
  assert.equal(navigationWindow.location.hash, "#shopping");
  assert.equal(navigationWindow.history.state.keep, true);
  dashboard._switchPage("scan");
  assert.equal(dashboard._cards.scan, scan);
  assert.equal(dashboard._cards.shopping, shopping);
  assert.equal(navigationWindow.location.hash, "");
  assert.equal(buttons[0]["aria-pressed"], "true");
  assert.equal(buttons[1]["aria-pressed"], "false");
  assert.equal(focusCount(), 1);
});

test("unsaved product edits and in-flight saves prevent navigation and are not discarded", () => {
  for (const state of ["dirty", "saving"]) {
    const { dashboard, scan, shopping, navigationWindow } = setupNavigation();
    if (state === "dirty") scan._dirty = () => true;
    else scan._saving = true;
    scan._draft = { values: { manufacturer: "Keep draft" } };
    navigationWindow.location.hash = "#shopping";
    dashboard._switchPage("shopping");
    assert.equal(dashboard._page, "scan");
    assert.equal(scan.hidden, false);
    assert.equal(shopping.hidden, true);
    assert.equal(scan._draft.values.manufacturer, "Keep draft");
    assert.equal(scan._notice.detail, "Save or discard your edits before switching pages.");
    assert.equal(navigationWindow.location.hash, "");
  }
});

test("queued scans, active scans and shopping writes prevent page switching", () => {
  for (const state of ["scan-busy", "scan-queued", "shopping-busy"]) {
    const { dashboard, scan, shopping } = setupNavigation();
    if (state === "scan-busy") scan._busy = true;
    if (state === "scan-queued") scan._queue = [{ barcode: "123" }];
    if (state === "shopping-busy") {
      dashboard._switchPage("shopping");
      shopping._busy = true;
      dashboard._switchPage("scan");
      assert.equal(dashboard._page, "shopping");
    } else {
      dashboard._switchPage("shopping");
      assert.equal(dashboard._page, "scan");
    }
  }
});

test("valid shopping hash selects the page, unknown hashes and invalid page names are ignored", () => {
  const { dashboard, navigationWindow } = setupNavigation();
  navigationWindow.location.hash = "#shopping";
  dashboard._hashChanged();
  assert.equal(dashboard._page, "shopping");
  navigationWindow.location.hash = "#unrelated-dialog";
  dashboard._hashChanged();
  dashboard._switchPage("not-a-page");
  assert.equal(dashboard._page, "shopping");
  navigationWindow.location.hash = "";
  dashboard._hashChanged();
  assert.equal(dashboard._page, "scan");
});

test("wrapper forwards hass and card-editor preview flags without modifying page state", () => {
  const { dashboard, scan, shopping } = setupNavigation();
  const hass = { connected: true, states: {} };
  dashboard.hass = hass;
  assert.equal(scan.hass, hass);
  assert.equal(shopping.hass, hass);
  dashboard.preview = true;
  dashboard._switchPage("shopping");
  assert.equal(scan.preview, true);
  assert.equal(shopping.preview, true);
  assert.equal(dashboard._page, "shopping");
});

test("inventory navigation supports its hash, shared highlighting, retained filters and draft/write guards", () => {
  const { dashboard, inventory, buttons, navigationWindow } = setupNavigation();
  navigationWindow.location.hash = "#inventory";
  dashboard._hashChanged();
  assert.equal(dashboard._page, "inventory");
  assert.equal(buttons[2]["aria-pressed"], "true");
  inventory._search = "keep filter";
  dashboard._switchPage("shopping");
  dashboard._switchPage("inventory");
  assert.equal(inventory._search, "keep filter");
  inventory._editor = { values: { quantity: "5" } };
  dashboard._switchPage("scan");
  assert.equal(dashboard._page, "inventory");
  assert.equal(navigationWindow.location.hash, "#inventory");
  let prevented = false;
  dashboard._beforeUnload({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  inventory._editor = null;
  inventory._busy = true;
  dashboard._switchPage("shopping");
  assert.equal(dashboard._page, "inventory");
  inventory._busy = false;
  inventory._confirmation = {};
  dashboard._switchPage("scan");
  assert.equal(inventory._confirmation, null);
  assert.equal(dashboard._page, "scan");
});
