const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const translations = Object.fromEntries(["en", "nl"].map((language) => [
  language, (() => {
    const catalog = JSON.parse(fs.readFileSync(path.join(root, "translations", `${language}.json`), "utf8"));
    return { ...catalog.generic, ...catalog.touchscreen };
  })(),
]));
const source = fs.readFileSync(path.join(root, "www", "vh-inventory-touchscreen.js"), "utf8");
const languageNames = { English: "en", Nederlands: "nl" };
const kitchenEntities = {
  worktop: "light.z_keuken_werkblad", ceiling: "light.z_keuken_plafond", speaker: "media_player.keuken",
  ledstripWarm: "automation.keuken_werkblad_ledstrip_warm", ledstripCold: "automation.keuken_werkblad_ledstrip_koud",
  ledstripOff: "automation.werkblad_ledstrip_uit", ledstripPower: "switch.tf04_switch",
  worktopAutoOff: "automation.keuken_werkblad_auto_off_if_forgotten",
};

async function mockScanResponse(hass, message, states) {
  if (message.service === "vh_inventory_touchscreen_lookup") {
    return { response: { product_id: null, suggestion: null, online_incomplete: false, truncated: false } };
  }
  await hass.callService(message.domain, message.service, message.service_data);
  const data = message.service_data;
  const product = states.find((row) => row.entity_id.endsWith("_products"))?.attributes.products
    .find((row) => data.product_id != null ? row.id === data.product_id : Number(row.barcode) === Number(data.barcode));
  if (!product) return { response: { outcome: "notfound", product_id: null } };
  const stock = states.find((row) => row.entity_id.endsWith("_stock")).attributes.stock
    .filter((row) => row.product_id === product.id).sort((a, b) => a.id - b.id)
    .map(({id, quantity, location_id}) => ({id, quantity, location_id: location_id ?? null}));
  return { response: { outcome: data.action.toLowerCase(), product_id: product.id,
    ...(data.confirm_alternatives ? { alternatives: [] } : {}),
    quantity: stock.reduce((sum, row) => sum + row.quantity, 0),
    almost_out: product.almost_out, stock,
    on_shopping: states.find((row) => row.entity_id.endsWith("_shopping")).attributes.shopping
      .some((row) => row.product_id === product.id) } };
}

function setup(overrides = {}) {
  const elements = new Map();
  const errors = [];
  const navigationWindow = {
    location: { protocol: "http:", pathname: "/keuken-touchscreen/scan", search: "", hash: "" },
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
    CARD_CONFIG: { configuration: { sections: [], scanners: { sections: [] } }, kitchen: kitchenEntities },
    setTimeout,
    clearTimeout,
    URL,
    window: navigationWindow,
  });
  vm.runInContext(source, context);
  const Card = elements.get("vh-inventory-touchscreen");
  const card = new Card();
  card._config = { translations, language: "nl" };
  const calls = [];
  card.hass = {
    connected: true,
    services: { pyscript: { vh_inventory_touchscreen_scan: {}, vh_inventory_touchscreen_shopping_decision: {},
      vh_inventory_touchscreen_lookup: {},
      vh_inventory_save_product_details: {} } },
    async callService(...args) { calls.push(args); },
    async callWS(message) {
      return message.type === "call_service" ? mockScanResponse(this, message, sampleStates()) : sampleStates();
    },
    ...overrides,
  };
  return { card, calls, errors, Card, context, ShoppingCard: elements.get("vh-inventory-shopping-touchscreen"),
    StockCard: elements.get("vh-inventory-stock-touchscreen"),
    ManagementCard: elements.get("vh-inventory-management-touchscreen"),
    ConfigurationCard: elements.get("vh-inventory-configuration-touchscreen"),
    KitchenCard: elements.get("vh-kitchen-touchscreen"),
    RecipesCard: elements.get("vh-recipes-touchscreen"),
    QuickShoppingCard: elements.get("vh-inventory-quick-shopping-touchscreen"),
    QuickStockCard: elements.get("vh-inventory-quick-stock-touchscreen"),
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
      almost_out: 0,
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

function recipeFixture() {
  return {recipe_id: "demo-recipe", slug: "demo-recipe", name: "Demo recipe", description: "Demo description",
    recipe_servings: 2, total_time: "25 min", ingredients: [{display: "200 g demo pasta"}],
    instructions: [{title: "Demo step", text: "Cook the demo pasta."}], notes: [{title: "Tip", text: "Demo note"}]};
}

function recipeSetup(recipes = {}) {
  const environment = setup();
  const element = () => ({
    children: [], dataset: {}, attributes: {}, listeners: {}, textContent: "", hidden: false,
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    focus(options) { this.focusOptions = options; this.focused = true; },
  });
  environment.context.document = {
    createElement(tagName) { return {...element(), tagName}; },
    createElementNS(namespaceURI, tagName) { return {...element(), namespaceURI, tagName}; },
  };
  const card = new environment.RecipesCard();
  card.setAttribute = () => {};
  const nodes = Object.fromEntries(["#recipe-logo", "#recipes-refresh", "#recipe-toolbar", "#recipe-search",
    "#recipes-status", "#recipe-count", "#recipe-content", "main"].map((key) => [key, element()]));
  const descendants = (node) => [node, ...node.children.flatMap(descendants)];
  card.shadowRoot.querySelector = (selector) => nodes[selector];
  card.shadowRoot.querySelectorAll = (selector) => selector === ".recipe-tile" ?
    descendants(nodes["#recipe-content"]).filter((node) => node.className === "recipe-tile") : [];
  card.setConfig({translations, language: "nl", recipes: {config_entry_id: "demo-mealie", ...recipes}});
  const calls = [];
  card.hass = {connected: true, services: {mealie: {get_recipes: {}, get_recipe: {}}},
    async callWS(message) {
      calls.push(JSON.parse(JSON.stringify(message)));
      return {response: message.service === "get_recipes" ? {recipes: {items: [recipeFixture()]}} : {recipe: recipeFixture()}};
    }};
  return {...environment, card, nodes, calls, descendants};
}

function recipeClock(environment) {
  const timers = new Map(), listeners = new Map();
  let nextId = 0;
  environment.context.setTimeout = (callback, delay) => {
    const id = ++nextId;
    timers.set(id, {callback, delay});
    return id;
  };
  environment.context.clearTimeout = (id) => timers.delete(id);
  environment.context.document.visibilityState = "visible";
  environment.context.document.addEventListener = (name, callback) => listeners.set(name, callback);
  environment.context.document.removeEventListener = (name) => listeners.delete(name);
  return {timers, listeners, async fire() {
    assert.equal(timers.size, 1);
    const [id, timer] = [...timers][0];
    assert.equal(timer.delay, 30000);
    timers.delete(id);
    timer.callback();
    await new Promise(setImmediate);
  }};
}

test("recipes use response-capable native reads and explicitly request every recipe", async () => {
  const {card, calls, nodes} = recipeSetup();
  await card._load();
  assert.deepEqual(calls[0], {type: "call_service", domain: "mealie", service: "get_recipes",
    service_data: {config_entry_id: "demo-mealie", result_limit: -1}, return_response: true});
  assert.equal(card._loaded, true);
  assert.equal(nodes["#recipe-count"].textContent, "1 / 1");
  await card._load("demo-recipe");
  assert.equal(calls[1].service, "get_recipe");
  assert.equal(calls[1].service_data.recipe_id, "demo-recipe");
  assert.equal(card._recipe.name, "Demo recipe");
  assert.equal(card._status, "");
});

test("recipes render text safely, including ingredients, instructions and notes", async () => {
  const {card, nodes, descendants} = recipeSetup();
  card._hass.callWS = async () => ({response: {recipe: {...recipeFixture(), name: "<img src=x onerror=alert(1)>",
    instructions: [{text: "<script>not executable</script>"}]}}});
  await card._load("demo-recipe");
  const children = descendants(nodes["#recipe-content"]);
  assert.ok(children.some((node) => node.textContent === "<img src=x onerror=alert(1)>"));
  assert.ok(children.some((node) => node.textContent === "<script>not executable</script>"));
  assert.ok(children.some((node) => node.textContent === "200 g demo pasta"));
  assert.ok(children.some((node) => node.textContent === "Demo note"));
  assert.ok(children.every((node) => node.innerHTML === undefined));
  assert.equal(nodes["#recipe-toolbar"].hidden, true);
  assert.equal(nodes["#recipe-count"].hidden, true);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /id="recipes-back"|class="back-slot"/);
});

test("cook mode expands preparation locally and returns to the same recipe DOM, scroll and focused control", async () => {
  const {card, nodes, calls} = recipeSetup();
  await card._load("demo-recipe");
  card.parentElement = {scrollTop: 234};
  const detail = nodes["#recipe-content"].children[0], toggle = card._cookToggle;
  const expandPath = toggle.children[0].children[0].attributes.d;
  assert.equal(toggle.attributes["aria-label"], "Kookmodus openen");
  assert.equal(toggle.attributes["aria-pressed"], "false");
  assert.equal(toggle.className, "action-icon recipe-cook-toggle primary");
  toggle.listeners.click();
  assert.equal(card._cookMode, true);
  assert.equal(nodes.main.dataset.cookMode, "true");
  assert.equal(card.parentElement.scrollTop, 0);
  assert.equal(toggle.attributes["aria-label"], "Volledig recept tonen");
  assert.equal(toggle.attributes["aria-pressed"], "true");
  assert.equal(toggle.className, "action-icon recipe-cook-toggle primary");
  assert.notEqual(toggle.children[0].children[0].attributes.d, expandPath);
  assert.equal(toggle.focused, true);
  assert.equal(toggle.focusOptions.preventScroll, true);
  assert.equal(nodes["#recipe-content"].children[0], detail);
  toggle.listeners.click();
  assert.equal(card._cookMode, false);
  assert.equal(nodes.main.dataset.cookMode, "false");
  assert.equal(card.parentElement.scrollTop, 234);
  assert.equal(card._cookToggle, toggle);
  assert.equal(toggle.children[0].children[0].attributes.d, expandPath);
  assert.equal(nodes["#recipe-content"].children[0], detail);
  assert.equal(calls.length, 1);
});

test("cook mode survives routine HA updates and visibility changes without recipe reads or polling", async () => {
  const env = recipeSetup(), clock = recipeClock(env);
  const {card, calls, nodes} = env;
  card.connectedCallback();
  card.setActive(true);
  await new Promise(setImmediate);
  await card._load("demo-recipe");
  card._toggleCookMode();
  const detail = nodes["#recipe-content"].children[0], toggle = card._cookToggle;
  for (let i = 0; i < 3; i++) card.hass = {...card._hass};
  env.context.document.visibilityState = "hidden";
  clock.listeners.get("visibilitychange")();
  env.context.document.visibilityState = "visible";
  clock.listeners.get("visibilitychange")();
  card.setActive(false);
  card.setActive(true);
  assert.equal(card._cookMode, true);
  assert.equal(nodes["#recipe-content"].children[0], detail);
  assert.equal(card._cookToggle, toggle);
  assert.equal(calls.length, 2);
  assert.equal(clock.timers.size, 0);
  card.showList();
  await new Promise(setImmediate);
  assert.equal(card._cookMode, false);
  assert.equal(card._cookToggle, null);
  assert.equal(nodes.main.dataset.cookMode, "false");
  assert.equal(clock.timers.size, 1);
  card.disconnectedCallback();
});

test("new recipe loads and configuration resets do not inherit another recipe's cook mode or scroll", async () => {
  const {card} = recipeSetup();
  card._hass.callWS = async (message) => ({response: {recipe: {...recipeFixture(), recipe_id: message.service_data.recipe_id}}});
  await card._load("demo-recipe");
  card.parentElement = {scrollTop: 500};
  card._toggleCookMode();
  await card._load("next-recipe");
  assert.equal(card._cookMode, false);
  assert.equal(card._detailScroll, 0);
  assert.equal(card._recipe.recipe_id, "next-recipe");
  assert.equal(card._cookToggle.attributes["aria-pressed"], "false");
  card._toggleCookMode();
  card.setConfig(card._config);
  assert.equal(card._cookMode, false);
  assert.equal(card._detailScroll, 0);
  assert.equal(card._cookToggle, null);
});

test("cook mode control is disabled during a foreground recipe read and labeled in both languages", async () => {
  for (const language of ["nl", "en"]) {
    const {card} = recipeSetup();
    card.setConfig({...card._config, language});
    await card._load("demo-recipe");
    assert.equal(card._cookToggle.attributes["aria-label"], language === "nl" ? "Kookmodus openen" : "Enter cook mode");
    card._busy = true;
    card._render();
    assert.equal(card._cookToggle.disabled, true);
    card._toggleCookMode();
    assert.equal(card._cookMode, false);
    card._busy = false;
    card._render();
    card._toggleCookMode();
    assert.equal(card._cookToggle.disabled, false);
    assert.equal(card._cookToggle.attributes["aria-label"], language === "nl" ? "Volledig recept tonen" : "Show full recipe");
  }
});

test("cook mode keeps recipe step text inert and can exit recipes with no preparation steps", async () => {
  const {card, descendants, nodes} = recipeSetup();
  card._hass.callWS = async () => ({response: {recipe: {...recipeFixture(),
    instructions: [{text: "<script>synthetic inert step</script>"}]}}});
  await card._load("demo-recipe");
  card._toggleCookMode();
  assert.ok(descendants(nodes["#recipe-content"]).some((node) => node.textContent === "<script>synthetic inert step</script>"));
  assert.ok(descendants(nodes["#recipe-content"]).every((node) => node.innerHTML === undefined));
  card._hass.callWS = async () => ({response: {recipe: {...recipeFixture(), instructions: []}}});
  await card._load("demo-recipe");
  card._toggleCookMode();
  assert.equal(card._cookMode, true);
  card._toggleCookMode();
  assert.equal(card._cookMode, false);
});

test("recipe photographs use only the configured origin, recipe UUID and safe image version", async () => {
  const {card, nodes, descendants} = recipeSetup({image_origin: "http://mealie.example:9925/"});
  const recipe = {...recipeFixture(), recipe_id: "00000000-0000-4000-8000-000000000001",
    image: "demo-v1", image_url: "https://untrusted.example/photo", original_url: "https://untrusted.example"};
  card._hass.callWS = async (message) => ({response: message.service === "get_recipes" ?
    {recipes: {items: [recipe]}} : {recipe}});
  await card._load();
  const photo = descendants(nodes["#recipe-content"]).find((node) => node.tagName === "img");
  assert.equal(photo.src, "http://mealie.example:9925/api/media/recipes/00000000-0000-4000-8000-000000000001/images/tiny-original.webp?version=demo-v1");
  assert.equal(photo.loading, "lazy");
  assert.equal(photo.decoding, "async");
  assert.equal(photo.referrerPolicy, "no-referrer");
  assert.equal(photo.alt, "");
  assert.equal(photo.hidden, false);
  await card._load(recipe.recipe_id);
  const detailPhoto = descendants(nodes["#recipe-content"]).find((node) => node.tagName === "img");
  assert.match(detailPhoto.src, /\/images\/original\.webp\?version=demo-v1$/);
  assert.equal(detailPhoto.loading, "eager");
});

test("missing or unsafe recipe photograph metadata keeps a visible placeholder without image requests", async () => {
  for (const fields of [{image: null}, {image: ""}, {image: "https://untrusted.example"},
    {image: "../secret"}, {image: "a".repeat(129)}, {image: {}},
    {image: "demo", recipe_id: "../secret"}, {image: "demo", recipe_id: "https://untrusted.example"}]) {
    const {card, nodes, descendants} = recipeSetup({image_origin: "http://mealie.example"});
    card._hass.callWS = async () => ({response: {recipes: {items: [{...recipeFixture(),
      recipe_id: "00000000-0000-4000-8000-000000000001", ...fields}]}}});
    await card._load();
    const children = descendants(nodes["#recipe-content"]);
    assert.equal(children.some((node) => node.tagName === "img"), false);
    const fallback = children.find((node) => node.className === "recipe-photo-fallback");
    assert.equal(fallback.textContent, "");
    assert.equal(fallback.attributes.role, "img");
    assert.equal(fallback.attributes["aria-label"], "Foto niet beschikbaar");
    assert.equal(fallback.children[0].tagName, "svg");
    assert.equal(card._error, false);
  }
});

test("missing-photo cookbook icon is local and accessible in both recipe views and languages", async () => {
  for (const language of ["nl", "en"]) {
    const {card, nodes, descendants} = recipeSetup();
    card.setConfig({...card._config, language});
    for (const recipeId of [null, "demo-recipe"]) {
      await card._load(recipeId);
      const children = descendants(nodes["#recipe-content"]);
      const fallback = children.find((node) => node.className === "recipe-photo-fallback");
      assert.equal(fallback.attributes["aria-label"], language === "nl" ? "Foto niet beschikbaar" : "Photo unavailable");
      assert.equal(fallback.textContent, "");
      const icon = fallback.children[0];
      assert.equal(icon.namespaceURI, "http://www.w3.org/2000/svg");
      assert.equal(icon.attributes.viewBox, "0 0 24 24");
      assert.equal(icon.attributes["aria-hidden"], "true");
      assert.equal(icon.attributes.focusable, "false");
      assert.equal(icon.children[0].namespaceURI, icon.namespaceURI);
      assert.match(icon.children[0].attributes.d, /^M4 3h7/);
      assert.equal(children.some((node) => node.tagName === "img"), false);
      assert.equal(nodes["#recipes-refresh"].hidden, true);
    }
  }
});

test("recipe count and feedback share a compact reserved row without rebuilding unchanged tiles", async () => {
  const {card, nodes} = recipeSetup();
  await card._load();
  const grid = nodes["#recipe-content"].children[0];
  assert.match(card.shadowRoot.innerHTML,
    /class="recipe-feedback"><p id="recipes-status"[^>]*><\/p>\s*<p id="recipe-count"/);
  assert.match(card.shadowRoot.innerHTML, /\.recipe-feedback \{[^}]*height: 28px;[^}]*flex: 0 0 28px;/);
  for (const status of ["", "Loading recipes...", "Unable to load recipes. Check Mealie and refresh."]) {
    card._status = status;
    card._render();
    assert.equal(nodes["#recipe-content"].children[0], grid);
    assert.equal(nodes["#recipes-status"].textContent, card._t(status));
    assert.equal(nodes["#recipe-count"].textContent, "1 / 1");
  }
});

test("invalid or credential-bearing photograph configuration is blocked and visibly reported", async () => {
  for (const image_origin of ["not a URL", "javascript:alert(1)", "data:image/png;base64,AA",
    "http://user:secret@mealie.example", "http://mealie.example/api", "http://mealie.example/?token=secret",
    "http://mealie.example/#secret", {}, 42]) {
    const {card, nodes} = recipeSetup({image_origin});
    assert.equal(card._imageOrigin, null);
    assert.equal(card._imageConfigInvalid, true);
    await card._load();
    assert.equal(nodes["#recipes-status"].textContent,
      "Receptfoto's niet beschikbaar. Controleer het Mealie-afbeeldingsadres.");
    assert.equal(card._recipes.length, 1);
  }
});

test("HTTPS dashboards refuse HTTP recipe images while HTTPS and optional text-only configuration remain valid", () => {
  const {card, navigationWindow} = recipeSetup();
  assert.equal(card._imageConfigInvalid, false);
  assert.equal(card._imageOrigin, null);
  navigationWindow.location.protocol = "https:";
  card.setConfig({...card._config, recipes: {image_origin: "http://mealie.example"}});
  assert.equal(card._imageConfigInvalid, true);
  assert.equal(card._imageOrigin, null);
  card.setConfig({...card._config, recipes: {image_origin: "https://mealie.example"}});
  assert.equal(card._imageConfigInvalid, false);
  assert.equal(card._imageOrigin, "https://mealie.example");
});

test("loaded and failed recipe photographs switch only their reserved frame contents without automatic retries", async () => {
  const {card, nodes, descendants} = recipeSetup({image_origin: "http://mealie.example"});
  card._hass.callWS = async () => ({response: {recipes: {items: [{...recipeFixture(),
    recipe_id: "00000000-0000-4000-8000-000000000001", image: "demo"}]}}});
  await card._load();
  const children = descendants(nodes["#recipe-content"]);
  const frame = children.find((node) => node.className === "recipe-photo");
  const photo = frame.children.find((node) => node.tagName === "img");
  const fallback = frame.children.find((node) => node.className === "recipe-photo-fallback");
  const icon = fallback.children[0];
  photo.listeners.load();
  assert.equal(photo.dataset.loaded, "true");
  assert.equal(photo.hidden, false);
  assert.equal(fallback.hidden, true);
  const src = photo.src;
  photo.listeners.error();
  assert.equal(photo.hidden, true);
  assert.equal(fallback.hidden, false);
  assert.equal(fallback.children[0], icon);
  assert.equal(photo.src, src);
  assert.equal(descendants(nodes["#recipe-content"]).find((node) => node.className === "recipe-photo"), frame);
  assert.equal(nodes["#recipes-refresh"].hidden, true);
  assert.equal(card._error, false);
});

test("background recipe polls detect changed photo versions while preserving search and scroll", async () => {
  const env = recipeSetup({image_origin: "http://mealie.example"}), clock = recipeClock(env);
  const {card, nodes, descendants} = env;
  const recipe = {...recipeFixture(), recipe_id: "00000000-0000-4000-8000-000000000001", image: "version1"};
  card._hass.callWS = async () => ({response: {recipes: {items: [recipe]}}});
  card.setActive(true);
  await new Promise(setImmediate);
  const initialGrid = nodes["#recipe-content"].children[0];
  await clock.fire();
  assert.equal(nodes["#recipe-content"].children[0], initialGrid);
  nodes["#recipe-search"].listeners.input({target: {value: "Demo"}});
  card.parentElement = {scrollTop: 123};
  recipe.image = "version2";
  await clock.fire();
  assert.equal(card._search, "Demo");
  assert.equal(card.parentElement.scrollTop, 123);
  assert.match(descendants(nodes["#recipe-content"]).find((node) => node.tagName === "img").src, /version=version2$/);
  card.setActive(false);
});

test("recipe search and navigation return preserve the complete list without network calls", async () => {
  const {card, nodes, calls} = recipeSetup();
  await card._load();
  nodes["#recipe-search"].listeners.input({target: {value: "not present"}});
  assert.equal(nodes["#recipe-count"].textContent, "0 / 1");
  assert.equal(card._recipes.length, 1);
  nodes["#recipe-search"].listeners.input({target: {value: "DESCRIPTION"}});
  assert.equal(nodes["#recipe-count"].textContent, "1 / 1");
  await card._load("demo-recipe");
  card.showList();
  assert.equal(card._recipe, null);
  assert.equal(card._search, "DESCRIPTION");
  assert.equal(nodes["#recipe-toolbar"].hidden, false);
  assert.equal(nodes["#recipe-count"].hidden, false);
  assert.equal(calls.length, 2);
});

test("missing and malformed recipe responses are errors, never empty-list success", async () => {
  for (const response of [undefined, {}, {recipes: {}}, {recipes: {items: null}},
    {recipes: {items: [{name: "Missing ID"}]}}]) {
    const {card, errors} = recipeSetup();
    card._hass.callWS = async () => ({response});
    await card._load();
    assert.equal(card._loaded, false);
    assert.equal(card._status, "Unable to load recipes. Check Mealie and refresh.");
    assert.equal(errors.length, 1);
    assert.equal(card._busy, false);
  }
});

test("empty recipe lists are valid and distinguishable from load failures", async () => {
  const {card, nodes, descendants} = recipeSetup();
  card._hass.callWS = async () => ({response: {recipes: {items: []}}});
  await card._load();
  assert.equal(card._loaded, true);
  assert.equal(card._status, "");
  assert.ok(descendants(nodes["#recipe-content"]).some((node) => node.textContent === "Geen recepten gevonden."));
});

test("invalid details and mismatched recipe identities are rejected", async () => {
  for (const recipe of [{...recipeFixture(), ingredients: [{}]}, {...recipeFixture(), instructions: [null]},
    {...recipeFixture(), instructions: [{text: 42}]}, {...recipeFixture(), notes: [{text: null}]},
    {...recipeFixture(), recipe_id: "different", slug: "different"}]) {
    const {card} = recipeSetup();
    card._hass.callWS = async () => ({response: {recipe}});
    await card._load("demo-recipe");
    assert.equal(card._recipe, null);
    assert.equal(card._status, "Unable to load this recipe. Check Mealie and refresh.");
  }
});

test("recipe reads are lazy, refresh on reopening and ignore responses after leaving the page", async () => {
  const env = recipeSetup();
  recipeClock(env);
  const {card, calls} = env;
  assert.equal(calls.length, 0);
  card.setActive(true);
  await new Promise(setImmediate);
  assert.equal(calls.length, 1);
  card.setActive(false);
  card.setActive(true);
  await new Promise(setImmediate);
  assert.equal(calls.length, 2);
  let resolve;
  card._hass.callWS = () => new Promise((done) => { resolve = done; });
  const pending = card._load("demo-recipe");
  assert.equal(card._busy, true);
  card.setActive(false);
  resolve({response: {recipe: recipeFixture()}});
  await pending;
  assert.equal(card._recipe, null);
  assert.equal(card._busy, false);
  assert.equal(card._status, "");
});

test("visible recipe overview polls every 30 seconds and adds new recipes without locking search or losing scroll", async () => {
  const env = recipeSetup(), clock = recipeClock(env);
  const {card, nodes} = env;
  const items = [recipeFixture()];
  card._hass.callWS = async () => ({response: {recipes: {items}}});
  card.setActive(true);
  await new Promise(setImmediate);
  nodes["#recipe-search"].value = "Demo";
  nodes["#recipe-search"].listeners.input({target: nodes["#recipe-search"]});
  card.parentElement = {scrollTop: 123};
  const replace = nodes["#recipe-content"].replaceChildren.bind(nodes["#recipe-content"]);
  nodes["#recipe-content"].replaceChildren = (...children) => { replace(...children); card.parentElement.scrollTop = 0; };
  let resolve;
  card._hass.callWS = () => new Promise((done) => { resolve = done; });
  await clock.fire();
  assert.equal(card._background, true);
  assert.equal(card._busy, false);
  assert.equal(nodes["#recipe-search"].disabled, false);
  assert.equal(nodes["#recipes-status"].textContent, "");
  resolve({response: {recipes: {items: [...items, {...recipeFixture(), recipe_id: "demo-new", slug: "demo-new", name: "Demo new"}]}}});
  await new Promise(setImmediate);
  assert.equal(card._recipes.length, 2);
  assert.equal(nodes["#recipe-count"].textContent, "2 / 2");
  assert.equal(card._search, "Demo");
  assert.equal(nodes["#recipe-search"].value, "Demo");
  assert.equal(card.parentElement.scrollTop, 123);
  assert.equal(nodes["#recipes-refresh"].hidden, true);
  assert.equal(clock.timers.size, 1);
  card.setActive(false);
  assert.equal(clock.timers.size, 0);
});

test("unchanged recipe polls preserve tile DOM and HA updates do not postpone the timer", async () => {
  const env = recipeSetup(), clock = recipeClock(env);
  const {card, nodes} = env;
  card.setActive(true);
  await new Promise(setImmediate);
  const grid = nodes["#recipe-content"].children[0];
  const timer = card._refreshTimer;
  for (let index = 0; index < 5; index++) card.hass = {...card._hass};
  assert.equal(card._refreshTimer, timer);
  await clock.fire();
  assert.equal(nodes["#recipe-content"].children[0], grid);
  card.setActive(false);
});

test("recipe polling pauses in hidden tabs, open details and disconnected cards, then resumes on the overview", async () => {
  const env = recipeSetup(), clock = recipeClock(env);
  const {card, calls, context} = env;
  card.connectedCallback();
  card.setActive(true);
  await new Promise(setImmediate);
  assert.equal(clock.timers.size, 1);
  context.document.visibilityState = "hidden";
  clock.listeners.get("visibilitychange")();
  assert.equal(clock.timers.size, 0);
  card.hass = {...card._hass};
  assert.equal(calls.length, 1);
  context.document.visibilityState = "visible";
  clock.listeners.get("visibilitychange")();
  await new Promise(setImmediate);
  assert.equal(calls.length, 2);
  await card._load("demo-recipe");
  const recipe = card._recipe;
  assert.equal(clock.timers.size, 0);
  context.document.visibilityState = "hidden";
  clock.listeners.get("visibilitychange")();
  context.document.visibilityState = "visible";
  clock.listeners.get("visibilitychange")();
  card.hass = {...card._hass};
  assert.equal(card._recipe, recipe);
  assert.equal(calls.length, 3);
  card.showList();
  await new Promise(setImmediate);
  assert.equal(calls.length, 4);
  assert.equal(clock.timers.size, 1);
  card.disconnectedCallback();
  assert.equal(clock.timers.size, 0);
  assert.equal(clock.listeners.has("visibilitychange"), false);
});

test("background recipe errors keep cached data, expose recovery and pause polling until an explicit retry", async () => {
  const env = recipeSetup(), clock = recipeClock(env);
  const {card, nodes} = env;
  card.setActive(true);
  await new Promise(setImmediate);
  const read = card._hass.callWS;
  card._hass.callWS = async () => { throw new Error("Demo background failure"); };
  await clock.fire();
  assert.equal(card._recipes.length, 1);
  assert.equal(card._error, true);
  assert.equal(nodes["#recipes-refresh"].hidden, false);
  assert.equal(clock.timers.size, 0);
  card._hass.callWS = read;
  await nodes["#recipes-refresh"].listeners.click();
  assert.equal(card._error, false);
  assert.equal(nodes["#recipes-refresh"].hidden, true);
  assert.equal(clock.timers.size, 1);
  card.setActive(false);
});

test("late background recipes cannot overwrite a recipe opened while the poll was in progress", async () => {
  const env = recipeSetup(), clock = recipeClock(env);
  const {card} = env;
  card.setActive(true);
  await new Promise(setImmediate);
  const read = card._hass.callWS;
  let resolve;
  card._hass.callWS = () => new Promise((done) => { resolve = done; });
  await clock.fire();
  card._hass.callWS = read;
  await card._load("demo-recipe");
  const recipe = card._recipe;
  resolve({response: {recipes: {items: []}}});
  await new Promise(setImmediate);
  assert.equal(card._recipe, recipe);
  assert.equal(card._recipes.length, 1);
  assert.equal(clock.timers.size, 0);
  card.setActive(false);
});

test("reconnecting Home Assistant refreshes the visible recipe overview and restarts polling", async () => {
  const env = recipeSetup(), clock = recipeClock(env);
  const {card, calls} = env;
  card.setActive(true);
  await new Promise(setImmediate);
  card.hass = {...card._hass, connected: false};
  assert.equal(clock.timers.size, 0);
  card.hass = {...card._hass, connected: true};
  await new Promise(setImmediate);
  assert.equal(calls.length, 2);
  assert.equal(clock.timers.size, 1);
  card.setActive(false);
});

test("recipe failures preserve already loaded recipes and allow an explicit retry", async () => {
  const {card, nodes} = recipeSetup();
  await card._load();
  card._hass.callWS = async () => { throw new Error("private backend details"); };
  await card._load();
  assert.equal(card._recipes.length, 1);
  assert.equal(card._status, "Unable to load recipes. Check Mealie and refresh.");
  assert.equal(nodes["#recipes-refresh"].disabled, false);
  assert.equal(nodes["#recipes-refresh"].hidden, false);
});

test("recipe recovery is hidden normally, shown after errors and hidden during a successful retry", async () => {
  const {card, nodes} = recipeSetup();
  const refresh = nodes["#recipes-refresh"];
  assert.equal(refresh.hidden, true);
  await card._load();
  assert.equal(refresh.hidden, true);
  const read = card._hass.callWS;
  card._hass.callWS = async () => { throw new Error("Demo read failure"); };
  await card._load("demo-recipe");
  assert.equal(refresh.hidden, false);
  assert.equal(nodes["#recipe-toolbar"].hidden, true);
  card._hass.callWS = read;
  const retry = refresh.listeners.click();
  assert.equal(refresh.hidden, true);
  await retry;
  assert.equal(card._recipe.recipe_id, "demo-recipe");
  assert.equal(refresh.hidden, true);
  assert.equal(nodes["#recipe-toolbar"].hidden, true);
});

test("returning to the recipe overview cancels pending details without accepting a late response", async () => {
  const {card, nodes} = recipeSetup();
  await card._load();
  let resolve;
  card._hass.callWS = () => new Promise((done) => { resolve = done; });
  const pending = card._load("demo-recipe");
  assert.equal(nodes["#recipe-toolbar"].hidden, true);
  card.showList();
  assert.equal(card._busy, false);
  assert.equal(nodes["#recipe-toolbar"].hidden, false);
  resolve({response: {recipe: recipeFixture()}});
  await pending;
  assert.equal(card._recipe, null);
  assert.equal(card._recipes.length, 1);
});

test("returning to the overview does not hide a list error or its recovery control", async () => {
  const {card, nodes} = recipeSetup();
  card._hass.callWS = async () => { throw new Error("Demo list failure"); };
  await card._load();
  card.showList();
  assert.equal(card._error, true);
  assert.equal(nodes["#recipes-refresh"].hidden, false);
});

test("offline or unconfigured recipes cannot issue calls or arbitrary Mealie actions", async () => {
  const {card, calls, nodes} = recipeSetup();
  await assert.rejects(card._read("import_recipe", {}));
  card.hass = {...card._hass, connected: false};
  assert.equal(nodes["#recipes-refresh"].disabled, true);
  await card._load();
  assert.equal(calls.length, 0);
  card._config.recipes.config_entry_id = "";
  card._render();
  assert.match(nodes["#recipes-status"].textContent, /Recepten zijn niet ingesteld/);
});

test("recipe reads time out visibly and late completions cannot replace the failure", async () => {
  const {card, context} = recipeSetup();
  context.setTimeout = (callback) => { queueMicrotask(callback); return 0; };
  card._hass.callWS = () => new Promise(() => {});
  await card._load();
  assert.equal(card._busy, false);
  assert.equal(card._loaded, false);
  assert.equal(card._status, "Unable to load recipes. Check Mealie and refresh.");
});

test("recipe ingredient fallback retains quantities, units, foods and notes", () => {
  const {card} = recipeSetup();
  assert.equal(card._ingredient({display: "Display text", original_text: "Original"}), "Display text");
  assert.equal(card._ingredient({original_text: "Original"}), "Original");
  assert.equal(card._ingredient({quantity: 2, unit: {name: "tsp"}, food: {name: "demo spice"}, note: "ground"}),
    "2 tsp demo spice ground");
});

