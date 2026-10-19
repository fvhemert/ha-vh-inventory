/* Dedicated touchscreen card. No global keyboard listener outside its active view. */
const VH_TOUCHSCREEN_THEME = `
:root {
  color-scheme: light;
  --cp-bg: #f7f4ef;
  --cp-bg-elevated: #fcfbf8;
  --cp-surface: #ffffff;
  --cp-surface-soft: #f5f5f5;
  --cp-border: #dedede;
  --cp-border-strong: #919191;
  --cp-text: #242424;
  --cp-text-muted: #5c5c5c;
  --cp-text-soft: #6f6f6f;
  --cp-accent: #b11f4b;
  --cp-accent-hover: #9a1a41;
  --cp-accent-soft: rgba(177, 31, 75, 0.08);
  --cp-accent-fg: #ffffff;
  --cp-success: #16a34a;
  --cp-danger: #dc2626;
  --cp-warning: #f59e0b;
  --cp-link: #0078d4;
  --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.12);
  --cp-overlay: rgba(255, 255, 255, 0.8);
  --cp-panel: rgba(255, 255, 255, 0.86);
  --cp-panel-strong: rgba(255, 255, 255, 0.96);
  --cp-sheen: rgba(255, 255, 255, 0.55);
  --cp-highlight: rgba(177, 31, 75, 0.12);
}
html[data-theme="dark"] {
  color-scheme: dark;
  --cp-bg: #3d3b3a;
  --cp-bg-elevated: #343231;
  --cp-surface: #292929;
  --cp-surface-soft: #2e2e2e;
  --cp-border: #474747;
  --cp-border-strong: #5f5f5f;
  --cp-text: #dedede;
  --cp-text-muted: #919191;
  --cp-text-soft: #b0b0b0;
  --cp-accent: #fd8ea1;
  --cp-accent-hover: #fb7b91;
  --cp-accent-soft: rgba(253, 142, 161, 0.14);
  --cp-accent-fg: #1a1a1a;
  --cp-success: #4ade80;
  --cp-danger: #f87171;
  --cp-warning: #fbbf24;
  --cp-link: #4da6ff;
  --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  --cp-overlay: rgba(41, 41, 41, 0.88);
  --cp-panel: rgba(41, 41, 41, 0.72);
  --cp-panel-strong: rgba(41, 41, 41, 0.96);
  --cp-sheen: rgba(255, 255, 255, 0.04);
  --cp-highlight: rgba(253, 142, 161, 0.12);
}
`;

const VH_TOUCHSCREEN_STYLE = `
:host { display: block; font-family: "Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--cp-text); background: var(--cp-bg); }
* { box-sizing: border-box; }
main { max-width: 1920px; margin: auto; padding: 32px 48px; min-height: var(--vh-touchscreen-main-height, calc(100dvh - 64px));
  display: flex; flex-direction: column; gap: 24px; }
header, .row { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.brand { display: flex; align-items: center; gap: 24px; min-width: 0; }
.brand-logo { width: 128px; height: 72px; object-fit: contain; flex-shrink: 0; }
.page-navigation { display: flex; gap: 12px; flex-shrink: 0; }
.page-navigation button { display: inline-flex; align-items: center; gap: 12px; }
.page-navigation svg { width: 28px; height: 28px; flex-shrink: 0; }
.eyebrow { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: var(--cp-text-muted); font-weight: 700; }
h1 { font-size: clamp(28px, 2.4vw, 44px); margin: 4px 0 0; font-weight: 650; }
h2 { font-size: clamp(28px, 2.6vw, 48px); margin: 16px 0; line-height: 1.15; overflow-wrap: anywhere; }
p { margin: 8px 0; line-height: 1.5; }
.muted { color: var(--cp-text-muted); }
.pill { display: inline-flex; align-items: center; gap: 12px; padding: 12px 20px; border: 1px solid var(--cp-border);
  border-radius: 10px; font-size: 18px; background: var(--cp-surface); }
.dot { height: 12px; width: 12px; border-radius: 50%; background: var(--cp-success); flex-shrink: 0; }
.pill[data-state="error"] .dot { background: var(--cp-danger); }
.pill[data-state="busy"] .dot, .pill[data-state="warning"] .dot { background: var(--cp-warning); }
.mode-bar { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(520px, 1fr); align-items: center; gap: 24px; }
.mode-bar h3 { margin: 0; font-size: 22px; }
.modes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
button { font: inherit; font-size: 21px; font-weight: 650; cursor: pointer; min-height: 68px; padding: 12px 24px;
  border-radius: 10px; border: 1px solid var(--cp-border-strong); background: var(--cp-surface); color: var(--cp-text); }
button:hover { background: var(--cp-surface-soft); }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--cp-accent); outline-offset: 4px; }
button[aria-pressed="true"], .primary { background: var(--cp-accent); color: var(--cp-accent-fg); border-color: var(--cp-accent); }
button[aria-pressed="true"]:hover, .primary:hover { background: var(--cp-accent-hover); }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.workspace { display: grid; grid-template-columns: minmax(360px, 0.85fr) minmax(0, 1.55fr); gap: 24px; flex: 1; }
.panel { background: var(--cp-surface); border: 1px solid var(--cp-border); border-radius: 16px; padding: 32px; min-width: 0; }
.scan-panel { display: flex; flex-direction: column; justify-content: center; }
.scanner-art { margin: 0 0 24px; color: var(--cp-accent); }
.scanner-art svg { width: 104px; height: 104px; }
.scan-panel h2 { font-size: 32px; margin: 0 0 8px; }
.scan-panel p { font-size: 19px; }
form { margin-top: 28px; }
label { display: block; font-size: 17px; font-weight: 650; margin-bottom: 12px; }
.input-row { display: flex; gap: 12px; }
input { min-width: 0; width: 100%; min-height: 68px; padding: 16px; font-size: 23px;
  font-family: Consolas, "Courier New", Courier, monospace; border-radius: 10px; border: 2px solid var(--cp-border-strong);
  background: var(--cp-bg-elevated); color: var(--cp-text); }
.scan-help { min-height: 56px; font-size: 16px !important; color: var(--cp-text-muted); }
.notice { border-left: 4px solid var(--cp-accent); background: var(--cp-accent-soft); padding: 16px 20px; margin-top: 20px; }
.notice[data-state="error"] { border-color: var(--cp-danger); }
.notice[data-state="warning"] { border-color: var(--cp-warning); }
.notice strong { font-size: 20px; }
.notice p { font-size: 17px; overflow-wrap: anywhere; }
.product-panel { display: flex; flex-direction: column; }
.product-body { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.product-heading { display: grid; grid-template-columns: minmax(0, 1fr) 180px; gap: 32px; align-items: center; margin: 8px 0 16px; }
.stock { border-radius: 16px; background: var(--cp-accent-soft); padding: 24px 12px; text-align: center; }
.stock strong { display: block; font-size: 68px; line-height: 1.1; color: var(--cp-accent); }
.stock span { display: block; font-size: 17px; margin-top: 8px; }
.description { font-size: 21px; color: var(--cp-text-muted); overflow-wrap: anywhere; }
dl { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; margin: 0; }
dl > div { border-top: 1px solid var(--cp-border); padding-top: 12px; min-width: 0; }
dt { font-size: 15px; color: var(--cp-text-muted); margin-bottom: 8px; }
dd { margin: 0; font-size: 22px; overflow-wrap: anywhere; }
.barcode { font-family: Consolas, "Courier New", Courier, monospace; }
.product-panel label { font: inherit; margin: 0; }
.product-panel input, .product-panel select { width: 100%; min-width: 0; min-height: 48px; padding: 8px 12px;
  font: inherit; font-size: 20px; border: 1px solid var(--cp-border-strong); border-radius: 10px;
  background: var(--cp-bg-elevated); color: var(--cp-text); }
.product-panel input:disabled, .product-panel select:disabled { opacity: 0.65; }
.product-footer { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--cp-border); font-size: 17px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; min-height: 84px; }
.edit-actions { display: flex; gap: 12px; flex-shrink: 0; }
#edit-status { font-size: 15px; margin: 8px 0 0; color: var(--cp-text-muted); }
#edit-status[data-state="error"] { color: var(--cp-danger); }
[hidden] { display: none !important; }
@media (min-width: 1500px) and (min-height: 900px) {
  main { padding: 40px 64px; gap: 32px; }
  .panel { padding: 32px; }
}
@media (max-width: 1000px) {
  main { padding: 24px; }
  .workspace, .mode-bar { grid-template-columns: 1fr; }
  .product-heading { grid-template-columns: minmax(0, 1fr) 140px; }
  .panel { padding: 24px; }
}
@media (max-width: 550px) {
  main { padding: 16px; } header { flex-wrap: wrap; }
  .modes, dl { grid-template-columns: 1fr; }
  .product-heading { grid-template-columns: 1fr; }
  .input-row, .product-footer, .edit-actions { flex-wrap: wrap; } button { font-size: 18px; }
}
`;

class VhInventoryTouchscreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._mode = "Lookup";
    this._queue = [];
    this._busy = false;
    this._blocked = false;
    this._result = null;
    this._draft = null;
    this._saving = false;
    this._editNotice = "";
    this._beforeUnload = (event) => {
      if (this._dirty() || this._saving) { event.preventDefault(); event.returnValue = ""; }
    };
    this._notice = { title: "Ready to scan", detail: "Scan a barcode to begin.", state: "ready" };
    this._keyboard = this._onKeyboard.bind(this);
    this._focusChanged = () => this._updateReady();
  }

  setConfig(config) {
    if (!config.translations?.en || !config.translations?.nl) {
      throw new Error("Build the touchscreen dashboard with build_touchscreen.py first.");
    }
    if (config.language && !config.translations[config.language]) {
      throw new Error("Unsupported touchscreen language.");
    }
    this._config = config;
    this._renderShell();
    this._render();
  }

  set hass(value) {
    this._hass = value;
    this._render();
  }

  connectedCallback() {
    document.addEventListener("keydown", this._keyboard, true);
    document.addEventListener("focusin", this._focusChanged);
    document.addEventListener("focusout", this._focusChanged);
    window.addEventListener("beforeunload", this._beforeUnload);
    this._focusInput();
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._keyboard, true);
    document.removeEventListener("focusin", this._focusChanged);
    document.removeEventListener("focusout", this._focusChanged);
    window.removeEventListener("beforeunload", this._beforeUnload);
    // Already submitted scans may complete; do not execute buffered scans after navigation.
    this._queue = [];
  }

  getCardSize() { return 18; }

  _t(key) {
    const language = this._config.language || "nl";
    return this._config.translations[language][key] || this._config.translations.en[key] || key;
  }

  _text(selector, value) {
    this.shadowRoot.querySelector(selector).textContent = value;
  }

  _available() {
    return Boolean(!this.preview && this._hass?.connected &&
      (this._mode === "Lookup" || this._hass.services?.pyscript?.vh_inventory_scan_enqueue));
  }

  _renderShell() {
    const theme = VH_TOUCHSCREEN_THEME.replace(":root", ":host")
      .replace('html[data-theme="dark"]', ':host([data-theme="dark"])');
    this.setAttribute("data-theme", this._config.theme === "light" ? "light" : "dark");
    this.shadowRoot.innerHTML = `<style>${theme}${VH_TOUCHSCREEN_STYLE}</style>
      <main>
        <header><div class="brand"><img class="brand-logo" id="brand-logo" alt="Van Hemert Home Automation"
            width="128" height="72">
          <div><div class="eyebrow">VH-INVENTORY</div><h1 data-i18n="Scan products"></h1></div></div>
          <div class="pill" id="connection" hidden><span class="dot"></span><span id="connection-text"></span></div></header>
        <section class="mode-bar" aria-labelledby="mode-title">
          <div><h3 id="mode-title" data-i18n="Scan mode"></h3><p class="muted" id="mode-help"></p></div>
          <div class="modes" role="group" aria-labelledby="mode-title">
            <button id="add" type="button" data-i18n="Add"></button>
            <button id="use" type="button" data-i18n="Use"></button>
            <button id="lookup" type="button" data-i18n="Lookup"></button>
          </div>
        </section>
        <div class="workspace">
          <section class="panel scan-panel">
            <div class="scanner-art" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <path d="M25 8H8v17M75 8h17v17M8 75v17h17M75 92h17V75" stroke-width="4"/>
              <path d="M23 28v44m8-44v44m12-44v44m6-44v44m10-44v44m12-44v44m7-44v44" stroke-width="4"/>
              <path d="M3 50h94" stroke-width="2"/></svg></div>
            <h2 data-i18n="Scan your product"></h2><p class="muted" data-i18n="Point the scanner at the barcode."></p>
            <form id="scan-form"><label for="barcode" data-i18n="Barcode"></label>
              <div class="input-row"><input id="barcode" type="text" inputmode="numeric" autocomplete="off"
                spellcheck="false" maxlength="64" enterkeyhint="go">
                <button class="primary" id="process" type="submit" data-i18n="Process"></button></div>
              <p class="scan-help" id="scan-help"></p>
            </form>
            <div class="notice" id="notice" role="status" aria-live="polite" aria-atomic="true">
              <strong id="notice-title"></strong><p id="notice-detail"></p></div>
            <button id="recover" type="button" hidden data-i18n="Stock checked, continue"></button>
          </section>
          <section class="panel product-panel" aria-labelledby="product-label">
            <div class="row"><div class="eyebrow" id="product-label" data-i18n="Last scanned product"></div>
              <span class="muted" id="result-mode"></span></div>
            <div class="product-body">
              <div class="product-heading"><div><h2 id="product-name"></h2>
                <p class="description" id="description"></p></div>
                <div class="stock"><strong id="stock">-</strong><span data-i18n="Current stock"></span></div></div>
              <dl><div><dt data-i18n="Barcode"></dt><dd class="barcode" id="product-barcode"></dd></div>
                <div><dt><label for="manufacturer" data-i18n="Manufacturer"></label></dt>
                  <dd><input id="manufacturer" type="text" maxlength="255" autocomplete="off"></dd></div>
                <div><dt><label for="category" data-i18n="Category"></label></dt><dd><select id="category"></select></dd></div>
                <div><dt><label for="store" data-i18n="Store"></label></dt><dd><select id="store"></select></dd></div>
                <div><dt><label for="unit" data-i18n="Unit"></label></dt>
                  <dd><input id="unit" type="text" maxlength="255" autocomplete="off"></dd></div>
                <div><dt><label for="locations" data-i18n="Location"></label></dt><dd><select id="locations"></select></dd></div></dl>
            </div>
            <div class="product-footer"><div><div id="shopping"></div>
              <p id="edit-status" role="status" aria-live="polite"></p></div>
              <div class="edit-actions" id="edit-actions" hidden>
                <button id="discard" type="button" data-i18n="Discard changes"></button>
                <button class="primary" id="save" type="button" data-i18n="Save"></button>
              </div></div>
          </section>
        </div>
      </main>`;
    this.shadowRoot.querySelector("#brand-logo").src = this._config.logo || "/local/van-hemert-logo-hi.png";
    for (const element of this.shadowRoot.querySelectorAll("[data-i18n]")) {
      element.textContent = this._t(element.dataset.i18n);
    }
    this.shadowRoot.querySelector("#scan-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = this.shadowRoot.querySelector("#barcode");
      this._enqueue(input.value);
      input.value = "";
      this._focusInput();
    });
    for (const [id, mode] of [["add", "Add"], ["use", "Use"], ["lookup", "Lookup"]]) {
      this.shadowRoot.querySelector(`#${id}`).addEventListener("click", () => {
        if (this._dirty() || this._saving) return;
        this._mode = mode;
        this._render();
        this._focusInput();
      });
      for (const [id, field] of [["manufacturer", "manufacturer"], ["unit", "unit"],
        ["category", "category_id"], ["store", "store_id"], ["locations", "location_id"]]) {
        const element = this.shadowRoot.querySelector(`#${id}`);
        element.addEventListener(element.tagName === "SELECT" ? "change" : "input",
          () => this._editField(field, element.value));
      }
      this.shadowRoot.querySelector("#save").addEventListener("click", () => this._saveDetails());
      this.shadowRoot.querySelector("#discard").addEventListener("click", () => {
        if (this._saving) return;
        this._resetDraft();
        this._render();
        this._focusInput();
      });
    }
    this.shadowRoot.querySelector("#recover").addEventListener("click", () => {
      this._blocked = false;
      this._notice = { title: "Ready to scan", detail: "Scan a barcode to begin.", state: "ready" };
      this._render();
      this._focusInput();
    });
  }

  _render() {
    if (!this._config || !this.shadowRoot.querySelector("main")) return;
    this._updateReady();
    for (const [id, mode] of [["add", "Add"], ["use", "Use"], ["lookup", "Lookup"]]) {
      this.shadowRoot.querySelector(`#${id}`).setAttribute("aria-pressed", String(this._mode === mode));
    }
    const help = this._mode === "Lookup" ? "View product details without changing stock or the shopping list."
      : this._mode === "Add" ? "Each scan adds one item." : "Each scan uses one item.";
    this._text("#mode-help", this._t(help));
    this._text("#process", this._t(this._mode === "Lookup" ? "Lookup" : "Process"));
    this._text("#scan-help", this._t("Scanner: keyboard mode with Enter suffix. You can also type a barcode."));
    this._text("#notice-title", this._t(this._notice.title));
    this._text("#notice-detail", this._notice.rawDetail || this._t(this._notice.detail));
    this.shadowRoot.querySelector("#notice").dataset.state = this._notice.state;
    this.shadowRoot.querySelector("#recover").hidden = !this._blocked;
    const result = this._result;
    const product = result?.product;
    this._text("#product-name", product?.name || this._t(result ? "Product not found" : "Your next product appears here"));
    const description = this._notice.title === "Product details saved." ? "Product details saved." : result?.mode === "Lookup"
      ? (product ? "Lookup only. Stock and shopping list are unchanged." : "Barcode not in the product catalogue. Nothing was changed.")
      : result ? "Review the scan queue in the main dashboard." : "Product details and stock after scanning.";
    this._text("#description", product?.description || this._t(description));
    this._text("#stock", result?.stock ?? "-");
    this._text("#result-mode", result ? this._t(result.mode) : "");
    this._text("#product-barcode", result?.barcode || "-");
    this._renderDetails();
    this._text("#shopping", result
      ? `${this._t("Shopping list quantity")}: ${result.shopping ?? "-"}`
      : this._t("No product scanned yet."));
  }

  _updateReady() {
    if (!this._config || !this.shadowRoot.querySelector("#connection")) return;
    const available = this._available();
    const focused = this.shadowRoot.activeElement?.id === "barcode";
    const paused = this._dirty() || this._saving;
    const state = !available || this._blocked ? "error" : this._busy || this._saving ? "busy" : paused ? "warning" : focused ? "ready" : "warning";
    const label = !available ? "Home Assistant unavailable" : this._blocked ? "Check stock before continuing"
      : this._saving ? "Saving product details" : paused ? "Save or discard your edits"
      : this._busy ? "Processing scan" : focused ? "Ready to scan" : "Tap the barcode field";
    const indicator = this.shadowRoot.querySelector("#connection");
    indicator.dataset.state = state;
    indicator.hidden = Boolean(available && !this._blocked && !this._busy && !paused);
    this._text("#connection-text", this._t(label));
  }

  _focusInput() {
    requestAnimationFrame(() => {
      if (this.isConnected && this.getClientRects().length && !this._blocked && !this._dirty() && !this._saving) {
        this.shadowRoot.querySelector("#barcode")?.focus({ preventScroll: true });
      }
    });
  }

  _onKeyboard(event) {
    if (this.preview || !this.isConnected || !this.getClientRects().length || this._blocked || this._dirty() || this._saving ||
        event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    const path = event.composedPath();
    const editable = path.some((element) => element.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "DIALOG", "HA-DIALOG"].includes(element.tagName) ||
      element.getAttribute?.("role") === "dialog");
    // Never capture input from another field, Home Assistant search, or a dialog.
    if (editable || path.includes(this.shadowRoot.querySelector("#barcode")) ||
        document.querySelector("ha-dialog, dialog[open]")) return;
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      const input = this.shadowRoot.querySelector("#barcode");
      input.focus({ preventScroll: true });
      input.value += event.key;
    }
  }

  _enqueue(value) {
    if (this._dirty() || this._saving) {
      this._notice = { title: "Scan not accepted", detail: "Save or discard your edits before scanning.", state: "warning" };
      this._render();
      return;
    }
    const barcode = String(value).trim();
    if (!/^[0-9]{1,15}$/.test(barcode)) {
      this._notice = { title: "Invalid barcode", detail: "Use 1 to 15 digits.", state: "warning" };
      this._render();
      return;
    }
    if (!this._available() || this._blocked || this._queue.length >= 20) {
      this._notice = { title: "Scan not accepted", detail: this._blocked ? "Check stock before continuing."
        : !this._available() ? "Reconnect to Home Assistant, then scan again." : "Wait for the queued scans, then scan again.", state: "error" };
      this._render();
      return;
    }
    this._queue.push({ barcode, mode: this._mode });
    return this._drain();
  }

  async _drain() {
    if (this._busy) return;
    this._busy = true;
    while (this._queue.length && this.isConnected) {
      const scan = this._queue.shift();
      this._notice = { title: "Processing scan", rawDetail: `${scan.barcode} | ${this._t(scan.mode)}`, state: "busy" };
      this._render();
      try {
        if (scan.mode !== "Lookup") {
          await this._hass.callService("pyscript", "vh_inventory_scan_enqueue", {
            barcode: scan.barcode, action: scan.mode,
          });
        }
        const states = await this._hass.callWS({ type: "get_states" });
        this._result = this._readResult(states, scan);
        this._resetDraft();
        if (scan.mode === "Lookup") {
          this._notice = this._result.product
            ? { title: "Product found", detail: "Lookup only. Stock and shopping list are unchanged.", state: "ready" }
            : { title: "Product not found", detail: "Barcode not in the product catalogue. Nothing was changed.", state: "warning" };
        } else {
          this._notice = this._result.product
            ? { title: "Scan processed", detail: "Product details and stock after scanning.", state: "ready" }
            : { title: "Product not found", detail: "Review the scan queue in the main dashboard.", state: "warning" };
        }
      } catch (error) {
        console.error("VH-Inventory touchscreen request failed", error);
        this._result = null;
        this._resetDraft();
        if (scan.mode === "Lookup") {
          this._notice = { title: "Lookup failed", detail: "Could not read product data. No changes were requested. Try lookup again.", state: "error" };
          this._render();
          continue;
        }
        this._blocked = true;
        const count = this._queue.length;
        this._queue = [];
        this._notice = { title: "Scan result uncertain", state: "error",
          rawDetail: `${this._t("Check inventory in the main dashboard before scanning again. Do not automatically retry.")} ${this._t("Unsent scans discarded")}: ${count}.` };
        break;
      }
      this._render();
    }
    this._busy = false;
    this._render();
  }

  _readResult(states, scan) {
    const rows = (entity, attribute) => {
      const state = states.find((item) => item.entity_id === entity);
      if (!state || ["unknown", "unavailable"].includes(state.state) ||
          !Array.isArray(state.attributes?.[attribute])) {
        throw new Error(`Missing inventory data: ${entity}`);
      }
      return state.attributes[attribute];
    };
    const normalize = (barcode) => String(barcode).replace(/^0+(?=\d)/, "");
    const products = rows("sensor.vh_inventory_products", "products");
    const stock = rows("sensor.vh_inventory_stock", "stock");
    const shopping = rows("sensor.vh_inventory_shopping", "shopping");
    const queue = scan.mode === "Lookup" ? [] : rows("sensor.vh_inventory_scan_queue", "scan_queue");
    const product = products.find((item) => normalize(item.barcode) === normalize(scan.barcode));
    if (!product) {
      if (scan.mode !== "Lookup" &&
          !queue.some((item) => normalize(item.barcode) === normalize(scan.barcode) && item.state === "Unknown")) {
        throw new Error("Scan completion could not be confirmed.");
      }
      return { ...scan, product: null, stock: null, shopping: null, locations: [] };
    }
    const inventory = stock.filter((item) => String(item.product_id) === String(product.id));
    const entries = shopping.filter((item) => String(item.product_id) === String(product.id));
    const total = (items) => items.reduce((sum, item) => {
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity)) throw new Error("Invalid inventory quantity.");
      return sum + quantity;
    }, 0);
    const references = Object.fromEntries(["categories", "stores", "locations"].map((name) => {
      const state = states.find((item) => item.entity_id === `sensor.vh_inventory_${name}`);
      return [name, state && !["unknown", "unavailable"].includes(state.state) &&
        Array.isArray(state.attributes?.[name]) ? state.attributes[name] : null];
    }));
    return { ...scan, product, stock: total(inventory), shopping: total(entries), inventory, references,
      locations: [...new Set(inventory.map((item) => item.location).filter(Boolean))] };
  }

  _values(result) {
    const product = result.product;
    const locations = [...new Set(result.inventory.map((row) => String(row.location_id ?? "")))].sort();
    return { manufacturer: product.manufacturer || "", unit: product.unit || "",
      category_id: String(product.category_id ?? ""), store_id: String(product.store_id ?? ""),
      location_id: locations.length > 1 ? "__multiple__" : locations[0] || "" };
  }

  _resetDraft() {
    this._editNotice = "";
    if (["Save or discard your edits before scanning.", "Save or discard your edits before switching pages."].includes(this._notice.detail)) {
      this._notice = { title: "Ready to scan", detail: "Scan a barcode to begin.", state: "ready" };
    }
    this._draft = this._result?.product ? { id: this._result.product.id,
      original: this._values(this._result), values: this._values(this._result),
      locations: [...new Set(this._result.inventory.map((row) => String(row.location_id ?? "")))].sort() } : null;
  }

  _dirty() {
    return Boolean(this._draft && Object.keys(this._draft.values)
      .some((field) => this._draft.values[field] !== this._draft.original[field]));
  }

  _canEdit() {
    return Boolean(!this.preview && this._hass?.connected && this._draft && !this._busy &&
      !this._saving && !this._blocked && !this._queue.length &&
      this._hass.services?.pyscript?.vh_inventory_save_product_details);
  }

  _editField(field, value) {
    if (!this._canEdit() || !Object.hasOwn(this._draft.values, field) ||
        (field === "location_id" && !(this._result.stock > 0))) return;
    this._draft.values[field] = String(value);
    this._editNotice = "";
    this._render();
  }

  _referenceRows(name) {
    const live = this._hass?.states?.[`sensor.vh_inventory_${name}`];
    if (!live) return this._result?.references?.[name] ?? null;
    return !["unknown", "unavailable"].includes(live.state) && Array.isArray(live.attributes?.[name])
      ? live.attributes[name] : null;
  }

  _renderDetails() {
    const editable = this._canEdit();
    const values = this._draft?.values;
    for (const field of ["manufacturer", "unit"]) {
      const input = this.shadowRoot.querySelector(`#${field}`);
      if (input.value !== (values?.[field] || "")) input.value = values?.[field] || "";
      input.disabled = !editable;
    }
    for (const [id, field, name, label] of [["category", "category_id", "categories", "category"],
      ["store", "store_id", "stores", "store"], ["locations", "location_id", "locations", "location"]]) {
      const select = this.shadowRoot.querySelector(`#${id}`);
      const rows = this._referenceRows(name);
      const value = values?.[field] || "";
      const options = [["", this._t("Unassigned")]];
      if (this._draft?.original[field] === "__multiple__") {
        options.push(["__multiple__", `${this._t("Multiple locations")}: ${this._result.locations.join(", ")}`]);
      }
      for (const row of rows || []) options.push([String(row.id), row[label]]);
      if (!options.some(([key]) => key === value)) options.push([value, this._t("Reference no longer available")]);
      const signature = JSON.stringify(options);
      if (select.dataset.options !== signature) {
        const elements = options.map(([key, text]) => {
          const option = document.createElement("option");
          option.value = key;
          option.textContent = text;
          return option;
        });
        select.replaceChildren(...elements);
        select.dataset.options = signature;
      }
      if (select.value !== value) select.value = value;
      select.disabled = !editable || !rows || (field === "location_id" && !(this._result.stock > 0));
    }
    const dirty = this._dirty();
    this.shadowRoot.querySelector("#edit-actions").hidden = !dirty && !this._saving;
    this.shadowRoot.querySelector("#save").disabled = !dirty || !editable;
    this.shadowRoot.querySelector("#discard").disabled = this._saving;
    for (const id of ["barcode", "process", "add", "use", "lookup"]) {
      this.shadowRoot.querySelector(`#${id}`).disabled = dirty || this._saving;
    }
    let message = this._saving ? "Saving product details" : dirty ? "Save or discard your edits before scanning."
      : this._draft && !this._hass?.services?.pyscript?.vh_inventory_save_product_details ? "Product editing service unavailable."
      : this._draft && !(this._result.stock > 0) ? "No stock: location editing is unavailable."
      : this._draft ? "Changing location moves all existing stock without changing quantities." : "";
    if (this._draft && ["categories", "stores", "locations"].some((name) => !this._referenceRows(name))) {
      message = "Reference lists unavailable. Reconnect or look up again.";
    }
    this._text("#edit-status", this._t(this._editNotice || message));
    this.shadowRoot.querySelector("#edit-status").dataset.state = this._editNotice === "Product details could not be saved or verified. Edits retained. Check the product; discard edits and look up again before retrying."
      ? "error" : "ready";
  }

  async _saveDetails() {
    if (!this._dirty() || !this._canEdit()) return;
    const draft = this._draft;
    const changes = {};
    const expected = {};
    for (const field of Object.keys(draft.values)) {
      if (draft.values[field] === draft.original[field]) continue;
      const numeric = field.endsWith("_id");
      changes[field] = numeric ? (draft.values[field] === "" ? null : Number(draft.values[field])) : draft.values[field];
      expected[field] = field === "location_id" ? draft.locations
        : numeric ? (draft.original[field] === "" ? null : Number(draft.original[field])) : draft.original[field];
    }
    this._saving = true;
    this._render();
    try {
      await this._hass.callService("pyscript", "vh_inventory_save_product_details",
        { id: Number(draft.id), changes, expected });
      const states = await this._hass.callWS({ type: "get_states" });
      const refreshed = this._readResult(states, { barcode: this._result.barcode, mode: "Lookup" });
      if (!refreshed.product || String(refreshed.product.id) !== String(draft.id)) {
        throw new Error("Saved product could not be verified.");
      }
      const values = this._values(refreshed);
      if (Object.keys(changes).some((field) => values[field] !== draft.values[field])) {
        throw new Error("Saved fields do not match the requested changes.");
      }
      this._result = { ...refreshed, mode: this._result.mode };
      this._resetDraft();
      this._editNotice = "Product details saved.";
      this._notice = { title: "Product details saved.", detail: "Stock totals and shopping quantities are unchanged.", state: "ready" };
    } catch (error) {
      console.error("VH-Inventory touchscreen save failed", error);
      this._editNotice = "Product details could not be saved or verified. Edits retained. Check the product; discard edits and look up again before retrying.";
    } finally {
      this._saving = false;
      this._render();
      if (!this._dirty()) this._focusInput();
    }
  }
}

class VhInventoryShoppingTouchscreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._busy = false;
    this._blocked = false;
    this._confirmId = null;
    this._status = "";
    this._states = {};
  }

  setConfig(config) {
    if (!config.translations?.en || !config.translations?.nl ||
        (config.language && !config.translations[config.language])) {
      throw new Error("Build the touchscreen dashboard with a supported language first.");
    }
    this._config = config;
    this._rowsSignature = null;
    const theme = VH_TOUCHSCREEN_THEME.replace(":root", ":host")
      .replace('html[data-theme="dark"]', ':host([data-theme="dark"])');
    this.setAttribute("data-theme", config.theme === "light" ? "light" : "dark");
    this.shadowRoot.innerHTML = `<style>${theme}${VH_TOUCHSCREEN_STYLE}
      .panel { padding-top: 16px; }
      .table-scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 22px; }
      th { text-align: left; font-size: 17px; color: var(--cp-text-muted); }
      th, td { padding: 20px 16px; border-bottom: 1px solid var(--cp-border); }
      td:first-child { min-width: 220px; overflow-wrap: anywhere; }
      .quantity-controls { display: flex; align-items: center; justify-content: center; gap: 16px; }
      .quantity-controls button { min-width: 68px; }
      .quantity-controls strong { min-width: 48px; text-align: center; }
      .remove-controls { display: flex; gap: 12px; justify-content: flex-end; }
      .confirm-row td { background: var(--cp-accent-soft); }
      .confirm-row p { font-size: 19px; }
      #shopping-status { min-height: 28px; font-size: 19px; }
      #shopping-status:empty { display: none; }
      #shopping-status[data-state="error"] { color: var(--cp-danger); }
      .empty { font-size: 24px; padding: 32px 16px; }
      @media (max-width: 1000px) { th, td { padding: 16px 12px; } }
      </style><main>
      <header><div class="brand"><img id="brand-logo" class="brand-logo"
        alt="Van Hemert Home Automation" width="128" height="72">
        <div><div class="eyebrow">VH-INVENTORY</div><h1 id="shopping-title" data-i18n="Shopping"></h1></div></div>
        <button id="shopping-refresh" type="button" hidden data-i18n="Refresh shopping list"></button></header>
      <section class="panel" aria-labelledby="shopping-title">
        <p id="shopping-status" role="status" aria-live="polite"></p>
        <p class="empty" id="shopping-empty" hidden data-i18n="Your shopping list is empty."></p>
        <div class="table-scroll"><table id="shopping-table">
          <thead><tr><th scope="col" data-i18n="Product"></th><th scope="col" data-i18n="Category"></th>
            <th scope="col" data-i18n="Store"></th><th scope="col" data-i18n="Quantity"></th>
            <th scope="col" data-i18n="Action"></th></tr></thead><tbody id="shopping-rows"></tbody>
        </table></div></section>
      </main>`;
    this.shadowRoot.querySelector("#brand-logo").src = config.logo || "/local/van-hemert-logo-hi.png";
    for (const element of this.shadowRoot.querySelectorAll("[data-i18n]")) {
      element.textContent = this._t(element.dataset.i18n);
    }
    this.shadowRoot.querySelector("#shopping-refresh").addEventListener("click", () => this._refresh());
    this._render();
  }

  set hass(value) {
    this._hass = value;
    this._states = value?.states || {};
    this._render();
  }

  getCardSize() { return 18; }

  _t(key) {
    const language = this._config.language || "nl";
    return this._config.translations[language][key] || this._config.translations.en[key] || key;
  }

  _rows(states = this._states) {
    const read = (name) => {
      const state = states[`sensor.vh_inventory_${name}`];
      if (!state || ["unknown", "unavailable"].includes(state.state) || !Array.isArray(state.attributes?.[name])) {
        throw new Error(`Missing shopping data: ${name}`);
      }
      return state.attributes[name];
    };
    const products = read("products");
    const ids = new Set();
    return read("shopping").map((row) => {
      if (!Number.isSafeInteger(row.id) || row.id < 1 || ids.has(row.id) ||
          !Number.isSafeInteger(row.quantity) || row.quantity < 1) {
        throw new Error("Invalid shopping row.");
      }
      ids.add(row.id);
      const product = products.find((item) => String(item.id) === String(row.product_id));
      const adhoc = row.product_id == null;
      const name = adhoc ? row.product : product?.name || row.product;
      if (typeof name !== "string" || !name.trim()) throw new Error("Shopping product name unavailable.");
      return { id: row.id, quantity: row.quantity, name, adhoc,
        category: adhoc ? this._t("Ad-Hoc item") : product?.category || this._t("Unassigned"),
        store: product?.store || this._t("Unassigned") };
    }).sort((a, b) => a.name.localeCompare(b.name, this._config.language || "nl") || a.id - b.id);
  }

  _canAct() {
    return Boolean(!this.preview && this._hass?.connected && !this._busy && !this._blocked &&
      this._hass.services?.pyscript?.vh_inventory_adjust_shopping &&
      this._hass.services?.pyscript?.vh_inventory_delete);
  }

  _render() {
    if (!this._config || !this.shadowRoot.querySelector("main")) return;
    let rows = [];
    let error = "";
    try { rows = this._rows(); }
    catch (failure) {
      error = "Shopping list unavailable. Reconnect and refresh before making changes.";
    }
    if (this._confirmId !== null && !rows.some((row) => row.id === this._confirmId)) this._confirmId = null;
    const connected = !this.preview && this._hass?.connected;
    const services = this._hass?.services?.pyscript;
    const message = error || (!connected ? "Home Assistant unavailable"
      : this._status || (!services?.vh_inventory_adjust_shopping || !services?.vh_inventory_delete
        ? "Shopping list editing services unavailable." : ""));
    const status = this.shadowRoot.querySelector("#shopping-status");
    status.textContent = this._t(message);
    status.dataset.state = error || this._blocked || !connected ? "error" : "ready";
    const refresh = this.shadowRoot.querySelector("#shopping-refresh");
    refresh.hidden = !(error || this._blocked || !connected);
    refresh.disabled = this._busy || !connected;
    this.shadowRoot.querySelector("#shopping-empty").hidden = Boolean(error || rows.length);
    this.shadowRoot.querySelector("#shopping-table").hidden = Boolean(error || !rows.length);
    const canAct = this._canAct() && !error;
    const signature = JSON.stringify([rows, canAct, this._confirmId]);
    if (this._rowsSignature === signature) return;
    this._rowsSignature = signature;
    const body = this.shadowRoot.querySelector("#shopping-rows");
    const elements = [];
    const text = (tag, value) => {
      const element = document.createElement(tag);
      element.textContent = value;
      return element;
    };
    const button = (label, action, name) => {
      const element = text("button", label);
      element.type = "button";
      element.disabled = !canAct;
      if (name) element.setAttribute("aria-label", name);
      element.addEventListener("click", action);
      return element;
    };
    for (const row of rows) {
      const tr = document.createElement("tr");
      tr.dataset.id = String(row.id);
      tr.append(text("td", row.name), text("td", row.category), text("td", row.store));
      const quantity = document.createElement("td");
      const controls = document.createElement("div");
      controls.className = "quantity-controls";
      controls.append(
        button("\u2212", () => this._change(row.id, -1), `${this._t("Decrease quantity")}: ${row.name}`),
        text("strong", String(row.quantity)),
        button("+", () => this._change(row.id, 1), `${this._t("Increase quantity")}: ${row.name}`));
      if (row.adhoc && row.quantity >= 99999) controls.lastChild.disabled = true;
      quantity.append(controls);
      const action = document.createElement("td");
      action.append(button(this._t("Remove item"), () => this._requestRemove(row.id),
        `${this._t("Remove item")}: ${row.name}`));
      tr.append(quantity, action);
      elements.push(tr);
      if (this._confirmId === row.id) {
        const confirm = document.createElement("tr");
        confirm.className = "confirm-row";
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.append(text("p", `${this._t("Remove this item from the shopping list?")} ${row.name}`));
        const actions = document.createElement("div");
        actions.className = "remove-controls";
        actions.append(button(this._t("Cancel"), () => {
          this._confirmId = null;
          this._render();
        }), button(this._t("Confirm removal"), () => this._change(row.id, "remove")));
        cell.append(actions);
        confirm.append(cell);
        elements.push(confirm);
      }
    }
    body.replaceChildren(...elements);
  }

  _requestRemove(id) {
    if (!this._canAct() || !this._rows().some((row) => row.id === id)) return;
    this._confirmId = id;
    this._render();
  }

  async _refresh() {
    if (this.preview || this._busy || !this._hass?.connected) return;
    this._busy = true;
    this._status = "Refreshing shopping list";
    this._render();
    try {
      const states = Object.fromEntries((await this._hass.callWS({ type: "get_states" }))
        .map((row) => [row.entity_id, row]));
      this._rows(states);
      this._states = states;
      this._blocked = false;
      this._confirmId = null;
      this._status = "Shopping list refreshed. Review quantities before trying again.";
    } catch (error) {
      console.error("VH-Inventory touchscreen shopping refresh failed", error);
      this._blocked = true;
      this._status = "Shopping list unavailable. Reconnect and refresh before making changes.";
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _change(id, action) {
    if (!this._canAct() || ![1, -1, "remove"].includes(action)) return;
    let submitted = false;
    try {
      const row = this._rows().find((item) => item.id === id);
      if (!row) throw new Error("Shopping row no longer exists.");
      if ((action === "remove" || (action === -1 && row.quantity === 1)) && this._confirmId !== id) {
        this._requestRemove(id);
        return;
      }
      if (row.adhoc && row.quantity >= 99999 && action === 1) return;
      this._busy = true;
      this._status = "Updating shopping list";
      this._render();
      submitted = true;
      const remove = action === "remove" || (action === -1 && row.quantity === 1);
      await this._hass.callService("pyscript", remove ? "vh_inventory_delete" : "vh_inventory_adjust_shopping",
        remove ? { table: "shopping_list", id } : { id, delta: action });
      const states = Object.fromEntries((await this._hass.callWS({ type: "get_states" }))
        .map((item) => [item.entity_id, item]));
      const updated = this._rows(states).find((item) => item.id === id);
      if (remove ? Boolean(updated) : !updated || updated.quantity !== row.quantity + action) {
        throw new Error("Shopping change could not be verified.");
      }
      this._states = states;
      this._confirmId = null;
      this._status = "Shopping list updated. Stock is unchanged.";
    } catch (error) {
      console.error("VH-Inventory touchscreen shopping change failed", error);
      this._blocked = true;
      this._status = submitted
        ? "Shopping change uncertain. Do not repeat it. Refresh and check the list first."
        : "Shopping list unavailable. Reconnect and refresh before making changes.";
    } finally {
      this._busy = false;
      this._render();
    }
  }
}

class VhInventoryStockTouchscreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._states = {};
    this._search = "";
    this._category = "";
    this._busy = false;
    this._blocked = false;
    this._status = "";
    this._editor = null;
    this._confirmation = null;
  }

  _t(key) {
    const language = this._config.language || "nl";
    return this._config.translations[language][key] || this._config.translations.en[key] || key;
  }

  setConfig(config) {
    if (!config.translations?.en || !config.translations?.nl ||
        (config.language && !config.translations[config.language])) {
      throw new Error("Build the touchscreen dashboard with a supported language first.");
    }
    this._config = config;
    const theme = VH_TOUCHSCREEN_THEME.replace(":root", ":host")
      .replace('html[data-theme="dark"]', ':host([data-theme="dark"])');
    this.setAttribute("data-theme", config.theme === "light" ? "light" : "dark");
    this.shadowRoot.innerHTML = `<style>${theme}${VH_TOUCHSCREEN_STYLE}
      .inventory-search { display: flex; gap: 12px; }
      .inventory-tools { display: flex; flex-wrap: wrap; gap: 16px; align-items: end; }
      .inventory-tools label { margin: 0; flex: 1; }
      select { min-height: 68px; width: 100%; padding: 12px; font: inherit; font-size: 20px;
        border: 1px solid var(--cp-border-strong); border-radius: 10px;
        background: var(--cp-surface); color: var(--cp-text); }
      .panel { padding-top: 16px; }
      #inventory-status { font-size: 19px; }
      #inventory-status:empty { display: none; }
      #inventory-status[data-state="error"] { color: var(--cp-danger); }
      .table-scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 21px; }
      th { text-align: left; font-size: 17px; color: var(--cp-text-muted); }
      th:nth-child(5), th:nth-child(6) { text-align: center; }
      th, td { padding: 16px 12px; border-bottom: 1px solid var(--cp-border); }
      td:first-child { min-width: 200px; overflow-wrap: anywhere; }
      td select { min-width: 160px; }
      .quantity-controls, .inventory-actions { display: flex; gap: 12px; align-items: center; justify-content: center; }
      .quantity-controls button { min-width: 68px; }
      .quantity-controls strong { min-width: 40px; text-align: center; }
      .editor-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .editor-fields label { margin: 0; }
      .editor-fields input, .editor-fields select { margin-top: 8px; }
      .editor-fields select { background: var(--cp-bg-elevated); }
      .editor-actions { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .editor-actions button { height: 68px; min-width: 0; box-sizing: border-box; padding: 12px 8px; }
      #inventory-editor h2 { font-size: 28px; }
      #inventory-confirmation { padding: 16px; background: var(--cp-accent-soft); border-radius: 10px; }
      .empty { padding: 24px 0; font-size: 24px; }
      @media (max-width: 700px) { .editor-fields { grid-template-columns: 1fr; } }
      </style><main>
      <header><div class="brand"><img id="brand-logo" class="brand-logo"
        alt="Van Hemert Home Automation" width="128" height="72">
        <div><div class="eyebrow">VH-INVENTORY</div><h1 id="inventory-title" data-i18n="Inventory"></h1></div></div>
        <button id="inventory-refresh" type="button" hidden data-i18n="Refresh inventory"></button></header>
      <div><label for="inventory-search" data-i18n="Search by product name or barcode"></label>
        <div class="inventory-search"><input id="inventory-search" type="search" autocomplete="off">
          <button id="inventory-clear" type="button" data-i18n="Reset"></button></div></div>
      <div class="inventory-tools"><button id="inventory-add" type="button" data-i18n="Add product to inventory"></button>
        <label><span data-i18n="Category"></span><select id="inventory-category"></select></label>
        <button id="inventory-print" type="button" data-i18n="Print full inventory"></button></div>
      <section class="panel" aria-labelledby="inventory-title">
        <p id="inventory-status" role="status" aria-live="polite"></p>
        <div id="inventory-confirmation" hidden></div>
        <p id="inventory-empty" class="empty" hidden></p>
        <div class="table-scroll"><table id="inventory-table"><thead><tr>
          <th scope="col" data-i18n="Product"></th><th scope="col" data-i18n="Category"></th>
          <th scope="col" data-i18n="Store"></th>
          <th scope="col" data-i18n="Location"></th><th scope="col" data-i18n="Quantity"></th>
          <th scope="col" data-i18n="Action"></th>
        </tr></thead><tbody id="inventory-rows"></tbody></table></div></section>
      <section id="inventory-editor" class="panel" hidden></section></main>`;
    this.shadowRoot.querySelector("#brand-logo").src = config.logo || "/local/van-hemert-logo-hi.png";
    for (const element of this.shadowRoot.querySelectorAll("[data-i18n]")) {
      element.textContent = this._t(element.dataset.i18n);
    }
    this.shadowRoot.querySelector("#inventory-search").addEventListener("input", (event) => {
      this._search = event.target.value;
      this._render();
    });
    this.shadowRoot.querySelector("#inventory-clear").addEventListener("click", () => {
      this._search = "";
      this.shadowRoot.querySelector("#inventory-search").value = "";
      this._render();
    });
    this.shadowRoot.querySelector("#inventory-category").addEventListener("change", (event) => {
      this._category = event.target.value;
      this._render();
    });
    this.shadowRoot.querySelector("#inventory-add").addEventListener("click", () => this._openEditor());
    this.shadowRoot.querySelector("#inventory-print").addEventListener("click", () => this._print());
    this.shadowRoot.querySelector("#inventory-refresh").addEventListener("click", () => this._refresh());
    this._render();
  }

  set hass(value) {
    this._hass = value;
    this._states = value?.states || {};
    this._render();
  }

  getCardSize() { return 18; }

  _data(states = this._states) {
    const read = (name) => {
      const sensor = states[`sensor.vh_inventory_${name}`];
      if (!sensor || ["unknown", "unavailable"].includes(sensor.state) || !Array.isArray(sensor.attributes?.[name])) {
        throw new Error(`Inventory data unavailable: ${name}`);
      }
      return sensor.attributes[name];
    };
    const unique = (rows, valid) => {
      const ids = new Set();
      for (const row of rows) {
        if (!Number.isSafeInteger(row.id) || row.id < 1 || ids.has(row.id) || !valid(row)) {
          throw new Error("Invalid inventory data.");
        }
        ids.add(row.id);
      }
      return rows;
    };
    const products = unique(read("products"), (p) => typeof p.name === "string" && Boolean(p.name.trim()) &&
      (p.category_id == null || (Number.isSafeInteger(p.category_id) && p.category_id > 0)) &&
      (p.store_id == null || (Number.isSafeInteger(p.store_id) && p.store_id > 0)) &&
      [p.manufacturer, p.unit, p.store].every((value) => value == null || typeof value === "string") &&
      (p.barcode == null || (typeof p.barcode === "string" && /^\d*$/.test(p.barcode)) ||
        (Number.isSafeInteger(p.barcode) && p.barcode >= 0)));
    const categories = unique(read("categories"), (c) => typeof c.category === "string" && Boolean(c.category.trim()));
    const stores = unique(read("stores"), (s) => typeof s.store === "string" && Boolean(s.store.trim()));
    const locations = unique(read("locations"), (l) => typeof l.location === "string" && Boolean(l.location.trim()));
    const stock = unique(read("stock"), (row) => Number.isSafeInteger(row.quantity) && row.quantity >= 0 &&
      products.some((p) => p.id === row.product_id) &&
      (row.location_id == null || (Number.isSafeInteger(row.location_id) && row.location_id > 0)));
    return { products, categories, stores, locations, stock };
  }

  _normalize(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
  }

  _rows(data = this._data()) {
    const search = this._normalize(this._search);
    return data.stock.filter((row) => row.quantity >= 1).map((row) => {
      const product = data.products.find((p) => p.id === row.product_id);
      return { ...row, name: product.name, barcode: product.barcode ?? "", category_id: product.category_id ?? null,
        store_id: product.store_id ?? null, store: product.store || this._t("Unassigned") };
    }).filter((row) => (!search || this._normalize(row.name).includes(search) || this._normalize(row.barcode).includes(search)) &&
      (!this._category || (this._category === "none" ? row.category_id == null : String(row.category_id) === this._category)))
      .sort((a, b) => a.name.localeCompare(b.name, this._config.language || "nl") || a.id - b.id);
  }

  _canAct() {
    const available = Boolean(!this.preview && this._hass?.connected && !this._busy && !this._blocked &&
      ["add_stock", "adjust_stock", "set_stock_field", "set_product_field", "save_stock_details", "delete"]
        .every((name) => this._hass.services?.pyscript?.[`vh_inventory_${name}`]));
    if (!available) return false;
    try { this._data(); return true; }
    catch (error) {
      console.error("VH-Inventory touchscreen inventory data unavailable", error);
      return false;
    }
  }

  _text(tag, value) {
    const element = document.createElement(tag);
    element.textContent = value;
    return element;
  }

  _button(label, action, disabled = false) {
    const button = this._text("button", this._t(label));
    button.type = "button";
    button.disabled = disabled;
    button.addEventListener("click", action);
    return button;
  }

  _options(select, rows, field, value, emptyLabel = "Unassigned") {
    const entries = [this._text("option", this._t(emptyLabel))];
    entries[0].value = "";
    for (const row of [...rows].sort((a, b) => a[field].localeCompare(b[field], this._config.language || "nl"))) {
      const option = this._text("option", row[field]);
      option.value = String(row.id);
      entries.push(option);
    }
    select.replaceChildren(...entries);
    select.value = value == null ? "" : String(value);
    if (value != null && select.value !== String(value)) {
      const missing = this._text("option", this._t("Reference no longer available"));
      missing.value = String(value);
      missing.disabled = true;
      select.append(missing);
      select.value = String(value);
    }
  }

  _render() {
    if (!this._config || !this.shadowRoot.querySelector("main")) return;
    let data, rows = [], error = false;
    try { data = this._data(); rows = this._rows(data); }
    catch (failure) { error = true; }
    const connected = !this.preview && this._hass?.connected;
    const canAct = this._canAct() && !error;
    const idle = canAct && !this._editor && !this._confirmation;
    const status = this.shadowRoot.querySelector("#inventory-status");
    const message = error ? "Inventory unavailable. Reconnect and refresh before making changes."
      : !connected ? "Home Assistant unavailable" : this._status ||
        (!this._canAct() && !this._busy && !this._blocked ? "Inventory editing services unavailable." : "");
    status.textContent = this._t(message);
    status.dataset.state = error || !connected || this._blocked ? "error" : "ready";
    const refresh = this.shadowRoot.querySelector("#inventory-refresh");
    refresh.hidden = !error && connected && !this._blocked;
    refresh.disabled = !connected || this._busy;
    this.shadowRoot.querySelector("#inventory-add").disabled = !idle;
    this.shadowRoot.querySelector("#inventory-print").disabled = !idle || !this._hass?.services?.script?.vh_print_inventory;
    const category = this.shadowRoot.querySelector("#inventory-category");
    this._options(category, data?.categories || [], "category", this._category === "none" ? "" : this._category, "All");
    const unassigned = this._text("option", this._t("Unassigned"));
    unassigned.value = "none";
    category.append(unassigned);
    category.value = this._category;
    if (category.value !== this._category) {
      const missing = this._text("option", this._t("Reference no longer available"));
      missing.value = this._category;
      category.append(missing);
      category.value = this._category;
    }
    const empty = this.shadowRoot.querySelector("#inventory-empty");
    empty.hidden = error || rows.length > 0;
    empty.textContent = this._t(this._search || this._category ? "No inventory matches your filters." : "No products in stock.");
    this.shadowRoot.querySelector("#inventory-table").hidden = error || !rows.length;
    const signature = JSON.stringify([rows, data?.categories, data?.stores, data?.locations, idle]);
    if (signature !== this._rowsSignature) {
      this._rowsSignature = signature;
      const elements = rows.map((row) => {
        const tr = document.createElement("tr");
        tr.dataset.id = String(row.id);
        tr.append(this._text("td", row.name));
        for (const [field, options, value] of [
          ["category", data.categories, row.category_id], ["store", data.stores, row.store_id],
          ["location", data.locations, row.location_id],
        ]) {
          const td = document.createElement("td");
          const select = document.createElement("select");
          this._options(select, options, field, value);
          const label = { category: "Category", store: "Store", location: "Location" }[field];
          select.setAttribute("aria-label", `${this._t(label)}: ${row.name}`);
          select.disabled = !idle;
          select.addEventListener("change", () => this._setField(row.id, field, select.value));
          td.append(select);
          tr.append(td);
        }
        const qty = document.createElement("td");
        const controls = document.createElement("div");
        controls.className = "quantity-controls";
        const minus = this._button("\u2212", () => this._change(row.id, -1), !idle);
        minus.setAttribute("aria-label", `${this._t("Decrease quantity")}: ${row.name}`);
        const plus = this._button("+", () => this._change(row.id, 1), !idle || row.quantity >= 99999);
        plus.setAttribute("aria-label", `${this._t("Increase quantity")}: ${row.name}`);
        controls.append(minus, this._text("strong", String(row.quantity)), plus);
        qty.append(controls);
        const actions = document.createElement("td");
        const group = document.createElement("div");
        group.className = "inventory-actions";
        group.append(this._button("Edit", () => this._openEditor(row.id), !idle),
          this._button("Remove item", () => this._remove(row.id), !idle));
        actions.append(group);
        tr.append(qty, actions);
        return tr;
      });
      this.shadowRoot.querySelector("#inventory-rows").replaceChildren(...elements);
    }
    const confirmation = this.shadowRoot.querySelector("#inventory-confirmation");
    confirmation.hidden = !this._confirmation;
    if (this._confirmation) {
      const pending = this._confirmation;
      confirmation.replaceChildren(this._text("p", `${this._t("Remove this stock row?")} ${pending.name}`),
        this._button("Cancel", () => { this._confirmation = null; this._render(); }, this._busy),
        this._button("Confirm removal", () => pending.run(), !canAct));
    }
    const editor = this.shadowRoot.querySelector("#inventory-editor");
    editor.hidden = !this._editor;
    for (const control of editor.querySelectorAll("input,select,button")) {
      control.disabled = control.id === "inventory-cancel" ? this._busy : !canAct || Boolean(this._confirmation);
    }
  }

  _name(rows, id, field, required = false) {
    if (id == null || id === "") {
      if (required) throw new Error("Select a product.");
      return "(none)";
    }
    const row = rows.find((item) => String(item.id) === String(id));
    if (!row || row[field] === "(none)" || rows.filter((item) => item[field] === row[field]).length !== 1) {
      throw new Error("The selected reference is missing or ambiguous.");
    }
    return row[field];
  }

  _sameRow(a, b) {
    return Boolean(a && b && a.id === b.id && a.product_id === b.product_id &&
      (a.location_id ?? null) === (b.location_id ?? null) && a.quantity === b.quantity);
  }

  async _read() {
    const states = Object.fromEntries((await this._hass.callWS({ type: "get_states" }))
      .map((row) => [row.entity_id, row]));
    this._data(states);
    return states;
  }

  async _write(prepare) {
    if (!this._canAct()) return;
    this._busy = true;
    this._status = "Updating inventory";
    this._render();
    let submitted = false;
    try {
      const previous = this._data();
      const currentStates = await this._read();
      const plan = prepare(previous, this._data(currentStates));
      for (const call of plan.calls) {
        if (!this._hass.services?.pyscript?.[call.service]) throw new Error("Inventory service unavailable.");
      }
      for (const call of plan.calls) {
        submitted = true;
        await this._hass.callService("pyscript", call.service, call.data);
      }
      const states = await this._read();
      if (!plan.verify(this._data(states))) throw new Error("Inventory change could not be verified.");
      this._states = states;
      this._editor = null;
      this._confirmation = null;
      this._status = "Inventory updated.";
    } catch (error) {
      console.error("VH-Inventory touchscreen inventory change failed", error);
      const validation = !submitted && [
        "Select a product.", "The selected reference is missing or ambiguous.",
        "Use the location dropdown to merge existing stock.", "Barcode already belongs to another product.",
        "Product name already belongs to another product.",
        "Stock exceeds the quantity limit.", "Merged stock exceeds the quantity limit.",
      ].includes(error.message);
      this._blocked = !validation;
      if (validation) this._confirmation = null;
      this._status = validation ? error.message : submitted
        ? "Inventory change uncertain. Do not repeat it. Refresh and check stock and shopping first."
        : "Inventory changed or unavailable. Refresh and check before trying again.";
    } finally {
      this._busy = false;
      this._render();
    }
  }

  _assertRow(previous, current, id, expected) {
    const before = expected || previous.stock.find((row) => row.id === id);
    const now = current.stock.find((row) => row.id === id);
    if (!before || before.quantity < 1 || !this._sameRow(before, now)) throw new Error("Stock row changed.");
    return now;
  }

  _askRemoval(row, run) {
    this._confirmation = { name: this._data().products.find((p) => p.id === row.product_id).name, run };
    this._render();
  }

  async _change(id, delta, expected = null) {
    if (!this._canAct() || this._editor || (this._confirmation && !expected) || ![1, -1].includes(delta)) return;
    const row = this._data().stock.find((item) => item.id === id);
    if (!row || row.quantity < 1 || (delta === 1 && row.quantity >= 99999)) return;
    if (delta === -1 && row.quantity === 1 && !expected) {
      this._askRemoval(row, () => this._change(id, delta, { ...row }));
      return;
    }
    await this._write((before, current) => {
      const original = this._assertRow(before, current, id, expected);
      const quantity = original.quantity + delta;
      return { calls: [{ service: "vh_inventory_adjust_stock", data: { id, delta } }],
        verify: (after) => {
          const updated = after.stock.find((item) => item.id === id);
          return quantity === 0 ? !updated || updated.quantity === 0
            : this._sameRow({ ...original, quantity }, updated);
        } };
    });
  }

  async _remove(id, expected = null) {
    if (!this._canAct() || this._editor || (this._confirmation && !expected)) return;
    const row = this._data().stock.find((item) => item.id === id);
    if (!row || row.quantity < 1) return;
    if (!expected) {
      this._askRemoval(row, () => this._remove(id, { ...row }));
      return;
    }
    await this._write((before, current) => {
      this._assertRow(before, current, id, expected);
      return { calls: [{ service: "vh_inventory_delete", data: { table: "stock", id } }],
        verify: (after) => !after.stock.some((item) => item.id === id) };
    });
  }

  async _setField(id, field, value) {
    if (!this._canAct() || this._editor || this._confirmation || !["category", "store", "location"].includes(field)) return;
    await this._write((before, current) => {
      const row = this._assertRow(before, current, id);
      const product = current.products.find((p) => p.id === row.product_id);
      const oldProduct = before.products.find((p) => p.id === row.product_id);
      if (field !== "location" && (product[`${field}_id`] ?? null) !== (oldProduct[`${field}_id`] ?? null)) {
        throw new Error(`Product ${field} changed.`);
      }
      const rows = { category: current.categories, store: current.stores, location: current.locations }[field];
      const name = this._name(rows, value, field);
      const target = value === "" ? null : Number(value);
      if (field === "store") {
        return { calls: [{ service: "vh_inventory_set_product_field",
          data: { id: row.product_id, field, value: name } }],
        verify: (after) => (after.products.find((p) => p.id === row.product_id)?.store_id ?? null) === target &&
          this._sameRow(row, after.stock.find((item) => item.id === id)) };
      }
      const total = current.stock.filter((item) => item.product_id === row.product_id &&
        (item.id === id || (item.location_id ?? null) === target)).reduce((sum, item) => sum + item.quantity, 0);
      if (field === "location" && total > 99999) throw new Error("Merged stock exceeds the quantity limit.");
      return { calls: [{ service: "vh_inventory_set_stock_field", data: { id, field, value: name } }],
        verify: (after) => field === "category"
          ? (after.products.find((p) => p.id === row.product_id)?.category_id ?? null) === target
          : after.stock.filter((item) => item.product_id === row.product_id &&
            (item.location_id ?? null) === target).reduce((sum, item) => sum + item.quantity, 0) === total &&
            !after.stock.some((item) => item.id === id && (item.location_id ?? null) !== target) };
    });
  }

  _openEditor(id = null) {
    if (!this._canAct() || this._editor || this._confirmation) return;
    const data = this._data();
    const row = id == null ? null : data.stock.find((item) => item.id === id && item.quantity >= 1);
    if (id != null && !row) return;
    const product = row ? data.products.find((p) => p.id === row.product_id) : null;
    this._editor = { id, originalRow: row ? { ...row } : null, originalProduct: product ? { ...product } : null,
      values: { product_id: row?.product_id == null ? "" : String(row.product_id),
        location_id: row?.location_id == null ? "" : String(row.location_id), quantity: String(row?.quantity ?? 1),
        name: product?.name || "", barcode: String(product?.barcode ?? ""), manufacturer: product?.manufacturer || "",
        unit: product?.unit || "", category_id: product?.category_id == null ? "" : String(product.category_id),
        store_id: product?.store_id == null ? "" : String(product.store_id) } };
    this._buildEditor(data);
    this._render();
    this.shadowRoot.querySelector("#inventory-editor")?.scrollIntoView({ block: "nearest" });
  }

  _buildEditor(data) {
    const host = this.shadowRoot.querySelector("#inventory-editor");
    if (!host) return;
    host.replaceChildren(this._text("h2", this._t(this._editor.id == null ? "Add Inventory" : "Edit Inventory")));
    const form = document.createElement("form");
    form.className = "editor-fields";
    const edit = this._editor.id != null;
    const fields = edit ? [
      ["barcode", "Barcode", "text"], ["name", "Product", "text"],
      ["manufacturer", "Manufacturer", "text"], ["store_id", "Store", "select"],
      ["category_id", "Category", "select"], ["unit", "Unit", "text"],
      ["location_id", "Location", "select"], ["quantity", "Quantity", "number"],
    ] : [
      ["product_id", "Product", "select"], ["location_id", "Location", "select"], ["quantity", "Quantity", "number"],
    ];
    for (const [field, label, type] of fields) {
      const wrapper = this._text("label", this._t(label));
      const input = document.createElement(type === "select" ? "select" : "input");
      input.name = field;
      if (type === "select") {
        const [rows, name] = field === "product_id" ? [data.products, "name"] :
          field === "location_id" ? [data.locations, "location"] :
            field === "store_id" ? [data.stores, "store"] : [data.categories, "category"];
        this._options(input, rows, name, this._editor.values[field]);
        input.required = field === "product_id";
      } else {
        input.type = type;
        input.value = this._editor.values[field];
        if (type === "number") { input.min = edit ? "0" : "1"; input.max = "99999"; input.step = "1"; input.required = true; }
        if (field === "barcode") { input.inputMode = "numeric"; input.maxLength = 15; input.pattern = "[0-9]{0,15}"; }
        if (["name", "manufacturer", "unit"].includes(field)) input.maxLength = 255;
        if (field === "name") input.required = true;
      }
      input.addEventListener(type === "select" ? "change" : "input", () => {
        this._editor.values[field] = input.value;
      });
      wrapper.append(input);
      form.append(wrapper);
    }
    const save = this._button("Save", () => {});
    save.type = "submit";
    const cancel = this._button("Cancel editing", () => {
      if (this._busy) return;
      this._editor = null;
      this._confirmation = null;
      if (!this._blocked) this._status = "";
      this._render();
    });
    cancel.id = "inventory-cancel";
    const actions = document.createElement("div");
    actions.className = "editor-actions";
    actions.append(save, cancel);
    form.append(actions);
    form.addEventListener("submit", (event) => { event.preventDefault(); this._save(); });
    host.append(form);
  }

  async _save(confirmed = false) {
    if (!this._canAct() || !this._editor || (this._confirmation && !confirmed)) return;
    const editor = this._editor;
    const values = { ...editor.values };
    const quantity = Number(values.quantity);
    const barcode = values.barcode.trim();
    if (editor.id != null && (!values.name.trim() || values.name.trim() === "(none)" ||
        [values.name.trim(), values.manufacturer, values.unit].some((value) => value.length > 255))) {
      this._status = "Enter a product name and text fields of up to 255 characters.";
      this._render();
      return;
    }
    if (!/^\d+$/.test(values.quantity) || !Number.isSafeInteger(quantity) ||
        quantity < (editor.id == null ? 1 : 0) || quantity > 99999 ||
        (editor.id != null && barcode && !/^\d{1,15}$/.test(barcode))) {
      this._status = "Enter a valid quantity and a barcode of up to 15 digits.";
      this._render();
      return;
    }
    if (editor.id != null && quantity === 0 && !confirmed) {
      this._askRemoval(editor.originalRow, () => this._save(true));
      return;
    }
    await this._write((before, current) => {
      if (editor.id != null) {
        const row = this._assertRow(before, current, editor.id, editor.originalRow);
        const pid = editor.originalRow.product_id;
        const product = current.products.find((p) => p.id === pid);
        const canonical = (p, stock) => ({
          name: p.name, barcode: p.barcode == null || p.barcode === "" ? null : Number(p.barcode),
          manufacturer: p.manufacturer || "", unit: p.unit || "",
          category_id: p.category_id ?? null, store_id: p.store_id ?? null,
          location_id: stock.location_id ?? null, quantity: stock.quantity,
        });
        const original = canonical(editor.originalProduct, editor.originalRow);
        const fresh = canonical(product, row);
        const proposed = { name: values.name.trim(), barcode: barcode ? Number(barcode) : null,
          manufacturer: values.manufacturer, unit: values.unit,
          category_id: values.category_id === "" ? null : Number(values.category_id),
          store_id: values.store_id === "" ? null : Number(values.store_id),
          location_id: values.location_id === "" ? null : Number(values.location_id), quantity };
        const changes = {}, expected = { quantity: original.quantity, location_id: original.location_id };
        for (const [field, value] of Object.entries(proposed)) {
          if (value === original[field]) continue;
          if (fresh[field] !== original[field]) throw new Error("Product or stock details changed.");
          changes[field] = value;
          expected[field] = original[field];
        }
        for (const [field, refs] of [["category_id", current.categories], ["store_id", current.stores],
          ["location_id", current.locations]]) {
          if (field in changes && proposed[field] !== null && !refs.some((r) => r.id === proposed[field])) {
            throw new Error("The selected reference is missing or ambiguous.");
          }
        }
        if ("name" in changes && current.products.some((p) => p.id !== pid && p.name === proposed.name)) {
          throw new Error("Product name already belongs to another product.");
        }
        if ("barcode" in changes && proposed.barcode !== null &&
            current.products.some((p) => p.id !== pid && p.barcode != null && p.barcode !== "" &&
              Number(p.barcode) === proposed.barcode)) throw new Error("Barcode already belongs to another product.");
        if (Object.keys(changes).length && current.stock.some((r) => r.id !== editor.id &&
            r.product_id === pid && (r.location_id ?? null) === proposed.location_id)) {
          throw new Error("Use the location dropdown to merge existing stock.");
        }
        return {
          calls: Object.keys(changes).length ? [{ service: "vh_inventory_save_stock_details",
            data: { id: editor.id, product_id: pid, changes, expected } }] : [],
          verify: (after) => {
            const saved = after.stock.find((r) => r.id === editor.id);
            const updated = after.products.find((p) => p.id === pid);
            const stockMatches = quantity === 0 && !saved ||
              this._sameRow({ ...row, location_id: proposed.location_id, quantity }, saved);
            return Boolean(stockMatches && updated && Object.keys(changes).every((field) =>
              canonical(updated, saved || { quantity: 0, location_id: proposed.location_id })[field] === proposed[field]));
          },
        };
      }
      const productName = this._name(current.products, values.product_id, "name", true);
      const locationName = this._name(current.locations, values.location_id, "location");
      const pid = Number(values.product_id), lid = values.location_id === "" ? null : Number(values.location_id);
      const old = before.stock.filter((row) => row.product_id === pid && (row.location_id ?? null) === lid);
      const now = current.stock.filter((row) => row.product_id === pid && (row.location_id ?? null) === lid);
      if (old.length > 1 || now.length > 1 || JSON.stringify(old) !== JSON.stringify(now)) throw new Error("Stock changed.");
      const expectedQuantity = quantity + (now[0]?.quantity || 0);
      if (expectedQuantity > 99999) throw new Error("Stock exceeds the quantity limit.");
      return { calls: [{ service: "vh_inventory_add_stock",
        data: { product: productName, location: locationName, quantity } }], verify: (after) => {
        const rows = after.stock.filter((row) => row.product_id === pid && (row.location_id ?? null) === lid);
        return rows.length === 1 && rows[0].quantity === expectedQuantity;
      } };
    });
  }

  async _refresh() {
    if (this.preview || !this._hass?.connected || this._busy) return;
    if (this._editor) {
      this._status = "Discard your inventory edits before refreshing.";
      this._render();
      return;
    }
    this._busy = true;
    this._render();
    try {
      this._states = await this._read();
      this._blocked = false;
      this._confirmation = null;
      this._status = "Inventory refreshed. Review stock and shopping before trying again.";
    } catch (error) {
      console.error("VH-Inventory touchscreen inventory refresh failed", error);
      this._blocked = true;
      this._status = "Inventory unavailable. Reconnect and refresh before making changes.";
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _print() {
    if (!this._canAct() || this._editor || this._confirmation || !this._hass.services?.script?.vh_print_inventory) return;
    this._busy = true;
    this._status = "Sending inventory to printer";
    this._render();
    try {
      await this._hass.callService("script", "vh_print_inventory", {});
      this._status = "Print request sent. Check the printer before printing again.";
    } catch (error) {
      console.error("VH-Inventory touchscreen inventory print failed", error);
      this._blocked = true;
      this._status = "Print result uncertain. Check the printer before trying again.";
    } finally {
      this._busy = false;
      this._render();
    }
  }
}

class VhInventoryTouchscreenDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._page = "scan";
    this._cards = {};
    this._beforeUnload = (event) => {
      if (this._cards.inventory?._editor || this._cards.inventory?._busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    this._hashChanged = () => {
      if (["", "#scan", "#shopping", "#inventory"].includes(window.location.hash)) {
        this._switchPage(["shopping", "inventory"].includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "scan");
      }
    };
  }

  setConfig(config) {
    this._config = config;
    const theme = VH_TOUCHSCREEN_THEME.replace(":root", ":host")
      .replace('html[data-theme="dark"]', ':host([data-theme="dark"])');
    this.setAttribute("data-theme", config.theme === "light" ? "light" : "dark");
    this.shadowRoot.innerHTML = `<style>${theme}${VH_TOUCHSCREEN_STYLE}
      :host { display: grid; grid-template-rows: minmax(0, 1fr) auto;
        height: calc(100dvh - var(--header-height, 0px)); overflow: hidden;
        --vh-touchscreen-main-height: 100%; }
      .pages { min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
      .pages > * { height: 100%; }
      .navigation-bar { padding: 16px 24px calc(16px + env(safe-area-inset-bottom, 0px));
        border-top: 1px solid var(--cp-border); background: var(--cp-bg-elevated); }
      .page-navigation { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
        max-width: 1020px; margin: auto; }
      .page-navigation button { justify-content: center; min-width: 0; height: 68px;
        box-sizing: border-box; line-height: 1.2; appearance: none; }
      @media (max-width: 550px) {
        .navigation-bar { padding-left: 12px; padding-right: 12px; }
        .page-navigation button { padding: 4px 6px; font-size: 14px; gap: 2px;
          flex-direction: column; overflow-wrap: anywhere; }
        .page-navigation svg { width: 20px; height: 20px; }
      }
      </style><div class="pages"></div><div class="navigation-bar"></div>`;
    const pages = this.shadowRoot.querySelector(".pages");
    for (const [page, tag] of [["scan", "vh-inventory-touchscreen"], ["shopping", "vh-inventory-shopping-touchscreen"],
      ["inventory", "vh-inventory-stock-touchscreen"]]) {
      const card = document.createElement(tag);
      card.preview = this.preview;
      card.setConfig({ ...config, type: `custom:${tag}` });
      this._cards[page] = card;
      pages.append(card);
      if (this._hass) card.hass = this._hass;
    }
    const nav = document.createElement("nav");
    nav.className = "page-navigation";
    nav.setAttribute("aria-label", this._cards.scan._t("Page navigation"));
    for (const [target, label, icon] of [
      ["scan", "Scan", '<path d="M4 8V4h4m8 0h4v4M4 16v4h4m8 0h4v-4M8 8v8m3-8v8m3-8v8m3-8v8"/>'],
      ["shopping", "Shopping", '<path d="M3 4h2l3 11h10l3-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>'],
      ["inventory", "Inventory", '<path d="M4 7l8-4 8 4v10l-8 4-8-4V7zm0 0l8 4 8-4M12 11v10"/>'],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.page = target;
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${icon}</svg>`;
      button.append(document.createTextNode(this._cards.scan._t(label)));
      button.addEventListener("click", () => this._switchPage(target));
      nav.append(button);
    }
    this.shadowRoot.querySelector(".navigation-bar").append(nav);
    this._page = ["shopping", "inventory"].includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "scan";
    this._renderNavigation();
  }

  set hass(value) {
    this._hass = value;
    for (const card of Object.values(this._cards)) card.hass = value;
    this._renderNavigation();
  }

  set preview(value) {
    this._preview = value;
    for (const card of Object.values(this._cards)) {
      card.preview = value;
      card._render();
    }
  }

  get preview() { return this._preview; }

  connectedCallback() {
    window.addEventListener("hashchange", this._hashChanged);
    window.addEventListener("beforeunload", this._beforeUnload);
    this._hashChanged();
  }

  disconnectedCallback() {
    window.removeEventListener("hashchange", this._hashChanged);
    window.removeEventListener("beforeunload", this._beforeUnload);
  }

  getCardSize() { return 18; }

  _syncHash() {
    if (this.preview) return;
    const hash = this._page === "scan" ? "" : `#${this._page}`;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${hash}`);
  }

  _switchPage(page) {
    if (!["scan", "shopping", "inventory"].includes(page) || !this._cards[page]) return;
    const scan = this._cards.scan;
    const shopping = this._cards.shopping;
    const inventory = this._cards.inventory;
    if (page !== this._page) {
      if (inventory?._editor || inventory?._busy) {
        inventory._status = "Save or discard your edits before switching pages.";
        inventory._render();
        this._syncHash();
        return;
      }
      if (scan._dirty() || scan._saving) {
        scan._notice = { title: "Save or discard your edits", detail: "Save or discard your edits before switching pages.", state: "warning" };
        scan._render();
        this._syncHash();
        return;
      }
      if (scan._busy || scan._queue.length || shopping._busy) {
        if (this._page === "scan") {
          scan._notice = { title: "Processing scan", detail: "Wait for the current action before switching pages.", state: "busy" };
          scan._render();
        }
        this._syncHash();
        return;
      }
      shopping._confirmId = null;
      shopping._render();
      if (inventory) {
        inventory._confirmation = null;
        inventory._render();
      }
    }
    this._page = page;
    this._syncHash();
    this._renderNavigation();
    if (page === "scan") scan._focusInput();
  }

  _renderNavigation() {
    for (const [page, card] of Object.entries(this._cards)) {
      card.hidden = this._page !== page;
    }
    for (const button of this.shadowRoot.querySelectorAll(".page-navigation button")) {
      button.setAttribute("aria-pressed", String(button.dataset.page === this._page));
    }
  }
}

if (!customElements.get("vh-inventory-touchscreen")) {
  customElements.define("vh-inventory-touchscreen", VhInventoryTouchscreen);
}
if (!customElements.get("vh-inventory-shopping-touchscreen")) {
  customElements.define("vh-inventory-shopping-touchscreen", VhInventoryShoppingTouchscreen);
}
if (!customElements.get("vh-inventory-stock-touchscreen")) {
  customElements.define("vh-inventory-stock-touchscreen", VhInventoryStockTouchscreen);
}
if (!customElements.get("vh-inventory-touchscreen-dashboard")) {
  customElements.define("vh-inventory-touchscreen-dashboard", VhInventoryTouchscreenDashboard);
}