test("shared language follows the HA selector and uses the main dashboard's English fallback", () => {
  const { card, context } = setup();
  card._config = { translations, language: "nl", language_names: languageNames };
  for (const [selected, expected] of [
    ["Nederlands", "nl"], ["English", "en"], ["unavailable", "en"], ["unknown", "en"], [undefined, "en"],
  ]) {
    card._hass.states = selected === undefined ? {} : { "input_select.vh_language": { state: selected } };
    assert.equal(context.vhTouchscreenLanguage(card), expected);
    assert.equal(card._t("Save"), translations[expected].Save);
  }
  card._hass = undefined;
  assert.equal(context.vhTouchscreenLanguage(card), "en");
});

test("legacy standalone cards retain configured language and unknown source text stays intact", () => {
  const { card } = setup();
  assert.equal(card._t("Save"), "Opslaan");
  card._config.language = "en";
  assert.equal(card._t("Save"), "Save");
  assert.equal(card._t("Synthetic raw product name"), "Synthetic raw product name");
});

test("in-place language bindings preserve controls, typed values and raw-name suffixes", () => {
  const { card, context } = setup();
  card._config = { translations, language_names: languageNames };
  const input = { value: "Unsaved draft", selected: true };
  const text = { nodeType: 3, nodeValue: "Product" };
  const label = { dataset: { i18n: "Manufacturer" }, children: [input], childNodes: [text, input] };
  const button = { dataset: { i18n: "Save" }, children: [], textContent: "" };
  const aria = { dataset: {}, attrs: {}, setAttribute(key, value) { this.attrs[key] = value; } };
  const placeholder = { dataset: {}, attrs: {}, setAttribute(key, value) { this.attrs[key] = value; } };
  card.shadowRoot.activeElement = input;
  const nodes = {
    "[data-i18n]": [label, button],
    "[data-i18n-aria-label]": [aria],
    "[data-i18n-placeholder]": [placeholder],
    "[data-i18n-title]": [],
  };
  card.shadowRoot.querySelectorAll = (selector) => nodes[selector] || [];
  context.vhTouchscreenAttribute(card, aria, "aria-label", "Category", ": Shopping");
  context.vhTouchscreenAttribute(card, placeholder, "placeholder", "Search by name");
  for (const code of ["nl", "en", "nl"]) {
    card._hass.states = { "input_select.vh_language": { state: code === "nl" ? "Nederlands" : "English" } };
    context.vhTouchscreenTranslate(card);
    assert.equal(text.nodeValue, translations[code].Manufacturer);
    assert.equal(button.textContent, translations[code].Save);
    assert.equal(aria.attrs["aria-label"], `${translations[code].Category}: Shopping`);
    assert.equal(placeholder.attrs.placeholder, translations[code]["Search by name"]);
    assert.equal(card.shadowRoot.activeElement, input);
    assert.equal(label.children[0], input);
    assert.equal(input.value, "Unsaved draft");
  }
});

test("processing and uncertain-scan messages translate live without changing scan state", () => {
  const { card } = setup();
  const nodes = new Map();
  card.shadowRoot.querySelector = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, { dataset: {}, setAttribute() {} });
    return nodes.get(selector);
  };
  card._updateReady = () => {};
  card._renderDetails = () => {};
  card._config = { translations, language_names: languageNames };
  for (const selected of ["Nederlands", "English"]) {
    card._hass.states = { "input_select.vh_language": { state: selected } };
    card._notice = { title: "Processing scan", scan: { barcode: "000123", mode: "Use" }, state: "busy" };
    card._render();
    assert.equal(nodes.get("#notice-detail").textContent, `000123 | ${card._t("Consumed")}`);
    card._notice = { title: "Scan result uncertain", discarded: 2, state: "error" };
    card._render();
    assert.ok(nodes.get("#notice-detail").textContent.includes(card._t("Unsent scans discarded")));
    assert.match(nodes.get("#notice-detail").textContent, /2\.$/);
    assert.equal(card._mode, "Lookup");
  }
});

test("new and recreated cards default to read-only lookup without a service call", async () => {
  const { card, calls, Card } = setup();
  assert.equal(card._mode, "Lookup");
  await card._enqueue("000123");
  assert.equal(calls.length, 0);
  assert.equal(card._result.mode, "Lookup");
  card._mode = "Add";
  assert.equal(new Card()._mode, "Lookup");
});

test("scan modes keep their labels and idle text waits for the next product", () => {
  const { card, calls } = setup();
  const nodes = new Map();
  card.shadowRoot.querySelector = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, { dataset: {}, setAttribute() {} });
    return nodes.get(selector);
  };
  card._updateReady = () => {};
  card._renderDetails = () => {};
  for (const [mode, label] of [
    ["Lookup", "Opzoeken"], ["Add", "Toevoegen"], ["AlmostOut", "Bijna op"], ["Use", "Verbruikt"],
  ]) {
    card._mode = mode;
    card._render();
    assert.equal(card._modeText(mode), label);
    assert.equal(nodes.get("#product-name").textContent, "Wachten op het volgende product");
  }
  card._result = { product: { name: "Demo product" }, mode: "Lookup", stock: 3, shopping: 0 };
  card._render();
  assert.equal(nodes.get("#product-name").textContent, "Demo product");
  card._result.product = null;
  card._render();
  assert.equal(nodes.get("#product-name").textContent, translations.nl["Product not found"]);
  assert.equal(calls.length, 0);
});

test("barcode and product fields have no adjacent mode buttons or stale button references", () => {
  assert.doesNotMatch(source, /#(?:product-)?process\b|id="(?:product-)?process"/);
  assert.match(source, /<input id="barcode"[^>]*enterkeyhint="go"><\/div>/);
  assert.match(source, /<input id="product-search"[^>]*aria-controls="name-search-dialog"><\/div>/);
  assert.match(source, /id="name-search-submit" type="submit"/);
});

test("reserved text slots retain full text and focus only populated visible slots", () => {
  const { context } = setup();
  const element = { textContent: "A full long message", hidden: false };
  assert.equal(context.vhTouchscreenTextSlot(element), element);
  assert.equal(element.tabIndex, 0);
  assert.equal(element.title, element.textContent);
  element.hidden = true;
  context.vhTouchscreenTextSlot(element);
  assert.equal(element.tabIndex, -1);
  element.hidden = false;
  element.textContent = "";
  context.vhTouchscreenTextSlot(element);
  assert.equal(element.tabIndex, -1);
  assert.equal(element.title, "");
});

test("table metadata uses bounded readable text rather than resizing the row or parsing HTML", () => {
  const { context } = setup();
  context.document = { createElement: tag => ({
    tag, children: [], append(child) { this.children.push(child); },
  }) };
  const value = '<b>A long synthetic product name</b>';
  const cell = context.vhTouchscreenTableCell(value);
  assert.equal(cell.tag, "td");
  assert.equal(cell.children.length, 1);
  const text = cell.children[0];
  assert.equal(text.tag, "span");
  assert.equal(text.className, "text-slot table-text");
  assert.equal(text.textContent, value);
  assert.equal(text.title, value);
  assert.equal(text.tabIndex, 0);
  assert.equal(text.innerHTML, undefined);
  assert.match(source, /\.table-text \{[^}]*height: 3em; line-height: 1\.5;/);
});

test("all list and configuration feedback regions reserve their space even when empty", () => {
  assert.equal((source.match(/id="(?:shopping|inventory|record|configuration)-status" class="feedback-slot"/g) || []).length, 5);
  assert.doesNotMatch(source, /#(?:shopping|inventory|record|configuration)-status:empty/);
  assert.match(source, /\.feedback-slot \{ height: 3em; flex: 0 0 3em; margin: 0; font-size: 19px; line-height: 1\.5;/);
  for (const prefix of ["shopping", "inventory", "record"]) {
    assert.match(source, new RegExp(`class="recovery-slot"><button id="${prefix}-refresh"`));
  }
});

test("scan metadata keeps bounded slots and compact scanner help leaves full-size recovery in normal flow", () => {
  assert.match(source, /\.product-heading h2 \{ height: 2\.3em;/);
  assert.match(source, /\.product-heading \.description \{ height: 1\.5em;/);
  assert.match(source, /class="product-badge-slot"><span class="almost-out-badge"/);
  assert.match(source, /class="edit-actions-slot"><div class="edit-actions" id="edit-actions" hidden>/);
  assert.match(source, /class="scan-assistance-slot"><p class="scan-help text-slot" id="scan-help"><\/p>\s*<button id="recover" type="button" hidden/);
  assert.equal((source.match(/id="recover"/g) || []).length, 1);
  assert.match(source, /querySelector\("#scan-help"\)\.hidden = this\._blocked;/);
  assert.match(source, /\.scan-assistance-slot \{ min-height: 32px; margin: 8px 0; \}/);
  assert.match(source, /#recover \{ width: 100%; min-height: 68px;/);
  assert.doesNotMatch(source, /#recover \{[^}]*position: absolute/);
});

test("quick tiles and configuration values keep bounded dimensions as their text changes", () => {
  assert.match(source, /\.product-grid button \{ height: 176px; min-height: 176px;/);
  assert.match(source, /\.setting-value \{[^}]*height: 3em; line-height: 1\.5;/);
  assert.match(source, /\.target-buttons \{[^}]*height: 228px;/);
  assert.match(source, /grid-template-columns: minmax\(0,1fr\) min\(200px,55%\)/);
  assert.doesNotMatch(source, /(?:line-clamp|-webkit-line-clamp):/);
});

test("Consumed is scanner-only display text while queued and sent actions remain Use", async () => {
  const { card, calls } = setup();
  card._mode = "Use";
  await card._enqueue("123");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].action, "Use");
  assert.equal(card._mode, "Use");
  assert.equal(card._result.mode, "Use");
  const nodes = new Map();
  card.shadowRoot.querySelector = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, { dataset: {}, setAttribute() {} });
    return nodes.get(selector);
  };
  card._updateReady = () => {};
  card._renderDetails = () => {};
  card._config = { translations, language_names: languageNames };
  for (const [language, consumed, generic] of [
    ["Nederlands", "Verbruikt", "Gebruiken"], ["English", "Consumed", "Use product"],
  ]) {
    card._hass.states = { "input_select.vh_language": { state: language } };
    card._render();
    assert.equal(nodes.get("#result-mode").textContent, consumed);
    assert.equal(card._t("Use"), generic);
    assert.equal(card._result.mode, "Use");
  }
  assert.match(source, /id="use"[^>]*data-i18n="Consumed"/);
  for (const language of ["nl", "en"]) {
    const catalog = JSON.parse(fs.readFileSync(path.join(root, "translations", `${language}.json`), "utf8"));
    assert.equal(Object.hasOwn(catalog.generic, "Consumed"), false);
    assert.equal(Object.hasOwn(catalog.main, "Consumed"), false);
    assert.equal(catalog.touchscreen.Consumed, translations[language].Consumed);
  }
});

test("quantity and action headings share centered column geometry with their controls", () => {
  const { ShoppingCard, StockCard, ManagementCard } = setup();
  assert.match(ShoppingCard.prototype.setConfig.toString(), /th:nth-child\(4\) \{ text-align: center; \}/);
  assert.match(ShoppingCard.prototype.setConfig.toString(), /\.quantity-controls \{[^}]*justify-content: center;/);
  assert.match(StockCard.prototype.setConfig.toString(), /th:nth-child\(5\), th:nth-child\(6\) \{ text-align: center; \}/);
  assert.match(StockCard.prototype.setConfig.toString(), /\.quantity-controls, \.inventory-actions \{[^}]*justify-content: center;/);
  assert.match(ManagementCard.prototype.setConfig.toString(), /th:last-child \{ text-align: center; \}/);
  assert.match(ManagementCard.prototype.setConfig.toString(), /\.record-actions \{ justify-content: center; \}/);
});

test("barcode suppresses the virtual keyboard and the readonly search launcher opens an editable popup", () => {
  const input = source.match(/<input id="barcode"[^>]*>/)[0];
  assert.match(input, /type="text"/);
  assert.match(input, /inputmode="none"/);
  assert.doesNotMatch(input, /\breadonly\b|\bdisabled\b/);
  const launcher = source.match(/<input id="product-search"[^>]*>/)[0];
  assert.match(launcher, /\breadonly\b/);
  assert.match(launcher, /inputmode="none"/);
  const popup = source.match(/<input id="name-search-input"[^>]*>/)[0];
  assert.match(popup, /inputmode="text"/);
  assert.doesNotMatch(popup, /\breadonly\b/);
  assert.equal((source.match(/inputmode="none"/g) || []).length, 2);
  assert.equal((source.match(/input\.inputMode = "numeric"/g) || []).length, 2);
});

test("scan uses the touchscreen response service, with independent Add mode and no ESPHome device", async () => {
  const { card, calls } = setup();
  card._mode = "Add";
  await card._enqueue("000123");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "pyscript");
  assert.equal(calls[0][1], "vh_inventory_touchscreen_scan");
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
  const { card, calls } = setup({ async callWS(message) {
    return message.type === "call_service" ? mockScanResponse(this, message, states) : states;
  } });
  card._mode = "Lookup";
  await card._enqueue("123");
  assert.equal(calls.length, 0);
  assert.equal(card._result.product, null);
  assert.equal(card._result.stock, null);
  assert.equal(card._notice.title, "Product not found");
  assert.equal(card._notice.detail, "No online details found. Enter product details and press Save. Nothing has been saved.");
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
    async callWS(message) {
      if (message.type === "call_service") return mockScanResponse(this, message, sampleStates());
      reads += 1; return sampleStates();
    },
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
  assert.equal(reads, 5);
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
  const { card } = setup({ async callWS(message) {
    const states = sampleStates({ quantity: 0 });
    return message.type === "call_service" ? mockScanResponse(this, message, states) : states;
  } });
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
  card._hass.callWS = async function(message) {
    const states = sampleStates({ product: false, unresolved: true });
    return message.type === "call_service" ? mockScanResponse(this, message, states) : states;
  };
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
  assert.equal(card._notice.discarded, 1);
  assert.equal(errors.length, 1);
  card._hass.callService = async () => assert.fail("Must not retry");
  await card._enqueue("123");
});

test("failure to refresh data is treated as uncertain even after service success", async () => {
  let reads = 0;
  const { card, calls } = setup({ async callWS(message) {
    if (message.type === "call_service") return mockScanResponse(this, message, sampleStates());
    if (reads++ === 0) return sampleStates();
    throw new Error("Refresh failed");
  } });
  card._mode = "Add";
  await card._enqueue("123");
  assert.equal(calls.length, 1);
  assert.equal(card._blocked, true);
});

test("missing or invalid sensor data cannot masquerade as zero stock or unknown product", async () => {
  for (const states of [[], sampleStates({ product: false }), sampleStates({ quantity: "bad" })]) {
    let reads = 0;
    const { card } = setup({ async callWS(message) {
      return message.type === "call_service" ? mockScanResponse(this, message, sampleStates())
        : reads++ === 0 ? sampleStates() : states;
    } });
    card._mode = "Add";
    await card._enqueue("123");
    assert.equal(card._blocked, true);
    assert.equal(card._result, null);
  }
});

test("navigating away discards buffered scans but allows an in-flight call to settle", async () => {
  let release, started;
  const gate = new Promise((resolve) => { release = resolve; });
  const began = new Promise((resolve) => { started = resolve; });
  const { card, calls } = setup();
  card._hass.callService = async (...args) => { calls.push(args); started(); await gate; };
  card._mode = "Add";
  const done = card._enqueue("123");
  card._enqueue("123");
  await began;
  card.isConnected = false;
  release();
  await done;
  assert.equal(calls.length, 1);
});

async function registrationSetup(mode = "Lookup", online = null) {
  const states = sampleStates({ product: false, quantity: 0 });
  const environment = setup();
  const { card } = environment;
  const creations = [];
  const previews = [];
  card._hass.services.pyscript.vh_inventory_touchscreen_create_product = {};
  card._hass.callWS = async (message) => {
    if (message.type === "get_states") return structuredClone(states);
    if (message.service === "vh_inventory_touchscreen_lookup") {
      previews.push(structuredClone(message));
      return { response: { product_id: null, suggestion: online, online_incomplete: false, truncated: false } };
    }
    if (message.service !== "vh_inventory_touchscreen_create_product") return mockScanResponse(card._hass, message, states);
    creations.push(structuredClone(message));
    const { barcode, mode, details, scan_id } = message.service_data;
    const { location_id, ...metadata } = details;
    states[0].attributes.products.push({ id: 3, barcode: Number(barcode), ...metadata, almost_out: 0 });
    if (mode === "Add") {
      states[1].attributes.stock.push({ id: 3, product_id: 3, location_id, quantity: 1 });
      states[3].attributes.scan_queue = states[3].attributes.scan_queue.filter((row) => row.id !== scan_id);
    }
    return { response: { product_id: 3, quantity: mode === "Add" ? 1 : 0 } };
  };
  card._mode = mode;
  await card._enqueue("000123");
  return { ...environment, states, creations, previews };
}

function resultClock(context) {
  let now = 0, next = 0;
  const jobs = new Map();
  context.setTimeout = (callback, delay) => {
    if (delay < 10000) return callback();
    const id = ++next;
    jobs.set(id, { callback, at: now + delay });
    return id;
  };
  context.clearTimeout = id => jobs.delete(id);
  return { jobs, tick(milliseconds) {
    now += milliseconds;
    for (const [id, job] of [...jobs]) if (job.at <= now) {
      jobs.delete(id);
      job.callback();
    }
  } };
}

function renderScanner(environment) {
  const { card, context } = environment;
  const element = () => ({
    value: "", dataset: {}, children: [], listeners: {},
    setAttribute() {}, removeAttribute(name) { delete this[name]; }, focus() {}, scrollIntoView() {},
    replaceChildren(...children) { this.children = children; },
    append(...children) { this.children.push(...children); },
    addEventListener(event, handler) { this.listeners[event] = handler; },
    querySelectorAll() { return this.children; },
  });
  context.document = { createElement: element };
  const nodes = new Map();
  card.shadowRoot.querySelectorAll = () => [];
  card.shadowRoot.querySelector = selector => {
    if (!nodes.has(selector)) nodes.set(selector, element());
    return nodes.get(selector);
  };
  return nodes;
}

function sampleNews() {
  const now = Date.now();
  return { entity_id: "sensor.vh_touchscreen_news", state: "ready", attributes: {
    updated_at: new Date(now).toISOString(), sample: true,
    headlines: ["NOS", "NU.nl", "Omroep Brabant", "NOS", "NU.nl", "Omroep Brabant"].map((source, index) => ({
      source, title: `Voorbeeld ${index + 1}`, published_at: new Date(now - index * 60000).toISOString(),
      summary: `Korte fictieve RSS-beschrijving ${index + 1}.`,
      url: `https://${({ NOS: "nos.nl", "NU.nl": "www.nu.nl", "Omroep Brabant": "www.omroepbrabant.nl" })[source]}/nieuws/voorbeeld-${index + 1}`,
    })),
  } };
}

function enableNews(environment, news = sampleNews()) {
  const { card } = environment;
  const nodes = environment.nodes || renderScanner(environment);
  card._config.news = { enabled: true };
  card._hass.states = { ...card._hass.states, "sensor.vh_touchscreen_news": news };
  card._render();
  return { ...environment, nodes, news };
}

test("news is opt-in and shows six safely rendered sample headlines with two from each selected publisher", () => {
  const environment = setup({ states: { "sensor.vh_touchscreen_news": sampleNews() } });
  const nodes = renderScanner(environment);
  environment.card._render();
  assert.equal(nodes.get("#news-panel").hidden, true);
  const { card, calls, errors } = enableNews({ ...environment, nodes });
  assert.equal(nodes.get("#news-panel").hidden, false);
  assert.equal(nodes.get(".product-panel").hidden, true);
  const rows = nodes.get("#news-list").children;
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map(row => row.children[0].children[0].textContent).sort(),
    ["NOS", "NOS", "NU.nl", "NU.nl", "Omroep Brabant", "Omroep Brabant"]);
  assert.equal(nodes.get("#news-preview").hidden, false);
  assert.match(nodes.get("#news-status").textContent, /Fictieve koppen.*Live nieuws is nog niet aangesloten/);
  assert.match(nodes.get("#news-updated").textContent, /Laatst bijgewerkt:/);
  card._render();
  assert.equal(nodes.get("#news-list").children, rows);
  assert.equal(calls.length, 0);
  assert.equal(errors.length, 0);
});

test("news keeps only the two newest headlines per source and renders HTML-shaped titles as plain text", () => {
  const news = sampleNews();
  const title = "<img src=x onerror=alert(1)>";
  news.attributes.headlines.unshift({
    source: "NOS", title, published_at: new Date(Date.now() + 1000).toISOString(),
  });
  const { nodes, errors } = enableNews(setup(), news);
  const rows = nodes.get("#news-list").children;
  assert.equal(rows.length, 6);
  assert.equal(rows[0].children[1].children[0].textContent, title);
  assert.equal(rows[0].children[1].children[0].innerHTML, undefined);
  assert.equal(rows.filter(row => row.children[0].children[0].textContent === "NOS").length, 2);
  assert.equal(errors.length, 0);
});

test("missing, empty or malformed news is explicit and does not disable scanning", () => {
  for (const change of ["missing", "unavailable", "empty", "source", "title", "date", "updated", "sample", "length"]) {
    const news = sampleNews();
    if (change === "missing") news.entity_id = "sensor.other";
    if (change === "unavailable") news.state = "unavailable";
    if (change === "empty") news.attributes.headlines = [];
    if (change === "source") news.attributes.headlines[0].source = "Unknown publisher";
    if (change === "title") news.attributes.headlines[0].title = " ";
    if (change === "date") news.attributes.headlines[0].published_at = "not a date";
    if (change === "updated") news.attributes.updated_at = null;
    if (change === "sample") news.attributes.sample = "true";
    if (change === "length") news.attributes.headlines = Array(51).fill(news.attributes.headlines[0]);
    const environment = setup();
    const { card, nodes, calls, errors } = enableNews(environment, news);
    if (change === "missing") {
      delete card._hass.states["sensor.vh_touchscreen_news"];
      card._render();
    }
    assert.equal(nodes.get("#news-panel").hidden, false);
    assert.equal(nodes.get("#news-list").children.length, 0);
    assert.equal(nodes.get("#news-status").textContent, "Nieuws tijdelijk niet beschikbaar.");
    assert.equal(nodes.get("#news-status").dataset.state, "warning");
    assert.equal(nodes.get("#news-updated").hidden, true);
    assert.equal(nodes.get("#barcode").disabled, false);
    assert.equal(card._blocked, false);
    assert.equal(calls.length, 0);
    const count = errors.length;
    card._render();
    assert.equal(errors.length, count);
  }
});

test("cached, offline and partially unavailable news is labelled explicitly", () => {
  for (const change of ["stale", "offline", "partial"]) {
    const news = sampleNews();
    news.attributes.sample = false;
    if (change === "stale") news.state = "stale";
    if (change === "partial") news.attributes.headlines =
      news.attributes.headlines.filter(row => row.source !== "Omroep Brabant");
    const environment = setup();
    if (change === "offline") environment.card._hass.connected = false;
    const { nodes } = enableNews(environment, news);
    assert.equal(nodes.get("#news-list").children.length, change === "partial" ? 4 : 6);
    assert.equal(nodes.get("#news-preview").hidden, true);
    assert.equal(nodes.get("#news-status").dataset.state, "warning");
    assert.match(nodes.get("#news-status").textContent,
      change === "partial" ? /Nieuws tijdelijk niet beschikbaar van: Omroep Brabant/ : /Nieuws kon niet worden vernieuwd/);
  }
});

test("live cached-source failures stay named even when six cached headlines remain", () => {
  const news = sampleNews();
  news.state = "stale";
  news.attributes.sample = false;
  news.attributes.failed_sources = ["NU.nl"];
  const { nodes, calls } = enableNews(setup(), news);
  assert.equal(nodes.get("#news-list").children.length, 6);
  assert.match(nodes.get("#news-status").textContent, /Nieuws tijdelijk niet beschikbaar van: NU.nl/);
  assert.equal(nodes.get("#news-status").dataset.state, "warning");
  assert.equal(calls.length, 0);
});

test("a news worker which stops refreshing is labelled stale after thirty minutes", () => {
  const news = sampleNews();
  news.attributes.sample = false;
  news.attributes.updated_at = new Date(Date.now() - 31 * 60000).toISOString();
  const { nodes } = enableNews(setup(), news);
  assert.equal(nodes.get("#news-list").children.length, 6);
  assert.match(nodes.get("#news-status").textContent, /Nieuws kon niet worden vernieuwd/);
  assert.equal(nodes.get("#news-status").dataset.state, "warning");
});

test("malformed failed-source metadata produces a news-only warning", () => {
  for (const failed_sources of ["NOS", ["Unknown"], ["NOS", "NOS", "NOS", "NOS"]]) {
    const news = sampleNews();
    news.attributes.failed_sources = failed_sources;
    const { nodes, errors, calls } = enableNews(setup(), news);
    assert.equal(nodes.get("#news-list").children.length, 0);
    assert.equal(nodes.get("#news-status").textContent, "Nieuws tijdelijk niet beschikbaar.");
    assert.equal(nodes.get("#barcode").disabled, false);
    assert.equal(errors.length, 1);
    assert.equal(calls.length, 0);
  }
});

test("headline buttons show a plain-text RSS preview without calling Home Assistant or navigating", () => {
  const news = sampleNews();
  news.attributes.sample = false;
  const { card, nodes, calls, navigationWindow } = enableNews(setup(), news);
  const rows = nodes.get("#news-list").children;
  rows[0].children[1].children[0].listeners.click();
  assert.equal(nodes.get("#news-list").hidden, true);
  assert.equal(nodes.get("#news-article").hidden, false);
  assert.equal(nodes.get("#news-article-actions").hidden, false);
  assert.equal(nodes.get("#news-article-title").textContent, news.attributes.headlines[0].title);
  assert.equal(nodes.get("#news-article-source").textContent, "NOS");
  assert.equal(nodes.get("#news-article-summary").textContent, news.attributes.headlines[0].summary);
  assert.equal(nodes.has("#news-open"), false);
  assert.equal(nodes.has("#news-link-unavailable"), false);
  assert.equal(navigationWindow.location.hash, "");
  assert.equal(calls.length, 0);
  card._closeNewsArticle();
  assert.equal(nodes.get("#news-list").hidden, false);
  assert.equal(nodes.get("#news-article").hidden, true);
  assert.equal(nodes.get("#news-list").children, rows);
  assert.equal(card._newsArticle, null);
});

test("reader preserves its selected preview across feed updates and scanner result interruptions", () => {
  const news = sampleNews();
  news.attributes.sample = false;
  const { card, nodes, calls } = enableNews(setup(), news);
  nodes.get("#news-list").children[0].children[1].children[0].listeners.click();
  const selected = card._newsArticle;
  card._hass.states["sensor.vh_touchscreen_news"] = sampleNews();
  card._hass.states["sensor.vh_touchscreen_news"].attributes.headlines[0].title = "New headline";
  card._render();
  assert.equal(card._newsArticle, selected);
  assert.equal(nodes.get("#news-article-title").textContent, selected.title);
  card._result = card._readResult(sampleStates(), { mode: "Lookup", barcode: "123" });
  card._resetDraft();
  card._render();
  assert.equal(nodes.get("#news-panel").hidden, true);
  card._closeResult();
  assert.equal(nodes.get("#news-panel").hidden, false);
  assert.equal(nodes.get("#news-article").hidden, false);
  assert.equal(card._newsArticle, selected);
  card._closeNewsArticle();
  assert.equal(nodes.get("#news-list").children[0].children[1].children[0].textContent, "New headline");
  assert.equal(calls.length, 0);
});

test("sample and legacy rows still open previews but never invent a full-story link", () => {
  for (const legacy of [false, true]) {
    const news = sampleNews();
    if (legacy) for (const row of news.attributes.headlines) {
      delete row.url;
      delete row.summary;
    }
    const { nodes, calls } = enableNews(setup(), news);
    nodes.get("#news-list").children[0].children[1].children[0].listeners.click();
    assert.equal(nodes.get("#news-article").hidden, false);
    assert.equal(nodes.has("#news-open"), false);
    assert.equal(nodes.has("#news-link-unavailable"), false);
    assert.equal(nodes.get("#news-article-summary").textContent, legacy
      ? "Voor dit bericht is geen voorbeeld beschikbaar." : news.attributes.headlines[0].summary);
    assert.equal(calls.length, 0);
  }
});

test("kiosk reader exposes no external-story control even when feed rows carry URLs", () => {
  for (const url of [
    "javascript:alert(1)", "data:text/html,hello", "http://nos.nl/artikel/1",
    "https://nos.nl.example.invalid/artikel/1", "https://example.invalid/nos.nl",
    "https://www.nu.nl/artikel/1", "https://user:secret@nos.nl/artikel/1",
    "https://nos.nl:8123/artikel/1", "https://nos.nl\\@example.invalid/article",
    "https://nos.nl/\narticle", {}, null,
  ]) {
    const news = sampleNews();
    news.attributes.sample = false;
    news.attributes.headlines[0].url = url;
    const { nodes, calls } = enableNews(setup(), news);
    nodes.get("#news-list").children[0].children[1].children[0].listeners.click();
    assert.equal(nodes.has("#news-open"), false, JSON.stringify(url));
    assert.equal(nodes.has("#news-link-unavailable"), false);
    assert.equal(calls.length, 0);
  }
  assert.doesNotMatch(source, /id="news-open"|id="news-link-unavailable"|function vhTouchscreenNewsUrl/);
  assert.doesNotMatch(setup().Card.prototype._renderNewsArticle.toString(), /href|window\.open/);
});

test("cached readers survive missing feed data with an explicit warning and no unsafe HTML", () => {
  const news = sampleNews();
  news.attributes.sample = false;
  news.attributes.headlines[0].summary = "<img src=x onerror=alert(1)> Plain summary.";
  const { card, nodes, errors } = enableNews(setup(), news);
  nodes.get("#news-list").children[0].children[1].children[0].listeners.click();
  assert.equal(nodes.get("#news-article-summary").textContent, news.attributes.headlines[0].summary);
  assert.equal(nodes.get("#news-article-summary").innerHTML, undefined);
  delete card._hass.states["sensor.vh_touchscreen_news"];
  card._render();
  assert.equal(nodes.get("#news-article").hidden, false);
  assert.equal(nodes.get("#news-status").textContent, "Nieuws tijdelijk niet beschikbaar.");
  card._closeNewsArticle();
  assert.equal(nodes.get("#news-article").hidden, true);
  assert.equal(nodes.get("#news-list").children.length, 0);
  assert.equal(errors.length, 0);
});

test("oversized or non-text RSS summaries fail explicitly without affecting scanner controls", () => {
  for (const summary of ["x".repeat(601), {}]) {
    const news = sampleNews();
    news.attributes.headlines[0].summary = summary;
    const { nodes, calls, errors } = enableNews(setup(), news);
    assert.equal(nodes.get("#news-status").textContent, "Nieuws tijdelijk niet beschikbaar.");
    assert.equal(nodes.get("#barcode").disabled, false);
    assert.equal(calls.length, 0);
    assert.equal(errors.length, 1);
  }
});

test("news yields to processing, saving, uncertain results and active product details", () => {
  const { card, nodes } = enableNews(setup());
  for (const guard of ["_busy", "_saving", "_blocked", "_nameLoading"]) {
    card[guard] = true;
    card._render();
    assert.equal(nodes.get("#news-panel").hidden, true, guard);
    card[guard] = false;
    card._render();
    assert.equal(nodes.get("#news-panel").hidden, false, guard);
  }
  card._result = card._readResult(sampleStates(), { mode: "Lookup", barcode: "123" });
  card._resetDraft();
  card._render();
  assert.equal(nodes.get("#news-panel").hidden, true);
  assert.equal(nodes.get(".product-panel").hidden, false);
  card._closeResult();
  assert.equal(nodes.get("#news-panel").hidden, false);
});

test("unknown-product registration replaces news until its unsaved draft is discarded", async () => {
  const environment = await registrationSetup("Lookup");
  const { card, nodes, creations } = enableNews(environment);
  assert.equal(card._draft.create, true);
  assert.equal(nodes.get("#news-panel").hidden, true);
  assert.equal(nodes.get(".product-panel").hidden, false);
  card._closeResult();
  assert.equal(nodes.get("#news-panel").hidden, false);
  assert.equal(creations.length, 0);
});

test("stock-name previews hide news without timing out and Cancel restores it without writes", async () => {
  const environment = stockNameSearchSetup();
  const { card, nodes, calls, context } = enableNews(environment);
  const clock = resultClock(context);
  await card._searchProducts("vanille");
  assert.equal(card._hasPendingNameAction(), true);
  assert.equal(nodes.get("#news-panel").hidden, true);
  card._scheduleResultDismissal();
  clock.tick(20000);
  assert.equal(nodes.get("#news-panel").hidden, true);
  nodes.get("#discard").listeners.click();
  assert.equal(nodes.get("#news-panel").hidden, false);
  assert.equal(calls.length, 0);
});

test("successful stock results show for ten seconds before news returns and malformed feeds cannot obscure details", async () => {
  const environment = stockNameSearchSetup();
  const { card, nodes, calls, context, news, errors } = enableNews(environment);
  const clock = resultClock(context);
  await card._enqueue("123");
  assert.equal(card._result.stock, 2);
  assert.equal(nodes.get("#news-panel").hidden, true);
  news.attributes.headlines = null;
  card._render();
  assert.equal(nodes.get(".product-panel").hidden, false);
  assert.equal(errors.length, 0);
  clock.tick(9999);
  assert.equal(nodes.get("#news-panel").hidden, true);
  clock.tick(1);
  assert.equal(card._result, null);
  assert.equal(nodes.get("#news-panel").hidden, false);
  assert.equal(nodes.get("#news-status").textContent, "Nieuws tijdelijk niet beschikbaar.");
  assert.equal(calls.length, 1);
  assert.equal(errors.length, 1);
});

function nameSearchSetup() {
  const states = sampleStates();
  const first = states[0].attributes.products[0];
  first.name = "Caf\u00e9 havermelk";
  states[0].attributes.products.push({ ...first, id: 2, barcode: null, name: "Cafe havermelk vanille" });
  const environment = setup({
    states: Object.fromEntries(states.map(row => [row.entity_id, row])),
    async callWS(message) {
      assert.equal(message.type, "get_states");
      return structuredClone(states);
    },
  });
  const nodes = renderScanner(environment);
  environment.card._hass.callService = async (...args) => {
    environment.calls.push(args);
    Object.assign(states[0].attributes.products.find(row => row.id === args[2].id), args[2].changes);
  };
  return { ...environment, states, nodes };
}

test("product name search waits for four characters, ignores case/accents and renders safe stable matching buttons", async () => {
  const { card, nodes, calls } = nameSearchSetup();
  for (const query of ["", "c", "ca", "caf"]) {
    await card._searchProducts(query);
    assert.equal(nodes.get("#name-results-panel").hidden, true);
    assert.equal(card._result, null);
  }
  await card._searchProducts(" CAF\u00c9 ");
  assert.equal(card._nameMatches.length, 2);
  assert.equal(nodes.get("#name-results-panel").hidden, false);
  assert.equal(nodes.get(".product-panel").hidden, true);
  const buttons = nodes.get("#name-results").children;
  card.hass = { ...card._hass };
  assert.equal(nodes.get("#name-results").children, buttons);
  assert.equal(buttons[0].textContent, "Caf\u00e9 havermelk");
  await buttons[1].listeners.click();
  assert.equal(card._result.product.id, 2);
  assert.equal(nodes.get("#edit-actions").hidden, false);
  assert.equal(calls.length, 0);
});

test("product search uses the MDI keyboard outline with the scan icon's shared pink sizing and alignment", () => {
  const section = source.slice(source.indexOf('<section class="panel product-search-section"'),
    source.indexOf('<form id="product-form"'));
  assert.match(section, /class="scan-intro"><div class="scanner-art" aria-hidden="true"/);
  assert.match(section, /<svg id="mdi-keyboard-outline" viewBox="0 0 24 24" fill="currentColor">/);
  assert.match(section, /M4,5A2,2 0 0,0 2,7V17/);
  assert.match(section, /M8,14V16H16V14H8Z/);
  assert.match(source, /\.scanner-art \{ flex-shrink: 0; color: var\(--cp-accent\); \}/);
  assert.match(source, /\.scanner-art svg \{ display: block; width: 88px; height: 88px; \}/);
  assert.match(source, /\.scanner-art svg \{ width: 56px; height: 56px; \}/);
});

test("mode, barcode and name search use separate matching cards aligned with the logo", () => {
  const { Card } = setup();
  const shell = Card.prototype._renderShell.toString();
  assert.match(shell, /<div class="workspace">\s*<div class="scan-controls">\s*<section class="panel mode-bar"/);
  assert.match(shell, /<\/section>\s*<section class="panel scan-panel">/);
  assert.match(shell, /<\/section>\s*<section class="panel product-search-section"/);
  assert.match(shell, /<\/section>\s*<\/div>\s*<section class="panel product-panel"/);
  assert.match(source, /\.scan-controls \{ display: flex; flex-direction: column; gap: 16px; min-width: 0; align-self: start; \}/);
  assert.match(source, /\.modes \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); gap: 8px;/);
  assert.match(source, /\.scan-panel \{ display: flex; flex-direction: column; \}/);
  assert.match(source, /\.scan-main \.scan-controls > \.panel \{ padding: 20px; \}/);
});

test("every view including scanner and recipe cook mode inherits the same responsive horizontal margins", () => {
  assert.match(source, /main \{ max-width: 1920px; margin: auto; padding: 32px 48px;/);
  assert.match(source, /main \{ padding: 40px 64px; gap: 32px; \}/);
  assert.match(source, /main \{ padding: 24px; \}/);
  assert.match(source, /main \{ padding: 16px; \}/);
  assert.match(source, /\.scan-main \{ padding-block: 32px; gap: 24px; \}/);
  assert.doesNotMatch(source, /\.scan-main(?: > header)? \{[^}]*(?:padding-inline-start|padding:)/);
  assert.match(source, /main\[data-cook-mode="true"\] \{ gap: 0; padding-block: 24px; \}/);
  assert.doesNotMatch(source, /main\[data-cook-mode="true"\] \{[^}]*padding: \d+px \d+px;/);
});

test("scanner title, matching pink mode icon and larger hamburger follow the three-card layout", () => {
  assert.equal(translations.nl["Scan products"], "Boodschappenlijst en voorraad");
  assert.equal(translations.en["Scan products"], "Shopping list and stock");
  assert.match(source, /<svg id="mdi-tune-variant" viewBox="0 0 24 24" fill="currentColor">/);
  assert.match(source, /M8 13C6\.14 13 4\.59 14\.28/);
  assert.match(source, /\.navigation-shortcuts button \{[^}]*width: 104px; height: 104px; min-height: 104px;/);
  assert.match(source, /\.navigation-shortcuts svg \{ display: block; width: 74\.8px; height: 74\.8px; \}/);
  assert.ok(Math.abs(74.8 / 44 - 1.7) < 0.000001);
});

test("unique name lookup and Save use product IDs even without barcodes and preserve stock/shopping", async () => {
  const { card, states, calls, nodes } = nameSearchSetup();
  const before = JSON.stringify(states.slice(1));
  await card._searchProducts("havermelk vani");
  assert.equal(card._result.product.id, 2);
  assert.equal(card._result.barcode, "");
  assert.equal(card._result.mode, "Lookup");
  assert.equal(nodes.get("#new-name").disabled, false);
  assert.equal(nodes.get("#product-source").textContent, "Uit database");
  assert.equal(calls.length, 0);
  card._editField("name", "Updated vanilla");
  await card._searchProducts("another query");
  assert.equal(card._nameQuery, "havermelk vani");
  assert.equal(nodes.get("#product-search").disabled, true);
  await card._saveDetails();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].id, 2);
  assert.equal(card._result.product.name, "Updated vanilla");
  assert.equal(JSON.stringify(states.slice(1)), before);
  card._closeResult();
  assert.equal(nodes.get("#product-search").value, "");
  assert.equal(nodes.get(".product-panel").hidden, true);
});

test("zero matches and unavailable catalogues report distinct search outcomes without online lookup or writes", async () => {
  const { card, nodes, calls } = nameSearchSetup();
  await card._searchProducts("no matching name");
  assert.equal(nodes.get("#name-results-status").textContent, "Geen producten gevonden.");
  card._hass.states["sensor.vh_inventory_products"].state = "unavailable";
  await card._searchProducts("havermelk");
  assert.match(nodes.get("#name-results-status").textContent, /Productdatabase niet beschikbaar/);
  assert.equal(card._result, null);
  assert.equal(calls.length, 0);
});

test("product search is disabled in Add and pending selections cannot replace newer queries or barcode scans", async () => {
  for (const mode of ["Add"]) {
    const { card, nodes, calls } = nameSearchSetup();
    card._mode = mode;
    card._render();
    await card._searchProducts("havermelk");
    assert.equal(nodes.get("#product-search").disabled, true);
    assert.equal(card._nameQuery, "");
    assert.equal(card._result, null);
    assert.equal(calls.length, 0);
  }
  for (const replacement of ["query", "barcode", "cancel"]) {
    const { card, states } = nameSearchSetup();
    let release;
    card._hass.callWS = () => new Promise(resolve => { release = resolve; });
    const pending = card._searchProducts("vanille");
    assert.equal(card._nameLoading, true);
    if (replacement === "query") await card._searchProducts("zzzz");
    else if (replacement === "cancel") card._closeResult();
    else {
      card._hass.callWS = async () => structuredClone(states);
      await card._enqueue("123");
    }
    release(structuredClone(states));
    await pending;
    assert.equal(card._nameLoading, false);
    assert.equal(card._result?.product.id ?? null, replacement === "barcode" ? 1 : null);
  }
});

test("deleted selections fail explicitly and normal feedback no longer uses a colored notice box", async () => {
  const { card, states, nodes, calls } = nameSearchSetup();
  await card._searchProducts("cafe");
  states[0].attributes.products = states[0].attributes.products.filter(row => row.id !== 2);
  await card._selectNameProduct(2);
  assert.equal(nodes.get("#name-results-status").textContent, "Het product bestaat niet meer. Zoek opnieuw.");
  assert.equal(calls.length, 0);
  assert.match(source, /class="scan-intro"/);
  assert.match(source, /\.scan-intro \{ display: flex; align-items: center;/);
  assert.doesNotMatch(source, /class="notice" id="notice"/);
  card._notice = { title: "Product found", detail: "Lookup only. Stock and shopping list are unchanged.", state: "ready" };
  card._render();
  assert.equal(nodes.get("#notice").hidden, true);
  card._notice.state = "error";
  card._render();
  assert.equal(nodes.get("#notice").hidden, false);
});

function popupSearchSetup() {
  const environment = nameSearchSetup();
  const { card, context, navigationWindow, nodes } = environment;
  const windowListeners = new Map(), viewportListeners = new Map();
  const pages = { isConnected: true, scrollTop: 140 };
  const properties = new Map();
  const dialog = card.shadowRoot.querySelector("#name-search-dialog");
  dialog.open = false;
  dialog.style = { setProperty: (key, value) => properties.set(key, value) };
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; };
  const input = card.shadowRoot.querySelector("#name-search-input");
  input.focus = () => { card.shadowRoot.activeElement = input; };
  input.blur = () => { card.shadowRoot.activeElement = null; };
  card.getRootNode = () => ({ querySelector: () => pages });
  card.setAttribute = () => {};
  navigationWindow.addEventListener = (key, fn) => windowListeners.set(key, fn);
  navigationWindow.removeEventListener = (key, fn) => {
    if (windowListeners.get(key) === fn) windowListeners.delete(key);
  };
  Object.assign(navigationWindow, { scrollX: 0, scrollY: 30, innerWidth: 1920, innerHeight: 1080,
    scrollTo: position => { navigationWindow.restored = position; } });
  navigationWindow.visualViewport = {
    width: 800, height: 360, offsetLeft: 16, offsetTop: 100,
    addEventListener: (key, fn) => viewportListeners.set(key, fn),
    removeEventListener: (key, fn) => {
      if (viewportListeners.get(key) === fn) viewportListeners.delete(key);
    },
  };
  context.document.addEventListener = () => {};
  context.document.removeEventListener = () => {};
  card._renderShell();
  card._render();
  return { ...environment, dialog, input, properties, windowListeners, viewportListeners, pages };
}

test("tapping the Product field opens search below four characters in Lookup, AlmostOut and Use but not Add", () => {
  const { card, nodes, dialog, calls } = popupSearchSetup();
  assert.equal(nodes.get("#product-search").disabled, false);
  assert.equal(nodes.get("#product-search-section").hidden, false);
  nodes.get("#product-search").listeners.click();
  assert.equal(dialog.open, true);
  assert.equal(card._nameMatches.length, 0);
  assert.equal(nodes.get("#name-search-submit").disabled, false);
  card._closeResult();
  for (const mode of ["Add", "AlmostOut", "Use"]) {
    card._mode = mode;
    card._render();
    assert.equal(nodes.get("#product-search-section").hidden, mode === "Add");
    card._openNameSearch();
    assert.equal(dialog.open, mode !== "Add");
    card._closeResult();
  }
  assert.equal(calls.length, 0);
  assert.equal(translations.nl["Find the product"], "Zoek je product");
});

test("barcode form submission and Product-field Enter remain available without adjacent buttons", () => {
  const { card, nodes, dialog } = popupSearchSetup();
  const scans = [];
  card._enqueue = barcode => { scans.push({ barcode, mode: card._mode }); };
  for (const mode of ["Lookup", "Add", "AlmostOut", "Use"]) {
    card._mode = mode;
    nodes.get("#barcode").value = "123";
    nodes.get("#scan-form").listeners.submit({ preventDefault() {} });
    assert.deepEqual(scans.at(-1), { barcode: "123", mode });
    assert.equal(nodes.get("#barcode").value, "");
    nodes.get("#product-search").listeners.keydown({ key: "Enter", preventDefault() {} });
    assert.equal(dialog.open, mode !== "Add");
    card._closeResult();
  }
});

function stockNameSearchSetup(mode = "Use") {
  const environment = popupSearchSetup();
  const { card, states, calls } = environment;
  card._mode = mode;
  states[1].attributes.stock = [
    { id: 1, product_id: 1, quantity: 3, location_id: 1, location: "Keuken" },
    { id: 2, product_id: 2, quantity: 3, location_id: null },
  ];
  states[2].attributes.shopping = [];
  card._hass.callWS = async message => {
    if (message.type === "get_states") return structuredClone(states);
    assert.equal(message.type, "call_service");
    assert.equal(message.domain, "pyscript");
    assert.equal(message.service, "vh_inventory_touchscreen_scan");
    assert.equal(message.return_response, true);
    const data = JSON.parse(JSON.stringify(message.service_data));
    calls.push([message.domain, message.service, data]);
    const product = states[0].attributes.products.find(row => data.product_id != null
      ? row.id === data.product_id : String(row.barcode) === data.barcode);
    const rows = states[1].attributes.stock.filter(row => row.product_id === product.id);
    const snapshot = () => rows.map(({ id, quantity, location_id }) =>
      ({ id, quantity, location_id: location_id ?? null })).sort((a, b) => a.id - b.id);
    if (data.expected_stock) {
      assert.deepEqual(data.expected_stock, snapshot());
      assert.equal(data.expected_almost_out, product.almost_out);
    }
    let outcome;
    if (data.action === "AlmostOut" && product.almost_out) outcome = "already_almost_out";
    else if (data.action === "Use" && product.almost_out) {
      product.almost_out = 0;
      outcome = "already_counted";
    } else {
      assert.ok(["AlmostOut", "Use"].includes(data.action));
      const row = rows.find(item => item.quantity > 0);
      if (row) row.quantity--;
      if (data.action === "AlmostOut") product.almost_out = 1;
      outcome = data.action === "AlmostOut" ? "almost_out" : row ? "use" : "shopping";
    }
    return { response: { outcome, product_id: product.id,
      ...(data.confirm_alternatives ? { alternatives: [] } : {}),
      quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      almost_out: product.almost_out, stock: snapshot(), on_shopping: false, audio_requested: true } };
  };
  card._render();
  return environment;
}

test("stock-mode name selection is read-only and Cancel closes without any service call", async () => {
  for (const mode of ["AlmostOut", "Use"]) for (const id of [1, 2]) {
    const { card, nodes, states, calls } = stockNameSearchSetup(mode);
    const before = JSON.stringify(states);
    await card._searchProducts("cafe");
    await nodes.get("#name-results").children[id - 1].listeners.click();
    assert.equal(card._result.product.id, id);
    assert.equal(card._result.mode, mode);
    assert.equal(card._canEdit(), false);
    for (const field of ["new-name", "new-description", "manufacturer", "unit", "category", "store", "locations"]) {
      assert.equal(nodes.get("#" + field).disabled, true);
    }
    assert.equal(nodes.get("#edit-actions").hidden, false);
    assert.equal(nodes.get("#save").textContent, mode === "Use" ? "Verbruikt" : "Bijna op");
    assert.equal(nodes.get("#save").disabled, false);
    assert.equal(nodes.get("#discard").disabled, false);
    assert.match(nodes.get("#edit-status").textContent, /Er is niets gewijzigd/);
    card._editField("name", "Not allowed");
    assert.equal(card._dirty(), false);
    nodes.get("#discard").listeners.click();
    assert.equal(card._result, null);
    assert.equal(nodes.get(".product-panel").hidden, true);
    assert.equal(JSON.stringify(states), before);
    assert.equal(calls.length, 0);
  }
});

test("confirmed stock name actions use product IDs, expected snapshots and exactly one scanner request", async () => {
  for (const mode of ["AlmostOut", "Use"]) for (const id of [1, 2]) {
    const environment = stockNameSearchSetup(mode);
    const { card, nodes, calls, states, context } = environment;
    const clock = resultClock(context);
    await card._searchProducts(id === 2 ? "vanille" : "cafe", id === 2);
    if (id === 1) await card._selectNameProduct(id);
    card._scheduleResultDismissal();
    assert.equal(clock.jobs.size, 0);
    clock.tick(20000);
    assert.equal(card._result.product.id, id);
    const first = nodes.get("#save").listeners.click();
    await nodes.get("#save").listeners.click();
    await first;
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], ["pyscript", "vh_inventory_touchscreen_scan", {
      product_id: id,
      expected_stock: [{ id, quantity: 3, location_id: id === 1 ? 1 : null }],
      expected_almost_out: 0, action: mode,
      ...(mode === "Use" ? { confirm_alternatives: true } : {}),
    }]);
    assert.equal(states[1].attributes.stock.find(row => row.product_id === id).quantity, 2);
    assert.equal(card._result.stock, 2);
    assert.equal(card._result.product.almost_out, mode === "AlmostOut" ? 1 : 0);
    assert.equal(nodes.get("#edit-actions").hidden, true);
    assert.equal(card._blocked, false);
    assert.equal(clock.jobs.size, 1);
    clock.tick(9999);
    assert.ok(card._result);
    clock.tick(1);
    assert.equal(card._result, null);
  }
});

test("confirmed AlmostOut is counted once and subsequent Use only clears its marker", async () => {
  const { card, calls, states, context } = stockNameSearchSetup("AlmostOut");
  resultClock(context);
  await card._searchProducts("vanille");
  await card._confirmNameAction();
  assert.equal(card._result.stock, 2);
  assert.equal(card._result.product.almost_out, 1);
  await card._searchProducts("vanille");
  await card._confirmNameAction();
  assert.equal(card._result.stock, 2);
  assert.equal(card._result.summary, "Already marked almost out. Stock unchanged.");
  card._mode = "Use";
  card._closeResult();
  await card._searchProducts("vanille");
  await card._confirmNameAction();
  assert.equal(card._result.stock, 2);
  assert.equal(card._result.product.almost_out, 0);
  assert.equal(card._result.summary, "Already counted. Stock unchanged; Almost out cleared.");
  assert.equal(states[2].attributes.shopping.length, 0);
  assert.equal(calls.length, 3);
});

test("changed or deleted stock-name selections are rejected before a service request", async () => {
  for (const change of ["quantity", "marker", "location", "row", "delete", "unavailable"]) {
    const { card, calls, states } = stockNameSearchSetup();
    await card._searchProducts("vanille");
    if (change === "quantity") states[1].attributes.stock[1].quantity--;
    if (change === "marker") states[0].attributes.products[1].almost_out = 1;
    if (change === "location") states[1].attributes.stock[1].location_id = 1;
    if (change === "row") states[1].attributes.stock.push({ id: 3, product_id: 2, quantity: 1, location_id: 1 });
    if (change === "delete") states[0].attributes.products.pop();
    if (change === "unavailable") states[1].state = "unavailable";
    const before = JSON.stringify(states);
    await card._confirmNameAction();
    assert.equal(calls.length, 0);
    assert.equal(JSON.stringify(states), before);
    assert.equal(card._result, null);
    assert.equal(card._blocked, false);
    assert.equal(card._notice.state, "error");
    assert.match(card._notice.detail, /No changes were requested.*Search again/);
  }
});

test("stock-name confirmations are disabled when the action is no longer available", async () => {
  for (const guard of ["mode", "service", "connection", "preview", "busy", "saving", "blocked", "queue", "disconnect"]) {
    const { card, calls, nodes } = stockNameSearchSetup();
    await card._searchProducts("vanille");
    if (guard === "mode") card._mode = "Lookup";
    if (guard === "service") delete card._hass.services.pyscript.vh_inventory_touchscreen_scan;
    if (guard === "connection") card._hass.connected = false;
    if (guard === "preview") card.preview = true;
    if (guard === "busy") card._busy = true;
    if (guard === "saving") card._saving = true;
    if (guard === "blocked") card._blocked = true;
    if (guard === "queue") card._queue.push({ barcode: "123", mode: "Use" });
    if (guard === "disconnect") card.isConnected = false;
    card._render();
    assert.equal(nodes.get("#save").disabled, true);
    await card._confirmNameAction();
    assert.equal(calls.length, 0);
    assert.equal(card._result.product.id, 2);
  }
});

test("stock-name selection ignores a response after changing mode and mode buttons discard pending actions", async () => {
  const { card, nodes, states, calls } = stockNameSearchSetup();
  const read = card._hass.callWS;
  let release;
  card._hass.callWS = () => new Promise(resolve => { release = resolve; });
  const pending = card._searchProducts("vanille");
  card._mode = "AlmostOut";
  release(structuredClone(states));
  await pending;
  assert.equal(card._result, null);
  card._hass.callWS = read;
  await card._searchProducts("vanille");
  assert.equal(card._hasPendingNameAction(), true);
  nodes.get("#lookup").listeners.click();
  assert.equal(card._result, null);
  assert.equal(nodes.get("#save").textContent, "Opslaan");
  assert.equal(calls.length, 0);
});

test("stock-name confirmation rechecks connection, preview and service availability after preflight", async () => {
  for (const change of ["connection", "preview", "service"]) {
    const { card, calls, states } = stockNameSearchSetup();
    await card._searchProducts("vanille");
    const read = card._hass.callWS;
    card._hass.callWS = async message => {
      const reply = await read(message);
      if (change === "connection") card._hass.connected = false;
      if (change === "preview") card.preview = true;
      if (change === "service") delete card._hass.services.pyscript.vh_inventory_touchscreen_scan;
      return reply;
    };
    await card._confirmNameAction();
    assert.equal(calls.length, 0);
    assert.equal(states[1].attributes.stock[1].quantity, 3);
    assert.equal(card._notice.state, "error");
    assert.equal(card._blocked, false);
  }
});

test("stock changes after preflight are guarded atomically and never retried automatically", async () => {
  const { card, calls, states, context } = stockNameSearchSetup();
  const clock = resultClock(context);
  await card._searchProducts("vanille");
  const original = card._hass.callWS;
  card._hass.callWS = async message => {
    if (message.type === "call_service") states[1].attributes.stock[1].quantity--;
    return original(message);
  };
  await card._confirmNameAction();
  assert.equal(calls.length, 1);
  assert.equal(states[1].attributes.stock[1].quantity, 2);
  assert.equal(card._blocked, true);
  assert.equal(card._notice.title, "Scan result uncertain");
  assert.equal(clock.jobs.size, 0);
  await card._confirmNameAction();
  assert.equal(calls.length, 1);
});

test("lost stock-action replies and failed readback remain uncertain with no automatic retry", async () => {
  for (const failure of ["reply", "readback"]) {
    const { card, calls, states, context } = stockNameSearchSetup();
    const clock = resultClock(context);
    await card._searchProducts("vanille");
    const original = card._hass.callWS;
    card._hass.callWS = async message => {
      if (message.type === "get_states" && calls.length && failure === "readback") throw Error("Readback unavailable");
      const reply = await original(message);
      if (message.type === "call_service" && failure === "reply") throw Error("Reply lost");
      return reply;
    };
    await card._confirmNameAction();
    assert.equal(calls.length, 1);
    assert.equal(states[1].attributes.stock[1].quantity, 2);
    assert.equal(card._blocked, true);
    assert.equal(card._result, null);
    assert.equal(clock.jobs.size, 0);
    await card._confirmNameAction();
    assert.equal(calls.length, 1);
  }
});

test("barcode stock actions remain immediate without a name-search confirmation or snapshot requirement", async () => {
  const { card, calls, context } = stockNameSearchSetup();
  resultClock(context);
  await card._searchProducts("vanille");
  await card._enqueue("123");
  assert.equal(card._result.product.id, 1);
  assert.equal(card._result.stock, 2);
  assert.equal(card._hasPendingNameAction(), false);
  assert.deepEqual(calls[0], ["pyscript", "vh_inventory_touchscreen_scan", {
    barcode: "123", action: "Use", confirm_alternatives: true }]);
});

function alternativeStockSetup() {
  const environment = stockNameSearchSetup();
  const { card, states, calls, context } = environment;
  const clock = resultClock(context);
  states[0].attributes.products[0].name = "Halvolle melk";
  states[0].attributes.products[1].name = "Halfvolle melk Houdbaar";
  states[1].attributes.stock[0].quantity = 1;
  states[1].attributes.stock[1].quantity = 2;
  const invoke = card._hass.callWS.bind(card._hass);
  card._hass.callWS = async message => {
    if (message.service === "vh_inventory_touchscreen_shopping_decision") {
      const data = JSON.parse(JSON.stringify(message.service_data));
      calls.push([message.domain, message.service, data]);
      assert.deepEqual(data.expected_stock, []);
      assert.equal(data.expected_almost_out, 0);
      assert.equal(data.product_id, 1);
      const listed = states[2].attributes.shopping.some(row => row.product_id === 1);
      if (data.add_to_shopping && !listed) states[2].attributes.shopping.push({ product_id: 1, quantity: 4 });
      return { response: { outcome: data.add_to_shopping ? "shopping_added" : "shopping_kept",
        product_id: 1, quantity: 0, almost_out: 0, stock: [], on_shopping: listed || data.add_to_shopping,
        shopping_added: data.add_to_shopping && !listed } };
    }
    const reply = await invoke(message);
    if (message.service === "vh_inventory_touchscreen_scan") {
      states[1].attributes.stock = states[1].attributes.stock.filter(row => row.quantity > 0);
      reply.response.alternatives = [{ product_id: 2, product: "Halfvolle melk Houdbaar", quantity: 2 }];
    }
    return reply;
  };
  return { ...environment, clock };
}

test("Use shows stocked equivalents and both requested buttons after exactly one decrement", async () => {
  const { card, nodes, calls, clock } = alternativeStockSetup();
  await card._enqueue("123");
  assert.equal(card._result.stock, 0);
  assert.equal(card._result.shopping, 0);
  assert.equal(card._hasPendingShoppingChoice(), true);
  assert.equal(nodes.get("#stock-alternatives").hidden, false);
  assert.equal(nodes.get("#stock-details-fields").hidden, true);
  assert.equal(nodes.get("#product-search-section").hidden, false);
  assert.equal(nodes.get("#stock-alternatives-list").children[0].textContent, "2x Halfvolle melk Houdbaar");
  assert.equal(nodes.get("#save").textContent, "Zet op de boodschappen lijst");
  assert.equal(nodes.get("#discard").textContent, "Niet op de boodschappen lijst zetten");
  assert.equal(nodes.get("#edit-actions").hidden, false);
  assert.equal(calls.length, 1);
  clock.tick(30000);
  assert.equal(card._hasPendingShoppingChoice(), true);
  assert.equal(clock.jobs.size, 0);
});

test("either shopping-choice button leaves the already consumed stock alone and serializes rapid taps", async () => {
  for (const add of [true, false]) {
    const { card, nodes, calls, states, clock } = alternativeStockSetup();
    await card._enqueue("123");
    const before = JSON.stringify(states[1]);
    const button = nodes.get(add ? "#save" : "#discard");
    const pending = button.listeners.click();
    await button.listeners.click();
    await pending;
    assert.equal(calls.length, 2);
    assert.equal(calls[1][1], "vh_inventory_touchscreen_shopping_decision");
    assert.equal(calls[1][2].add_to_shopping, add);
    assert.equal(JSON.stringify(states[1]), before);
    assert.equal(card._result.stock, 0);
    assert.equal(card._result.shopping, add ? 4 : 0);
    assert.equal(card._hasPendingShoppingChoice(), false);
    assert.equal(card._blocked, false);
    clock.tick(10000);
    assert.equal(card._result, null);
  }
});

test("a pending shopping choice blocks scans, name search, close, mode changes and unloading", async () => {
  const { card, nodes, calls } = alternativeStockSetup();
  await card._enqueue("123");
  const result = card._result;
  await card._enqueue("123");
  card._closeResult();
  nodes.get("#lookup").listeners.click();
  card._openNameSearch();
  let prevented = false;
  card._beforeUnload({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(card._result, result);
  assert.equal(card._mode, "Use");
  assert.equal(card._nameSearchEnabled(), false);
  assert.equal(card._queue.length, 0);
  assert.equal(calls.length, 1);
  for (const id of ["barcode", "use", "add", "lookup", "almost-out"]) assert.equal(nodes.get(`#${id}`).disabled, true);
});

test("queued but unsent scans are discarded visibly when a shopping choice interrupts processing", async () => {
  const { card, calls } = alternativeStockSetup();
  card._queue.push({ barcode: "123", mode: "Use" }, { barcode: "123", mode: "Use" });
  await card._drain();
  assert.equal(calls.length, 1);
  assert.equal(card._queue.length, 0);
  assert.ok(card._notice.rawDetail.includes(`${translations.nl["Unsent scans discarded"]}: 1.`));
});

test("name-based Use confirmation reaches the same alternative-stock flow", async () => {
  const { card, calls } = alternativeStockSetup();
  await card._searchProducts("halvolle");
  await card._selectNameProduct(1);
  assert.equal(calls.length, 0);
  await card._confirmNameAction();
  assert.equal(calls[0][2].product_id, 1);
  assert.equal(calls[0][2].confirm_alternatives, true);
  assert.equal(card._hasPendingShoppingChoice(), true);
  await card._resolveShoppingChoice(false);
  assert.equal(card._result.stock, 0);
  assert.equal(calls.length, 2);
});

test("PLUS/JUMBO name confirmation honors threshold two, reports each choice and returns to news ten seconds later", async () => {
  for (const addLast of [true, false]) {
    const { card, nodes, states, calls, context } = stockNameSearchSetup();
    const clock = resultClock(context);
    Object.assign(states[0].attributes.products[0],
      { name: "Houdbare Magere Melk (PLUS)", barcode: 8718989823139, auto_add_threshold: 2 });
    Object.assign(states[0].attributes.products[1],
      { name: "Houdbare Magere Melk (JUMBO)", barcode: 8718452136247 });
    states[1].attributes.stock.forEach(row => { row.quantity = 2; });
    const invoke = card._hass.callWS.bind(card._hass);
    card._hass.callWS = async message => {
      if (message.service === "vh_inventory_touchscreen_shopping_decision") {
        const data = JSON.parse(JSON.stringify(message.service_data));
        calls.push([message.domain, message.service, data]);
        const rows = states[1].attributes.stock.filter(row => row.product_id === 1);
        assert.deepEqual(data.expected_stock, rows.map(({ id, quantity, location_id }) =>
          ({ id, quantity, location_id })));
        if (data.add_to_shopping) states[2].attributes.shopping.push({ product_id: 1, quantity: 4 });
        return { response: { outcome: data.add_to_shopping ? "shopping_added" : "shopping_kept",
          product_id: 1, quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
          almost_out: 0, on_shopping: data.add_to_shopping, shopping_added: data.add_to_shopping } };
      }
      const reply = await invoke(message);
      if (message.service === "vh_inventory_touchscreen_scan") {
        states[1].attributes.stock = states[1].attributes.stock.filter(row => row.quantity > 0);
        reply.response.alternatives = [{ product_id: 2, product: "Houdbare Magere Melk (JUMBO)", quantity: 2 }];
      }
      return reply;
    };
    for (const [before, add] of [[2, false], [1, addLast]]) {
      await card._searchProducts("Magere melk");
      await card._selectNameProduct(1);
      assert.equal(card._result.stock, before);
      await nodes.get("#save").listeners.click();
      assert.equal(card._result.stock, before - 1);
      assert.equal(card._hasPendingShoppingChoice(), true);
      assert.equal(nodes.get("#stock-alternatives-list").children[0].textContent,
        "2x Houdbare Magere Melk (JUMBO)");
      clock.tick(30000);
      assert.equal(card._hasPendingShoppingChoice(), true);
      await nodes.get(add ? "#save" : "#discard").listeners.click();
      assert.equal(card._result.stock, before - 1);
      assert.equal(card._hasPendingShoppingChoice(), false);
      const summary = add
        ? "Product added to shopping list. Stock was not decreased again."
        : "Product not added to shopping list. Stock was not decreased again.";
      assert.equal(nodes.get("#description").textContent, translations.nl[summary]);
      assert.equal(card._result.summary, summary);
      clock.tick(9999);
      assert.ok(card._result);
      clock.tick(1);
      assert.equal(card._result, null);
    }
    assert.equal(calls.filter(row => row[1] === "vh_inventory_touchscreen_scan").length, 2);
    assert.equal(states[1].attributes.stock.find(row => row.product_id === 2).quantity, 2);
    assert.equal(states[2].attributes.shopping.length, addLast ? 1 : 0);
  }
});

test("changed stock requires review before a choice and never repeats consumption", async () => {
  const { card, states, calls } = alternativeStockSetup();
  await card._enqueue("123");
  states[1].attributes.stock.push({ id: 9, product_id: 1, quantity: 2, location_id: null });
  await card._resolveShoppingChoice(true);
  assert.equal(calls.length, 1);
  assert.equal(card._result.stock, 2);
  assert.equal(card._hasPendingShoppingChoice(), true);
  assert.equal(card._blocked, false);
  assert.match(card._notice.detail, /Stock changed.*Consumption was not repeated/);
});

test("uncertain shopping writes are not retried and cannot repeat the consumed stock action", async () => {
  for (const fault of ["lost-response", "malformed-response", "unexpected-stock-change"]) {
    const { card, states, calls } = alternativeStockSetup();
    await card._enqueue("123");
    const invoke = card._hass.callWS.bind(card._hass);
    card._hass.callWS = async message => {
      const response = await invoke(message);
      if (message.service === "vh_inventory_touchscreen_shopping_decision") {
        if (fault === "lost-response") throw new Error("Synthetic lost reply");
        if (fault === "malformed-response") return {};
        states[1].attributes.stock.push({ id: 9, product_id: 1, quantity: 1, location_id: null });
      }
      return response;
    };
    await card._resolveShoppingChoice(true);
    assert.equal(card._blocked, true, fault);
    assert.equal(card._result, null, fault);
    assert.match(card._notice.detail, /Do not rescan or retry automatically/);
    await card._resolveShoppingChoice(true);
    await card._enqueue("123");
    assert.equal(calls.length, 2, fault);
    assert.equal(calls.filter(row => row[1] === "vh_inventory_touchscreen_scan").length, 1);
  }
});

test("read failures and disconnection keep the unresolved choice without requesting more writes", async () => {
  const { card, calls } = alternativeStockSetup();
  await card._enqueue("123");
  card._hass.callWS = async () => { throw new Error("Synthetic offline read"); };
  await card._resolveShoppingChoice(false);
  assert.equal(card._hasPendingShoppingChoice(), true);
  assert.equal(card._blocked, false);
  assert.equal(calls.length, 1);
  card._hass.connected = false;
  await card._resolveShoppingChoice(true);
  assert.equal(calls.length, 1);
  assert.equal(card._hasPendingShoppingChoice(), true);
});

test("malformed alternative metadata blocks further actions instead of fabricating a shopping decision", async () => {
  for (const alternatives of [undefined, null, {}, [{product_id: 1, product: "Self", quantity: 2}],
    [{product_id: 2, product: "Empty", quantity: 0}], [{product_id: 2, product: {}, quantity: 2}]]) {
    const { card, calls } = alternativeStockSetup();
    const invoke = card._hass.callWS.bind(card._hass);
    card._hass.callWS = async message => {
      const response = await invoke(message);
      if (message.service === "vh_inventory_touchscreen_scan") response.response.alternatives = alternatives;
      return response;
    };
    await card._enqueue("123");
    assert.equal(card._blocked, true);
    assert.equal(card._result, null);
    assert.equal(calls.length, 1);
  }
});

test("popup follows visual viewport resize and scroll, restores scroll, and unregisters its listeners", () => {
  const { card, context, navigationWindow, dialog, properties, windowListeners, viewportListeners, pages } = popupSearchSetup();
  context.requestAnimationFrame = fn => fn();
  card._focusInput = () => {};
  card._openNameSearch();
  assert.equal(dialog.open, true);
  assert.equal(properties.get("--vh-search-height"), "360px");
  assert.equal(properties.get("--vh-search-top"), "100px");
  navigationWindow.visualViewport.height = 280;
  viewportListeners.get("resize")();
  assert.equal(properties.get("--vh-search-height"), "280px");
  navigationWindow.visualViewport.offsetTop = 140;
  viewportListeners.get("scroll")();
  assert.equal(properties.get("--vh-search-top"), "140px");
  pages.scrollTop = 300;
  card._closeResult();
  assert.equal(dialog.open, false);
  assert.equal(pages.scrollTop, 140);
  assert.equal(navigationWindow.restored.top, 30);
  assert.equal(windowListeners.has("resize"), false);
  assert.equal(viewportListeners.size, 0);
  navigationWindow.visualViewport = undefined;
  card._openNameSearch();
  windowListeners.get("resize")();
  assert.equal(properties.get("--vh-search-height"), "1080px");
  assert.equal(properties.get("--vh-search-top"), "0px");
  card._closeResult();
});

test("popup keeps unique matches and typing focus until explicit submit or selection", async () => {
  const { card, dialog, input, nodes, calls } = popupSearchSetup();
  card._openNameSearch();
  input.value = "vanille";
  await input.listeners.input({ target: input });
  assert.equal(card._nameMatches.length, 1);
  assert.equal(card._result, null);
  assert.equal(dialog.open, true);
  assert.equal(card.shadowRoot.activeElement, input);
  await nodes.get("#name-search-form").listeners.submit({ preventDefault() {} });
  assert.equal(card._result.product.id, 2);
  assert.equal(dialog.open, false);
  assert.equal(calls.length, 0);
});

test("popup Escape, close and disconnect cancel pending selections without writes", async () => {
  for (const action of ["escape", "keydown", "close", "disconnect"]) {
    const { card, dialog, states, nodes, calls, viewportListeners } = popupSearchSetup();
    card._openNameSearch("cafe");
    let release;
    card._hass.callWS = () => new Promise(resolve => { release = resolve; });
    const pending = card._selectNameProduct(2);
    if (action === "escape") {
      let cancelled = false;
      dialog.listeners.cancel({ preventDefault() { cancelled = true; } });
      assert.equal(cancelled, true);
    } else if (action === "keydown") {
      let cancelled = false;
      dialog.listeners.keydown({ key: "Escape", preventDefault() { cancelled = true; } });
      assert.equal(cancelled, true);
    } else if (action === "close") nodes.get("#name-search-close").listeners.click();
    else card.disconnectedCallback();
    release(structuredClone(states));
    await pending;
    assert.equal(dialog.open, false);
    assert.equal(card._result, null);
    assert.equal(viewportListeners.size, 0);
    assert.equal(calls.length, 0);
  }
});

test("a replacement barcode closes the popup and preserves normal Lookup behavior", async () => {
  const { card, dialog, calls } = popupSearchSetup();
  card._openNameSearch("cafe");
  await card._enqueue("123");
  assert.equal(dialog.open, false);
  assert.equal(card._result.product.id, 1);
  assert.equal(card._nameQuery, "");
  assert.equal(calls.length, 0);
});

test("a stale popup submit cannot move focus from a newer query", async () => {
  const { card, input, nodes, states } = popupSearchSetup();
  card._openNameSearch("vanille");
  let release, focused = false;
  card._hass.callWS = () => new Promise(resolve => { release = resolve; });
  nodes.get("#name-results").focus = () => { focused = true; };
  const pending = nodes.get("#name-search-form").listeners.submit({ preventDefault() {} });
  input.value = "cafe";
  await input.listeners.input({ target: input });
  release(structuredClone(states));
  await pending;
  assert.equal(card._nameMatches.length, 2);
  assert.equal(card.shadowRoot.activeElement, input);
  assert.equal(focused, false);
  assert.equal(card._result, null);
});

test("scanner result starts hidden and Lookup exposes all editable metadata plus both actions", async () => {
  const environment = setup();
  const { card } = environment;
  const nodes = renderScanner(environment);
  card._render();
  assert.equal(nodes.get(".product-panel").hidden, true);
  await card._enqueue("123");
  assert.equal(nodes.get(".product-panel").hidden, false);
  for (const id of ["new-name", "new-description", "manufacturer", "unit", "category", "store",
    "new-auto-add-enabled", "new-auto-add-threshold", "new-auto-add-quantity"]) {
    assert.equal(nodes.get(`#${id}`).disabled, false, id);
  }
  assert.equal(nodes.get("#new-name").value, "Demo product");
  assert.equal(nodes.get("#new-description").value, "Keep description");
  assert.equal(nodes.get("#new-auto-add-quantity").value, "4");
  assert.equal(nodes.get("#edit-actions").hidden, false);
  assert.equal(nodes.get("#new-product-help").hidden, true);
  card._editField("name", "Discarded name");
  card._closeResult();
  assert.equal(card._result, null);
  assert.equal(card._draft, null);
  assert.equal(nodes.get(".product-panel").hidden, true);
});

test("known stock actions are informational and dismiss at ten seconds without changing their stock semantics", async () => {
  for (const mode of ["Add", "Use", "AlmostOut"]) {
    const environment = setupManagement();
    const clock = resultClock(environment.context);
    const card = new (environment.context.customElements.get("vh-inventory-touchscreen"))();
    card._config = { translations, language: "nl" };
    card.hass = environment.mock;
    card._mode = mode;
    const nodes = renderScanner({ ...environment, card });
    await card._enqueue("2000000000015");
    assert.equal(card._canEdit(), false);
    assert.equal(nodes.get("#edit-actions").hidden, true);
    assert.equal(nodes.get("#new-name").disabled, true);
    assert.equal(nodes.get("#new-auto-add-threshold").disabled, true);
    assert.equal(card._result.stock, mode === "Add" ? 4 : 2);
    assert.equal(card._result.product.almost_out, mode === "AlmostOut" ? 1 : 0);
    assert.ok(card._result.summary);
    assert.equal(clock.jobs.size, 1);
    clock.tick(9999);
    assert.ok(card._result);
    clock.tick(1);
    assert.equal(card._result, null);
    assert.equal(nodes.get(".product-panel").hidden, true);
  }
});

test("full Lookup save patches metadata only, then dismisses; edits cancel dismissal", async () => {
  const states = sampleStates();
  const { card, context, calls } = setup({
    async callWS() { return structuredClone(states); },
    async callService(...args) {
      calls.push(args);
      Object.assign(states[0].attributes.products[0], args[2].changes);
    },
  });
  const clock = resultClock(context);
  await card._enqueue("123");
  const stockAndShopping = JSON.stringify(states.slice(1));
  assert.equal(clock.jobs.size, 0);
  for (const [field, value] of Object.entries({ name: "Changed", description: "New details",
    auto_add_enabled: "0", auto_add_threshold: "7", auto_add_quantity: "8" })) card._editField(field, value);
  await card._saveDetails();
  assert.equal(calls.length, 1);
  assert.deepEqual({ ...calls[0][2].changes }, {
    name: "Changed", description: "New details", auto_add_enabled: 0, auto_add_threshold: 7, auto_add_quantity: 8,
  });
  assert.equal(JSON.stringify(states.slice(1)), stockAndShopping);
  assert.equal(card._result.product.id, 1);
  assert.equal(clock.jobs.size, 1);
  card._editField("description", "Keep editing");
  assert.equal(clock.jobs.size, 0);
  clock.tick(20000);
  assert.equal(card._draft.values.description, "Keep editing");
  await card._saveDetails();
  clock.tick(10000);
  assert.equal(card._result, null);
});

test("product-field focus outlines stay inside the independently scrolling form", () => {
  assert.match(source, /\.product-panel input:focus-visible, \.product-panel select:focus-visible \{ outline-offset: -3px; \}/);
});

test("unknown stock actions show the stock-specific heading and dismiss without a write or online lookup", async () => {
  for (const language of ["nl", "en"]) for (const mode of ["Use", "AlmostOut"]) {
    const states = sampleStates({ product: false, quantity: 0 });
    const snapshot = JSON.stringify(states);
    const environment = setup({ async callWS(message) {
      assert.equal(message.type, "get_states");
      return structuredClone(states);
    } });
    const { card, context, calls } = environment;
    const clock = resultClock(context);
    const nodes = renderScanner(environment);
    card._config.language = language;
    card._mode = mode;
    await card._enqueue("999");
    assert.equal(nodes.get("#product-name").textContent, translations[language]["Product not found in stock"]);
    assert.equal(nodes.get("#notice-title").textContent, translations[language]["Product not found in stock"]);
    assert.equal(nodes.get("#edit-actions").hidden, true);
    assert.equal(card._draft, null);
    assert.equal(calls.length, 0);
    assert.equal(JSON.stringify(states), snapshot);
    assert.equal(clock.jobs.size, 1);
    clock.tick(9999);
    assert.equal(nodes.get(".product-panel").hidden, false);
    clock.tick(1);
    assert.equal(nodes.get(".product-panel").hidden, true);
    assert.equal(card._result, null);
  }
});

test("online Add uses the new-product heading while Lookup keeps its existing heading and both drafts stay open", async () => {
  for (const language of ["nl", "en"]) for (const mode of ["Lookup", "Add"]) {
    const environment = await registrationSetup(mode,
      { name: "Online demo", description: "", manufacturer: "", unit: "" });
    const { card, context, calls, creations } = environment;
    const clock = resultClock(context);
    const nodes = renderScanner(environment);
    card._config.language = language;
    card._render();
    const title = mode === "Add" ? "New product found online" : "Online product found";
    assert.equal(nodes.get("#product-name").textContent, translations[language][title]);
    assert.equal(nodes.get("#notice-title").textContent, translations[language][title]);
    assert.equal(clock.jobs.size, 0);
    clock.tick(20000);
    assert.equal(nodes.get(".product-panel").hidden, false);
    assert.equal(card._draft.create, true);
    assert.equal(calls.length, 0);
    assert.equal(creations.length, 0);
    card._closeResult();
  }
});

test("online and manual registration stay open until explicit Save or Cancel in both modes", async () => {
  for (const mode of ["Lookup", "Add"]) for (const online of [null,
    { name: "Online demo", description: "Details", manufacturer: "Maker", unit: "box" }]) {
    const { card, context, creations } = await registrationSetup(mode, online);
    const clock = resultClock(context);
    if (!online) card._editField("name", "Manual demo");
    clock.tick(20000);
    assert.ok(card._draft.create);
    assert.equal(creations.length, 0);
    await card._saveDetails();
    assert.equal(creations.length, 1);
    assert.equal(card._result.stock, mode === "Add" ? 1 : 0);
    assert.equal(card._canEdit(), mode === "Lookup");
    clock.tick(9999);
    assert.ok(card._result.product);
    clock.tick(1);
    assert.equal(card._result, null);
  }
});

test("failed saves never start dismissal and obsolete timers cannot hide a newer result", async () => {
  const environment = await registrationSetup("Lookup",
    { name: "Online demo", description: "Details", manufacturer: "Maker", unit: "box" });
  const { card } = environment;
  const clock = resultClock(environment.context);
  await card._saveDetails();
  const stale = [...clock.jobs.values()][0].callback;
  await card._enqueue("999");
  assert.equal(clock.jobs.size, 0);
  stale();
  assert.equal(card._result.barcode, "999");
  card._editField("name", "Different online demo");
  const ws = card._hass.callWS;
  card._hass.callWS = message => {
    if (message.type === "call_service") throw new Error("Synthetic lost response");
    return ws(message);
  };
  await card._saveDetails();
  assert.equal(card._draft.uncertain, true);
  assert.equal(clock.jobs.size, 0);
  clock.tick(20000);
  assert.equal(card._result.barcode, "999");
  card._closeResult();
  assert.equal(card._result, null);
});

test("saving untouched Lookup details performs no write and starts dismissal after a fresh read", async () => {
  const { card, calls, context } = setup();
  const clock = resultClock(context);
  await card._enqueue("123");
  await card._saveDetails();
  assert.equal(calls.length, 0);
  assert.equal(card._notice.title, "Product details saved.");
  assert.equal(clock.jobs.size, 1);
  clock.tick(10000);
  assert.equal(card._result, null);
});

test("both modes show identical online drafts without changing catalogue, stock, shopping or queue", async () => {
  const online = { name: "Online demo", description: "Online details", manufacturer: "Online maker", unit: "box" };
  for (const mode of ["Lookup", "Add"]) {
    const { card, states, calls, creations, previews } = await registrationSetup(mode, online);
    assert.equal(card._result.product, null);
    assert.equal(card._result.stock, null);
    assert.equal(card._result.barcode, "000123");
    for (const [field, value] of Object.entries(online)) assert.equal(card._draft.values[field], value);
    assert.equal(card._dirty(), true);
    assert.equal(card._notice.title, mode === "Add" ? "New product found online" : "Online product found");
    assert.match(card._notice.detail, /Not saved/);
    assert.equal(creations.length, 0);
    assert.equal(calls.length, 0);
    assert.equal(previews.length, 1);
    assert.equal(JSON.stringify(states), JSON.stringify(sampleStates({ product: false, quantity: 0 })));
    assert.deepEqual(previews[0].service_data, { barcode: "000123" });
    card.hass = { ...card._hass };
    assert.equal(card._draft.values.name, online.name);
    await card._enqueue("999");
    assert.equal(previews.length, 1);
    assert.match(card._notice.detail, /Save or discard/);
  }
});

test("prefilled drafts require explicit Save and create zero or one stock item by original mode", async () => {
  for (const mode of ["Lookup", "Add"]) {
    const { card, states, creations } = await registrationSetup(mode,
      { name: "Online demo", description: "Details", manufacturer: "Maker", unit: "box" });
    const beforeQueue = structuredClone(states[3]);
    assert.equal(creations.length, 0);
    await card._saveDetails();
    await card._saveDetails();
    assert.equal(creations.length, 1);
    assert.equal(card._result.product.name, "Online demo");
    assert.equal(card._result.stock, mode === "Add" ? 1 : 0);
    assert.equal(creations[0].service_data.scan_id, null);
    assert.deepEqual(states[3], beforeQueue);
  }
});

test("source badges distinguish online drafts from database readback in both languages", async () => {
  for (const language of ["en", "nl"]) {
    const { card, creations } = await registrationSetup("Lookup",
      { name: "Online demo", description: "Details", manufacturer: "Maker", unit: "box" });
    const nodes = new Map();
    card.shadowRoot.querySelector = (selector) => {
      if (!nodes.has(selector)) nodes.set(selector, { textContent: "", dataset: {}, setAttribute() {} });
      return nodes.get(selector);
    };
    card._updateReady = () => {};
    card._renderDetails = () => {};
    card._config.language = language;
    card._render();
    assert.equal(nodes.get("#product-source").textContent, "Online");
    assert.equal(creations.length, 0);
    await card._saveDetails();
    assert.equal(nodes.get("#product-source").textContent, language === "nl" ? "Uit database" : "From Database");
    assert.equal(nodes.get("#product-name").textContent, "Online demo");
    assert.equal(creations.length, 1);
    card._result = null;
    card._resetDraft();
    card._render();
    assert.equal(nodes.get("#product-source").textContent, "");
    await card._enqueue("999");
    assert.equal(nodes.get("#product-source").textContent, "Online");
    card._resetDraft(false);
    card._render();
    assert.equal(nodes.get("#product-source").textContent, "");
  }
});

test("online misses, incomplete lookups, errors and malformed replies keep an editable manual draft", async () => {
  for (const issue of ["miss", "incomplete", "error", "malformed", "unavailable"]) {
    for (const mode of ["Lookup", "Add"]) {
      const { card, states, creations } = await registrationSetup(mode);
      const original = JSON.stringify(states);
      const callWS = card._hass.callWS;
      card._hass.callWS = async (message) => {
        if (message.service !== "vh_inventory_touchscreen_lookup") return callWS(message);
        if (issue === "error") throw new Error("Demo provider unavailable");
        if (issue === "malformed") return {};
        return { response: { product_id: null, suggestion: null, online_incomplete: issue === "incomplete" } };
      };
      if (issue === "unavailable") delete card._hass.services.pyscript.vh_inventory_touchscreen_lookup;
      await card._enqueue("000123");
      assert.equal(card._blocked, false, `${mode}: ${issue}`);
      assert.equal(card._draft.create, true);
      assert.equal(card._canEdit(), true);
      assert.equal(card._result.product, null);
      assert.equal(creations.length, 0);
      assert.equal(JSON.stringify(states), original);
      assert.equal(card._notice.title, ["error", "malformed", "unavailable"].includes(issue)
        ? "Online lookup failed" : "Product not found");
      if (issue === "incomplete") assert.match(card._notice.detail, /incomplete/);
      card._editField("name", "Manual demo");
      await card._saveDetails();
      assert.equal(creations.length, 1);
    }
  }
});

test("unknown online drafts stop and explicitly discard buffered scans rather than overwrite details", async () => {
  const { card, previews, calls } = await registrationSetup();
  const done = card._enqueue("000123");
  card._enqueue("999");
  await done;
  assert.equal(previews.length, 2);
  assert.equal(card._queue.length, 0);
  assert.equal(card._result.barcode, "000123");
  assert.ok(card._notice.rawDetail.includes(`${card._t("Unsent scans discarded")}: 1`));
  assert.equal(card._canEdit(), true);
  assert.equal(calls.length, 0);
});

test("unreadable initial data never submits an Add mutation or claims an uncertain write", async () => {
  for (const states of [[], sampleStates({ quantity: "bad" })]) {
    const { card, calls } = setup({ async callWS() { return states; } });
    card._mode = "Add";
    await card._enqueue("123");
    assert.equal(calls.length, 0);
    assert.equal(card._blocked, false);
    assert.equal(card._notice.title, "Lookup failed");
  }
});

test("concurrent registration during online lookup shows the catalogue product without adding stock", async () => {
  const { card, states, creations, calls } = await registrationSetup("Add");
  const callWS = card._hass.callWS;
  card._hass.callWS = async (message) => {
    if (message.service === "vh_inventory_touchscreen_lookup") {
      states[0].attributes.products.push(...sampleStates()[0].attributes.products);
      return { response: { product_id: 1, suggestion: null, online_incomplete: false } };
    }
    return callWS(message);
  };
  await card._enqueue("000123");
  assert.equal(card._result.product.name, "Demo product");
  assert.equal(card._result.stock, 0);
  assert.equal(card._draft.create, undefined);
  assert.equal(creations.length, 0);
  assert.equal(calls.length, 0);
  assert.match(card._notice.detail, /This scan did not change stock/);
});

test("truncated online text is visible as a review warning without saving the product", async () => {
  const { card, creations } = await registrationSetup("Lookup");
  const callWS = card._hass.callWS;
  card._hass.callWS = async (message) => message.service === "vh_inventory_touchscreen_lookup"
    ? { response: { product_id: null, suggestion: {
      name: "Demo", description: "D".repeat(255), manufacturer: "", unit: "",
    }, online_incomplete: false, truncated: true } } : callWS(message);
  await card._enqueue("000123");
  assert.equal(card._draft.values.description.length, 255);
  assert.match(card._notice.detail, /shortened/);
  assert.equal(creations.length, 0);
});

test("scanner discard button uses Afbreken in Dutch and Cancel in English", () => {
  assert.match(source, /id="discard" type="button" data-i18n="Cancel editing"/);
  assert.equal(translations.nl["Cancel editing"], "Afbreken");
  assert.equal(translations.en["Cancel editing"], "Cancel");
});

test("unknown Lookup offers all product fields and saves only after explicit Save", async () => {
  const { card, states, creations } = await registrationSetup();
  const before = structuredClone(states.slice(1));
  assert.equal(card._draft.create, true);
  assert.equal(card._result.barcode, "000123");
  assert.equal(card._dirty(), false);
  for (const [field, value] of Object.entries({ name: " New demo ", description: "Details", manufacturer: "Maker",
    unit: "box", category_id: "2", store_id: "1", auto_add_enabled: "1",
    auto_add_threshold: "2", auto_add_quantity: "3" })) card._editField(field, value);
  card._editField("location_id", "2");
  assert.equal(card._draft.values.location_id, "");
  card.hass = { ...card._hass };
  assert.equal(card._draft.values.name, " New demo ");
  assert.equal(creations.length, 0);
  await card._saveDetails();
  assert.equal(creations.length, 1);
  assert.equal(creations[0].return_response, true);
  assert.equal(creations[0].service_data.mode, "Lookup");
  assert.equal(creations[0].service_data.scan_id, null);
  assert.equal(creations[0].service_data.barcode, "000123");
  assert.equal(card._result.product.name, "New demo");
  assert.equal(card._result.product.auto_add_quantity, 3);
  assert.equal(card._result.stock, 0);
  assert.equal(card._dirty(), false);
  assert.deepEqual(states.slice(1), before);
});

test("unknown Add saves the product and exactly one stock item at its selected location", async () => {
  const { card, states, creations } = await registrationSetup("Add");
  const shopping = structuredClone(states[2]);
  card._editField("name", "New demo");
  card._editField("location_id", "2");
  const done = card._saveDetails();
  await card._saveDetails();
  card._editField("name", "Do not replace");
  await card._enqueue("999");
  await done;
  assert.equal(creations.length, 1);
  assert.equal(creations[0].service_data.scan_id, null);
  assert.equal(card._result.product.name, "New demo");
  assert.equal(card._result.stock, 1);
  assert.equal(card._result.inventory[0].location_id, 2);
  assert.equal(states[3].attributes.scan_queue.length, 0);
  assert.deepEqual(states[2], shopping);
  assert.equal(card._notice.detail, "Product saved and one item added to stock.");
});

test("unknown Use and Almost out never offer creation or accept product edits", async () => {
  for (const mode of ["Use", "AlmostOut"]) {
    const { card, creations } = await registrationSetup(mode);
    assert.equal(card._result.product, null);
    assert.equal(card._draft, null);
    card._editField("name", "Must not save");
    await card._saveDetails();
    assert.equal(creations.length, 0);
  }
});

test("registration controls are mode-specific and never enable unknown Use or Almost-out fields", async () => {
  for (const mode of ["Lookup", "Add", "Use", "AlmostOut"]) {
    const { card, context } = await registrationSetup(mode);
    context.document = { createElement: () => ({ value: "", textContent: "" }) };
    const nodes = new Map();
    card.shadowRoot.querySelector = (selector) => {
      if (!nodes.has(selector)) nodes.set(selector, {
        value: "", dataset: {}, type: selector === "#new-auto-add-enabled" ? "checkbox" : "text",
        setAttribute() {},
        replaceChildren(...options) { this.options = options; },
      });
      return nodes.get(selector);
    };
    card._renderDetails();
    const creating = ["Lookup", "Add"].includes(mode);
    card._render = () => card._renderDetails();
    assert.equal(nodes.get("#new-product-fields").hidden, !creating, mode);
    assert.equal(nodes.get("#new-auto-fields").hidden, !creating, mode);
    assert.equal(nodes.get("#edit-actions").hidden, !creating, mode);
    assert.equal(nodes.get("#product-heading").hidden, false, mode);
    assert.equal(nodes.get(".product-panel").dataset.unknown, "true", mode);
    assert.equal(nodes.get("#new-name").disabled, !creating, mode);
    assert.equal(nodes.get("#manufacturer").disabled, !creating, mode);
    assert.equal(nodes.get("#locations").disabled, mode !== "Add", mode);
    assert.equal(nodes.get("#save").disabled, true, mode);
    if (creating) {
      card._editField("name", "New demo");
      card._renderDetails();
      assert.equal(nodes.get("#save").disabled, false, mode);
      for (const id of ["barcode", "add", "use", "lookup", "almost-out"]) {
        assert.equal(nodes.get(`#${id}`).disabled, true, `${mode}: ${id}`);
      }
    }
  }
});

test("registration keeps prominent result headings and unsaved subtitles for misses, hits and provider failures", async () => {
  assert.match(source, /id="product-heading"[\s\S]*?<div class="product-fields">[\s\S]*?id="new-product-fields"/);
  assert.match(source, /\.product-panel\[data-unknown="true"\] \.product-heading h2 \{ height: auto; min-height: 2\.3em; overflow: visible;/);
  assert.match(source, /\.product-panel\[data-details="true"\] \.product-fields \{ overflow-y: auto;/);
  assert.match(source, /\.workspace > \.product-panel, \.workspace > \.news-panel \{ contain: size; min-height: 0; overflow: hidden;/);
  assert.match(source, /@media \(max-width: 1000px\)[\s\S]*?contain: none; overflow: visible;/);
  assert.match(source, /\.product-body \{[^}]*min-height: 0; overflow-y: auto;/);
  assert.match(source, /\.product-footer \{[^}]*flex-shrink: 0;/);
  for (const language of ["en", "nl"]) {
    for (const outcome of ["missing", "online", "incomplete", "error"]) {
      const environment = await registrationSetup("Lookup", outcome === "online"
        ? { name: "Online demo", description: "", manufacturer: "", unit: "" } : null);
      const { card, context, creations } = environment;
      const callWS = card._hass.callWS;
      if (outcome === "incomplete" || outcome === "error") {
        card._hass.callWS = async (message) => {
          if (message.service !== "vh_inventory_touchscreen_lookup") return callWS(message);
          if (outcome === "error") throw new Error("Synthetic lookup failure");
          return { response: { product_id: null, suggestion: null, online_incomplete: true } };
        };
        await card._enqueue("000123");
      }
      context.document = { createElement: () => ({ value: "", textContent: "" }) };
      const nodes = new Map();
      card.shadowRoot.querySelector = (selector) => {
        if (!nodes.has(selector)) nodes.set(selector, {
          value: "", textContent: "", dataset: {}, setAttribute() {},
          type: selector === "#new-auto-add-enabled" ? "checkbox" : "text",
          replaceChildren() {},
        });
        return nodes.get(selector);
      };
      card._updateReady = () => {};
      card._config.language = language;
      card._render();
      const key = outcome === "online" ? "Online product found"
        : outcome === "missing" ? "Product not found" : "Online lookup failed";
      assert.equal(nodes.get("#product-heading").hidden, false);
      assert.equal(nodes.get("#product-name").textContent, translations[language][key]);
      assert.equal(nodes.get("#description").textContent, translations[language]["Not saved."]);
      assert.equal(nodes.get("#stock").textContent, "-");
      assert.equal(creations.length, 0);
      card._notice = { title: "Scan not accepted", detail: "Save or discard your edits before scanning.", state: "warning" };
      card._render();
      assert.equal(nodes.get("#product-name").textContent, translations[language][key]);
    }
  }
});

test("registration rejects invalid fields, missing references and concurrent duplicates before writing", async () => {
  for (const issue of ["name", "quantity", "reference", "duplicate", "barcode", "scan"]) {
    const { card, states, creations } = await registrationSetup(issue === "scan" ? "Add" : "Lookup");
    card._editField("name", "New demo");
    if (issue === "name") card._editField("name", " ");
    if (issue === "quantity") card._editField("auto_add_quantity", "0");
    if (issue === "reference") states[4].state = "unavailable";
    if (issue === "duplicate") states[0].attributes.products.push({ id: 9, barcode: 999, name: "new DEMO" });
    if (issue === "barcode") states[0].attributes.products.push({ id: 9, barcode: 123, name: "Other" });
    if (issue === "scan") card._result.scan_id = 0;
    await card._saveDetails();
    assert.equal(creations.length, 0, issue);
    assert.ok(card._editNotice, issue);
  }
});

test("online duplicate-name saves show localized errors, focus the name and allow a corrected save", async () => {
  for (const language of ["en", "nl"]) {
    for (const mode of ["Lookup", "Add"]) {
      const environment = await registrationSetup(mode,
        { name: "Online demo", description: "Keep details", manufacturer: "Maker", unit: "box" });
      const { card, states, creations, context } = environment;
      states[0].attributes.products.push({ id: 9, barcode: 999, name: "ONLINE DEMO" });
      context.document = { createElement: () => ({ value: "", textContent: "" }) };
      const nodes = new Map();
      card.shadowRoot.querySelectorAll = () => [];
      card.shadowRoot.querySelector = (selector) => {
        if (!nodes.has(selector)) nodes.set(selector, {
          value: "", textContent: "", dataset: {}, attributes: {},
          type: selector === "#new-auto-add-enabled" ? "checkbox" : "text",
          setAttribute(key, value) { this.attributes[key] = value; },
          replaceChildren() {},
          focus() { this.focused = true; },
          scrollIntoView() { this.scrolled = true; },
        });
        return nodes.get(selector);
      };
      card._config.language = language;
      await card._saveDetails();
      const key = "A product with this name already exists. Choose a different name.";
      assert.equal(creations.length, 0);
      assert.equal(card._draft.uncertain, false);
      assert.equal(card._draft.values.description, "Keep details");
      assert.equal(nodes.get("#product-name").textContent, translations[language]["Product not saved."]);
      assert.equal(nodes.get("#notice-title").textContent, translations[language]["Product not saved."]);
      assert.equal(nodes.get("#connection-text").textContent, translations[language]["Product not saved."]);
      assert.equal(nodes.get("#notice-detail").textContent, translations[language][key]);
      assert.equal(nodes.get("#edit-status").textContent, translations[language][key]);
      assert.equal(nodes.get("#edit-status").dataset.state, "error");
      assert.equal(nodes.get(".product-panel").dataset.saveError, "true");
      assert.equal(nodes.get("#new-name").attributes["aria-invalid"], "true");
      assert.equal(nodes.get("#new-name").focused, true);
      assert.equal(nodes.get("#new-name").scrolled, true);
      card._editField("name", "Different demo");
      assert.equal(card._editNotice, "");
      assert.equal(nodes.get("#new-name").attributes["aria-invalid"], "false");
      assert.equal(nodes.get(".product-panel").dataset.saveError, "false");
      assert.equal(nodes.get("#product-name").textContent, translations[language][
        mode === "Add" ? "New product found online" : "Online product found"]);
      await card._saveDetails();
      assert.equal(creations.length, 1);
      assert.equal(card._result.product.name, "Different demo");
      assert.equal(card._result.stock, mode === "Add" ? 1 : 0);
      assert.equal(card._dirty(), false);
    }
  }
});

test("uncertain product creation retains the draft and disables repeated saves until discarded", async () => {
  for (const issue of ["write", "response", "stock", "queue"]) {
    const { card, creations, states } = await registrationSetup("Add");
    if (issue === "queue") {
      card._result.scan_id = 5;
      states[3].attributes.scan_queue.push({ id: 5, barcode: "000123", action: "Add", state: "Unknown" });
    }
    card._editField("name", "Retain this name");
    const callWS = card._hass.callWS;
    card._hass.callWS = async (message) => {
      if (message.type === "call_service" && issue === "write") {
        creations.push(message);
        throw new Error("Disconnected");
      }
      const result = await callWS(message);
      if (message.type === "call_service" && issue === "response") return {};
      if (message.type === "get_states" && creations.length) {
        if (issue === "stock") result[1].attributes.stock[0].quantity = 2;
        if (issue === "queue") return result.filter((row) => row.entity_id !== "sensor.vh_inventory_scan_queue");
      }
      return result;
    };
    await card._saveDetails();
    assert.equal(card._draft.values.name, "Retain this name", issue);
    assert.equal(card._draft.uncertain, true, issue);
    assert.match(card._editNotice, /Do not save again/, issue);
    await card._saveDetails();
    assert.equal(creations.length, 1, issue);
    card._resetDraft(false);
    assert.equal(card._dirty(), false);
    assert.equal(card._draft, null);
  }
});

test("deferred scanner focus never steals the first entry from a newly focused product field", () => {
  const { card, context } = setup();
  let frame, focused = 0;
  context.requestAnimationFrame = (callback) => { frame = callback; };
  const barcode = { id: "barcode", tagName: "INPUT", focus() { focused += 1; } };
  card.shadowRoot.querySelector = () => barcode;
  card.getClientRects = () => [{}];
  card.shadowRoot.activeElement = barcode;
  card._focusInput();
  card.shadowRoot.activeElement = { id: "new-name", tagName: "INPUT" };
  frame();
  assert.equal(focused, 0);
  card.shadowRoot.activeElement = barcode;
  card._focusInput();
  frame();
  assert.equal(focused, 1);
  card.shadowRoot.activeElement = { id: "save", tagName: "BUTTON" };
  card._focusInput();
  frame();
  assert.equal(focused, 2);
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
  const { ShoppingCard, QuickShoppingCard, QuickStockCard, StockCard, ManagementCard, ConfigurationCard } = setup();
  const keys = new Set([
    ...Array.from(source.matchAll(/data-i18n="([^"$]+)"/g), (match) => match[1]),
    ...Array.from(source.matchAll(/(?:title|detail): "([^"]+)"/g), (match) => match[1]),
    ...Array.from(source.matchAll(/this\._t\("([^"]+)"\)/g), (match) => match[1]),
    ...Array.from(source.matchAll(/this\._status = "([^"]+)"/g), (match) => match[1]),
    ...Object.values(new ShoppingCard()._refreshText()),
    ...[StockCard, ManagementCard, ConfigurationCard].flatMap((Card) => Object.values(new Card()._writeMessages())),
    ...[QuickShoppingCard, QuickStockCard].flatMap((Card) => [
      ...Object.values(new Card()._gridText()), ...Object.values(new Card()._refreshText()),
    ]),
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
    services: { pyscript: { vh_inventory_adjust_shopping: {}, vh_inventory_delete: {} },
      script: { vh_print_shopping: {} } },
    async callService(domain, service, data) {
      calls.push([domain, service, structuredClone(data)]);
      if (domain === "script" && service === "vh_print_shopping") return;
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

test("shopping print calls the same full-list script as main without editing or serializing local rows", async () => {
  const { card, calls, states } = setupShopping();
  const before = JSON.stringify(states);
  await card._print();
  assert.deepEqual(calls, [["script", "vh_print_shopping", {}]]);
  assert.equal(JSON.stringify(states), before);
  assert.equal(card._status, "Print request sent. Check the printer before printing again.");
  assert.equal(card._busy, false);
  states[1].attributes.shopping = [];
  await card._print();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], ["script", "vh_print_shopping", {}]);
});

test("shopping print refuses offline, preview, busy, blocked, absent service, confirmation and unavailable data", async () => {
  for (const condition of ["offline", "preview", "busy", "blocked", "service", "confirmation", "data"]) {
    const { card, states, calls } = setupShopping();
    if (condition === "offline") card._hass.connected = false;
    if (condition === "preview") card.preview = true;
    if (condition === "busy") card._busy = true;
    if (condition === "blocked") card._blocked = true;
    if (condition === "service") delete card._hass.services.script.vh_print_shopping;
    if (condition === "confirmation") card._confirmId = 10;
    if (condition === "data") states[1].state = "unavailable";
    await card._print();
    assert.equal(calls.length, 0, condition);
    if (condition === "data") {
      assert.equal(card._blocked, true);
      assert.match(card._status, /unavailable/);
    }
  }
});

test("shopping print serializes rapid taps, blocks other actions/navigation and guards unloading", async () => {
  const { card, calls } = setupShopping();
  const { dashboard } = setupNavigation();
  dashboard._cards.shopping = card;
  dashboard._switchPage("shopping");
  const original = card._hass.callService;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  card._hass.callService = async (...args) => { await gate; return original(...args); };
  const pending = card._print();
  assert.equal(card._busy, true);
  assert.equal(card._status, "Sending shopping list to printer");
  await card._print();
  await card._change(10, 1);
  await card._refresh();
  dashboard._switchPage("scan");
  assert.equal(dashboard._page, "shopping");
  let prevented = false;
  dashboard._beforeUnload({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  release();
  await pending;
  assert.deepEqual(calls, [["script", "vh_print_shopping", {}]]);
  dashboard._switchPage("scan");
  assert.equal(dashboard._page, "scan");
});

test("uncertain shopping printing is not retried and requires explicit refresh without printing again", async () => {
  const { card, calls, errors } = setupShopping();
  card._hass.callService = async (...args) => { calls.push(args); throw new Error("Lost print response"); };
  await card._print();
  assert.equal(card._blocked, true);
  assert.equal(card._busy, false);
  assert.equal(errors.length, 1);
  assert.equal(card._status, "Print result uncertain. Check the printer before trying again.");
  card.hass = card._hass;
  await card._print();
  await card._change(10, 1);
  assert.equal(calls.length, 1);
  await card._refresh();
  assert.equal(card._blocked, false);
  assert.equal(calls.length, 1);
});

test("shopping print button tracks service/state guards even when table rows are unchanged", () => {
  const { card, states, calls } = setupShopping();
  states[1].attributes.shopping = [];
  const nodes = new Map();
  card.shadowRoot.querySelector = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { dataset: {}, replaceChildren() {} });
    return nodes.get(selector);
  };
  const print = card.shadowRoot.querySelector("#shopping-print");
  card._render();
  assert.equal(print.disabled, false);
  delete card._hass.services.script.vh_print_shopping;
  card._render();
  assert.equal(print.disabled, true);
  card._hass.services.script.vh_print_shopping = {};
  card._render();
  assert.equal(print.disabled, false);
  for (const key of ["_busy", "_blocked"]) {
    card[key] = true;
    card._render();
    assert.equal(print.disabled, true);
    card[key] = false;
  }
  card._hass.connected = false;
  card._render();
  assert.equal(print.disabled, true);
  card._hass.connected = true;
  states[1].state = "unavailable";
  card._render();
  assert.equal(print.disabled, true);
  assert.equal(calls.length, 0);
});

test("shopping missing reference values are blank in both languages without hiding ad-hoc labels or real names", () => {
  const { card, states, calls } = setupShopping();
  for (const language of ["nl", "en"]) {
    card._config.language = language;
    for (const missing of ["", null, undefined]) {
      Object.assign(states[0].attributes.products[0], { category: missing, store: missing });
      const rows = card._rows();
      assert.equal(rows.find(row => row.id === 10).category, "");
      assert.equal(rows.find(row => row.id === 10).store, "");
      assert.equal(rows.find(row => row.id === 12).store, "");
      assert.equal(rows.find(row => row.id === 12).category, translations[language]["Ad-Hoc item"]);
      assert.equal(rows.find(row => row.id === 11).category, "Pasta");
    }
    Object.assign(states[0].attributes.products[0], { category: "Niet toegewezen", store: "Unassigned" });
    const named = card._rows().find(row => row.id === 10);
    assert.equal(named.category, "Niet toegewezen");
    assert.equal(named.store, "Unassigned");
  }
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
  assert.match(html, /id="shopping-status" class="feedback-slot" role="status" aria-live="polite"/);
  assert.match(html, /id="shopping-print" type="button" data-i18n="Print Shopping list"/);
  assert.match(html, /\.panel \{ padding-top: 16px; \}/);
  assert.doesNotMatch(html, /#shopping-status:empty/);
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

test("inventory Almost-out indication follows the product flag across locations without writes", () => {
  const { card, states, publish, calls } = setupInventory();
  card._showAlmostOut = true;
  states[0].attributes.products[0].almost_out = 1;
  states[1].attributes.stock[2].quantity = 1;
  publish();
  assert.deepEqual(Array.from(card._rows(), (row) => [row.id, row.almostOut]),
    [[1, true], [2, true], [3, false]]);
  assert.equal(card._t("Almost out"), "Bijna op");
  card._config.language = "en";
  assert.equal(card._t("Almost out"), "Almost out");
  states[0].attributes.products[0].almost_out = 0;
  publish();
  assert.ok(card._rows().every((row) => row.almostOut === false));
  assert.deepEqual(calls, []);
  assert.match(source, /data-icon="mdi:exclamation-thick"[^]*?M10 3H14V14H10V3M10 21V17H14V21H10Z/);
  assert.match(source, /\.inventory-almost-out \{[^}]*color: #facc15;/);
});

test("inventory visibility defaults off and either switch reveals Almost-out zero-stock products", () => {
  const { card, states, publish, calls } = setupInventory();
  states[0].attributes.products[0].almost_out = 1;
  states[0].attributes.products[1].almost_out = 1;
  states[0].attributes.products.push({ id: 3, name: "No stock row", barcode: 789 });
  publish();
  assert.equal(card._showAlmostOut, false);
  assert.equal(card._showZeroStock, false);
  assert.equal(card._rows().length, 0);
  card._showAlmostOut = true;
  assert.deepEqual(Array.from(card._rows(), row => row.id), [1, 2, "empty-2"]);
  card._showAlmostOut = false;
  card._showZeroStock = true;
  assert.deepEqual(Array.from(card._rows(), row => row.id), ["empty-3", "empty-2"]);
  card._showAlmostOut = true;
  assert.deepEqual(Array.from(card._rows(), row => row.id), [1, 2, "empty-3", "empty-2"]);
  assert.deepEqual(calls, []);
});

test("inventory zero-stock entries are unique per depleted product and obey search/category filters", () => {
  const { card, states, publish, calls } = setupInventory();
  states[1].attributes.stock.push({ id: 4, product_id: 1, location_id: null, quantity: 0 },
    { id: 5, product_id: 2, location_id: 1, quantity: 0 });
  publish();
  card._showZeroStock = true;
  assert.deepEqual(Array.from(card._rows(), row => row.id), [1, 2, "empty-2"]);
  card._search = "456";
  assert.deepEqual(Array.from(card._rows(), row => [row.product_id, row.quantity]), [[2, 0]]);
  card._category = "1";
  assert.equal(card._rows().length, 0);
  card._category = "2";
  assert.equal(card._rows().length, 1);
  states[1].attributes.stock.find(row => row.id === 3).quantity = 1;
  publish();
  assert.deepEqual(Array.from(card._rows(), row => row.id), [3]);
  assert.deepEqual(calls, []);
});

test("inventory zero-stock Add opens a preselected draft and uses the existing verified add service", async () => {
  const { card, states, publish, calls } = setupInventory();
  states[1].attributes.stock = states[1].attributes.stock.filter(row => row.product_id !== 2);
  publish();
  card._showZeroStock = true;
  const row = card._rows().find(row => row.outOfStock);
  assert.equal(row.id, "empty-2");
  card._openEditor(null, row.product_id);
  assert.equal(card._editor.id, null);
  assert.equal(card._editor.values.product_id, "2");
  assert.equal(card._editor.values.quantity, "1");
  assert.equal(calls.length, 0);
  await card._save();
  assert.deepEqual(calls, [["pyscript", "vh_inventory_add_stock", {
    product: "Other product", location: "(none)", quantity: 1,
  }]]);
  assert.equal(card._blocked, false);
  assert.equal(card._rows().find(row => row.product_id === 2).outOfStock, false);
});

test("zero-stock plus adds exactly one unassigned unit and preserves either Almost-out state", async () => {
  for (const flag of [0, 1]) {
    for (const retainedZeroRow of [false, true]) {
      const { card, states, publish, calls } = setupInventory();
      states[0].attributes.products[1].almost_out = flag;
      if (!retainedZeroRow) states[1].attributes.stock = states[1].attributes.stock.filter(r => r.product_id !== 2);
      publish();
      const otherStock = JSON.stringify(states[1].attributes.stock.filter(r => r.product_id !== 2));
      await card._addEmptyStock(2);
      assert.deepEqual(calls, [["pyscript", "vh_inventory_add_stock", {
        product: "Other product", location: "(none)", quantity: 1,
      }]]);
      assert.equal(card._blocked, false);
      assert.equal(card._editor, null);
      assert.equal(card._data().products.find(p => p.id === 2).almost_out, flag);
      assert.deepEqual(Array.from(card._data().stock.filter(r => r.product_id === 2),
        r => [r.quantity, r.location_id]), [[1, null]]);
      assert.equal(JSON.stringify(states[1].attributes.stock.filter(r => r.product_id !== 2)), otherStock);
    }
  }
});

test("inventory reserves minus/quantity/plus columns even when the zero row has no minus button", () => {
  const stockStyle = source.slice(source.indexOf("class VhInventoryStockTouchscreen"));
  assert.match(stockStyle, /\.quantity-controls \{ display: grid; grid-template-columns: 68px 6ch 68px; \}/);
  assert.match(stockStyle, /\.quantity-controls button:last-child \{ grid-column: 3; \}/);
  assert.match(stockStyle, /\.quantity-controls strong \{ grid-column: 2;/);
});

test("inventory pencil buttons retain translated accessible labels without replacing their SVG", () => {
  const { card } = setupInventory();
  let clicked = 0;
  card._button = (label, action, disabled, translate) => ({
    label, action, disabled, translate, dataset: {},
    setAttribute(key, value) { this[key] = value; },
  });
  for (const [language, label] of [["nl", "Bewerk"], ["en", "Edit"]]) {
    card._config.language = language;
    const button = card._editButton(() => { clicked += 1; }, false, "Synthetic product");
    assert.equal(button.label, "");
    assert.equal(button.translate, false);
    assert.equal(button.disabled, false);
    assert.equal(button.className, "action-icon inventory-edit");
    assert.equal(button["aria-label"], `${label}: Synthetic product`);
    assert.equal(button.title, `${label}: Synthetic product`);
    assert.equal(button.dataset.i18n, undefined);
    assert.match(button.innerHTML, /data-icon="mdi:pencil"/);
    assert.match(button.innerHTML, /aria-hidden="true"/);
    button.action();
  }
  assert.equal(clicked, 2);
  assert.equal(card._editButton(() => {}, true, "Synthetic product").disabled, true);
});

test("shared trash icons preserve translated labels, disabled state and the original handler", () => {
  const { card } = setupInventory();
  card._button = (label, action, disabled, translate) => ({
    action, disabled, translate, dataset: {}, setAttribute(key, value) { this[key] = value; },
  });
  let deleted = 0;
  for (const [language, label] of [["nl", "Verwijderen"], ["en", "Remove item"]]) {
    card._config.language = language;
    const button = card._iconButton("Remove item", () => { deleted += 1; }, false, "Synthetic record");
    assert.equal(button.className, "action-icon");
    assert.equal(button["aria-label"], `${label}: Synthetic record`);
    assert.equal(button.title, `${label}: Synthetic record`);
    assert.equal(button.dataset.i18n, undefined);
    assert.equal(button.translate, false);
    assert.match(button.innerHTML, /data-icon="mdi:delete"/);
    button.action();
  }
  assert.equal(deleted, 2);
  assert.equal(card._iconButton("Remove item", () => {}, true, "Synthetic record").disabled, true);
  assert.match(source, /button\.action-icon \{[^}]*border: 1px solid var\(--cp-border-strong\)/);
});

test("shopping removes its Delete cell and header but retains a four-column confirmation row", () => {
  const shopping = source.slice(source.indexOf("class VhInventoryShoppingTouchscreen"),
    source.indexOf("class VhInventoryQuickShoppingTouchscreen"));
  assert.doesNotMatch(shopping, /data-i18n="Action"/);
  assert.doesNotMatch(shopping, /button\(this\._t\("Remove item"\)/);
  assert.match(shopping, /cell.colSpan = 4/);
  assert.match(shopping, /action === -1 && row.quantity === 1/);
});

test("inventory keeps the pencil Action column but no per-row Add; management and settings reuse icons", () => {
  const inventory = source.slice(source.indexOf("class VhInventoryStockTouchscreen"),
    source.indexOf("class VhInventoryQuickStockTouchscreen"));
  assert.match(inventory, /data-i18n="Action"/);
  assert.doesNotMatch(inventory, /this\._button\("Add",/);
  assert.match(inventory, /id="inventory-add"/);
  const management = source.slice(source.indexOf("class VhInventoryManagementTouchscreen"));
  assert.match(management, /this\._iconButton\("Remove item", \(\) => this\._remove\(row.id\)/);
  assert.match(management, /!idle \|\| used \|\| !this\._canDelete\(\)/);
  assert.match(management, /this\._editButton\(\(\) => this\._openEditor\(row.id\)/);
  assert.match(management, /this\._editButton\(\(\) => this\._openEditor\(entity\)/);
});

test("inventory row rendering frames empty references and no longer creates explicit Delete buttons", () => {
  const stockClass = source.slice(source.indexOf("class VhInventoryStockTouchscreen"),
    source.indexOf("class VhInventoryQuickStockTouchscreen"));
  assert.match(stockClass, /\.inventory-reference \{[^}]*border: 1px solid var\(--cp-border-strong\)/);
  assert.match(stockClass, /for \(const value of \[category, row.store, ""\]\)/);
  assert.match(stockClass, /group.append\(this._editButton\(\(\) => this._openEditor\(row.id\)/);
  assert.doesNotMatch(stockClass, /this\._button\("Remove item"/);
});

test("zero-stock plus rejects missing, renamed, restocked or reflagged products before writing", async () => {
  for (const change of ["missing", "name", "stock", "flag"]) {
    const { card, calls, states } = setupInventory();
    card._hass.callWS = async () => {
      const fresh = structuredClone(states);
      const products = fresh[0].attributes.products;
      if (change === "missing") {
        fresh[0].attributes.products = products.filter(p => p.id !== 2);
        fresh[1].attributes.stock = fresh[1].attributes.stock.filter(r => r.product_id !== 2);
      }
      if (change === "name") products[1].name = "Changed product";
      if (change === "stock") fresh[1].attributes.stock[2].quantity = 1;
      if (change === "flag") products[1].almost_out = 1;
      return fresh;
    };
    await card._addEmptyStock(2);
    assert.equal(calls.length, 0, change);
    assert.equal(card._blocked, true, change);
  }
});

test("zero-stock plus respects edit, confirmation, connectivity and write guards", async () => {
  for (const guard of ["editor", "confirmation", "busy", "disconnected", "service", "positive", "missing"]) {
    const { card, calls } = setupInventory();
    if (guard === "editor") card._editor = {};
    if (guard === "confirmation") card._confirmation = {};
    if (guard === "busy") card._busy = true;
    if (guard === "disconnected") card._hass.connected = false;
    if (guard === "service") delete card._hass.services.pyscript.vh_inventory_add_stock;
    await card._addEmptyStock(guard === "positive" ? 1 : guard === "missing" ? 999 : 2);
    assert.equal(calls.length, 0, guard);
  }
});

test("zero-stock plus reports uncertain readback and never retries a submitted addition", async () => {
  for (const result of ["unchanged", "flag-cleared"]) {
    const { card, calls, states, publish } = setupInventory();
    states[0].attributes.products[1].almost_out = 1;
    publish();
    const execute = card._hass.callService;
    card._hass.callService = async (...args) => {
      if (result === "unchanged") calls.push(args);
      else {
        await execute(...args);
        states[0].attributes.products[1].almost_out = 0;
      }
    };
    await card._addEmptyStock(2);
    assert.equal(card._blocked, true);
    assert.match(card._status, /uncertain/);
    await card._addEmptyStock(2);
    assert.equal(calls.length, 1);
  }
});

test("zero-stock Edit passes the catalogue ID without opening an Add draft or writing stock", () => {
  const { card, calls } = setupInventory();
  const opened = [];
  card.onEditProduct = id => { opened.push(id); return true; };
  card._editEmptyProduct(2);
  assert.deepEqual(opened, [2]);
  assert.equal(card._editor, null);
  assert.equal(calls.length, 0);
  card.onEditProduct = () => false;
  card._editEmptyProduct(2);
  assert.equal(card._status, "Product editing service unavailable.");
  card._editor = {};
  card.onEditProduct = () => assert.fail("Do not navigate away from a draft");
  card._editEmptyProduct(2);
});

test("zero-stock Edit reuses the guarded Producten editor without creating stock or clearing the flag", async () => {
  const { card, states, publish, calls } = setupManagement();
  const stock = states().find(s => s.entity_id.endsWith("_stock")).attributes.stock;
  stock.splice(0);
  const product = states().find(s => s.entity_id.endsWith("_products")).attributes.products[0];
  product.almost_out = 1;
  publish();
  const { dashboard, inventory } = setupNavigation();
  dashboard._cards.products = card;
  dashboard._page = "inventory";
  inventory._showZeroStock = true;
  inventory._search = "Keep filter";
  assert.equal(dashboard._editInventoryProduct(product.id), true);
  assert.equal(dashboard._page, "products");
  assert.equal(card._editor.id, product.id);
  assert.equal(calls.length, 0);
  card._editor.values.name = "Edited zero-stock product";
  await card._save();
  assert.equal(card._blocked, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], "vh_inventory_update_product");
  assert.equal(card._data().stock.length, 0);
  assert.equal(card._data().products.find(p => p.id === product.id).almost_out, 1);
  dashboard._switchPage("inventory");
  assert.equal(dashboard._page, "inventory");
  assert.equal(inventory._showZeroStock, true);
  assert.equal(inventory._search, "Keep filter");
});

test("zero-stock Edit cannot bypass navigation guards or unavailable catalogue services", () => {
  const { card } = setupManagement();
  const { dashboard, inventory } = setupNavigation();
  dashboard._cards.products = card;
  dashboard._page = "inventory";
  inventory._editor = {};
  assert.equal(dashboard._editInventoryProduct(1), false);
  assert.equal(dashboard._page, "inventory");
  assert.equal(card._editor, null);
  inventory._editor = null;
  assert.equal(dashboard._editInventoryProduct(99999), false);
  card._hass.connected = false;
  assert.equal(dashboard._editInventoryProduct(1), false);
});

test("stocked Almost-out products retain normal quantity, editing and confirmed deletion actions", async () => {
  const { card, states, publish, calls } = setupInventory();
  states[0].attributes.products[0].almost_out = 1;
  card._showAlmostOut = true;
  publish();
  await card._change(1, 1);
  await card._change(1, -1);
  card._openEditor(1);
  card._editor.values.manufacturer = "Edited manufacturer";
  await card._save();
  await card._remove(1);
  assert.ok(card._confirmation);
  await card._confirmation.run();
  assert.deepEqual(calls.map(call => call[1]), [
    "vh_inventory_adjust_stock", "vh_inventory_adjust_stock",
    "vh_inventory_save_stock_details", "vh_inventory_delete",
  ]);
  assert.equal(card._data().products[0].almost_out, 1);
});

test("scanner modes appear as Lookup, Add, Almost out, Use without changing the read-only default", () => {
  const { card } = setup();
  const html = source.match(/<div class="modes"[^]*?<\/div>/)[0];
  assert.deepEqual([...html.matchAll(/<button id="([^"]+)"/g)].map(match => match[1]),
    ["lookup", "add", "almost-out", "use"]);
  assert.equal(card._mode, "Lookup");
});

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

test("inventory store comes from the catalogue, updates live, and missing stores display blank", () => {
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
    assert.ok(card._rows().every((r) => r.store === ""));
  }
  assert.equal(calls.length, 0);
});

test("reference selects default to blank but preserve real labels, missing-reference warnings and the named filter", () => {
  const { StockCard, ManagementCard } = setup();
  for (const Card of [StockCard, ManagementCard]) {
    const card = new Card();
    card._label = (tag, key) => ({ textContent: card._t(key), value: "" });
    card._text = (tag, value) => ({ textContent: value, value: "" });
    const select = {
      children: [], _value: "",
      replaceChildren(...children) { this.children = children; },
      append(child) { this.children.push(child); },
      set value(value) { this._value = this.children.some(option => option.value === value) ? value : ""; },
      get value() { return this._value; },
    };
    for (const language of ["nl", "en"]) {
      card._config = { translations, language };
      card._options(select, [{ id: 1, category: "Unassigned" }], "category", null);
      assert.equal(select.value, "");
      assert.equal(select.children[0].textContent, "");
      assert.equal(select.children[1].textContent, "Unassigned");
      card._options(select, [], "category", 999);
      assert.equal(select.value, "999");
      assert.equal(select.children[1].textContent, translations[language]["Reference no longer available"]);
      assert.equal(select.children[1].disabled, true);
      card._options(select, [], "category", null, "All");
      assert.equal(select.children[0].textContent, translations[language].All);
    }
  }
  assert.match(StockCard.prototype._render.toString(),
    /const unassigned = this\._label\("option", "Unassigned"\);[^]*?unassigned\.value = "none"/);
});

test("scanner missing reference choices stay blank across languages while broken references remain explicit", () => {
  const { card, context, calls } = setup();
  context.document = { createElement: () => ({ value: "", textContent: "" }) };
  const nodes = new Map();
  card.shadowRoot.querySelector = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      value: "", dataset: {}, setAttribute() {}, replaceChildren(...options) { this.options = options; },
    });
    return nodes.get(selector);
  };
  card._referenceRows = () => [];
  card._canEdit = () => false;
  for (const language of ["nl", "en"]) {
    card._config.language = language;
    card._draft = null;
    card._renderDetails();
    for (const id of ["category", "store", "locations"]) {
      assert.equal(nodes.get(`#${id}`).options[0].value, "");
      assert.equal(nodes.get(`#${id}`).options[0].textContent, "");
      assert.equal(nodes.get(`#${id}`).value, "");
    }
    const values = { manufacturer: "", unit: "", category_id: "999", store_id: "", location_id: "" };
    card._draft = { original: { ...values }, values };
    card._result = { stock: 0 };
    card._renderDetails();
    assert.equal(nodes.get("#category").options.at(-1).textContent,
      translations[language]["Reference no longer available"]);
    assert.equal(nodes.get("#category").value, "999");
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
  assert.ok(card._rows().every((r) => r.store_id === null && r.store === ""));
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
  assert.ok(calls.every(call => call[2].check_alternatives === false));
});

test("inventory delete confirms the exact stock row and does not delete its product", async () => {
  const { card, calls, states } = setupInventory();
  const products = JSON.stringify(states[0]);
  await card._remove(1);
  assert.equal(calls.length, 0);
  await card._change(2, 1);
  assert.equal(calls.length, 0);
  await card._confirmation.run();
  assert.deepEqual(calls, [["pyscript", "vh_inventory_delete", {
    table: "stock", id: 1, check_alternatives: false }]]);
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
  card._showAlmostOut = true;
  card._showZeroStock = true;
  card._openEditor(1);
  card._editor.values.manufacturer = "Keep draft";
  states[1].attributes.stock[0].quantity = 4;
  publish();
  assert.equal(card._search, "cafe");
  assert.equal(card._category, "1");
  assert.equal(card._showAlmostOut, true);
  assert.equal(card._showZeroStock, true);
  assert.equal(card._editor.values.manufacturer, "Keep draft");
  assert.equal(calls.length, 0);
});

test("inventory and quick shopping use the same labeled search panel, placeholder and clear button", () => {
  const { StockCard, QuickShoppingCard, QuickStockCard } = setup();
  for (const [Card, prefix] of [[StockCard, "inventory"], [QuickShoppingCard, "quick"], [QuickStockCard, "quick"]]) {
    const card = new Card();
    const nodes = new Map();
    card.setAttribute = () => {};
    card.shadowRoot.querySelector = (selector) => {
      if (!nodes.has(selector)) nodes.set(selector, {
        dataset: {}, listeners: {}, addEventListener(event, handler) { this.listeners[event] = handler; }, focus() {},
      });
      return nodes.get(selector);
    };
    card.shadowRoot.querySelectorAll = () => [];
    card._render = () => {};
    card.setConfig({ translations, language: "nl" });
    const html = card.shadowRoot.innerHTML;
    if (prefix === "inventory") {
      for (const [id, field] of [["almost-out", "_showAlmostOut"], ["zero-stock", "_showZeroStock"]]) {
        assert.match(html, new RegExp(`id="inventory-show-${id}"[^>]*role="switch" aria-checked="false"`));
        assert.equal(card[field], false);
        nodes.get(`#inventory-show-${id}`).listeners.click();
        assert.equal(card[field], true);
        nodes.get(`#inventory-show-${id}`).listeners.click();
        assert.equal(card[field], false);
      }
    }
    assert.match(html, /<section class="panel search-panel"><label for="[^"]+-search" data-i18n="Search products">/);
    assert.match(html, /\.panel\.search-panel \{ padding: 20px 24px; \}/);
    assert.match(html, /\.search-panel label \{ margin-bottom: 8px; \}/);
    assert.match(html, new RegExp(`<div class="input-row"><input id="${prefix}-search"`));
    assert.match(html, new RegExp(`id="${prefix}-clear" type="button" data-i18n="Clear search"`));
    const input = nodes.get(`#${prefix}-search`);
    assert.equal(input.placeholder, translations.nl["Search by product name or barcode"]);
    input.value = "filter";
    input.listeners.input({ target: input });
    assert.equal(card._search, "filter");
    card._category = "keep category";
    nodes.get(`#${prefix}-clear`).listeners.click();
    assert.equal(card._search, "");
    assert.equal(input.value, "");
    assert.equal(card._category, "keep category");
  }
});

function navigationShell() {
  const { DashboardCard, context, navigationWindow } = setup();
  const all = node => node.children.flatMap(child => [child, ...all(child)]);
  const element = () => ({
    children: [], dataset: {}, attributes: {}, listeners: {}, focused: 0, open: false,
    style: { setProperty(key, value) { this[key] = value; } },
    append(...children) { this.children.push(...children); },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(key, handler) { this.listeners[key] = handler; },
    focus() { this.focused++; }, scrollIntoView() {}, showModal() { this.open = true; }, close() { this.open = false; },
    getBoundingClientRect() { return { left: 12, top: 12, right: 412, bottom: 800 }; },
    querySelector(selector) {
      const page = selector.match(/button\[data-page="([^"]+)"\]/)?.[1];
      return all(this).find(node => page ? node.dataset.page === page : node.id === selector.slice(1)) || null;
    },
    setConfig() {}, setActive() {}, activate() {}, _render() {}, _focusInput() {}, showList() {},
    _dirty: () => false, _hasPendingShoppingChoice: () => false,
    _queue: [], _t: key => translations.nl[key] || key,
  });
  context.document = { createElement: element, createTextNode: (text) => text };
  const dashboard = new DashboardCard();
  dashboard.setAttribute = () => {};
  const pages = element();
  const root = element();
  root.append(pages);
  dashboard.shadowRoot.querySelector = selector => selector === ".pages" ? pages : root.querySelector(selector);
  dashboard.shadowRoot.querySelectorAll = (selector) => selector === ".page-navigation button[data-page]"
    ? all(dashboard._menuPopup).filter(node => node.dataset.page) : [];
  dashboard.shadowRoot.append = (...children) => root.append(...children);
  dashboard.setConfig({ translations, language: "nl" });
  Object.assign(navigationWindow, { innerWidth: 1920, innerHeight: 1080 });
  return { dashboard, pages, navigationWindow, root };
}

test("dashboard provides a top-right MDI hamburger and correctly ordered maintenance submenu", () => {
  const { dashboard, pages, root } = navigationShell();
  assert.equal(pages.children.length, 12);
  assert.deepEqual(root.children.slice(1).map(node => node.id), ["navigation-shortcuts", "navigation-popup"]);
  const toggle = dashboard._menuButton, popup = dashboard._menuPopup;
  assert.equal(toggle.attributes["aria-label"], "Paginamenu openen");
  assert.equal(toggle.attributes["aria-expanded"], "false");
  assert.match(toggle.innerHTML, /id="mdi-menu"/);
  assert.match(toggle.innerHTML, /M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z/);
  assert.equal(popup.open, false);
  const nav = popup.children[1];
  assert.equal(nav.className, "page-navigation");
  assert.deepEqual(nav.children.slice(0, 7).map(button => button.dataset.page),
    ["scan", "recipes", "kitchen", "shopping", "quick-shopping", "quick-stock", "configuration"]);
  assert.equal(nav.children[0].attributes["aria-label"], "Boodschappenlijst en voorraad");
  assert.equal(nav.children[0].children[0].textContent, "Boodschappenlijst en voorraad");
  assert.equal(nav.children[1].attributes["aria-label"], "Recepten");
  assert.equal(nav.children[2].attributes["aria-label"], "Keuken");
  assert.equal(nav.children[6].attributes["aria-label"], "Configuratie");
  assert.equal(nav.children[7].id, "maintenance-toggle");
  assert.equal(nav.children[8].hidden, true);
  assert.deepEqual(nav.children[8].children.map(item => item.dataset.page),
    ["inventory", "products", "locations", "categories", "stores"]);
  assert.match(dashboard.shadowRoot.innerHTML, /grid-template-rows: minmax\(0, 1fr\);/);
  assert.doesNotMatch(dashboard.shadowRoot.innerHTML, /class="navigation-bar"|settings-popup|settings-toggle/);
  assert.match(dashboard.shadowRoot.innerHTML, /\.pages \{[^}]*overflow-y: auto/);
  assert.match(dashboard.shadowRoot.innerHTML, /\.pages, \.page-navigation \{ scrollbar-width: none; \}/);
  assert.match(dashboard.shadowRoot.innerHTML, /\.page-navigation \{[^}]*overflow-y: auto;/);
  assert.match(dashboard.shadowRoot.innerHTML, /\.page-navigation \{[^}]*flex: 1 1 auto; min-height: 0;/);
  assert.doesNotMatch(dashboard.shadowRoot.innerHTML, /scrollbar-gutter: stable/);
  assert.doesNotMatch(dashboard.shadowRoot.innerHTML, /\*::?-webkit-scrollbar/);
  assert.match(dashboard.shadowRoot.innerHTML, /--vh-navigation-header-inset: 580px/);
});

test("large shortcuts precede the hamburger and use the guarded page routes with accessible labels", () => {
  const { dashboard, root, navigationWindow } = navigationShell();
  const controls = root.children[1];
  assert.deepEqual(controls.children.map(button => button.id),
    ["shortcut-scan", "shortcut-recipes", "shortcut-kitchen", "shortcut-shopping", "navigation-toggle"]);
  assert.deepEqual(Array.from(dashboard._shortcutButtons, button => button.attributes["aria-label"]),
    ["Home", "Recepten", "Verlichting", "Boodschappenlijst"]);
  for (const button of dashboard._shortcutButtons) {
    assert.equal(button.attributes.title, button.attributes["aria-label"]);
    assert.match(button.innerHTML, /viewBox="0 0 24 24".*aria-hidden="true"/);
  }
  const recipes = dashboard._shortcutButtons.find(button => button.dataset.page === "recipes");
  assert.match(recipes.innerHTML, /<g fill="none" stroke="currentColor"/);
  assert.match(recipes.innerHTML, /M12 6v15M6 8h3M6 11h3M6 14h3M15 8h3M15 11h3M15 14h3/);
  const scan = dashboard._cards.scan;
  for (const guard of ["dirty", "pending", "busy", "queue", "editor"]) {
    scan._dirty = () => guard === "dirty";
    scan._hasPendingShoppingChoice = () => guard === "pending";
    scan._busy = guard === "busy";
    scan._queue = guard === "queue" ? [{}] : [];
    dashboard._cards.products._editor = guard === "editor" ? {} : null;
    for (const button of dashboard._shortcutButtons) {
      button.listeners.click();
      assert.equal(dashboard._page, "scan", guard);
    }
  }
  scan._dirty = () => false;
  scan._hasPendingShoppingChoice = () => false;
  scan._busy = false;
  scan._queue = [];
  dashboard._cards.products._editor = null;
  let recipeList = 0;
  dashboard._cards.recipes.showList = () => { recipeList++; };
  for (const button of dashboard._shortcutButtons) {
    button.listeners.click();
    assert.equal(dashboard._page, button.dataset.page);
    assert.equal(button.attributes["aria-current"], "page");
    assert.equal(navigationWindow.location.hash, button.dataset.page === "scan" ? "" : `#${button.dataset.page}`);
  }
  assert.equal(recipeList, 1);
});

test("Home returns to the combined scan page without bypassing pending choices or unsaved edits", () => {
  const { dashboard, navigationWindow } = navigationShell();
  const home = dashboard._shortcutButtons.find(button => button.dataset.page === "scan");
  const shopping = dashboard._shortcutButtons.find(button => button.dataset.page === "shopping");
  assert.equal(home.attributes["aria-current"], "page");
  shopping.listeners.click();
  const scan = dashboard._cards.scan;
  for (const guard of ["dirty", "pending", "busy", "queue", "editor"]) {
    scan._dirty = () => guard === "dirty";
    scan._hasPendingShoppingChoice = () => guard === "pending";
    scan._busy = guard === "busy";
    scan._queue = guard === "queue" ? [{}] : [];
    dashboard._cards.products._editor = guard === "editor" ? {} : null;
    home.listeners.click();
    assert.equal(dashboard._page, "shopping", guard);
  }
  scan._dirty = () => false;
  scan._hasPendingShoppingChoice = () => false;
  scan._busy = false;
  scan._queue = [];
  dashboard._cards.products._editor = null;
  home.listeners.click();
  assert.equal(dashboard._page, "scan");
  assert.equal(navigationWindow.location.hash, "");
  assert.equal(home.attributes["aria-current"], "page");
  assert.equal(shopping.attributes["aria-current"], "false");
});

test("selected shortcut glyphs stay black on solid pink and five buttons have responsive header clearance", () => {
  assert.match(source, /\.navigation-shortcuts \.navigation-shortcut\[aria-current="page"\] \{ border-color: #fd8ea1; background: #fd8ea1; color: #000; \}/);
  assert.match(source, /grid-template-columns: repeat\(5, 104px\)/);
  assert.match(source, /@media \(max-width: 600px\) \{\s*:host \{ --vh-navigation-header-block-inset: 348px; \}/);
});

test("native navigation popup toggles accessibly, ignores inside taps, dismisses outside/Escape and restores focus", () => {
  const { dashboard } = navigationShell();
  const toggle = dashboard._menuButton, popup = dashboard._menuPopup;
  toggle.listeners.click();
  assert.equal(dashboard._menuOpen, true);
  assert.equal(popup.open, true);
  assert.equal(toggle.attributes["aria-expanded"], "true");
  assert.equal(popup.querySelector('button[data-page="scan"]').focused, 1);
  popup.listeners.pointerdown({ target: popup, clientX: 100, clientY: 100 });
  assert.equal(dashboard._menuOpen, true);
  let outsidePrevented = false;
  popup.listeners.pointerdown({ target: popup, clientX: 900, clientY: 900, preventDefault() { outsidePrevented = true; } });
  assert.equal(outsidePrevented, true);
  assert.equal(popup.open, false);
  assert.equal(toggle.attributes["aria-expanded"], "false");
  assert.equal(toggle.focused, 1);
  toggle.listeners.click();
  let prevented = false;
  popup.listeners.cancel({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(dashboard._menuOpen, false);
  assert.equal(toggle.focused, 2);
  toggle.listeners.click();
  popup.querySelector("#navigation-close").listeners.click();
  assert.equal(popup.open, false);
  assert.equal(toggle.focused, 3);
});

test("maintenance expands independently and current-page navigation preserves links and menu highlighting", () => {
  const { dashboard } = navigationShell();
  dashboard._setMenuOpen(true);
  dashboard._maintenanceButton.listeners.click();
  assert.equal(dashboard._maintenanceOpen, true);
  assert.equal(dashboard._maintenanceGroup.hidden, false);
  assert.equal(dashboard._maintenanceButton.attributes["aria-expanded"], "true");
  assert.equal(dashboard._page, "scan");
  dashboard._maintenanceGroup.children[0].listeners.click();
  assert.equal(dashboard._page, "inventory");
  assert.equal(dashboard._menuOpen, false);
  assert.equal(dashboard._maintenanceButton.dataset.active, "true");
  assert.equal(dashboard._maintenanceGroup.children[0].attributes["aria-current"], "page");
  dashboard._setMenuOpen(true);
  assert.equal(dashboard._maintenanceGroup.hidden, false);
  assert.equal(dashboard._maintenanceGroup.children[0].focused, 1);
  dashboard._maintenanceButton.listeners.click();
  assert.equal(dashboard._maintenanceGroup.hidden, true);
});

test("hamburger navigation retains deep links and preserves draft/action guards", () => {
  const { dashboard, scan, inventory, navigationWindow } = setupNavigation();
  dashboard._menuButton = { setAttribute(key, value) { this[key] = value; }, focus() {} };
  dashboard._setMenuOpen(true);
  scan._dirty = () => true;
  dashboard._switchPage("inventory");
  assert.equal(dashboard._menuOpen, false);
  assert.equal(dashboard._page, "scan");
  assert.equal(navigationWindow.location.hash, "");
  scan._dirty = () => false;
  dashboard._switchPage("inventory");
  assert.equal(dashboard._menuButton["aria-expanded"], "false");
  assert.equal(navigationWindow.location.hash, "#inventory");
  inventory._editor = { values: { quantity: "3" } };
  dashboard._switchPage("shopping");
  assert.equal(dashboard._page, "inventory");
  inventory._editor = null;
  dashboard._switchPage("shopping");
  assert.equal(dashboard._menuButton["aria-expanded"], "false");
});

test("navigation viewport listeners resize the popup and are removed on close and disconnect", () => {
  const { dashboard, navigationWindow } = navigationShell();
  const added = new Map(), viewportListeners = new Map();
  navigationWindow.addEventListener = (key, fn) => added.set(key, fn);
  navigationWindow.removeEventListener = (key, fn) => { if (added.get(key) === fn) added.delete(key); };
  navigationWindow.visualViewport = {
    width: 800, height: 360, offsetTop: 100, offsetLeft: 30,
    addEventListener: (key, fn) => viewportListeners.set(key, fn),
    removeEventListener: (key, fn) => { if (viewportListeners.get(key) === fn) viewportListeners.delete(key); },
  };
  dashboard.connectedCallback();
  dashboard._setMenuOpen(true);
  assert.equal(dashboard._menuPopup.style["--vh-menu-height"], "360px");
  navigationWindow.visualViewport.height = 280;
  navigationWindow.visualViewport.offsetTop = 140;
  viewportListeners.get("resize")();
  assert.equal(dashboard._menuPopup.style["--vh-menu-height"], "280px");
  viewportListeners.get("scroll")();
  assert.equal(dashboard._menuPopup.style["--vh-menu-top"], "140px");
  dashboard._setMenuOpen(false);
  assert.equal(viewportListeners.size, 0);
  assert.equal(added.has("resize"), false);
  dashboard._setMenuOpen(true);
  dashboard.disconnectedCallback();
  assert.equal(dashboard._menuOpen, false);
  assert.equal(dashboard._menuPopup.open, false);
  assert.equal(added.size, 0);
  assert.equal(viewportListeners.size, 0);
});

test("native close events synchronize menu state without closing a reopened menu", () => {
  const { dashboard } = navigationShell();
  dashboard._setMenuOpen(true);
  dashboard._menuPopup.close();
  dashboard._menuPopup.listeners.close();
  assert.equal(dashboard._menuOpen, false);
  dashboard._setMenuOpen(true);
  dashboard._menuPopup.listeners.close();
  assert.equal(dashboard._menuPopup.open, true);
  dashboard._setMenuOpen(false);
});

test("Tab and Shift+Tab wrap at the visible menu boundaries without including collapsed maintenance items", () => {
  const { dashboard } = navigationShell();
  const popup = dashboard._menuPopup;
  const first = { focus() { this.focused = true; }, scrollIntoView() {}, getClientRects: () => [{}] };
  const last = { focus() { this.focused = true; }, scrollIntoView() {}, getClientRects: () => [{}] };
  const hidden = { focus() { throw Error("Collapsed item received focus"); }, getClientRects: () => [] };
  popup.querySelectorAll = () => [first, last, hidden];
  dashboard.shadowRoot.activeElement = last;
  let prevented = 0;
  popup.listeners.keydown({ key: "Tab", shiftKey: false, preventDefault() { prevented++; } });
  assert.equal(first.focused, true);
  dashboard.shadowRoot.activeElement = first;
  popup.listeners.keydown({ key: "Tab", shiftKey: true, preventDefault() { prevented++; } });
  assert.equal(last.focused, true);
  assert.equal(prevented, 2);
});

test("top-right hamburger and menu reserve end clearance for page headers and recipe cook mode", () => {
  assert.match(source, /\.navigation-shortcuts \{ position: absolute; top: 32px; right: 16px;/);
  assert.match(source, /\.navigation-shortcuts \{ top: 16px; right: 12px; grid-template-columns: repeat\(2, 104px\); \}/);
  assert.match(source, /left: auto; right: calc\(100vw - var\(--vh-menu-left, 0px\) - var\(--vh-menu-width, 100vw\) \+ 12px\)/);
  assert.match(source, /main > header \{ padding-inline-end: var\(--vh-navigation-header-inset, 0px\);/);
  assert.match(source, /padding-block-start: var\(--vh-navigation-header-block-inset, 0px\)/);
  assert.match(source, /main\[data-cook-mode="true"\] \.recipe-preparation-heading \{[^}]*padding-inline-end: var\(--vh-navigation-header-inset, 0px\);/);
  assert.match(source, /\.recipe-preparation-heading h3 \{ margin: 0; min-width: 0; overflow-wrap: anywhere; \}/);
});

function setupNavigation() {
  const { DashboardCard, navigationWindow } = setup();
  const dashboard = new DashboardCard();
  let focusCount = 0;
  const makeCard = () => ({
    _busy: false, _saving: false, _queue: [], _confirmId: null, _notice: {},
    _dirty: () => false, _hasPendingShoppingChoice: () => false,
    _render() {}, activate() {}, _focusInput() { focusCount += 1; },
  });
  const buttons = ["kitchen", "scan", "shopping", "quick-shopping", "quick-stock", "inventory",
    "products", "locations", "categories", "stores", "configuration"].map((page) => ({
    dataset: { page }, setAttribute(key, value) { this[key] = value; },
  }));
  dashboard.shadowRoot.querySelectorAll = () => buttons;
  const scan = makeCard();
  const shopping = makeCard();
  const inventory = makeCard();
  const quickShopping = makeCard();
  const quickStock = makeCard();
  const kitchen = makeCard();
  inventory._editor = null;
  dashboard._cards = { kitchen, scan, shopping, inventory, "quick-shopping": quickShopping, "quick-stock": quickStock };
  for (const page of ["products", "locations", "categories", "stores", "configuration"]) dashboard._cards[page] = makeCard();
  dashboard._renderNavigation();
  return { dashboard, scan, shopping, inventory, kitchen, quickShopping, quickStock, buttons, navigationWindow, focusCount: () => focusCount };
}

function setupManagement(table = "products", configuration = null) {
  const { ManagementCard, context, errors } = setup();
  context.structuredClone = structuredClone;
  context.setTimeout = (callback, delay) => delay >= 10000 ? setTimeout(callback, delay).unref() : callback();
  if (configuration) context.CARD_CONFIG.configuration = configuration;
  const card = new ManagementCard();
  context.managementCard = card;
  const demo = fs.readFileSync(path.join(root, "build_touchscreen.py"), "utf8")
    .match(/DEMO = r"""([\s\S]*?)"""/)[1].split('const dashboard = document.createElement')[0];
  vm.runInContext(`${demo}
    const publishDemo = () => {
      mock.states = Object.fromEntries(structuredClone(states()).map((item) => [item.entity_id, item]));
      managementCard.hass = mock;
    };
    globalThis.managementDemo = { mock, states, publish: publishDemo, meta: VH_TOUCHSCREEN_MANAGEMENT };`, context);
  const { mock, states, publish, meta } = context.managementDemo;
  card._table = table;
  card._meta = meta[table];
  card._config = { translations, language: "nl" };
  card._render = () => {};
  card._buildEditor = () => {};
  const calls = [];
  const execute = mock.callService.bind(mock);
  mock.callService = async (...args) => { calls.push(structuredClone(args)); await execute(...args); };
  publish();
  return { card, calls, states, publish, errors, context, mock };
}

function setupKitchen() {
  const base = setupManagement();
  const Card = base.context.customElements.get("vh-kitchen-touchscreen");
  const card = new Card();
  card._config = { kitchen: kitchenEntities, translations, language: "nl" };
  card._render = () => {};
  card.hass = base.mock;
  return { ...base, card, publish() { base.publish(); card.hass = base.mock; } };
}

function renderKitchen(card) {
  const nodes = new Map();
  card.shadowRoot.querySelector = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      dataset: {}, attributes: {}, children: [], style: { setProperty(key, value) { this[key] = value; } },
      setAttribute(key, value) { this.attributes[key] = value; },
    });
    return nodes.get(selector);
  };
  card.shadowRoot.querySelector("#speaker-source").dataset.options =
    JSON.stringify(card._info("speaker").attrs.source_list);
  card._render = Object.getPrototypeOf(card)._render.bind(card);
  card._render();
  return nodes;
}

test("kitchen pending locks preserve otherwise-available controls without enabling them", () => {
  const { card, calls, states, publish } = setupKitchen();
  states().find(row => row.entity_id === kitchenEntities.ceiling).state = "off";
  publish();
  const nodes = renderKitchen(card);
  card._busy = true;
  card._render();
  assert.equal(nodes.get("main").attributes["aria-busy"], "true");
  for (const id of ["worktop-power", "ceiling-power", "worktop-brightness", "speaker-play",
    "speaker-mute", "speaker-volume", "ledstrip-warm"]) {
    const control = nodes.get(`#${id}`);
    assert.equal(control.disabled, true, id);
    assert.equal(control.dataset.pendingLock, "true", id);
  }
  assert.equal(nodes.get("#ceiling-brightness").disabled, true);
  assert.equal(nodes.get("#ceiling-brightness").dataset.pendingLock, "false");
  assert.equal(card._canAct(), false);
  card._busy = false;
  card._render();
  assert.equal(nodes.get("main").attributes["aria-busy"], "false");
  assert.equal(nodes.get("#worktop-power").disabled, false);
  assert.equal(nodes.get("#worktop-power").dataset.pendingLock, "false");
  assert.equal(calls.length, 0);
  assert.match(source, /button\[data-pending-lock="true"\]:disabled, input\[data-pending-lock="true"\]:disabled \{\s*opacity: 1; cursor: progress;/);
});

test("offline, blocked and unsupported kitchen controls never get pending-only appearance", () => {
  const { card, mock } = setupKitchen();
  const nodes = renderKitchen(card);
  card._busy = true;
  for (const reason of ["offline", "blocked", "preview"]) {
    mock.connected = reason !== "offline";
    card._blocked = reason === "blocked";
    card.preview = reason === "preview";
    card._render();
    for (const id of ["worktop-power", "speaker-play", "ledstrip-warm"]) {
      assert.equal(nodes.get(`#${id}`).disabled, true, reason);
      assert.equal(nodes.get(`#${id}`).dataset.pendingLock, "false", reason);
    }
  }
  card.preview = false;
  card._blocked = false;
  delete mock.services.light.turn_off;
  delete mock.services.media_player.media_play;
  delete mock.services.automation.trigger;
  card._render();
  for (const id of ["worktop-power", "speaker-play", "ledstrip-warm"]) {
    assert.equal(nodes.get(`#${id}`).disabled, true);
    assert.equal(nodes.get(`#${id}`).dataset.pendingLock, "false");
  }
  assert.equal(nodes.get("#speaker-mute").dataset.pendingLock, "true");
});

test("delayed kitchen commands stay single-flight and clear pending styling on success or uncertainty", async () => {
  for (const fail of [false, true]) {
    const { card, mock, calls, states } = setupKitchen();
    const before = JSON.stringify(states().filter(row => row.entity_id.startsWith("sensor.vh_inventory_")));
    const nodes = renderKitchen(card), execute = mock.callService.bind(mock);
    let release, entered, attempts = 0;
    const gate = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { entered = resolve; });
    mock.callService = async (...args) => {
      attempts++;
      entered();
      await gate;
      if (fail) throw new Error("Synthetic uncertain light command");
      return execute(...args);
    };
    const pending = card._control("worktop", "power");
    await started;
    assert.equal(card._busy, true);
    assert.equal(nodes.get("#worktop-power").dataset.pendingLock, "true");
    assert.equal(nodes.get("#speaker-play").disabled, true);
    await card._control("worktop", "power");
    await card._control("speaker", "play");
    assert.equal(attempts, 1);
    release();
    await pending;
    assert.equal(card._busy, false);
    assert.equal(card._blocked, fail);
    assert.equal(nodes.get("main").attributes["aria-busy"], "false");
    assert.equal(nodes.get("#worktop-power").dataset.pendingLock, "false");
    assert.equal(nodes.get("#worktop-power").disabled, fail);
    if (!fail) assert.deepEqual(calls, [["light", "turn_off", { entity_id: kitchenEntities.worktop }]]);
    assert.equal(JSON.stringify(states().filter(row => row.entity_id.startsWith("sensor.vh_inventory_"))), before);
  }
});

test("verified kitchen feedback is localized while unverified requests retain sent wording", async () => {
  for (const language of ["en", "nl"]) {
    for (const [key, action, value] of [
      ["worktop", "power"], ["worktop", "brightness", 65], ["ceiling", "temperature", 4200],
      ["speaker", "play"], ["speaker", "mute"], ["speaker", "volume", 25],
      ["speaker", "source", "Other demo radio"],
    ]) {
      const { card, calls } = setupKitchen();
      card._config.language = language;
      const nodes = renderKitchen(card);
      assert.equal(nodes.get("#kitchen-status").tabIndex, -1);
      await card._control(key, action, value);
      assert.equal(card._blocked, false);
      assert.equal(card._status, "Successfully executed.");
      assert.equal(nodes.get("#kitchen-status").textContent,
        language === "nl" ? "Succesvol uitgevoerd." : "Successfully executed.");
      assert.equal(nodes.get("#kitchen-status").title, nodes.get("#kitchen-status").textContent);
      assert.equal(nodes.get("#kitchen-status").tabIndex, 0);
      assert.equal(calls.length, 1);
    }
    for (const [key, action] of [["ledstripWarm", "preset"], ["speaker", "previous"], ["speaker", "next"]]) {
      const { card } = setupKitchen();
      card._config.language = language;
      const nodes = renderKitchen(card);
      await card._control(key, action);
      assert.equal(card._status, "Control request sent.");
      assert.equal(nodes.get("#kitchen-status").textContent, translations[language]["Control request sent."]);
    }
  }
});

test("kitchen feedback waits for readback, never claims uncertain execution, and never retries", async () => {
  for (const fail of [false, true]) {
    const { card, calls } = setupKitchen(), nodes = renderKitchen(card);
    const readback = card._readback.bind(card);
    let entered, release;
    const started = new Promise(resolve => { entered = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    card._readback = async plan => {
      entered();
      await gate;
      if (fail) throw new Error("Synthetic unconfirmed device feedback");
      return readback(plan);
    };
    const pending = card._control("worktop", "power");
    await started;
    assert.equal(calls.length, 1);
    assert.equal(card._busy, true);
    assert.equal(card._status, "Sending control request");
    assert.equal(nodes.get("#kitchen-status").textContent, translations.nl["Sending control request"]);
    await card._control("speaker", "play");
    assert.equal(calls.length, 1);
    release();
    await pending;
    assert.equal(card._busy, false);
    assert.equal(card._blocked, fail);
    assert.equal(card._status, fail ? card._writeMessages().uncertain : "Successfully executed.");
    assert.equal(calls.length, 1);
    card._readback = readback;
    if (fail) {
      await card._refresh();
      assert.equal(card._blocked, false);
      assert.equal(card._status, card._writeMessages().refreshed);
      assert.equal(calls.length, 1);
    }
  }
});

test("kitchen slider fill follows values and stays unchanged during pending locks", () => {
  const { card } = setupKitchen(), nodes = renderKitchen(card);
  const input = nodes.get("#speaker-volume");
  for (const value of [0, 25, 100, -10, 110]) {
    card._busy = false;
    card._range("speaker-volume", true, value, 0, 100, "%");
    const expected = `${Math.max(0, Math.min(100, value))}%`;
    assert.equal(input.style["--range-fill"], expected);
    card._busy = true;
    card._range("speaker-volume", true, value, 0, 100, "%");
    assert.equal(input.disabled, true);
    assert.equal(input.dataset.pendingLock, "true");
    assert.equal(input.style["--range-fill"], expected);
  }
  card._range("worktop-temperature", true, 4000, 2000, 6000, " K");
  assert.equal(nodes.get("#worktop-temperature").style["--range-fill"], "50%");
  card._range("worktop-temperature", false, null, 0, 0, " K");
  assert.equal(nodes.get("#worktop-temperature").style["--range-fill"], "0%");
  assert.equal(nodes.get("#worktop-temperature").dataset.pendingLock, "false");
  assert.match(source, /appearance: none; -webkit-appearance: none; --range-color: var\(--cp-accent\)/);
  for (const pseudo of ["::-webkit-slider-runnable-track", "::-webkit-slider-thumb",
    "::-moz-range-track", "::-moz-range-thumb"]) assert.ok(source.includes(pseudo));
});

test("kitchen slider dragging updates the fill and output without sending until release", () => {
  const { card } = setupKitchen(), nodes = renderKitchen(card);
  const input = nodes.get("#speaker-volume"), events = new Map(), requests = [];
  input.addEventListener = (name, handler) => events.set(name, handler);
  card._control = (...args) => requests.push(args);
  card._bindRange("speaker", "volume");
  input.value = "80";
  events.get("input")();
  assert.equal(input.style["--range-fill"], "80%");
  assert.equal(nodes.get("#speaker-volume-value").textContent, "80%");
  assert.equal(requests.length, 0);
  events.get("change")();
  assert.deepEqual(requests, [["speaker", "volume", 80]]);
});

test("Sonos controls keep DOM and visual order in one horizontally scrollable row", () => {
  const markup = source.match(/<div class="media-controls">([\s\S]*?)<\/div>/)[1];
  assert.deepEqual([...markup.matchAll(/id="speaker-([^"]+)"/g)].map(match => match[1]),
    ["play", "mute", "previous", "next"]);
  assert.match(source, /\.media-controls \{ display: grid; grid-template-columns: repeat\(4,minmax\(68px,1fr\)\);\s*gap: 12px; margin: 24px 0; overflow-x: auto;/);
  assert.match(source, /\.media-controls button:focus-visible \{ outline-offset: -4px; \}/);
});

test("Sonos play and mute accent states follow reported playback and mute independently", () => {
  const { card, states, publish, calls } = setupKitchen(), nodes = renderKitchen(card);
  const speaker = states().find(row => row.entity_id === kitchenEntities.speaker);
  for (const state of ["playing", "paused", "idle", "buffering", "unavailable"]) {
    for (const muted of [true, false]) {
      speaker.state = state;
      speaker.attributes.is_volume_muted = muted;
      publish();
      assert.equal(nodes.get("#speaker-play").attributes["aria-pressed"], String(state === "playing"));
      assert.equal(nodes.get("#speaker-mute").attributes["aria-pressed"], String(muted));
      assert.equal(nodes.get("#speaker-play").dataset.icon, state === "playing" ? "pause" : "play");
      assert.equal(nodes.get("#speaker-mute").dataset.icon, muted ? "volume-off" : "volume-high");
    }
  }
  assert.equal(calls.length, 0);
});

test("light state badges reflect Kelvin and brightness, then clear stale color when off or unavailable", () => {
  const { card, states, publish, calls } = setupKitchen();
  const light = states().find(row => row.entity_id === kitchenEntities.worktop);
  light.state = "on";
  light.attributes.brightness = 230;
  light.attributes.color_temp_kelvin = 2331;
  publish();
  const nodes = renderKitchen(card), badge = nodes.get("#worktop-state");
  assert.equal(badge.dataset.icon, "lightbulb-group");
  assert.match(badge.innerHTML, /data-icon="mdi:lightbulb-group"/);
  assert.match(badge.attributes["aria-label"], /90%, 2331 K/);
  const warm = badge.style["--light-color"];
  assert.match(warm, /^rgb\(255, \d+, \d+\)$/);
  const bright = Number(badge.style["--light-level"]);
  light.attributes.brightness = 30;
  publish();
  assert.ok(Number(badge.style["--light-level"]) < bright);
  assert.equal(badge.style["--light-color"], warm);
  light.attributes.color_temp_kelvin = 6500;
  publish();
  assert.notEqual(badge.style["--light-color"], warm);
  light.state = "off";
  publish();
  assert.equal(badge.dataset.icon, "lightbulb-group-off-outline");
  assert.equal(badge.style["--light-color"], "var(--cp-text-muted)");
  assert.equal(badge.style["--light-level"], "1");
  assert.equal(badge.attributes["aria-label"], "Werkblad: Uit");
  light.state = "unavailable";
  publish();
  assert.equal(badge.dataset.icon, "help-circle-outline");
  assert.equal(badge.attributes["title"], `Werkblad: ${card._t("Device unavailable")}`);
  assert.equal(calls.length, 0);
});

test("light badges omit unknown or invalid telemetry and do not reuse stale Kelvin in RGB mode", () => {
  const { card, states, publish } = setupKitchen();
  const light = states().find(row => row.entity_id === kitchenEntities.ceiling);
  light.state = "on";
  const nodes = renderKitchen(card), badge = nodes.get("#ceiling-state");
  for (const [brightness, temperature] of [
    [undefined, undefined], [null, null], [-1, -1], [256, 40001],
    [NaN, NaN], [Infinity, Infinity], ["150", "2331"], [100, 999],
  ]) {
    light.attributes.brightness = brightness;
    light.attributes.color_temp_kelvin = temperature;
    publish();
    assert.equal(badge.dataset.icon, "lightbulb-group");
    assert.equal(badge.style["--light-color"], "var(--cp-text-muted)");
    assert.doesNotMatch(badge.attributes["aria-label"], / K/);
    assert.doesNotMatch(JSON.stringify(badge.style), /NaN|Infinity/);
    if (brightness !== 100) {
      assert.equal(badge.style["--light-level"], "1");
      assert.doesNotMatch(badge.attributes["aria-label"], /%/);
    }
  }
  for (const temperature of [1000, 40000]) {
    light.attributes.color_temp_kelvin = temperature;
    publish();
    assert.match(badge.style["--light-color"], /^rgb\(\d+, \d+, \d+\)$/);
  }
  light.attributes.color_mode = "rgb";
  light.attributes.color_temp_kelvin = 2331;
  publish();
  assert.equal(badge.style["--light-color"], "var(--cp-text-muted)");
  assert.doesNotMatch(badge.attributes["aria-label"], /2331/);
});

test("media icons follow playback/mute state with translated accessible labels and no text replacement", () => {
  const { card, states, publish, calls } = setupKitchen();
  const nodes = renderKitchen(card);
  for (const [id, icon, label] of [
    ["previous", "skip-previous", "Previous track"], ["play", "play", "Play"],
    ["next", "skip-next", "Next track"], ["mute", "volume-high", "Mute"],
  ]) {
    const button = nodes.get(`#speaker-${id}`);
    assert.equal(button.dataset.icon, icon);
    assert.match(button.innerHTML, /<svg .*aria-hidden="true"/);
    assert.equal(button.attributes["aria-label"], card._t(label));
    assert.equal(button.attributes.title, card._t(label));
  }
  const speaker = states().find(row => row.entity_id === kitchenEntities.speaker);
  speaker.state = "playing";
  speaker.attributes.is_volume_muted = true;
  publish();
  assert.equal(nodes.get("#speaker-play").dataset.icon, "pause");
  assert.equal(nodes.get("#speaker-play").attributes["aria-label"], card._t("Pause"));
  assert.equal(nodes.get("#speaker-mute").dataset.icon, "volume-off");
  assert.equal(nodes.get("#speaker-mute").attributes["aria-label"], card._t("Unmute"));
  assert.equal(nodes.get("#speaker-mute").attributes["aria-pressed"], "true");
  const playSvg = nodes.get("#speaker-play").innerHTML;
  card._config.language = "en";
  publish();
  assert.equal(nodes.get("#speaker-play").attributes["aria-label"], "Pause");
  assert.equal(nodes.get("#speaker-mute").attributes.title, "Unmute");
  assert.equal(nodes.get("#speaker-play").innerHTML, playSvg);
  assert.equal(calls.length, 0);
});

function renderRadioSources(card, context) {
  const element = () => ({
    dataset: {}, attributes: {}, children: [], listeners: {}, textContent: "", hidden: false,
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(event, handler) { this.listeners[event] = handler; },
    append(child) { this.children.push(child); },
    replaceChildren(...children) { this.children = children; },
  });
  const group = element();
  context.document = { createElement: element };
  context.console.warn = () => {};
  card.shadowRoot.querySelector = () => group;
  card._render = () => card._renderSources(card._info("speaker"), card._canAct());
  card._render();
  return group;
}

test("radio tiles follow live favorites, use only local logos and safely name unknown favorites", () => {
  const { card, states, context, publish } = setupKitchen();
  const names = ["NPO Radio 2 - myTuner", "Omroep Brabant - myTuner", "Radio 10 - myTuner",
    "Radio 538 - myTuner", "Radio Veronica - myTuner", '<img src=x onerror="bad()">', "__proto__"];
  const speaker = states().find(row => row.entity_id === kitchenEntities.speaker);
  speaker.attributes.source_list = [...names, names[0], "", null, 42];
  publish();
  const group = renderRadioSources(card, context);
  assert.deepEqual(group.children.map(button => button.dataset.source), names);
  for (const [index, button] of group.children.entries()) {
    assert.equal(button.attributes["aria-label"], names[index]);
    assert.equal(button.title, names[index]);
    assert.equal(button.disabled, false);
    const label = button.children.at(-1);
    assert.equal(label.textContent, names[index]);
    if (index < 5) {
      const image = button.children[0];
      assert.match(image.src, /^\/local\/vh-radio-favorites\/[a-z0-9-]+\.(png|jpg)$/);
      assert.equal(image.alt, "");
      assert.equal(label.hidden, true);
      assert.ok(fs.existsSync(path.join(root, "www", image.src.slice("/local/".length))));
      image.listeners.error();
      assert.equal(image.hidden, true);
      assert.equal(label.hidden, false);
    } else assert.equal(button.children.length, 1);
  }
});

test("radio tiles retain focusable nodes, reflect the current source and apply all write guards", () => {
  const { card, context, mock, states, publish } = setupKitchen();
  const group = renderRadioSources(card, context), first = group.children[0];
  assert.equal(first.attributes["aria-pressed"], "true");
  const speaker = states().find(row => row.entity_id === kitchenEntities.speaker);
  speaker.attributes.source = "Other demo radio";
  publish();
  assert.equal(group.children[0], first);
  assert.equal(first.attributes["aria-pressed"], "false");
  assert.equal(group.children[1].attributes["aria-pressed"], "true");
  for (const key of ["_busy", "_blocked", "preview"]) {
    card[key] = true;
    card._render();
    assert.ok(group.children.every(button => button.disabled), key);
    card[key] = false;
  }
  mock.connected = false;
  card._render();
  assert.ok(group.children.every(button => button.disabled));
  mock.connected = true;
  delete mock.services.media_player.select_source;
  card._render();
  assert.ok(group.children.every(button => button.disabled));
  mock.services.media_player.select_source = {};
  speaker.attributes.supported_features = 4;
  publish();
  assert.ok(group.children.every(button => button.disabled));
  speaker.attributes.source_list = [];
  publish();
  assert.equal(group.children.length, 0);
});

test("radio tile activation sends one existing Sonos source selection and never edits inventory", async () => {
  const { card, context, calls, states } = setupKitchen();
  const before = JSON.stringify(states().filter(row => row.entity_id.startsWith("sensor.vh_inventory_")));
  const group = renderRadioSources(card, context);
  const pending = group.children[1].listeners.click();
  await group.children[1].listeners.click();
  await pending;
  assert.deepEqual(calls, [["media_player", "select_source",
    { entity_id: kitchenEntities.speaker, source: "Other demo radio" }]]);
  assert.equal(JSON.stringify(states().filter(row => row.entity_id.startsWith("sensor.vh_inventory_"))), before);
  assert.equal(group.children[1].attributes["aria-pressed"], "true");
  assert.equal(card._blocked, false);
});

test("LED strip presets reuse exact popup automation triggers without changing inventory or relay power", async () => {
  const { card, states, calls, publish } = setupKitchen();
  const inventory = JSON.stringify(states().filter(row => row.entity_id.startsWith("sensor.vh_inventory_")));
  for (const key of ["ledstripWarm", "ledstripCold", "ledstripOff"]) {
    const automation = states().find(row => row.entity_id === kitchenEntities[key]);
    automation.state = "off";
    publish();
    await card._control(key, "preset");
    assert.deepEqual(calls.at(-1), ["automation", "trigger", {
      entity_id: kitchenEntities[key], skip_condition: true,
    }]);
    assert.equal(automation.state, "off");
    assert.equal(card._status, "Control request sent.");
    assert.equal(card._blocked, false);
  }
  assert.equal(calls.length, 3);
  assert.equal(states().find(row => row.entity_id === kitchenEntities.ledstripPower).state, "on");
  assert.equal(states().find(row => row.entity_id === kitchenEntities.worktopAutoOff).state, "off");
  assert.equal(JSON.stringify(states().filter(row => row.entity_id.startsWith("sensor.vh_inventory_"))), inventory);
});

test("LED strip power and Werkblad auto-off use explicit state-based services and exact entities", async () => {
  const { card, calls } = setupKitchen();
  for (const [key, domain, services] of [
    ["ledstripPower", "switch", ["turn_off", "turn_on"]],
    ["worktopAutoOff", "automation", ["turn_on", "turn_off"]],
  ]) {
    for (const service of services) {
      await card._control(key, "power");
      assert.deepEqual(calls.at(-1), [domain, service, { entity_id: kitchenEntities[key] }]);
      assert.equal(card._blocked, false);
    }
  }
  assert.equal(calls.length, 4);
});

test("removed relay/auto-off controls stay absent while preset availability still updates", () => {
  const { card, states, publish, mock, calls } = setupKitchen();
  const nodes = renderKitchen(card);
  assert.equal(calls.length, 0);
  assert.equal(nodes.has("#ledstrip-power"), false);
  assert.equal(nodes.has("#worktop-auto-off"), false);
  for (const mode of ["warm", "cold", "off"]) {
    assert.equal(nodes.get(`#ledstrip-${mode}`).disabled, false);
    assert.equal(nodes.get(`#ledstrip-${mode}`).attributes["aria-pressed"], undefined);
  }
  states().find(row => row.entity_id === kitchenEntities.ledstripPower).state = "off";
  states().find(row => row.entity_id === kitchenEntities.worktopAutoOff).state = "on";
  states().find(row => row.entity_id === kitchenEntities.worktop).state = "unavailable";
  states().find(row => row.entity_id === kitchenEntities.ledstripOff).state = "unavailable";
  publish();
  assert.equal(nodes.has("#ledstrip-power"), false);
  assert.equal(nodes.has("#worktop-auto-off"), false);
  assert.equal(states().find(row => row.entity_id === kitchenEntities.ledstripPower).state, "off");
  assert.equal(states().find(row => row.entity_id === kitchenEntities.worktopAutoOff).state, "on");
  assert.equal(nodes.get("#worktop-power").disabled, true);
  assert.equal(nodes.get("#ledstrip-warm").disabled, false);
  assert.equal(nodes.get("#ledstrip-off").disabled, true);
  delete mock.services.automation.trigger;
  delete mock.services.automation.turn_off;
  publish();
  assert.equal(nodes.get("#ledstrip-warm").disabled, true);
  assert.equal(nodes.has("#worktop-auto-off"), false);
  assert.equal(nodes.has("#ledstrip-power"), false);
  assert.equal(nodes.get("#kitchen-refresh").hidden, true);
  assert.equal(calls.length, 0);
});

test("LED controls reject unsupported actions and stale power state before sending", async () => {
  for (const [key, action] of [["ledstripWarm", "power"], ["ledstripPower", "preset"], ["worktopAutoOff", "preset"]]) {
    const { card, calls } = setupKitchen();
    await card._control(key, action);
    assert.equal(card._blocked, true);
    assert.equal(calls.length, 0);
  }
  for (const key of ["ledstripPower", "worktopAutoOff"]) {
    const { card, states, mock, calls } = setupKitchen();
    mock.callWS = async () => {
      const row = states().find(row => row.entity_id === kitchenEntities[key]);
      row.state = row.state === "on" ? "off" : "on";
      return structuredClone(states());
    };
    await card._control(key, "power");
    assert.equal(card._blocked, true);
    assert.equal(calls.length, 0);
  }
});

test("uncertain LED preset requests are never repeated and show recovery until refreshed", async () => {
  const { card, mock, calls } = setupKitchen();
  const nodes = renderKitchen(card);
  mock.callService = async (...args) => { calls.push(args); throw new Error("Lost trigger response"); };
  await card._control("ledstripWarm", "preset");
  assert.equal(card._blocked, true);
  assert.equal(calls.length, 1);
  assert.equal(nodes.get("#kitchen-refresh").hidden, false);
  await card._control("ledstripWarm", "preset");
  await card._control("ledstripPower", "power");
  assert.equal(calls.length, 1);
  await card._refresh();
  assert.equal(card._blocked, false);
  assert.equal(nodes.get("#kitchen-refresh").hidden, true);
  assert.equal(calls.length, 1);
});

test("kitchen controls send only explicit light/media requests to the configured entities", async () => {
  const { card, calls, states } = setupKitchen();
  const beforeInventory = JSON.stringify(states().filter(row => row.entity_id.startsWith("sensor.vh_inventory_")));
  await card._control("worktop", "power");
  assert.deepEqual(calls.at(-1), ["light", "turn_off", { entity_id: kitchenEntities.worktop }]);
  await card._control("worktop", "power");
  assert.equal(calls.at(-1)[1], "turn_on");
  await card._control("worktop", "brightness", 65);
  assert.deepEqual(calls.at(-1), ["light", "turn_on", { entity_id: kitchenEntities.worktop, brightness_pct: 65 }]);
  await card._control("ceiling", "temperature", 4200);
  assert.deepEqual(calls.at(-1), ["light", "turn_on", { entity_id: kitchenEntities.ceiling, color_temp_kelvin: 4200 }]);
  await card._control("speaker", "play");
  assert.equal(calls.at(-1)[1], "media_play");
  await card._control("speaker", "play");
  assert.equal(calls.at(-1)[1], "media_pause");
  await card._control("speaker", "volume", 20);
  assert.deepEqual(calls.at(-1), ["media_player", "volume_set", { entity_id: kitchenEntities.speaker, volume_level: 0.2 }]);
  await card._control("speaker", "mute");
  assert.deepEqual(calls.at(-1)[2], { entity_id: kitchenEntities.speaker, is_volume_muted: true });
  await card._control("speaker", "source", "Other demo radio");
  assert.deepEqual(calls.at(-1)[2], { entity_id: kitchenEntities.speaker, source: "Other demo radio" });
  await card._control("speaker", "previous");
  assert.equal(calls.at(-1)[1], "media_previous_track");
  await card._control("speaker", "next");
  assert.equal(calls.at(-1)[1], "media_next_track");
  assert.equal(card._blocked, false);
  assert.equal(card._status, "Control request sent.");
  assert.equal(calls.length, 11);
  assert.equal(JSON.stringify(states().filter(row => row.entity_id.startsWith("sensor.vh_inventory_"))), beforeInventory);
});

test("kitchen controls validate entity, action, capabilities and numeric/source bounds before writes", async () => {
  for (const [key, action, value] of [
    ["invalid", "power"], ["worktop", "next"], ["speaker", "invalid"],
    ["worktop", "brightness", 0], ["worktop", "brightness", 101], ["worktop", "brightness", NaN],
    ["ceiling", "temperature", 2000], ["ceiling", "temperature", 7000],
    ["speaker", "volume", -1], ["speaker", "volume", 101], ["speaker", "volume", 1.5],
    ["speaker", "source", "Not a real station"], ["speaker", "source", ""],
  ]) {
    const { card, calls } = setupKitchen();
    await card._control(key, action, value);
    assert.equal(calls.length, 0, `${key}/${action}/${value}`);
    assert.equal(card._blocked, true);
    assert.equal(card._status, "Device changed or unavailable. Refresh and check before trying again.");
  }
  for (const unavailable of ["offline", "preview", "busy", "blocked"]) {
    const { card, calls } = setupKitchen();
    if (unavailable === "offline") card._hass.connected = false;
    else if (unavailable === "preview") card.preview = true;
    else card[`_${unavailable}`] = true;
    await card._control("worktop", "power");
    assert.equal(calls.length, 0);
  }
});

test("kitchen unavailable and unsupported devices disable only their supported actions", () => {
  const { card, states, publish } = setupKitchen();
  const worktop = states().find(row => row.entity_id === kitchenEntities.worktop);
  const ceiling = states().find(row => row.entity_id === kitchenEntities.ceiling);
  worktop.state = "unavailable";
  ceiling.attributes.supported_color_modes = ["onoff"];
  publish();
  assert.equal(card._supports("worktop", "power", card._info("worktop")), false);
  assert.equal(card._supports("ceiling", "power", card._info("ceiling")), true);
  assert.equal(card._supports("ceiling", "brightness", card._info("ceiling")), false);
  assert.equal(card._supports("ceiling", "temperature", card._info("ceiling")), false);
  const speaker = states().find(row => row.entity_id === kitchenEntities.speaker);
  speaker.attributes.supported_features = 4;
  publish();
  assert.equal(card._supports("speaker", "volume", card._info("speaker")), true);
  for (const action of ["play", "mute", "previous", "next", "source"]) {
    assert.equal(card._supports("speaker", action, card._info("speaker")), false);
  }
});

test("kitchen rejects stale state and absent services, never repeats uncertain writes and refreshes explicitly", async () => {
  for (const condition of ["stale", "service", "lost", "readback"]) {
    const { card, mock, states, calls, publish } = setupKitchen();
    if (condition === "stale") {
      mock.callWS = async () => {
        states().find(row => row.entity_id === kitchenEntities.worktop).attributes.brightness = 200;
        return structuredClone(states());
      };
    } else if (condition === "service") delete mock.services.light.turn_on;
    else if (condition === "lost") mock.callService = async (...args) => { calls.push(args); throw new Error("Lost response"); };
    else mock.callService = async (...args) => { calls.push(args); };
    await card._control("worktop", "brightness", 70);
    assert.equal(card._blocked, true, condition);
    assert.equal(calls.length, ["lost", "readback"].includes(condition) ? 1 : 0);
    assert.equal(card._status, calls.length ? "Device response uncertain. Do not repeat the action. Refresh and check the device first."
      : "Device changed or unavailable. Refresh and check before trying again.");
    await card._control("speaker", "play");
    assert.equal(calls.length, ["lost", "readback"].includes(condition) ? 1 : 0);
    publish();
    await card._refresh();
    assert.equal(card._blocked, false);
    assert.equal(card._status, "Device states refreshed.");
  }
});

test("kitchen rejects off lights and malformed reported capabilities without sending commands", async () => {
  for (const [key, action, value, patch] of [
    ["worktop", "brightness", 70, { state: "off" }],
    ["worktop", "brightness", 70, { attributes: { supported_color_modes: "color_temp" } }],
    ["worktop", "brightness", 70, { attributes: { brightness: 300 } }],
    ["ceiling", "temperature", 4000, { attributes: { color_temp_kelvin: -1 } }],
    ["ceiling", "temperature", 4000, { attributes: { min_color_temp_kelvin: NaN } }],
    ["speaker", "play", undefined, { attributes: { supported_features: -1 } }],
    ["speaker", "source", "Demo radio", { attributes: { source_list: "Demo radio" } }],
  ]) {
    const { card, calls, states, publish } = setupKitchen();
    const row = states().find(entity => entity.entity_id === kitchenEntities[key]);
    if (patch.state) row.state = patch.state;
    Object.assign(row.attributes, patch.attributes);
    publish();
    assert.equal(card._supports(key, action, card._info(key)), false);
    await card._control(key, action, value);
    assert.equal(calls.length, 0, `${key}/${action}`);
    assert.equal(card._blocked, true);
  }
});

test("kitchen refresh is hidden in real-time operation and appears only until successful recovery", async () => {
  const { card, mock, states, publish, calls } = setupKitchen();
  const nodes = renderKitchen(card);
  const refresh = nodes.get("#kitchen-refresh");
  assert.equal(refresh.hidden, true);
  assert.equal(calls.length, 0);
  mock.connected = false;
  publish();
  assert.equal(refresh.hidden, true);
  assert.equal(refresh.disabled, true);
  mock.connected = true;
  const light = states().find(row => row.entity_id === kitchenEntities.worktop);
  light.state = "off";
  publish();
  assert.equal(nodes.get("#worktop-power").textContent, "Inschakelen");
  assert.equal(refresh.hidden, true);
  await card._control("worktop", "power");
  assert.equal(refresh.hidden, true);
  assert.equal(calls.length, 1);
  mock.callService = async () => { throw new Error("Lost response"); };
  await card._control("worktop", "power");
  assert.equal(card._blocked, true);
  assert.equal(refresh.hidden, false);
  assert.equal(refresh.disabled, false);
  publish();
  assert.equal(refresh.hidden, false);
  const read = mock.callWS;
  mock.callWS = async () => { throw new Error("Refresh failed"); };
  await card._refresh();
  assert.equal(refresh.hidden, false);
  mock.connected = false;
  publish();
  assert.equal(refresh.hidden, false);
  assert.equal(refresh.disabled, true);
  mock.connected = true;
  card._busy = true;
  card._render();
  assert.equal(refresh.disabled, true);
  card._busy = false;
  mock.callWS = read;
  await card._refresh();
  assert.equal(card._blocked, false);
  assert.equal(refresh.hidden, true);
  assert.equal(calls.length, 1);
});

test("kitchen page uses scanner-style header, linked labels, release-only sliders and validated config", () => {
  const { KitchenCard } = setup();
  const card = new KitchenCard(), nodes = new Map();
  card.setAttribute = () => {};
  card._render = () => {};
  card.shadowRoot.querySelector = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      dataset: {}, listeners: {}, addEventListener(event, handler) { this.listeners[event] = handler; },
    });
    return nodes.get(selector);
  };
  const config = { kitchen: kitchenEntities, translations, language: "nl" };
  card.setConfig(config);
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<header><div class="brand"><img id="kitchen-logo" class="brand-logo"/);
  assert.match(html, /<div class="eyebrow">VH-INVENTORY<\/div>/);
  assert.match(html, /<h1 data-i18n="Kitchen - Lighting and music">/);
  assert.equal(card._t("Kitchen - Lighting and music"), "Keuken - Verlichting en muziek");
  assert.equal(card._t("Kitchen"), "Keuken");
  assert.match(html, /id="kitchen-refresh"[^>]* hidden>/);
  assert.match(html, /id="kitchen-status"[^>]*aria-atomic="true"/);
  assert.match(html, /class="recovery-slot"><button id="kitchen-refresh"/);
  assert.match(html, /class="speaker-group-slot"><p id="speaker-group"/);
  assert.match(html, /#kitchen-status \{[^}]*height: 3em; flex: 0 0 3em;/);
  assert.doesNotMatch(html, /#kitchen-status:empty/);
  assert.match(html, /\.range-label \{ display: grid; grid-template-columns: minmax\(0,1fr\) 8ch;/);
  assert.match(html, /\.media-panel \.device-heading \{[^}]*grid-template-columns: minmax\(0,1fr\) min\(200px,50%\);/);
  assert.match(html, /#speaker-state \{[^}]*height: 3em;[^}]*white-space: nowrap;/);
  assert.match(html, /class="device-state light-indicator" role="img"/);
  assert.doesNotMatch(html, /id="speaker-(previous|play|next|mute)"[^>]*data-i18n=/);
  assert.doesNotMatch(html, /id="(?:worktop-auto-off|ledstrip-power)"/);
  assert.equal(nodes.has("#worktop-auto-off"), false);
  assert.equal(nodes.has("#ledstrip-power"), false);
  assert.match(html, /id="ledstrip-warm"[^>]*data-i18n="Warm"/);
  assert.match(html, /id="ledstrip-cold"[^>]*data-i18n="Cold"/);
  assert.match(html, /id="ledstrip-off"[^>]*data-i18n="Off"/);
  assert.match(html, /<div class="worktop-panels">\s*<section class="panel kitchen-panel" aria-labelledby="worktop-title">/);
  assert.match(html, /id="worktop-temperature"[^>]*>\s*<\/section>\s*<section class="panel kitchen-panel ledstrip" aria-labelledby="ledstrip-title">/);
  assert.match(html, /<h2 id="ledstrip-title" data-i18n="LED strip">/);
  assert.equal(nodes.get("#kitchen-logo").src, "/local/van-hemert-logo-hi.png");
  for (const id of ["worktop-brightness", "worktop-temperature", "ceiling-brightness", "ceiling-temperature", "speaker-volume"]) {
    assert.match(html, new RegExp(`for="${id}"`));
    assert.match(html, new RegExp(`id="${id}" type="range"`));
    const events = nodes.get(`#${id}`).listeners;
    assert.ok(events.input);
    assert.ok(events.change);
  }
  for (const kitchen of [null, { ...kitchenEntities, worktop: "switch.not_allowed" },
    { ...kitchenEntities, ceiling: kitchenEntities.worktop }, { ...kitchenEntities, speaker: "media_player.bad;id" },
    { ...kitchenEntities, ledstripPower: "light.not_allowed" }, { ...kitchenEntities, ledstripWarm: null },
    { ...kitchenEntities, worktopAutoOff: kitchenEntities.ledstripWarm }]) {
    assert.throws(() => card.setConfig({ ...config, kitchen }), /valid kitchen entities/);
  }
});

test("kitchen navigation is leftmost and preserves scanner drafts and pending device controls", () => {
  const { dashboard, kitchen, scan, navigationWindow } = setupNavigation();
  dashboard._switchPage("kitchen");
  assert.equal(dashboard._page, "kitchen");
  assert.equal(navigationWindow.location.hash, "#kitchen");
  assert.equal(kitchen.hidden, false);
  assert.equal(scan.hidden, true);
  kitchen._busy = true;
  dashboard._switchPage("scan");
  assert.equal(dashboard._page, "kitchen");
  kitchen._busy = false;
  dashboard._switchPage("scan");
  scan._dirty = () => true;
  dashboard._switchPage("kitchen");
  assert.equal(dashboard._page, "scan");
});

function setupConfiguration() {
  const entities = [
    "input_boolean.vh_tts_enabled", "input_boolean.vh_touchscreen_fullscreen",
    "input_boolean.vh_kiosk_mode", "input_text.vh_mqtt_topic", "input_number.vh_tts_volume",
    "input_select.vh_handheld_add_color", "switch.barcode_01_scanning_enabled",
    "light.barcode_01_display_backlight", "number.barcode_01_idle_timer",
    "select.barcode_01_startup_mode", "text.barcode_01_product_name",
    "switch.barcode_01_print_inventory_list", "counter.vh_ai_match_calls_today",
    "sensor.scanner_01_state", "event.scanner_01_last_scan",
  ];
  const configuration = { version: 1, sections: [
    { id: "tts", title: "TTS announcements", fields: entities.map((entity) => ({ entity, name: entity })), hints: [] },
  ], scanners: { devices: ["Barcode-01", "Barcode-02", "Scanner-01"], sections: [] } };
  const fixture = setupManagement("products", configuration);
  const Card = vm.runInContext('customElements.get("vh-inventory-configuration-touchscreen")', fixture.context);
  const card = new Card();
  card._config = { translations, language: "nl", configuration };
  card._fields = new Map(configuration.sections[0].fields.map((field) => [field.entity, field]));
  card._selections = [
    { id: "speakers", helper: "input_text.vh_tts_media_players", service: "vh_inventory_tts_toggle_player", parameter: "player" },
    { id: "notifications", helper: "input_text.vh_notify_devices", service: "vh_inventory_notify_toggle_device", parameter: "device" },
  ];
  card._speakers = null;
  card._render = () => {};
  card._buildEditor = () => {};
  card.hass = fixture.mock;
  return { ...fixture, card };
}

test("configuration uses explicit HA services for each writable domain and does not write on opening", async () => {
  const { card, calls } = setupConfiguration();
  await card.activate();
  assert.equal(calls.length, 0);
  assert.equal(card._speakers[0].value, "media_player.demo_speaker");
  const cases = [
    ["input_boolean.vh_tts_enabled", "turn_on", "on"],
    ["switch.barcode_01_scanning_enabled", "turn_on", "on"],
    ["light.barcode_01_display_backlight", "turn_on", "on"],
    ["input_text.vh_mqtt_topic", "set_value", "demo/topic"],
    ["text.barcode_01_product_name", "set_value", "Demo product"],
    ["input_number.vh_tts_volume", "set_value", "2"],
    ["number.barcode_01_idle_timer", "set_value", "3"],
    ["input_select.vh_handheld_add_color", "select_option", "Demo B"],
    ["select.barcode_01_startup_mode", "select_option", "Demo B"],
  ];
  for (const [entity, service, value] of cases) {
    if (value === "on") await card._toggle(entity);
    else {
      card._openEditor(entity);
      card._editor.values.value = value;
      await card._save();
    }
    const call = calls.at(-1);
    assert.equal(call[0], entity.split(".")[0]);
    assert.equal(call[1], service);
    assert.equal(call[2].entity_id, entity);
    assert.equal(card._states[entity].state, value);
    assert.equal(card._blocked, false);
    assert.equal(card._editor, null);
  }
  assert.equal(calls.length, cases.length);
});

test("touchscreen fullscreen toggles use verified helper writes without changing the main kiosk setting", async () => {
  const { card, calls } = setupConfiguration();
  const entity = "input_boolean.vh_touchscreen_fullscreen";
  const main = card._states["input_boolean.vh_kiosk_mode"].state;
  await card.activate();
  assert.equal(calls.length, 0);
  await card._toggle(entity);
  assert.equal(card._states[entity].state, "on");
  assert.equal(card._states["input_boolean.vh_kiosk_mode"].state, main);
  await card._toggle(entity);
  assert.equal(card._states[entity].state, "off");
  assert.equal(card._states["input_boolean.vh_kiosk_mode"].state, main);
  assert.deepEqual(calls, [
    ["input_boolean", "turn_on", { entity_id: entity }],
    ["input_boolean", "turn_off", { entity_id: entity }],
  ]);
});

test("touchscreen height follows kiosk header removal and keeps the normal header fallback", () => {
  const source = fs.readFileSync(path.join(root, "www", "vh-inventory-touchscreen.js"), "utf8");
  assert.ok(source.includes("height: calc(100dvh - var(--kiosk-header-height, var(--header-height, 0px)))"));
});

test("configuration validates bounds, steps, options and text lengths without submitting invalid edits", async () => {
  for (const [entity, value] of [
    ["input_number.vh_tts_volume", ""], ["input_number.vh_tts_volume", "NaN"],
    ["input_number.vh_tts_volume", "101"], ["input_number.vh_tts_volume", "-1"],
    ["input_number.vh_tts_volume", "1.5"], ["input_text.vh_mqtt_topic", "x".repeat(256)],
    ["input_select.vh_handheld_add_color", "not an option"],
  ]) {
    const { card, calls } = setupConfiguration();
    card._openEditor(entity); card._editor.values.value = value;
    await card._save();
    assert.equal(calls.length, 0, value);
    assert.equal(card._editor.values.value, value);
    assert.equal(card._blocked, false);
    assert.equal(card._status, "Enter a value within the setting limits.");
  }
});

test("configuration disables sensors, counters, missing metadata, offline entities and missing services individually", async () => {
  const { card, calls } = setupConfiguration();
  for (const entity of ["counter.vh_ai_match_calls_today", "sensor.scanner_01_state", "event.scanner_01_last_scan"]) {
    card._openEditor(entity); await card._toggle(entity);
    assert.equal(card._editor, null);
  }
  delete card._states["input_text.vh_mqtt_topic"].attributes.max;
  card._openEditor("input_text.vh_mqtt_topic");
  assert.equal(card._editor, null);
  card._states["switch.barcode_01_scanning_enabled"].state = "unavailable";
  await card._toggle("switch.barcode_01_scanning_enabled");
  delete card._hass.services.light.turn_on;
  await card._toggle("light.barcode_01_display_backlight");
  assert.equal(calls.length, 0);
  await card._toggle("input_boolean.vh_tts_enabled");
  assert.equal(calls.length, 1);
  card._hass.connected = false;
  await card._toggle("input_boolean.vh_tts_enabled");
  assert.equal(calls.length, 1);
  card._hass.connected = true; card.preview = true;
  await card._toggle("input_boolean.vh_tts_enabled");
  assert.equal(calls.length, 1);
});

test("configuration rejects stale values or metadata before writing and retains the draft", async () => {
  for (const change of ["value", "metadata", "missing"]) {
    const { card, calls, states } = setupConfiguration();
    const entity = "input_number.vh_tts_volume";
    card._openEditor(entity); card._editor.values.value = "4";
    const row = states().find((item) => item.entity_id === entity);
    if (change === "value") row.state = "3";
    if (change === "metadata") row.attributes.max = 10;
    if (change === "missing") row.state = "unavailable";
    await card._save();
    assert.equal(calls.length, 0, change);
    assert.equal(card._blocked, true);
    assert.equal(card._editor.values.value, "4");
    await card._save();
    assert.equal(calls.length, 0);
  }
});

test("configuration no-op saves do not submit writes and number formatting is not a change", async () => {
  const { card, calls, states } = setupConfiguration();
  const entity = "input_number.vh_tts_volume";
  states().find((row) => row.entity_id === entity).state = "1.0";
  card.hass = { ...card._hass, states: Object.fromEntries(structuredClone(states()).map((row) => [row.entity_id, row])) };
  card._openEditor(entity); card._editor.values.value = "1";
  await card._save();
  assert.equal(calls.length, 0);
  assert.equal(card._blocked, false);
  assert.equal(card._editor, null);
});

test("configuration print switches require confirmation and are never retried after a lost response", async () => {
  const { card, calls } = setupConfiguration();
  const entity = "switch.barcode_01_print_inventory_list";
  await card._toggle(entity);
  assert.equal(calls.length, 0);
  assert.ok(card._confirmation);
  card._hass.callService = async (...args) => { calls.push(args); throw new Error("Lost print response"); };
  await card._confirmation.run();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], "turn_on");
  assert.equal(card._blocked, true);
  await card._confirmation.run();
  await card._toggle(entity);
  assert.equal(calls.length, 1);
  assert.match(card._status, /uncertain/);
});

test("configuration membership toggles preserve all other Sonos and notification selections", async () => {
  const { card, calls, states } = setupConfiguration();
  await card.activate();
  for (const [group, helper, target, existing, service, parameter] of [
    ["speakers", "input_text.vh_tts_media_players", "media_player.demo_speaker", "media_player.other",
      "vh_inventory_tts_toggle_player", "player"],
    ["notifications", "input_text.vh_notify_devices", "mobile_app_demo_device", "mobile_app_other",
      "vh_inventory_notify_toggle_device", "device"],
  ]) {
    states().find((row) => row.entity_id === helper).state = existing;
    card.hass = { ...card._hass, states: Object.fromEntries(structuredClone(states()).map((row) => [row.entity_id, row])) };
    await card._toggleTarget(group, target);
    assert.equal(calls.at(-1)[1], service);
    assert.equal(calls.at(-1)[2][parameter], target);
    assert.deepEqual(Array.from(card._tokens(card._states[helper])), [existing, target].sort());
    await card._toggleTarget(group, target);
    assert.equal(card._states[helper].state, existing);
  }
  const count = calls.length;
  await card._toggleTarget("speakers", "media_player.unlisted");
  assert.equal(calls.length, count);
});

test("configuration serializes writes and polls only readback when a device updates late", async () => {
  const { card, calls, states } = setupConfiguration();
  const entity = "switch.barcode_01_scanning_enabled";
  let reads = 0, pending = false;
  const read = card._hass.callWS;
  card._hass.callWS = async (message) => {
    if (pending && ++reads === 3) states().find((row) => row.entity_id === entity).state = "on";
    return read(message);
  };
  card._hass.callService = async (...args) => { calls.push(args); pending = true; };
  await Promise.all([card._toggle(entity), card._toggle("input_boolean.vh_tts_enabled")]);
  assert.equal(calls.length, 1);
  assert.equal(reads, 3);
  assert.equal(card._blocked, false);
  assert.equal(card._states[entity].state, "on");
});

test("configuration unverified readback blocks repeats; cancel and explicit refresh restore safe operation", async () => {
  const { card, calls } = setupConfiguration();
  card._hass.callService = async (...args) => { calls.push(args); };
  card._openEditor("input_text.vh_mqtt_topic"); card._editor.values.value = "demo/new";
  await card._save();
  assert.equal(calls.length, 1);
  assert.equal(card._blocked, true);
  assert.equal(card._editor.values.value, "demo/new");
  await card._refresh();
  assert.equal(card._blocked, true);
  card._editor = null;
  await card._refresh();
  assert.equal(card._blocked, false);
  assert.equal(card._states["input_text.vh_mqtt_topic"].state, "");
  assert.equal(calls.length, 1);
});

test("configuration discovery failure is explicit, can be refreshed and never submits a service", async () => {
  const { card, calls, errors } = setupConfiguration();
  const read = card._hass.callWS;
  card._hass.callWS = async () => { throw new Error("Registry denied"); };
  await card.activate();
  assert.equal(card._discoveryError, true);
  assert.equal(errors.length, 1);
  assert.equal(calls.length, 0);
  card._hass.callWS = read;
  await card.activate(true);
  assert.equal(card._discoveryError, false);
  assert.equal(card._speakers.length, 1);
  assert.equal(calls.length, 0);
});

test("configuration navigation supports deep links and guards drafts, writes and unloading", () => {
  const { dashboard, navigationWindow } = setupNavigation();
  const configuration = dashboard._cards.configuration;
  let activated = 0;
  configuration.activate = () => { activated += 1; };
  dashboard._switchPage("configuration");
  assert.equal(navigationWindow.location.hash, "#configuration");
  assert.equal(activated, 1);
  configuration._editor = { values: { value: "draft" } };
  dashboard._switchPage("scan");
  assert.equal(dashboard._page, "configuration");
  const event = { preventDefault() { this.prevented = true; } };
  dashboard._beforeUnload(event);
  assert.equal(event.prevented, true);
  configuration._editor = null; configuration._busy = true;
  dashboard._switchPage("scan");
  assert.equal(dashboard._page, "configuration");
  configuration._busy = false; dashboard._switchPage("scan");
  assert.equal(dashboard._page, "scan");
});

test("management product search is accent-insensitive and finds catalogue products without stock", () => {
  const { card, calls, states, publish } = setupManagement();
  states()[0].attributes.products[2].name = "Caf\u00e9 zonder voorraad";
  publish();
  card._search = "cafe";
  assert.deepEqual(Array.from(card._rows(), (row) => row.id), [3]);
  card._search = "2000000000022";
  assert.deepEqual(Array.from(card._rows(), (row) => row.id), [2]);
  assert.equal(calls.length, 0);
});

test("management product editor saves every field by ID without changing stock or shopping", async () => {
  const { card, calls, states } = setupManagement();
  const dependencies = JSON.stringify(states().slice(1, 3));
  card._openEditor(1);
  Object.assign(card._editor.values, { name: "Gewijzigd product", barcode: "000456", manufacturer: "Ander merk",
    description: "Nieuwe beschrijving", unit: "fles", category_id: "2", store_id: "2",
    auto_add_enabled: 1, auto_add_threshold: "3", auto_add_quantity: "5" });
  await card._save();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], "vh_inventory_update_product");
  assert.equal(calls[0][2].id, 1);
  assert.equal(calls[0][2].barcode, 456);
  assert.equal(calls[0][2].category, "Pasta en rijst");
  assert.equal(calls[0][2].store, "Andere demo winkel");
  assert.equal(calls[0][2].auto_add_enabled, 1);
  assert.equal(calls[0][2].auto_add_threshold, 3);
  assert.equal(calls[0][2].auto_add_quantity, 5);
  assert.equal(card._data().products[0].description, "Nieuwe beschrijving");
  assert.equal(JSON.stringify(states().slice(1, 3)), dependencies);
  assert.equal(card._editor, null);
  assert.equal(card._blocked, false);
});

test("management creates products without barcode or references and permits suggested category assignment", async () => {
  const { card, calls } = setupManagement();
  const service = card._hass.callService;
  card._hass.callService = async (...args) => {
    await service(...args);
    const newest = card._data().products.at(-1);
    newest.category_id = 1;
  };
  // Model a server-side suggested category in the post-save state, not in the draft.
  const read = card._hass.callWS;
  let reads = 0;
  card._hass.callWS = async (...args) => {
    const result = await read(...args);
    if (++reads > 1) result[0].attributes.products.at(-1).category_id = 1;
    return result;
  };
  card._openEditor();
  card._editor.values.name = "Nieuw product";
  await card._save();
  assert.equal(calls[0][1], "vh_inventory_add_product");
  assert.equal(calls[0][2].barcode, null);
  assert.equal(calls[0][2].category, "(none)");
  assert.equal(card._editor, null);
  assert.equal(card._blocked, false);
});

function renderManagementConfirmation(environment) {
  const { card, context } = environment;
  const element = () => ({
    dataset: {}, children: [], listeners: {},
    setAttribute() {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    querySelectorAll() { return []; },
  });
  context.document = { createElement: element };
  const nodes = new Map();
  card.shadowRoot.querySelectorAll = () => [];
  card.shadowRoot.querySelector = selector => {
    if (!nodes.has(selector)) nodes.set(selector, element());
    return nodes.get(selector);
  };
  card._rows = () => [];
  card._render = Object.getPrototypeOf(card)._render.bind(card);
  return nodes;
}

test("management confirmation keeps button identity across state updates, busy changes and language changes", async () => {
  assert.match(source, /\.confirmation-actions \{ display: flex; flex-wrap: wrap; gap: 12px; \}/);
  for (const table of ["products", "locations", "categories", "stores"]) {
    const environment = setupManagement(table);
    const { card, calls } = environment;
    const id = table === "products" ? 1 : 99;
    if (table !== "products") {
      environment.states().find(row => row.entity_id === `sensor.vh_inventory_${table}`)
        .attributes[table].push({ id, [card._meta.field]: "Unused demo reference" });
      environment.publish();
    }
    renderManagementConfirmation(environment);
    await card._remove(id);
    const view = card._confirmationView;
    assert.ok(view);
    card.hass = { ...card._hass };
    assert.equal(card._confirmationView.confirm, view.confirm);
    assert.equal(card._confirmationView.cancel, view.cancel);
    card._config.language = "en";
    card._render();
    assert.equal(card._confirmationView.confirm, view.confirm);
    card._busy = true;
    card._render();
    assert.equal(view.confirm.disabled, true);
    assert.equal(view.cancel.disabled, true);
    card._busy = false;
    card._render();
    assert.equal(view.confirm.disabled, false);
    assert.equal(view.cancel.disabled, false);
    view.cancel.listeners.click();
    assert.equal(card._confirmation, null);
    assert.equal(card._confirmationView, null);
    assert.equal(calls.length, 0);
    await card._remove(id);
    assert.notEqual(card._confirmationView.confirm, view.confirm);
  }
});

test("stable management confirmation still submits exactly one deletion and verifies its cascade", async () => {
  const environment = setupManagement();
  const { card, calls } = environment;
  renderManagementConfirmation(environment);
  await card._remove(1);
  const confirm = card._confirmationView.confirm;
  card.hass = { ...card._hass };
  await confirm.listeners.click();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], "vh_inventory_delete");
  assert.equal(calls[0][2].id, 1);
  assert.equal(card._data().products.some(row => row.id === 1), false);
  assert.equal(card._data().stock.some(row => row.product_id === 1), false);
  assert.equal(card._data().shopping.some(row => row.product_id === 1), false);
  assert.equal(card._confirmation, null);
  assert.equal(card._confirmationView, null);
});

test("management reference add, rename and guarded delete preserve ID links", async () => {
  for (const table of ["locations", "categories", "stores"]) {
    const { card, calls } = setupManagement(table);
    const field = card._meta.field;
    const dependencies = JSON.stringify([card._data().products, card._data().stock]);
    card._openEditor();
    card._editor.values.value = "Nieuw";
    await card._save();
    const id = card._data()[table].find((row) => row[field] === "Nieuw").id;
    card._openEditor(id);
    card._editor.values.value = "Hernoemd";
    await card._save();
    assert.equal(card._data()[table].find((row) => row.id === id)[field], "Hernoemd");
    assert.equal(JSON.stringify([card._data().products, card._data().stock]), dependencies);
    await card._remove(id);
    assert.equal(calls.length, 2);
    await card._confirmation.run();
    assert.deepEqual(calls.at(-1), ["pyscript", "vh_inventory_delete",
      { table, id, require_unused: true, expected_value: "Hernoemd" }]);
    assert.equal(card._data()[table].some((row) => row.id === id), false);
    assert.equal(card._blocked, false);
  }
});

test("management blocks used references and guarded deletion is unavailable on older backends", async () => {
  for (const table of ["locations", "categories", "stores"]) {
    const { card, calls } = setupManagement(table);
    await card._remove(1);
    assert.equal(calls.length, 0);
    assert.equal(card._confirmation, null);
    assert.match(card._status, /in use/);
    card._hass.services.pyscript.vh_inventory_delete = {};
    assert.equal(card._canDelete(), false);
    await card._remove(2);
    assert.equal(calls.length, 0);
  }
});

test("management product deletion confirms cascade and checks stock/shopping dependencies again", async () => {
  for (const changed of [false, true]) {
    const { card, calls, states } = setupManagement();
    await card._remove(1);
    assert.match(card._confirmation.message, /all its stock and shopping/);
    assert.match(card._confirmation.detail, /1/);
    if (changed) states()[2].attributes.shopping[0].quantity += 1;
    await card._confirmation.run();
    assert.equal(calls.length, changed ? 0 : 1);
    assert.equal(card._blocked, changed);
    if (!changed) {
      assert.equal(card._data().products.some((row) => row.id === 1), false);
      assert.equal(card._data().stock.some((row) => row.product_id === 1), false);
      assert.equal(card._data().shopping.some((row) => row.product_id === 1), false);
    }
  }
});

test("management stale full-row drafts never overwrite another client's product edits", async () => {
  const { card, calls, states } = setupManagement();
  card._openEditor(1);
  card._editor.values.description = "Local draft";
  states()[0].attributes.products[0].manufacturer = "Remote change";
  await card._save();
  assert.equal(calls.length, 0);
  assert.equal(card._blocked, true);
  assert.equal(card._editor.values.description, "Local draft");
});

test("management inline fields use single-field services and reject stale values", async () => {
  const { card, calls, states } = setupManagement();
  for (const [field, value] of [["category", "2"], ["store", ""], ["auto_add_threshold", "0"], ["auto_add_quantity", "7"]]) {
    await card._setField(1, field, value);
    assert.equal(card._blocked, false);
    assert.equal(calls.at(-1)[1], "vh_inventory_set_product_field");
    assert.equal(calls.at(-1)[2].field, field);
  }
  assert.equal(card._data().products[0].store_id, null);
  states()[0].attributes.products[0].auto_add_quantity = 8;
  await card._setField(1, "auto_add_quantity", "9");
  assert.equal(calls.length, 4);
  assert.equal(card._blocked, true);
});

test("management validates names, duplicate barcodes, lengths and Auto-Add bounds before writes", async () => {
  for (const values of [{ name: "" }, { name: "Voorbeeld volkoren pasta" }, { barcode: "2000000000022" },
    { barcode: "abc" }, { manufacturer: "x".repeat(256) }, { auto_add_threshold: "-1" },
    { auto_add_quantity: "0" }, { auto_add_quantity: "1000" }, { category_id: "999" }]) {
    const { card, calls } = setupManagement();
    card._openEditor(1);
    Object.assign(card._editor.values, values);
    await card._save();
    assert.equal(calls.length, 0);
    assert.equal(card._blocked, false);
    assert.ok(card._status);
  }
  const { card, calls, states, publish } = setupManagement();
  states()[0].attributes.products[1].name = "Voorbeeld havermelk";
  publish();
  card._openEditor(1);
  card._editor.values.description = "Unchanged duplicate name is allowed";
  await card._save();
  assert.equal(calls.length, 1);
  assert.equal(card._blocked, false);
});

test("management lost responses block retries until the draft is cancelled and records are refreshed", async () => {
  const { card, calls } = setupManagement();
  const execute = card._hass.callService;
  card._hass.callService = async (...args) => { await execute(...args); throw new Error("Lost response"); };
  card._openEditor(1);
  card._editor.values.description = "Saved before lost response";
  await card._save();
  assert.equal(calls.length, 1);
  assert.equal(card._blocked, true);
  assert.match(card._status, /uncertain/);
  await card._save();
  await card._refresh();
  assert.equal(calls.length, 1);
  assert.equal(card._blocked, true);
  card._editor = null;
  await card._refresh();
  assert.equal(card._blocked, false);
  assert.equal(card._data().products[0].description, "Saved before lost response");
});

test("management missing readback, unavailable data and offline/preview states never allow repeated writes", async () => {
  for (const mode of ["offline", "preview", "blocked", "service", "shopping"]) {
    const { card, calls } = setupManagement();
    if (mode === "offline") card._hass.connected = false;
    if (mode === "preview") card.preview = true;
    if (mode === "blocked") card._blocked = true;
    if (mode === "service") card._hass.services = {};
    if (mode === "shopping") delete card._states["sensor.vh_inventory_shopping"];
    card._openEditor();
    await card._setField(1, "auto_add_quantity", "2");
    await card._remove(1);
    assert.equal(calls.length, 0);
    assert.equal(card._editor, null);
  }
  const { card, calls } = setupManagement();
  card._hass.callService = async (...args) => { calls.push(args); };
  card._openEditor();
  card._editor.values.name = "Not actually created";
  await card._save();
  assert.equal(calls.length, 1);
  assert.equal(card._blocked, true);
  assert.match(card._status, /uncertain/);
});

test("all four management pages retain guarded hashes, closed hamburger state and unload protection", () => {
  for (const page of ["products", "locations", "categories", "stores"]) {
    const { dashboard, navigationWindow } = setupNavigation();
    dashboard._menuButton = { setAttribute(key, value) { this[key] = value; }, focus() {} };
    navigationWindow.location.hash = `#${page}`;
    dashboard._hashChanged();
    assert.equal(dashboard._page, page);
    assert.equal(dashboard._menuButton["aria-expanded"], "false");
    const card = dashboard._cards[page];
    for (const field of ["_editor", "_busy"]) {
      card[field] = true;
      dashboard._switchPage("scan");
      assert.equal(dashboard._page, page);
      let prevented = false;
      dashboard._beforeUnload({ preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
      card[field] = null;
    }
    card._confirmation = {};
    dashboard._switchPage("scan");
    assert.equal(card._confirmation, null);
    assert.equal(dashboard._page, "scan");
  }
});

test("hamburger expanded state follows popup visibility on every page, including navigation and rerenders", () => {
  for (const page of ["scan", "shopping", "quick-shopping", "quick-stock", "inventory",
    "products", "locations", "categories", "stores"]) {
    const { dashboard, buttons } = setupNavigation();
    const toggle = { setAttribute(key, value) { this[key] = value; }, focus() {} };
    dashboard._menuButton = toggle;
    dashboard._menuPopup = { open: false, querySelector: () => null, style: { setProperty() {} },
      showModal() { this.open = true; }, close() { this.open = false; } };
    dashboard._switchPage(page);
    assert.equal(toggle["aria-expanded"], "false");
    assert.equal(buttons.find((button) => button.dataset.page === page)["aria-pressed"], "true");
    dashboard._setMenuOpen(true);
    assert.equal(toggle["aria-expanded"], "true");
    dashboard._renderNavigation();
    assert.equal(toggle["aria-expanded"], "true");
    dashboard._switchPage(page);
    assert.equal(dashboard._menuPopup.open, false);
    assert.equal(toggle["aria-expanded"], "false");
  }
});

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
  assert.equal(buttons.find(button => button.dataset.page === "shopping")["aria-pressed"], "true");
  assert.equal(buttons.find(button => button.dataset.page === "scan")["aria-pressed"], "false");
  assert.equal(navigationWindow.location.hash, "#shopping");
  assert.equal(navigationWindow.history.state.keep, true);
  dashboard._switchPage("scan");
  assert.equal(dashboard._cards.scan, scan);
  assert.equal(dashboard._cards.shopping, shopping);
  assert.equal(navigationWindow.location.hash, "");
  assert.equal(buttons.find(button => button.dataset.page === "scan")["aria-pressed"], "true");
  assert.equal(buttons.find(button => button.dataset.page === "shopping")["aria-pressed"], "false");
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
  assert.equal(buttons.find(button => button.dataset.page === "inventory")["aria-pressed"], "true");
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

function setupQuickShopping() {
  const { QuickShoppingCard, calls, errors } = setup();
  const card = new QuickShoppingCard();
  card._config = { translations, language: "nl" };
  const states = [
    { entity_id: "sensor.vh_inventory_products", state: "3", attributes: { products: [
      { id: 1, name: "Z Demo milk", barcode: 123 },
      { id: 2, name: "Caf\u00e9 demo", barcode: 456 },
      { id: 3, name: "Caf\u00e9 demo", barcode: 789 },
    ] } },
    { entity_id: "sensor.vh_inventory_shopping", state: "4", attributes: { shopping: [
      { id: 10, product_id: 1, product: "Z Demo milk", quantity: 2 },
      { id: 11, product_id: 1, product: "Z Demo milk", quantity: 3 },
      { id: 12, product_id: null, product: "Demo ad-hoc", quantity: 4 },
      { id: 13, product_id: 3, product: "Caf\u00e9 demo", quantity: 1 },
    ] } },
    { entity_id: "sensor.vh_inventory_stock", state: "1",
      attributes: { stock: [{ id: 20, product_id: 1, location_id: 1, quantity: 8 }] } },
  ];
  const publish = () => { card.hass = { ...card._hass,
    states: Object.fromEntries(structuredClone(states).map((row) => [row.entity_id, row])) }; };
  card.hass = {
    connected: true, services: { pyscript: { vh_inventory_shopping_toggle: {} } },
    async callWS(message) { assert.equal(message.type, "get_states"); return structuredClone(states); },
    async callService(domain, service, data) {
      calls.push([domain, service, structuredClone(data)]);
      assert.equal(service, "vh_inventory_shopping_toggle");
      assert.equal(domain, "pyscript");
      const list = states[1].attributes.shopping;
      if (list.some((item) => item.product_id === data.product_id)) {
        states[1].attributes.shopping = list.filter((item) => item.product_id !== data.product_id);
      } else {
        list.push({ id: Math.max(0, ...list.map((item) => item.id)) + 1,
          product_id: data.product_id, quantity: 1 });
      }
    },
  };
  publish();
  return { card, states, publish, calls, errors };
}

test("quick shopping splits the full catalogue by product ID, including zero-stock products and duplicate names", () => {
  const { card, calls } = setupQuickShopping();
  const rows = card._rows();
  assert.equal(Array.from(rows, (row) => row.id).join(","), "2,3,1");
  assert.equal(rows[0].shopping.length, 0);
  assert.equal(rows[1].shopping.length, 1);
  assert.equal(rows[2].shopping.reduce((sum, row) => sum + row.quantity, 0), 5);
  assert.equal(rows.length, 3); // Ad-hoc items remain in the regular shopping page.
  assert.equal(calls.length, 0);
});

test("quick shopping product labels override inherited bold with regular weight and readable line spacing", () => {
  assert.match(source, /\.product-grid button strong \{ font-weight: 400; line-height: 1\.65; height: 3\.3em;/);
});

test("quick shopping search is local, accent/case-insensitive and supports barcodes without losing the query on updates", () => {
  const { card, states, publish, calls } = setupQuickShopping();
  card._search = " CAFE ";
  assert.equal(card._filteredRows().length, 2);
  card._search = "45";
  assert.equal(card._filteredRows()[0].id, 2);
  states[0].attributes.products[1].name = "New demo name";
  publish();
  assert.equal(card._search, "45");
  assert.equal(card._filteredRows()[0].name, "New demo name");
  card._search = "absent";
  assert.equal(card._filteredRows().length, 0);
  assert.equal(calls.length, 0);
});

test("quick shopping adds quantity one and one tap removes all linked rows without changing stock, products or ad-hoc items", async () => {
  const { card, states, calls } = setupQuickShopping();
  const stock = JSON.stringify(states[2]);
  const products = JSON.stringify(states[0]);
  const adhoc = JSON.stringify(states[1].attributes.shopping.find((row) => row.id === 12));
  await card._change(2, false);
  assert.equal(card._rows().find((row) => row.id === 2).shopping[0].quantity, 1);
  await card._change(1, true);
  assert.equal(card._rows().find((row) => row.id === 1).shopping.length, 0);
  assert.equal(states[1].attributes.shopping.some((row) => row.product_id === 3), true);
  assert.equal(JSON.stringify(states[2]), stock);
  assert.equal(JSON.stringify(states[0]), products);
  assert.equal(JSON.stringify(states[1].attributes.shopping.find((row) => row.id === 12)), adhoc);
  assert.deepEqual(calls, [
    ["pyscript", "vh_inventory_shopping_toggle", { product_id: 2 }],
    ["pyscript", "vh_inventory_shopping_toggle", { product_id: 1 }],
  ]);
});

test("quick shopping empty catalogue is valid but missing, malformed or dangling data is not", () => {
  const changes = [
    (states) => { states[0].state = "unavailable"; },
    (states) => { states[1].attributes.shopping[0].quantity = 0; },
    (states) => { states[0].attributes.products[1].id = 1; },
    (states) => { states[0].attributes.products[0].name = " "; },
    (states) => { states[1].attributes.shopping[0].product_id = 999; },
    (states) => { states[1].attributes.shopping[0].product_id = "1"; },
    (states) => { states[1].attributes.shopping[0].product_id = undefined; },
  ];
  for (const change of changes) {
    const { card, states, publish } = setupQuickShopping();
    change(states);
    publish();
    assert.throws(() => card._rows());
  }
  const { card, states, publish } = setupQuickShopping();
  states[0].attributes.products = [];
  states[1].attributes.shopping = states[1].attributes.shopping.filter((row) => row.product_id === null);
  publish();
  assert.equal(card._rows().length, 0);
});

test("quick shopping preflight rejects changed membership, quantities, deleted products and failed fresh reads before toggling", async () => {
  for (const scenario of ["membership", "quantity", "deleted", "read"]) {
    const { card, states, calls, errors } = setupQuickShopping();
    if (scenario === "membership") states[1].attributes.shopping.push({ id: 99, product_id: 2, quantity: 1 });
    if (scenario === "quantity") states[1].attributes.shopping[0].quantity = 9;
    if (scenario === "deleted") states[0].attributes.products.splice(1, 1);
    if (scenario === "read") card._hass.callWS = async () => { throw new Error("Offline"); };
    await card._change(scenario === "quantity" ? 1 : 2, scenario === "quantity");
    assert.equal(calls.length, 0, scenario);
    assert.equal(card._blocked, true, scenario);
    assert.match(card._status, /changed or unavailable/);
    assert.equal(errors.length, 1);
  }
});

test("quick shopping refuses stale button intent and invalid product IDs instead of inverting the action", async () => {
  for (const [id, listed] of [[1, false], [2, true], [999, false]]) {
    const { card, calls } = setupQuickShopping();
    await card._change(id, listed);
    assert.equal(calls.length, 0);
    assert.equal(card._blocked, true);
  }
});

test("quick shopping serializes rapid taps and blocks navigation until completion", async () => {
  const { card, calls } = setupQuickShopping();
  const original = card._hass.callService;
  let finish;
  const gate = new Promise((resolve) => { finish = resolve; });
  card._hass.callService = async (...args) => { await gate; await original(...args); };
  const done = card._change(2, false);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(card._busy, true);
  await card._change(2, false);
  await card._change(1, true);
  const { dashboard } = setupNavigation();
  dashboard._switchPage("quick-shopping");
  dashboard._cards["quick-shopping"] = card;
  dashboard._switchPage("shopping");
  assert.equal(dashboard._page, "quick-shopping");
  finish();
  await done;
  assert.equal(calls.length, 1);
  assert.equal(card._busy, false);
});

test("quick shopping uncertain writes/readbacks block retries until explicit refresh, without undoing an applied write", async () => {
  for (const scenario of ["lost-response", "unchanged", "readback", "wrong-quantity"]) {
    const { card, calls, errors } = setupQuickShopping();
    const originalWrite = card._hass.callService;
    const originalRead = card._hass.callWS;
    let reads = 0;
    card._hass.callService = async (...args) => {
      if (scenario === "unchanged") { calls.push(args); return; }
      await originalWrite(...args);
      if (scenario === "lost-response") throw new Error("Response lost");
    };
    card._hass.callWS = async (...args) => {
      reads += 1;
      if (reads === 2 && scenario === "readback") throw new Error("Readback failed");
      const snapshot = await originalRead(...args);
      if (reads === 2 && scenario === "wrong-quantity") {
        snapshot[1].attributes.shopping.find((row) => row.product_id === 2).quantity = 5;
      }
      return snapshot;
    };
    await card._change(2, false);
    assert.equal(card._blocked, true, scenario);
    assert.match(card._status, /uncertain/);
    await card._change(2, false);
    assert.equal(calls.length, 1);
    assert.equal(errors.length, 1);
    card._hass.callWS = originalRead;
    await card._refresh();
    assert.equal(card._blocked, false);
    assert.equal(card._rows().find((row) => row.id === 2).shopping.length, scenario === "unchanged" ? 0 : 1);
    assert.equal(calls.length, 1);
  }
});

test("quick shopping cannot write offline, in card preview, when blocked or without its service", async () => {
  for (const condition of ["offline", "preview", "blocked", "service"]) {
    const { card, calls } = setupQuickShopping();
    if (condition === "offline") card._hass.connected = false;
    if (condition === "preview") card.preview = true;
    if (condition === "blocked") card._blocked = true;
    if (condition === "service") card._hass.services = {};
    await card._change(2, false);
    assert.equal(calls.length, 0);
  }
});

test("quick shopping navigation supports deep links, highlighting and retained local search", () => {
  const { dashboard, quickShopping, buttons, navigationWindow, scan } = setupNavigation();
  navigationWindow.location.hash = "#quick-shopping";
  dashboard._hashChanged();
  assert.equal(dashboard._page, "quick-shopping");
  assert.equal(scan.hidden, true);
  assert.equal(buttons.find(button => button.dataset.page === "quick-shopping")["aria-pressed"], "true");
  quickShopping._search = "keep";
  dashboard._switchPage("inventory");
  dashboard._switchPage("quick-shopping");
  assert.equal(quickShopping._search, "keep");
  assert.equal(navigationWindow.location.hash, "#quick-shopping");
  scan._dirty = () => true;
  dashboard._switchPage("scan");
  assert.equal(dashboard._page, "quick-shopping");
});

function setupQuickStock() {
  const { QuickStockCard, calls, errors } = setup();
  const card = new QuickStockCard();
  card._config = { translations, language: "nl" };
  const { states } = setupQuickShopping();
  for (const product of states[0].attributes.products) product.almost_out = 0;
  states[2].attributes.stock.push(
    { id: 21, product_id: 1, location_id: 2, location: "Demo cupboard", quantity: 1 },
    { id: 2, product_id: 3, location_id: null, quantity: 1 });
  const publish = () => { card.hass = { ...card._hass,
    states: Object.fromEntries(structuredClone(states).map((row) => [row.entity_id, row])) }; };
  card.hass = {
    connected: true,
    services: { pyscript: { vh_inventory_touchscreen_scan: {} } },
    async callWS(message) {
      if (message.type === "call_service") return mockScanResponse(card._hass, message, states);
      assert.equal(message.type, "get_states"); return structuredClone(states);
    },
    async callService(domain, service, data) {
      calls.push([domain, service, structuredClone(data)]);
      assert.equal(domain, "pyscript");
      const stock = states[2].attributes.stock;
      assert.equal(service, "vh_inventory_touchscreen_scan");
      if (data.action === "Use") {
        const row = stock.find((item) => item.id === data.stock_id);
        assert.ok(row);
        row.quantity = Math.max(0, row.quantity - 1);
        states[2].attributes.stock = stock.filter((item) => item.quantity > 0);
      } else {
        assert.equal(data.action, "Add");
        assert.ok(states[0].attributes.products.some((p) => p.id === data.product_id));
        const existing = stock.filter((item) => item.product_id === data.product_id).sort((a, b) => a.id - b.id)[0];
        if (existing) existing.quantity += 1;
        else stock.push({ id: Math.max(0, ...stock.map((item) => item.id)) + 1,
          product_id: data.product_id, quantity: 1, location_id: null });
      }
    },
  };
  publish();
  return { card, calls, errors, states, publish };
}

test("quick stock shows every positive location row and adds only out-of-stock product IDs, not names", () => {
  const { card } = setupQuickStock();
  const rows = card._rows();
  assert.equal(rows.length, 4);
  assert.equal(rows.filter((row) => card._listed(row)).length, 3);
  assert.equal(rows.find((row) => !card._listed(row)).productId, 2);
  assert.equal(rows.filter((row) => row.productId === 1).length, 2);
  assert.equal(rows.find((row) => row.id === 21).location, "Demo cupboard");
  assert.equal(rows.find((row) => row.productId === 3).location, "");
  assert.equal(card._sectionOrder().join(","), "remove,add");
  assert.equal(card._t(card._gridText().title), "Snelle Voorraad");
});

test("quick stock search shares accent/name/barcode filtering and preserves search on updates", () => {
  const { card, publish } = setupQuickStock();
  card._search = " CAFE ";
  assert.equal(card._filteredRows().length, 2);
  card._search = "45";
  assert.equal(card._filteredRows()[0].productId, 2);
  publish();
  assert.equal(card._search, "45");
  card._search = "absent";
  assert.equal(card._filteredRows().length, 0);
});

test("quick stock cards omit location/details and show only a compact number badge with an accessible quantity", () => {
  const { QuickStockCard, context } = setup();
  const element = () => ({
    children: [], attributes: {},
    append(child) { this.children.push(child); },
    getAttribute(key) { return this.attributes[key]; },
    setAttribute(key, value) { this.attributes[key] = value; },
  });
  context.document = { createElement: element };
  const card = new QuickStockCard();
  card._config = { translations, language: "nl" };
  for (const quantity of [1, 12, 99999]) {
    const row = { quantity, location: "Hidden demo location" };
    const button = element();
    button.setAttribute("aria-label", "Use demo product");
    assert.equal(card._buttonDetails(row).length, 0);
    card._decorateButton(button, row);
    assert.equal(button.className, "stock-product");
    assert.equal(button.children.length, 1);
    assert.equal(button.children[0].className, "stock-quantity");
    assert.equal(button.children[0].textContent, String(quantity));
    assert.equal(button.children[0].attributes["aria-hidden"], "true");
    assert.equal(button.attributes["aria-label"], `Use demo product, ${translations.nl["Stock:"]} ${quantity}`);
    assert.doesNotMatch(button.attributes["aria-label"], /Hidden demo location/);
    assert.equal(row.location, "Hidden demo location");
  }
  const add = element();
  card._decorateButton(add, { quantity: 0 });
  assert.equal(add.children.length, 0);
  assert.match(source, /\.product-grid button\.stock-product \{[^}]*padding-bottom: 62px;/);
  assert.match(source, /\.stock-quantity \{[^}]*bottom: 12px; left: 12px;[^}]*border-radius: 10px;/);
});

test("quick stock decrements the selected stock ID and adds quantity one by product ID even with colliding IDs", async () => {
  const { card, calls, states } = setupQuickStock();
  const expected_stock = JSON.parse(JSON.stringify(card._rows().find((row) => row.id === 20).stock));
  const products = JSON.stringify(states[0]);
  const shopping = JSON.stringify(states[1]);
  await card._change(20, true);
  assert.equal(card._rows().find((row) => row.id === 20).quantity, 7);
  assert.equal(card._rows().find((row) => row.id === 21).quantity, 1);
  await card._change(2, false); // Product 2, not stock row 2 (which belongs to product 3).
  assert.equal(card._rows().find((row) => row.productId === 2).quantity, 1);
  assert.equal(card._rows().find((row) => row.productId === 3).quantity, 1);
  assert.equal(JSON.stringify(states[0]), products);
  assert.equal(JSON.stringify(states[1]), shopping);
  assert.equal(card._blocked, false);
  assert.deepEqual(calls, [
    ["pyscript", "vh_inventory_touchscreen_scan", {
      product_id: 1, action: "Use", stock_id: 20, expected_stock, expected_almost_out: 0 }],
    ["pyscript", "vh_inventory_touchscreen_scan", {
      product_id: 2, action: "Add", expected_stock: [], expected_almost_out: 0 }],
  ]);
});

test("quick stock final-unit taps remove the location button, then offer the product for adding once all locations are empty", async () => {
  const { card } = setupQuickStock();
  await card._change(21, true);
  assert.equal(card._rows().filter((row) => row.productId === 1).length, 1);
  assert.equal(card._rows().some((row) => row.productId === 1 && !card._listed(row)), false);
  await card._change(2, true);
  const depleted = card._rows().find((row) => row.productId === 3);
  assert.equal(card._listed(depleted), false);
  await card._change(3, false);
  assert.equal(card._rows().find((row) => row.productId === 3).quantity, 1);
  assert.equal(card._blocked, false);
});

test("quick stock zero-quantity rows are not use buttons and adding preserves the first existing row ID/location", async () => {
  const { card, states, publish } = setupQuickStock();
  states[2].attributes.stock.push({ id: 50, product_id: 2, quantity: 0, location_id: 2, location: "Demo cupboard" });
  publish();
  assert.equal(card._rows().find((row) => row.productId === 2).quantity, 0);
  await card._change(2, false);
  const added = card._rows().find((row) => row.productId === 2);
  assert.equal(added.id, 50);
  assert.equal(added.location, "Demo cupboard");
  assert.equal(added.quantity, 1);
  assert.equal(card._blocked, false);
});

test("quick stock rejects invalid, unavailable, duplicate and dangling data, but empty data is valid", () => {
  const scenarios = [
    (s) => { s[2].state = "unavailable"; },
    (s) => { delete s[2].attributes.stock; },
    (s) => { s[0].attributes.products[0].id = 2; },
    (s) => { s[0].attributes.products[0].name = " "; },
    (s) => { s[2].attributes.stock[0].id = 2; },
    (s) => { s[2].attributes.stock[0].product_id = 999; },
    (s) => { s[2].attributes.stock[0].product_id = "1"; },
    (s) => { s[2].attributes.stock[0].quantity = -1; },
    (s) => { s[2].attributes.stock[0].quantity = 1.5; },
    (s) => { s[2].attributes.stock[0].location_id = "2"; },
  ];
  for (const change of scenarios) {
    const { card, states, publish } = setupQuickStock();
    change(states);
    publish();
    assert.throws(() => card._rows());
  }
  const { card, states, publish } = setupQuickStock();
  states[0].attributes.products = [];
  states[2].attributes.stock = [];
  publish();
  assert.equal(card._rows().length, 0);
});

test("quick stock does not require a shopping sensor to read stock or availability", () => {
  const { card } = setupQuickStock();
  delete card._states["sensor.vh_inventory_shopping"];
  assert.equal(card._rows().length, 4);
});

test("quick stock preflight rejects quantity, location, membership, product identity and other-location changes without writing", async () => {
  for (const scenario of ["quantity", "location", "membership", "deleted", "name", "other-location", "read"]) {
    const { card, states, calls, errors } = setupQuickStock();
    const stock = states[2].attributes.stock;
    if (scenario === "quantity") stock[0].quantity += 1;
    if (scenario === "location") stock[0].location_id = 4;
    if (scenario === "membership") stock.push({ id: 88, product_id: 2, quantity: 1, location_id: null });
    if (scenario === "deleted") states[0].attributes.products.splice(0, 1);
    if (scenario === "name") states[0].attributes.products[0].name = "Changed demo name";
    if (scenario === "other-location") stock[1].quantity += 1;
    if (scenario === "read") card._hass.callWS = async () => { throw new Error("Offline"); };
    await card._change(scenario === "membership" ? 2 : 20, scenario !== "membership");
    assert.equal(calls.length, 0, scenario);
    assert.equal(card._blocked, true, scenario);
    assert.match(card._status, /changed or unavailable/);
    assert.equal(errors.length, 1);
  }
});

test("quick stock rejects stale button snapshots and stale add/use intent", async () => {
  for (const scenario of ["snapshot", "add", "use", "missing"]) {
    const { card, states, publish, calls } = setupQuickStock();
    const old = card._rows().find((row) => row.id === 20);
    if (scenario === "snapshot") {
      states[2].attributes.stock[0].quantity += 1;
      publish();
    }
    await card._change(scenario === "missing" ? 999 : scenario === "use" ? 1 : 20,
      scenario !== "add", scenario === "snapshot" ? old : undefined);
    assert.equal(calls.length, 0, scenario);
    assert.equal(card._blocked, true, scenario);
  }
});

test("quick stock uncertain writes and failed/wrong readbacks block retries until an explicit refresh", async () => {
  for (const scenario of ["lost-response", "unchanged", "readback", "wrong-quantity", "wrong-location"]) {
    const { card, calls, errors } = setupQuickStock();
    const write = card._hass.callService;
    const read = card._hass.callWS;
    let reads = 0;
    card._hass.callService = async (...args) => {
      if (scenario === "unchanged") { calls.push(args); return; }
      await write(...args);
      if (scenario === "lost-response") throw new Error("Response lost");
    };
    card._hass.callWS = async (...args) => {
      if (args[0].type !== "get_states") return read(...args);
      if (args[0].type !== "get_states") return read(...args);
      reads += 1;
      if (reads === 2 && scenario === "readback") throw new Error("Readback failed");
      const snapshot = await read(...args);
      if (reads === 2 && scenario === "wrong-quantity") snapshot[2].attributes.stock.at(-1).quantity = 9;
      if (reads === 2 && scenario === "wrong-location") snapshot[2].attributes.stock.at(-1).location_id = 2;
      return snapshot;
    };
    await card._change(2, false);
    assert.equal(card._blocked, true, scenario);
    assert.match(card._status, /uncertain/);
    await card._change(2, false);
    assert.equal(calls.length, 1);
    assert.equal(errors.length, 1);
    card._hass.callWS = read;
    await card._refresh();
    assert.equal(card._blocked, false);
    assert.equal(card._rows().find((row) => row.productId === 2).quantity, scenario === "unchanged" ? 0 : 1);
    assert.equal(card._status, "Inventory refreshed. Review stock and shopping before trying again.");
    assert.equal(calls.length, 1);
  }
});

test("quick stock failed refresh stays blocked, retains the filter and never submits a write", async () => {
  const { card, calls } = setupQuickStock();
  card._search = "keep";
  card._blocked = true;
  card._hass.callWS = async () => { throw new Error("Offline"); };
  await card._refresh();
  assert.equal(card._blocked, true);
  assert.equal(card._search, "keep");
  assert.equal(card._status, "Inventory unavailable. Reconnect and refresh before making changes.");
  assert.equal(calls.length, 0);
});

test("quick stock serializes rapid taps and blocks navigation and unload while a stock write is pending", async () => {
  const { card, calls } = setupQuickStock();
  const write = card._hass.callService;
  let finish;
  const gate = new Promise((resolve) => { finish = resolve; });
  card._hass.callService = async (...args) => { await gate; await write(...args); };
  const pending = card._change(20, true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(card._busy, true);
  await card._change(21, true);
  await card._change(2, false);
  const { dashboard, navigationWindow } = setupNavigation();
  dashboard._switchPage("quick-stock");
  dashboard._cards["quick-stock"] = card;
  dashboard._switchPage("inventory");
  assert.equal(dashboard._page, "quick-stock");
  assert.equal(navigationWindow.location.hash, "#quick-stock");
  let prevented = false;
  dashboard._beforeUnload({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  finish();
  await pending;
  assert.equal(calls.length, 1);
  assert.equal(card._busy, false);
});

test("quick stock refuses writes offline, preview, blocked, without the response service, or when disconnected during preflight", async () => {
  for (const scenario of ["offline", "preview", "blocked", "response-service", "preflight-disconnect"]) {
    const { card, calls } = setupQuickStock();
    if (scenario === "offline") card._hass.connected = false;
    if (scenario === "preview") card.preview = true;
    if (scenario === "blocked") card._blocked = true;
    if (scenario === "response-service") delete card._hass.services.pyscript.vh_inventory_touchscreen_scan;
    if (scenario === "preflight-disconnect") {
      const read = card._hass.callWS;
      card._hass.callWS = async (...args) => { card._hass.connected = false; return read(...args); };
    }
    await card._change(20, true);
    assert.equal(calls.length, 0, scenario);
  }
});

test("quick stock navigation supports hash, correct highlighting and preserved search while respecting editor drafts", () => {
  const { dashboard, quickStock, inventory, buttons, navigationWindow } = setupNavigation();
  navigationWindow.location.hash = "#quick-stock";
  dashboard._hashChanged();
  assert.equal(dashboard._page, "quick-stock");
  assert.equal(buttons.find(button => button.dataset.page === "quick-stock")["aria-pressed"], "true");
  quickStock._search = "keep";
  dashboard._switchPage("inventory");
  inventory._editor = { values: { quantity: "3" } };
  dashboard._switchPage("quick-stock");
  assert.equal(dashboard._page, "inventory");
  inventory._editor = null;
  dashboard._switchPage("quick-stock");
  assert.equal(quickStock._search, "keep");
  assert.equal(navigationWindow.location.hash, "#quick-stock");
});

function setupAlmostOut() {
  const { context, mock, states, publish, errors } = setupManagement();
  const Scan = context.customElements.get("vh-inventory-touchscreen");
  const QuickStock = context.customElements.get("vh-inventory-quick-stock-touchscreen");
  const scan = new Scan();
  const quick = new QuickStock();
  for (const card of [scan, quick]) {
    card._config = { translations, language: "nl" };
    card._render = () => {};
    card.hass = mock;
  }
  const commands = [];
  const execute = mock.callWS.bind(mock);
  mock.callWS = async (message) => { commands.push(structuredClone(message)); return execute(message); };
  const rows = (name) => states().find((row) => row.entity_id === `sensor.vh_inventory_${name}`).attributes[name];
  const refresh = () => { publish(); scan.hass = mock; quick.hass = mock; };
  return { scan, quick, mock, rows, commands, refresh, errors };
}

test("Almost out, repeat, restock, acknowledgement and next consumption use the response transport end to end", async () => {
  const { scan, rows, commands, refresh, errors } = setupAlmostOut();
  rows("stock")[0].quantity = 2;
  rows("shopping").splice(0);
  refresh();
  for (const [mode, quantity, flag, listed] of [
    ["AlmostOut", 1, 1, true], ["AlmostOut", 1, 1, true],
    ["Add", 2, 1, false], ["Use", 2, 0, false], ["Use", 1, 0, true],
  ]) {
    scan._mode = mode;
    await scan._enqueue("2000000000015");
    assert.equal(scan._blocked, false, mode);
    assert.equal(scan._result.stock, quantity, mode);
    assert.equal(scan._result.product.almost_out, flag, mode);
    assert.equal(scan._result.shopping > 0, listed, mode);
  }
  const writes = commands.filter((message) => message.type === "call_service");
  assert.equal(writes.length, 5);
  assert.ok(writes.every((message) => message.return_response === true &&
    message.service === "vh_inventory_touchscreen_scan"));
  assert.deepEqual(errors, []);
});

test("pending zero-stock Quick Inventory offers separate collision-free acknowledge and restock actions", async () => {
  for (const restockFirst of [true, false]) {
    const { scan, quick, rows, refresh, commands, errors } = setupAlmostOut();
    rows("stock")[0].quantity = 1;
    refresh();
    scan._mode = "AlmostOut";
    await scan._enqueue("2000000000015");
    rows("stock").push({id: 1, product_id: 3, quantity: 5, location_id: null});
    refresh();
    const pending = quick._rows().find((row) => row.productId === 1 && quick._listed(row));
    assert.equal(pending.id, "pending-1");
    assert.equal(quick._buttonAction(pending, true), "Verbruik bevestigen");
    assert.equal(quick._rows().filter((row) => row.productId === 1).length, 2);
    if (restockFirst) {
      await quick._change(1, false);
      assert.equal(quick._blocked, false);
      const stocked = quick._rows().find((row) => row.productId === 1);
      assert.equal(stocked.almostOut, true);
      await quick._change(stocked.id, true);
      assert.equal(quick._rows().find((row) => row.productId === 1).quantity, 1);
    } else {
      await quick._change(pending.id, true);
      assert.equal(quick._rows().find((row) => row.productId === 1).quantity, 0);
      assert.equal(commands.at(-2).service_data.stock_id, undefined);
    }
    assert.equal(quick._blocked, false);
    assert.equal(quick._rows().find((row) => row.productId === 1).almostOut, false);
    assert.equal(rows("stock").find((row) => row.product_id === 3).quantity, 5);
    assert.deepEqual(errors, []);
  }
});

test("unknown Almost out is read-only and tells the user to register first", async () => {
  const { scan, commands } = setupAlmostOut();
  scan._mode = "AlmostOut";
  await scan._enqueue("999999");
  assert.equal(scan._blocked, false);
  assert.equal(scan._notice.detail, "Register this product before marking it Almost out.");
  assert.equal(commands.filter((message) => message.type === "call_service").length, 0);
});

test("malformed or contradictory scan responses block further writes without retrying", async () => {
  for (const change of [
    (reply) => { delete reply.response; },
    (reply) => { reply.response.almost_out = "1"; },
    (reply) => { reply.response.quantity += 1; },
    (reply) => { reply.response.product_id = 999; },
    (reply) => { reply.response.on_shopping = !reply.response.on_shopping; },
    (reply) => { reply.response.outcome = "add"; },
    (reply) => { reply.response = {outcome: "notfound", product_id: null}; },
  ]) {
    const { scan, mock, commands } = setupAlmostOut();
    const execute = mock.callWS;
    mock.callWS = async (message) => {
      const reply = await execute(message);
      if (message.type === "call_service") change(reply);
      return reply;
    };
    scan._mode = "AlmostOut";
    await scan._enqueue("2000000000015");
    assert.equal(scan._blocked, true);
    await scan._enqueue("2000000000015");
    assert.equal(commands.filter((message) => message.type === "call_service").length, 1);
  }
});
