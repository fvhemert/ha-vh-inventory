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
main > header { padding-inline-end: var(--vh-navigation-header-inset, 0px);
  padding-block-start: var(--vh-navigation-header-block-inset, 0px);
  min-height: var(--vh-navigation-header-min-height, 0px); }
.brand { display: flex; align-items: center; gap: 24px; min-width: 0; }
.brand > div { min-width: 0; }
.brand-logo { width: 128px; height: 72px; object-fit: contain; flex-shrink: 0; }
.page-navigation { display: flex; gap: 12px; flex-shrink: 0; }
.page-navigation button { display: inline-flex; align-items: center; gap: 12px; }
.page-navigation svg { width: 28px; height: 28px; flex-shrink: 0; }
.eyebrow { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: var(--cp-text-muted); font-weight: 700; }
h1 { font-size: clamp(28px, 2.4vw, 44px); margin: 4px 0 0; font-weight: 650; overflow-wrap: anywhere; }
h2 { font-size: clamp(28px, 2.6vw, 48px); margin: 16px 0; line-height: 1.15; overflow-wrap: anywhere; }
p { margin: 8px 0; line-height: 1.5; }
.muted { color: var(--cp-text-muted); }
.text-slot, .feedback-slot { min-width: 0; overflow: auto; overflow-wrap: anywhere; scrollbar-width: none; }
.text-slot::-webkit-scrollbar, .feedback-slot::-webkit-scrollbar { display: none; }
.feedback-slot { height: 3em; flex: 0 0 3em; margin: 0; font-size: 19px; line-height: 1.5; }
.table-text { display: block; width: 180px; height: 3em; line-height: 1.5; }
td:first-child > .table-text { width: 240px; }
.recovery-slot { width: 280px; max-width: 100%; height: 68px; flex-shrink: 0; }
.recovery-slot > button { width: 100%; height: 68px; padding: 12px; font-size: 18px; }
.connection-slot { width: 360px; max-width: 100%; height: 68px; flex-shrink: 0; }
#connection { width: 100%; height: 68px; }
#connection-text { max-height: 3em; }
.pill { display: inline-flex; align-items: center; gap: 12px; padding: 12px 20px; border: 1px solid var(--cp-border);
  border-radius: 10px; font-size: 18px; background: var(--cp-surface); }
.dot { height: 12px; width: 12px; border-radius: 50%; background: var(--cp-success); flex-shrink: 0; }
.pill[data-state="error"] .dot { background: var(--cp-danger); }
.pill[data-state="busy"] .dot, .pill[data-state="warning"] .dot { background: var(--cp-warning); }
.scan-controls { display: flex; flex-direction: column; gap: 16px; min-width: 0; align-self: start; }
.scan-main .scan-controls > .panel { padding: 20px; }
.scan-controls h2 { font-size: 32px; margin: 0 0 8px; }
.scan-controls p { font-size: 19px; }
.scan-controls form { margin-top: 20px; }
.mode-bar { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
#mode-help { height: 3em; line-height: 1.5; margin: 8px 0 0; }
.modes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.modes button { min-width: 0; padding: 12px 4px; font-size: clamp(16px, 1.1vw, 20px); }
.almost-out-badge { display: inline-block; border: 1px solid var(--cp-warning);
  border-radius: 8px; padding: 4px 8px; font-size: 16px; line-height: 1.3; font-weight: 400; }
.stock-alternatives { padding: 0; list-style: none; }
.stock-alternatives li { padding: 12px 0; border-bottom: 1px solid var(--cp-border);
  overflow-wrap: anywhere; font-size: 23px; }
button { font: inherit; font-size: 21px; font-weight: 650; cursor: pointer; min-height: 68px; padding: 12px 24px;
  border-radius: 10px; border: 1px solid var(--cp-border-strong); background: var(--cp-surface); color: var(--cp-text); }
button:hover { background: var(--cp-surface-soft); }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--cp-accent); outline-offset: 4px; }
button[aria-pressed="true"], .primary { background: var(--cp-accent); color: var(--cp-accent-fg); border-color: var(--cp-accent); }
button[aria-pressed="true"]:hover, .primary:hover { background: var(--cp-accent-hover); }
button:disabled { opacity: 0.55; cursor: not-allowed; }
button.action-icon { width: 68px; min-width: 68px; padding: 12px; display: grid; place-items: center;
  border: 1px solid var(--cp-border-strong); }
button.action-icon svg { width: 28px; height: 28px; fill: currentColor; }
.workspace { display: grid; grid-template-columns: minmax(360px, 0.85fr) minmax(0, 1.55fr);
  gap: 24px; flex: 1; align-content: start; }
/* Only the left controls determine the desktop row height. */
.workspace > .product-panel, .workspace > .news-panel { contain: size; min-height: 0; overflow: hidden; }
.panel { background: var(--cp-surface); border: 1px solid var(--cp-border); border-radius: 16px; padding: 32px; min-width: 0; }
.panel.search-panel { padding: 20px 24px; }
.search-panel label { margin-bottom: 8px; }
.scan-panel { display: flex; flex-direction: column; }
.news-panel { display: flex; flex-direction: column; gap: 20px; }
.news-header { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
.news-header svg { width: 48px; height: 48px; flex-shrink: 0; color: var(--cp-accent); }
.news-header h2 { margin: 0; font-size: 32px; }
.news-preview { display: inline-block; margin-top: 8px; padding: 4px 8px; border-radius: 8px;
  color: var(--cp-accent); background: var(--cp-accent-soft); font-size: 15px; }
.news-content { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
.news-list { list-style: none; margin: 0; padding: 0; flex: 1; min-height: 0; overflow-y: auto; }
.news-list li { padding: 16px 0; border-bottom: 1px solid var(--cp-border); }
.news-list li:first-child { padding-top: 0; }
.news-list li:last-child { padding-bottom: 0; border-bottom: 0; }
.news-meta { display: flex; justify-content: space-between; align-items: center; gap: 12px;
  margin-bottom: 8px; color: var(--cp-text-muted); font-size: 15px; }
.news-meta time { white-space: nowrap; }
.news-source { color: var(--cp-accent); font-weight: 650; }
.news-list h3 { margin: 0; font-size: clamp(19px, 1.3vw, 24px); line-height: 1.4; overflow-wrap: anywhere; }
.news-headline { display: block; width: 100%; min-height: 44px; padding: 0; border: 0;
  border-radius: 4px; font: inherit; text-align: left; line-height: inherit;
  color: var(--cp-text); background: var(--cp-surface); overflow-wrap: anywhere;
  text-decoration: underline; text-decoration-color: var(--cp-border-strong); text-underline-offset: 4px; }
.news-headline:hover { color: var(--cp-accent); text-decoration-color: var(--cp-accent); }
.news-headline:focus-visible { outline-offset: -3px; }
.news-article { flex: 1; min-height: 0; overflow-y: auto; }
.news-article h3 { margin: 12px 0 16px; font-size: clamp(24px, 1.8vw, 30px); line-height: 1.35; overflow-wrap: anywhere; }
.news-article p { margin: 0 0 16px; line-height: 1.6; font-size: 20px; overflow-wrap: anywhere; }
.news-article-actions { display: flex; flex-wrap: wrap; gap: 12px; flex-shrink: 0; }
.news-article-actions > * { flex: 1; min-width: 0; min-height: 56px; padding: 12px;
  font-size: 17px; font-weight: 650; text-align: center; overflow-wrap: anywhere; }
.news-footer { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
.news-footer p { margin: 0; font-size: 15px; }
#news-status[data-state="warning"] { color: var(--cp-warning); }
.scan-intro { display: flex; align-items: center; gap: 20px; }
.scan-intro > div:last-child { min-width: 0; }
.scanner-art { flex-shrink: 0; color: var(--cp-accent); }
.scanner-art svg { display: block; width: 88px; height: 88px; }
.product-search-section .scan-help { min-height: 0; }
form { margin-top: 28px; }
label { display: block; font-size: 17px; font-weight: 650; margin-bottom: 12px; }
.input-row { display: flex; gap: 12px; }
#product-form { margin-top: 20px; }
.name-results { display: flex; flex-direction: column; gap: 12px; min-height: 0; flex: 1;
  overflow-y: auto; overscroll-behavior: contain; padding: 4px; }
.name-result { width: 100%; text-align: left; overflow-wrap: anywhere; }
.name-result:focus-visible { outline-offset: -3px; }
.name-result span { display: block; font-size: 16px; font-weight: 400; color: var(--cp-text-muted); margin-top: 4px; }
.name-search-dialog { display: none; position: fixed; margin: 0; max-width: none; max-height: none;
  left: calc(var(--vh-search-left, 0px) + max(12px, (var(--vh-search-width, 100vw) - 1100px) / 2));
  top: calc(var(--vh-search-top, 0px) + 12px);
  width: min(1100px, calc(var(--vh-search-width, 100vw) - 24px));
  height: calc(var(--vh-search-height, 100dvh) - 24px);
  min-height: 0; padding: 16px; border: 1px solid var(--cp-border-strong); border-radius: 16px;
  background: var(--cp-surface); color: var(--cp-text); overflow: hidden; }
.name-search-dialog[open] { display: flex; flex-direction: column; gap: 8px; }
.name-search-dialog::backdrop { background: var(--cp-overlay); }
.name-search-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0; }
.name-search-header h2 { font-size: 28px; margin: 0; }
#name-search-close { width: 44px; min-height: 44px; flex-shrink: 0; padding: 10px; }
#name-search-close svg { display: block; width: 22px; height: 22px; }
#name-search-form { flex-shrink: 0; margin: 0; }
#name-search-form .input-row { flex-wrap: nowrap; }
#name-search-form label { font-size: 16px; margin-bottom: 6px; }
#name-search-form input { min-height: 52px; padding: 10px 12px; font-size: 20px; }
#name-search-submit { min-height: 52px; flex: 0 0 112px; padding: 10px; font-size: 18px; }
#name-search-form p { font-size: 15px; margin: 6px 0 0; }
.name-results-panel { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; }
.name-results-panel h2 { font-size: 22px; margin: 0; flex-shrink: 0; }
#name-results-status { margin: 0; flex-shrink: 0; }
#name-results-status:empty { display: none; }
.name-search-dialog .name-result { flex-shrink: 0; min-height: 52px; padding: 8px 12px; font-size: 20px; }
.name-search-dialog input:focus-visible { outline-offset: -3px; }
input { min-width: 0; width: 100%; min-height: 68px; padding: 16px; font-size: 23px;
  font-family: Consolas, "Courier New", Courier, monospace; border-radius: 10px; border: 2px solid var(--cp-border-strong);
  background: var(--cp-bg-elevated); color: var(--cp-text); }
.scan-help { min-height: 56px; font-size: 16px !important; color: var(--cp-text-muted); }
.scan-assistance-slot { min-height: 32px; margin: 8px 0; }
.scan-assistance-slot .scan-help { min-height: 32px; margin: 0; }
#recover { width: 100%; min-height: 68px; padding: 12px; font-size: 18px; }
.scan-message { margin-top: 12px; color: var(--cp-warning); }
.scan-message[data-state="error"] { color: var(--cp-danger); }
.scan-message strong, .scan-message p { font-size: 17px; overflow-wrap: anywhere; }
#notice-title { display: block; line-height: 1.5; }
#notice-detail { line-height: 1.5; margin: 4px 0 0; }
.product-panel { display: flex; flex-direction: column; }
.product-body { flex: 1; display: flex; flex-direction: column; justify-content: safe center;
  min-height: 0; overflow-y: auto; }
.product-fields { min-height: 0; }
.product-heading { display: grid; grid-template-columns: minmax(0, 1fr) 180px; gap: 32px; align-items: center; margin: 8px 0 16px; }
.product-heading h2 { height: 2.3em; margin: 0 0 8px; }
.product-panel[data-unknown="true"] .product-heading h2 { height: auto; min-height: 2.3em; overflow: visible; }
.product-heading .description { height: 1.5em; line-height: 1.5; margin: 0; }
.product-badge-slot { height: 29px; flex-shrink: 0; }
.product-summary { display: grid; grid-template-columns: minmax(0,1fr) 110px 160px; gap: 12px; min-height: 29px; }
#result-mode { flex: 0 0 160px; height: 1.5em; line-height: 1.5; white-space: nowrap; }
#product-barcode { display: block; height: 1.5em; line-height: 1.5; white-space: nowrap; }
.barcode-label-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 25px; }
#product-source { max-width: 60%; padding: 2px 8px; border: 1px solid var(--cp-border);
  border-radius: 8px; color: var(--cp-accent); font-size: 13px; font-weight: 600;
  height: 25px; line-height: 19px; white-space: nowrap; }
#product-source:empty { visibility: hidden; }
.stock { border-radius: 16px; background: var(--cp-accent-soft); padding: 24px 12px; text-align: center; }
.stock strong { display: block; font-size: 68px; line-height: 1.1; color: var(--cp-accent); }
#stock { height: 1.1em; white-space: nowrap; }
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
.product-panel input:focus-visible, .product-panel select:focus-visible { outline-offset: -3px; }
.new-product-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; }
.new-product-fields label { font-size: 17px; color: var(--cp-text-muted); }
.new-product-fields input { display: block; margin-top: 6px; }
.new-product-fields input[type="checkbox"] { width: 28px; height: 28px; min-height: 28px; }
#new-product-help { font-size: 20px; margin: 0 0 16px; }
.product-panel[data-details="true"] .product-body { justify-content: flex-start; }
.product-panel[data-details="true"] .product-heading { flex-shrink: 0; }
.product-panel[data-details="true"] .product-fields { overflow-y: auto; padding-right: 8px; }
.product-footer { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--cp-border); font-size: 17px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; min-height: 84px; flex-shrink: 0; }
.product-footer > div:first-child { flex: 1; min-width: 0; }
#shopping { height: 1.5em; line-height: 1.5; }
.edit-actions-slot { width: 300px; max-width: 100%; height: 68px; flex-shrink: 0; }
.edit-actions { display: flex; gap: 12px; flex-shrink: 0; }
.edit-actions button { flex: 1; min-width: 0; height: 68px; padding: 12px; }
.product-panel[data-shopping-choice="true"] .product-footer { flex-direction: column; align-items: stretch; gap: 12px; }
.product-panel[data-shopping-choice="true"] .edit-actions-slot { width: 100%; height: auto; }
.product-panel[data-shopping-choice="true"] .edit-actions button { height: auto; overflow-wrap: anywhere; }
#edit-status { font-size: 15px; margin: 8px 0 0; color: var(--cp-text-muted); }
#edit-status { height: 3em; line-height: 1.5; }
#edit-status[data-state="error"] { color: var(--cp-danger); }
.product-panel[data-save-error="true"] #edit-status { height: auto; min-height: 3em; font-size: 20px; }
#new-name[aria-invalid="true"] { border-color: var(--cp-danger); }
[hidden] { display: none !important; }
@media (min-width: 1500px) and (min-height: 900px) {
  main { padding: 40px 64px; gap: 32px; }
  .panel { padding: 32px; }
  .scan-main { padding-block: 32px; gap: 24px; }
  .scan-main .panel { padding: 24px; }
  .scan-main dl { gap: 12px 24px; }
  .scan-main dl > div { padding-top: 8px; }
  .scan-main .product-heading { margin: 4px 0 12px; }
  .scan-main .product-footer { margin-top: 8px; }
}
@media (min-width: 1001px) and (max-width: 1400px) {
  .modes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 1000px) {
  main { padding: 24px; }
  .workspace { grid-template-columns: 1fr; }
  .workspace > .product-panel, .workspace > .news-panel { contain: none; overflow: visible; }
  .product-heading { grid-template-columns: minmax(0, 1fr) 140px; }
  .panel { padding: 24px; }
}
@media (max-width: 550px) {
  main { padding: 16px; } header { flex-wrap: wrap; }
  .brand { gap: 12px; } .brand-logo { width: 80px; height: 45px; }
  .modes, dl, .new-product-fields { grid-template-columns: 1fr; }
  .product-summary { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .product-summary > .eyebrow { grid-column: 1 / -1; }
  .product-heading { grid-template-columns: 1fr; }
  .scan-intro { gap: 12px; }
  .scanner-art svg { width: 56px; height: 56px; }
  .input-row, .product-footer, .edit-actions { flex-wrap: wrap; } button { font-size: 18px; }
  .product-panel[data-shopping-choice="true"] .edit-actions { flex-direction: column; }
}
`;

function vhTouchscreenLanguage(card) {
  const names = card._config?.language_names;
  if (names) {
    const selected = card._hass?.states?.["input_select.vh_language"]?.state;
    const code = names[selected];
    return code && card._config.translations[code] ? code : "en";
  }
  return card._config?.language || "nl";
}

function vhTouchscreenText(card, key) {
  const language = vhTouchscreenLanguage(card);
  return card._config.translations[language]?.[key] || card._config.translations.en[key] || key;
}

function vhTouchscreenSearchText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
}

function vhTouchscreenViewport(element, prefix) {
  const viewport = window.visualViewport;
  for (const [key, value] of Object.entries({
    width: viewport ? viewport.width : window.innerWidth,
    height: viewport ? viewport.height : window.innerHeight,
    left: viewport ? viewport.offsetLeft : 0,
    top: viewport ? viewport.offsetTop : 0,
  })) element.style.setProperty(`--vh-${prefix}-${key}`, `${value}px`);
}

function vhTouchscreenAttribute(card, element, attribute, key, suffix = "") {
  const field = { "aria-label": "i18nAriaLabel", "placeholder": "i18nPlaceholder", "title": "i18nTitle" }[attribute];
  element.dataset[field] = key;
  element.dataset[`${field}Suffix`] = suffix;
  element.setAttribute(attribute, `${card._t(key)}${suffix}`);
}

function vhTouchscreenTextSlot(element) {
  element.tabIndex = element.textContent && !element.hidden ? 0 : -1;
  element.title = element.textContent;
  return element;
}

function vhTouchscreenTableCell(value) {
  const cell = document.createElement("td");
  const text = document.createElement("span");
  text.className = "text-slot table-text";
  text.textContent = value;
  cell.append(vhTouchscreenTextSlot(text));
  return cell;
}

function vhTouchscreenTranslate(card) {
  if (!card._config) return;
  const language = vhTouchscreenLanguage(card);
  if (card._translatedLanguage === language) return;
  card._translatedLanguage = language;
  card.setAttribute?.("lang", language);
  for (const element of card.shadowRoot?.querySelectorAll?.("[data-i18n]") || []) {
    const text = `${element.dataset.i18nPrefix || ""}${card._t(element.dataset.i18n)}${element.dataset.i18nSuffix || ""}`;
    if (element.children?.length) {
      const node = [...element.childNodes].find((node) => node.nodeType === 3);
      if (node) node.nodeValue = text;
      else element.prepend(document.createTextNode(text));
    } else element.textContent = text;
  }
  for (const [attribute, key] of [["placeholder", "i18nPlaceholder"], ["aria-label", "i18nAriaLabel"], ["title", "i18nTitle"]]) {
    const selector = `[data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}]`;
    for (const element of card.shadowRoot?.querySelectorAll?.(selector) || []) {
      element.setAttribute(attribute, `${card._t(element.dataset[key])}${element.dataset[`${key}Suffix`] || ""}`);
    }
  }
}

async function vhTouchscreenScan(card, data) {
  const reply = await card._hass.callWS({
    type: "call_service", domain: "pyscript", service: "vh_inventory_touchscreen_scan",
    service_data: data, return_response: true,
  });
  const result = reply?.response;
  const outcomes = {
    Add: ["add", "notfound"], Use: ["use", "shopping", "already_counted", "notfound"],
    AlmostOut: ["almost_out", "already_almost_out"],
  };
  if (!result || !outcomes[data.action]?.includes(result.outcome) ||
      (result.outcome === "notfound" ? result.product_id !== null :
        !Number.isSafeInteger(result.product_id) || result.product_id < 1 ||
        !Number.isSafeInteger(result.quantity) || result.quantity < 0 ||
        ![0, 1].includes(result.almost_out) || typeof result.on_shopping !== "boolean")) {
    throw new Error("Invalid touchscreen scan response. Do not repeat the action.");
  }
  if (data.confirm_alternatives && result.outcome !== "notfound" &&
      (!Array.isArray(result.alternatives) || result.alternatives.some(row =>
        !row || !Number.isSafeInteger(row.product_id) || row.product_id < 1 ||
        row.product_id === result.product_id || typeof row.product !== "string" ||
        !row.product.trim() || row.product.length > 255 ||
        !Number.isSafeInteger(row.quantity) || row.quantity < 1) ||
        new Set(result.alternatives.map(row => row.product_id)).size !== result.alternatives.length ||
        result.alternatives.length && (result.on_shopping || !["use", "shopping"].includes(result.outcome)))) {
    throw new Error("Invalid alternative-stock response. Do not repeat the action.");
  }
  return result;
}

function vhTouchscreenOutcome(result) {
  return {
    almost_out: "Almost out recorded. Stock counted once.",
    already_almost_out: "Already marked almost out. Stock unchanged.",
    already_counted: "Already counted. Stock unchanged; Almost out cleared.",
  }[result.outcome];
}

class VhInventoryTouchscreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._mode = "Lookup";
    this._queue = [];
    this._busy = false;
    this._blocked = false;
    this._result = null;
    this._resultTimer = null;
    this._draft = null;
    this._saving = false;
    this._editNotice = "";
    this._nameQuery = "";
    this._nameMatches = [];
    this._nameVersion = 0;
    this._nameLoading = false;
    this._newsArticle = null;
    this._nameError = "";
    this._nameScroll = null;
    this._nameViewportChanged = () => this._positionNameSearch();
    this._beforeUnload = (event) => {
      if (this._dirty() || this._saving || this._hasPendingShoppingChoice()) {
        event.preventDefault(); event.returnValue = "";
      }
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
    this._nameVersion++;
    this._hideNameSearch(false);
    this._stopResultTimer();
  }

  getCardSize() { return 18; }

  _stopResultTimer() {
    if (this._resultTimer !== null) clearTimeout(this._resultTimer);
    this._resultTimer = null;
  }

  _closeResult() {
    if (this._hasPendingShoppingChoice()) return;
    this._stopResultTimer();
    this._hideNameSearch();
    this._clearNameSearch();
    this._result = null;
    this._resetDraft(false);
    const fields = this.shadowRoot.querySelector(".product-fields");
    if (fields) fields.scrollTop = 0;
    this._notice = { title: "Ready to scan", detail: "Scan a barcode to begin.", state: "ready" };
    this._render();
    this._focusInput();
  }

  _saveError() {
    return Boolean(this._draft && this._editNotice && this._editNotice !== "Product details saved.");
  }

  _scheduleResultDismissal() {
    this._stopResultTimer();
    if (!this._result || this._hasPendingNameAction() || this._hasPendingShoppingChoice() || this._dirty() || this._busy || this._saving ||
        this._blocked || this._saveError()) return;
    const result = this._result;
    const timer = setTimeout(() => {
      if (this._resultTimer !== timer) return;
      this._resultTimer = null;
      if (this._result !== result || this._hasPendingNameAction() || this._hasPendingShoppingChoice() || this._dirty() || this._busy || this._saving || this._blocked ||
          this._draft?.uncertain || this._saveError()) return;
      this._closeResult();
    }, 10000);
    this._resultTimer = timer;
  }

  _t(key) {
    return vhTouchscreenText(this, key);
  }

  _text(selector, value) {
    this.shadowRoot.querySelector(selector).textContent = value;
  }

  _available() {
    return Boolean(!this.preview && this._hass?.connected &&
      (this._mode === "Lookup" || this._hass.services?.pyscript?.vh_inventory_touchscreen_scan &&
        (this._mode !== "Use" || this._hass.services?.pyscript?.vh_inventory_touchscreen_shopping_decision)));
  }

  _nameSearchEnabled() {
    return !this._hasPendingShoppingChoice() && ["Lookup", "AlmostOut", "Use"].includes(this._mode);
  }

  _hasPendingShoppingChoice() {
    return Boolean(this._result?.mode === "Use" && this._result.product && this._result.alternatives?.length);
  }

  _canResolveShoppingChoice() {
    return Boolean(this._hasPendingShoppingChoice() && this.isConnected && this._available() &&
      !this._busy && !this._saving && !this._blocked && !this._queue.length);
  }

  async _resolveShoppingChoice(addToShopping) {
    if (!this._canResolveShoppingChoice()) return;
    const pending = this._result;
    const identity = { product_id: pending.product.id, barcode: pending.barcode, mode: "Use" };
    this._saving = true;
    this._render();
    let submitted = false;
    try {
      const fresh = this._readResult(await this._hass.callWS({ type: "get_states" }), identity);
      if (!fresh.product) throw new Error("Consumed product no longer exists.");
      if (JSON.stringify(this._stockSnapshot(fresh)) !== JSON.stringify(this._stockSnapshot(pending))) {
        this._result = { ...fresh, alternatives: pending.alternatives, summary: pending.summary };
        this._resetDraft();
        this._notice = { title: "Shopping decision not saved.",
          detail: "Stock changed. Review the updated quantity and choose again. Consumption was not repeated.", state: "warning" };
        return;
      }
      if (!this.isConnected || !this._available() || this._result !== pending) {
        throw new Error("Shopping decision service or connection changed.");
      }
      const expected = this._stockSnapshot(fresh);
      submitted = true;
      const reply = await this._hass.callWS({
        type: "call_service", domain: "pyscript", service: "vh_inventory_touchscreen_shopping_decision",
        return_response: true, service_data: { product_id: pending.product.id, add_to_shopping: addToShopping,
          expected_stock: expected.stock, expected_almost_out: expected.almostOut },
      });
      const response = reply?.response;
      const result = this._readResult(await this._hass.callWS({ type: "get_states" }), identity);
      if (!response || response.outcome !== (addToShopping ? "shopping_added" : "shopping_kept") ||
          response.product_id !== pending.product.id || typeof response.on_shopping !== "boolean" ||
          typeof response.shopping_added !== "boolean" ||
          addToShopping && !response.on_shopping || !addToShopping && response.shopping_added ||
          !result.product || result.stock !== response.quantity ||
          result.product.almost_out !== response.almost_out || Boolean(result.shopping) !== response.on_shopping ||
          JSON.stringify(this._stockSnapshot(result)) !== JSON.stringify(expected)) {
        throw new Error("Shopping decision could not be verified. Do not repeat consumption.");
      }
      this._result = { ...result, summary: addToShopping
        ? response.shopping_added
          ? "Product added to shopping list. Stock was not decreased again."
          : "Product is already on the shopping list. Stock was not decreased again."
        : response.on_shopping
          ? "Shopping list left unchanged. Stock was not decreased again."
          : "Product not added to shopping list. Stock was not decreased again." };
      this._resetDraft();
      this._notice = { title: "Scan processed", detail: this._result.summary, state: "ready" };
    } catch (error) {
      console.error("VH-Inventory touchscreen shopping decision failed", error);
      if (submitted) {
        this._blocked = true;
        this._result = null;
        this._resetDraft(false);
      }
      this._notice = { title: "Shopping decision not saved.", state: "error", detail: submitted
        ? "Shopping decision uncertain. Check stock and shopping list before continuing. Do not rescan or retry automatically."
        : "Could not verify the shopping decision. Consumption is already recorded. No further changes were requested." };
    } finally {
      this._saving = false;
      this._render();
      this._scheduleResultDismissal();
    }
  }

  _stockSnapshot(result) {
    return {
      stock: result.inventory.map(row => ({ id: row.id, quantity: row.quantity,
        location_id: row.location_id ?? null })).sort((a, b) => a.id - b.id),
      almostOut: result.product.almost_out ?? 0,
    };
  }

  _hasPendingNameAction() {
    return Boolean(this._result?.pendingAction && this._result.product &&
      ["AlmostOut", "Use"].includes(this._result.mode));
  }

  _canConfirmNameAction() {
    return Boolean(this._hasPendingNameAction() && this._result.mode === this._mode &&
      Number.isSafeInteger(this._result.product.id) && this._result.product.id > 0 &&
      this.isConnected && this._available() && !this._busy && !this._saving &&
      !this._blocked && !this._queue.length);
  }

  _confirmNameAction() {
    if (!this._canConfirmNameAction()) return;
    const result = this._result;
    const expected = result.pendingAction;
    result.pendingAction = null;
    this._queue.push({ product_id: result.product.id, barcode: result.barcode, mode: result.mode,
      expected_stock: expected.stock, expected_almost_out: expected.almostOut });
    return this._drain();
  }

  _clearNameSearch() {
    this._nameVersion++;
    this._nameQuery = "";
    this._nameMatches = [];
    this._nameLoading = false;
    this._nameError = "";
  }

  _openNameSearch(seed) {
    if (!this._nameSearchEnabled() || !this._available() || this._blocked || this._busy ||
        this._saving || this._dirty() || this._queue.length) return;
    const dialog = this.shadowRoot.querySelector("#name-search-dialog");
    if (!dialog.open) {
      this._stopResultTimer();
      const pages = this.getRootNode().querySelector?.(".pages");
      this._nameScroll = { x: window.scrollX, y: window.scrollY, pages, top: pages?.scrollTop };
      dialog.showModal();
      window.addEventListener("resize", this._nameViewportChanged);
      window.visualViewport?.addEventListener("resize", this._nameViewportChanged);
      window.visualViewport?.addEventListener("scroll", this._nameViewportChanged);
      this._positionNameSearch();
    }
    const input = this.shadowRoot.querySelector("#name-search-input");
    input.value = seed === undefined ? this._nameQuery : seed;
    input.focus({ preventScroll: true });
    this._searchProducts(input.value, false);
  }

  _positionNameSearch() {
    const dialog = this.shadowRoot.querySelector("#name-search-dialog");
    if (!dialog?.open) return;
    vhTouchscreenViewport(dialog, "search");
  }

  _hideNameSearch(restoreFocus = true) {
    window.removeEventListener("resize", this._nameViewportChanged);
    window.visualViewport?.removeEventListener("resize", this._nameViewportChanged);
    window.visualViewport?.removeEventListener("scroll", this._nameViewportChanged);
    const dialog = this.shadowRoot.querySelector("#name-search-dialog");
    if (!dialog?.open) return;
    this.shadowRoot.querySelector("#name-search-input").blur();
    dialog.close();
    const saved = this._nameScroll;
    this._nameScroll = null;
    if (restoreFocus) {
      this._focusInput();
      requestAnimationFrame(() => {
        if (saved) {
          window.scrollTo({ left: saved.x, top: saved.y, behavior: "instant" });
          if (saved.pages?.isConnected) saved.pages.scrollTop = saved.top;
        }
      });
    }
  }

  async _searchProducts(value, selectUnique = !this.shadowRoot.querySelector("#name-search-dialog")?.open) {
    if (!this._nameSearchEnabled() || !this._available() || this._blocked || this._busy ||
        this._saving || this._dirty() || this._queue.length) return;
    this._stopResultTimer();
    this._nameVersion++;
    this._nameQuery = String(value);
    this._nameMatches = [];
    this._nameLoading = false;
    this._nameError = "";
    this._result = null;
    this._resetDraft(false);
    this._notice = { title: "Ready to scan", detail: "Scan a barcode to begin.", state: "ready" };
    if ([...this._nameQuery.trim()].length >= 4) {
      try {
        const state = this._hass.states?.["sensor.vh_inventory_products"];
        if (!state || ["unknown", "unavailable"].includes(state.state) ||
            !Array.isArray(state.attributes?.products) || state.attributes.products.some(row =>
              !Number.isSafeInteger(row.id) || row.id < 1 || typeof row.name !== "string" || !row.name.trim())) {
          throw new Error("Product catalogue unavailable. Reconnect or refresh before searching.");
        }
        const query = vhTouchscreenSearchText(this._nameQuery);
        this._nameMatches = state.attributes.products.filter(row =>
          vhTouchscreenSearchText(row.name).includes(query)).sort((a, b) =>
          a.name.localeCompare(b.name) || a.id - b.id);
      } catch (error) {
        console.error("VH-Inventory product search failed", error);
        this._nameError = error.message;
      }
    }
    this._render();
    if (selectUnique && this._nameMatches.length === 1) await this._selectNameProduct(this._nameMatches[0].id);
  }

  async _selectNameProduct(id) {
    if (!this._nameSearchEnabled() || !this._available() || this._blocked || this._busy ||
        this._saving || this._dirty() || this._nameLoading || this._queue.length ||
        !this._nameMatches.some(row => row.id === id)) return;
    const version = this._nameVersion;
    const mode = this._mode;
    this._nameLoading = true;
    this._nameError = "";
    this._render();
    try {
      const states = await this._hass.callWS({ type: "get_states" });
      if (version !== this._nameVersion || !this.isConnected || this._mode !== mode) return;
      const result = this._readResult(states, { product_id: id, barcode: "", mode: "Lookup" });
      if (!result.product) throw new Error("Product no longer exists. Search again.");
      this._result = { ...result, mode,
        ...(mode !== "Lookup" ? { pendingAction: this._stockSnapshot(result) } : {}) };
      this._resetDraft();
      this._hideNameSearch();
    } catch (error) {
      if (version !== this._nameVersion) return;
      console.error("VH-Inventory product selection failed", error);
      this._nameError = error.message;
    } finally {
      if (version === this._nameVersion) {
        this._nameLoading = false;
        this._render();
      }
    }
  }

  _renderNameSearch() {
    const enabled = this._nameSearchEnabled();
    const disabled = !enabled || !this._available() || this._blocked ||
      this._busy || this._saving || this._dirty() || Boolean(this._queue.length);
    const input = this.shadowRoot.querySelector("#product-search");
    this.shadowRoot.querySelector("#product-search-section").hidden = !["Lookup", "AlmostOut", "Use"].includes(this._mode);
    input.disabled = disabled;
    if (input.value !== this._nameQuery) input.value = this._nameQuery;
    const popupInput = this.shadowRoot.querySelector("#name-search-input");
    popupInput.disabled = disabled;
    if (popupInput.value !== this._nameQuery) popupInput.value = this._nameQuery;
    this.shadowRoot.querySelector("#name-search-submit").disabled = disabled || this._nameLoading;
    const panel = this.shadowRoot.querySelector("#name-results-panel");
    panel.hidden = !enabled || [...this._nameQuery.trim()].length < 4 || Boolean(this._result);
    if (panel.hidden) return;
    this._text("#name-results-status", this._t(this._nameError || (this._nameLoading
      ? "Loading product details." : this._nameMatches.length ? "" : "No matching products.")));
    const list = this.shadowRoot.querySelector("#name-results");
    const signature = JSON.stringify(this._nameMatches.map(row => [row.id, row.name, row.barcode]));
    if (list.dataset.signature !== signature) {
      const buttons = this._nameMatches.map(row => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "name-result";
        button.textContent = row.name;
        if (row.barcode != null) {
          const barcode = document.createElement("span");
          barcode.textContent = String(row.barcode);
          button.append(barcode);
        }
        button.addEventListener("click", () => this._selectNameProduct(row.id));
        return button;
      });
      list.replaceChildren(...buttons);
      list.dataset.signature = signature;
    }
    for (const button of list.querySelectorAll("button")) button.disabled = disabled || this._nameLoading;
  }

  _renderNews() {
    const panel = this.shadowRoot.querySelector("#news-panel");
    if (!panel) return;
    panel.hidden = this._config.news?.enabled !== true || Boolean(
      this._result || this._busy || this._saving || this._blocked || this._nameLoading || this._saveError());
    if (panel.hidden) return;
    const list = this.shadowRoot.querySelector("#news-list");
    const preview = this.shadowRoot.querySelector("#news-preview");
    const updated = this.shadowRoot.querySelector("#news-updated");
    const status = this.shadowRoot.querySelector("#news-status");
    const showStatus = (message, warning = false) => {
      status.textContent = message;
      status.hidden = !message;
      status.dataset.state = warning ? "warning" : "ready";
    };
    const unavailable = () => {
      list.replaceChildren();
      delete list.dataset.signature;
      preview.hidden = true;
      updated.hidden = true;
      showStatus(this._t("News temporarily unavailable."), true);
      this._renderNewsArticle();
    };
    const sensor = this._hass?.states?.["sensor.vh_touchscreen_news"];
    if (!sensor || ["unknown", "unavailable"].includes(sensor.state)) {
      unavailable();
      return;
    }
    try {
      const sources = ["NOS", "NU.nl", "Omroep Brabant"];
      const timestamp = value => typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
        Number.isFinite(Date.parse(value));
      const data = sensor.attributes;
      if (!["ready", "stale"].includes(sensor.state) || !timestamp(data?.updated_at) ||
          (data.sample != null && typeof data.sample !== "boolean") ||
          (data.failed_sources != null && (!Array.isArray(data.failed_sources) ||
            data.failed_sources.length > sources.length || data.failed_sources.some(source => !sources.includes(source)))) ||
          !Array.isArray(data.headlines) || !data.headlines.length || data.headlines.length > 50 ||
          data.headlines.some(row => !row || !sources.includes(row.source) ||
            typeof row.title !== "string" || !row.title.trim() || row.title.length > 300 ||
            (row.summary != null && (typeof row.summary !== "string" || row.summary.length > 600)) ||
            !timestamp(row.published_at))) {
        throw new Error("Invalid touchscreen news data.");
      }
      const newestFirst = (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at);
      const headlines = sources.flatMap(source => data.headlines.filter(row => row.source === source)
        .sort(newestFirst).slice(0, 2)).sort(newestFirst);
      const language = vhTouchscreenLanguage(this);
      const time = new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit", hour12: false });
      const signature = JSON.stringify({ headlines, language, sample: data.sample === true });
      if (list.dataset.signature !== signature) {
        const rows = headlines.map(row => {
          const item = document.createElement("li");
          const meta = document.createElement("div");
          meta.className = "news-meta";
          const source = document.createElement("span");
          source.className = "news-source";
          source.textContent = row.source;
          const published = document.createElement("time");
          published.dateTime = row.published_at;
          published.textContent = time.format(new Date(row.published_at));
          const title = document.createElement("h3");
          const headline = document.createElement("button");
          headline.type = "button";
          headline.className = "news-headline";
          headline.dataset.newsKey = JSON.stringify([row.source, row.title, row.published_at]);
          headline.textContent = row.title.trim();
          headline.addEventListener("click", () => {
            this._newsListScroll = list.scrollTop;
            this._newsArticle = { ...row, sample: data.sample === true, key: headline.dataset.newsKey };
            this._renderNewsArticle();
            const article = this.shadowRoot.querySelector("#news-article");
            article.scrollTop = 0;
            article.focus({ preventScroll: true });
          });
          title.append(headline);
          meta.append(source, published);
          item.append(meta, title);
          return item;
        });
        list.replaceChildren(...rows);
        list.dataset.signature = signature;
      }
      const updatedTime = new Intl.DateTimeFormat(language, {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(new Date(data.updated_at));
      updated.textContent = `${this._t("Last updated")}: ${updatedTime}`;
      updated.hidden = false;
      preview.hidden = data.sample !== true;
      const missing = sources.filter(source => data.failed_sources?.includes(source) ||
        !headlines.some(row => row.source === source));
      const stale = sensor.state === "stale" || !this._hass.connected ||
        Date.now() - Date.parse(data.updated_at) > 30 * 60000;
      showStatus([
        data.sample === true ? this._t("Fictitious headlines for this local preview. Live news is not connected.") : "",
        stale ? this._t("News could not be refreshed. Showing previously received headlines.") : "",
        missing.length ? `${this._t("News temporarily unavailable for")}: ${missing.join(", ")}.` : "",
      ].filter(Boolean).join(" "), stale || Boolean(missing.length));
      delete panel.dataset.error;
      this._renderNewsArticle();
    } catch (error) {
      if (panel.dataset.error !== error.message) console.error("VH-Inventory news data unavailable", error);
      panel.dataset.error = error.message;
      unavailable();
    }
  }

  _renderNewsArticle() {
    const article = this.shadowRoot.querySelector("#news-article");
    if (!article) return;
    const selected = this._newsArticle;
    this.shadowRoot.querySelector("#news-list").hidden = Boolean(selected);
    article.hidden = !selected;
    this.shadowRoot.querySelector("#news-article-actions").hidden = !selected;
    if (!selected) return;
    this._text("#news-article-title", selected.title);
    this._text("#news-article-source", selected.source);
    const published = this.shadowRoot.querySelector("#news-article-time");
    published.dateTime = selected.published_at;
    published.textContent = new Intl.DateTimeFormat(vhTouchscreenLanguage(this), {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(selected.published_at));
    this._text("#news-article-summary", selected.summary?.trim() ||
      this._t("No preview is available for this story."));
    if (selected.sample) this.shadowRoot.querySelector("#news-preview").hidden = false;
  }

  _closeNewsArticle() {
    const key = this._newsArticle?.key;
    this._newsArticle = null;
    this._renderNews();
    const list = this.shadowRoot.querySelector("#news-list");
    list.scrollTop = this._newsListScroll || 0;
    const buttons = [...this.shadowRoot.querySelectorAll(".news-headline")];
    (buttons.find(button => button.dataset.newsKey === key) || buttons[0] ||
      this.shadowRoot.querySelector("#news-title")).focus({ preventScroll: true });
  }

  _renderShell() {
    const theme = VH_TOUCHSCREEN_THEME.replace(":root", ":host")
      .replace('html[data-theme="dark"]', ':host([data-theme="dark"])');
    this.setAttribute("data-theme", this._config.theme === "light" ? "light" : "dark");
    this.shadowRoot.innerHTML = `<style>${theme}${VH_TOUCHSCREEN_STYLE}</style>
      <main class="scan-main">
        <header><div class="brand"><img class="brand-logo" id="brand-logo" alt="Van Hemert Home Automation"
            width="128" height="72">
          <div><div class="eyebrow">VH-INVENTORY</div><h1 data-i18n="Scan products"></h1></div></div>
          <div class="connection-slot"><div class="pill" id="connection" hidden><span class="dot"></span><span id="connection-text" class="text-slot"></span></div></div></header>
        <div class="workspace">
          <div class="scan-controls">
          <section class="panel mode-bar" aria-labelledby="mode-title">
          <div class="scan-intro"><div class="scanner-art" aria-hidden="true">
            <svg id="mdi-tune-variant" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 13C6.14 13 4.59 14.28 4.14 16H2V18H4.14C4.59 19.72 6.14 21 8 21S11.41 19.72 11.86 18H22V16H11.86C11.41 14.28 9.86 13 8 13M8 19C6.9 19 6 18.1 6 17C6 15.9 6.9 15 8 15S10 15.9 10 17C10 18.1 9.1 19 8 19M19.86 6C19.41 4.28 17.86 3 16 3S12.59 4.28 12.14 6H2V8H12.14C12.59 9.72 14.14 11 16 11S19.41 9.72 19.86 8H22V6H19.86M16 9C14.9 9 14 8.1 14 7C14 5.9 14.9 5 16 5S18 5.9 18 7C18 8.1 17.1 9 16 9Z"/></svg></div>
            <div><h2 id="mode-title" data-i18n="Scan mode"></h2><p class="muted text-slot" id="mode-help"></p></div></div>
          <div class="modes" role="group" aria-labelledby="mode-title">
            <button id="lookup" type="button" data-i18n="Lookup"></button>
            <button id="add" type="button" data-i18n="Add"></button>
            <button id="almost-out" type="button" data-i18n="Almost out"></button>
            <button id="use" type="button" data-i18n="Consumed"></button>
          </div>
          </section>
          <section class="panel scan-panel">
            <div class="scan-intro"><div class="scanner-art" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <path d="M25 8H8v17M75 8h17v17M8 75v17h17M75 92h17V75" stroke-width="4"/>
              <path d="M23 28v44m8-44v44m12-44v44m6-44v44m10-44v44m12-44v44m7-44v44" stroke-width="4"/>
              <path d="M3 50h94" stroke-width="2"/></svg></div>
            <div><h2 data-i18n="Scan your product"></h2><p class="muted" data-i18n="Point the scanner at the barcode."></p></div></div>
            <form id="scan-form"><label for="barcode" data-i18n="Barcode"></label>
              <div class="input-row"><input id="barcode" type="text" inputmode="none" autocomplete="off"
                spellcheck="false" maxlength="64" enterkeyhint="go"></div>
              <div class="scan-assistance-slot"><p class="scan-help text-slot" id="scan-help"></p>
                <button id="recover" type="button" hidden data-i18n="Stock checked, continue"></button></div>
            </form>
            <div class="scan-message" id="notice" role="status" aria-live="polite" aria-atomic="true" hidden>
              <strong id="notice-title" class="text-slot"></strong><p id="notice-detail" class="text-slot"></p></div>
          </section>
          <section class="panel product-search-section" id="product-search-section">
            <div class="scan-intro"><div class="scanner-art" aria-hidden="true">
              <svg id="mdi-keyboard-outline" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4,5A2,2 0 0,0 2,7V17A2,2 0 0,0 4,19H20A2,2 0 0,0 22,17V7A2,2 0 0,0 20,5H4M4,7H20V17H4V7M5,8V10H7V8H5M8,8V10H10V8H8M11,8V10H13V8H11M14,8V10H16V8H14M17,8V10H19V8H17M5,11V13H7V11H5M8,11V13H10V11H8M11,11V13H13V11H11M14,11V13H16V11H14M17,11V13H19V11H17M8,14V16H16V14H8Z"/></svg></div>
              <div><h2 data-i18n="Find the product"></h2>
                <p class="muted" data-i18n="Use the keyboard to search."></p></div></div>
            <form id="product-form"><label for="product-search" data-i18n="Product"></label>
              <div class="input-row"><input id="product-search" type="search" readonly inputmode="none"
                autocomplete="off" aria-describedby="product-search-help" aria-haspopup="dialog" aria-controls="name-search-dialog"></div>
              <p class="scan-help" id="product-search-help" data-i18n="Type at least 4 letters"></p>
            </form>
          </section>
          </div>
          <section class="panel product-panel" aria-labelledby="product-label" hidden>
            <div class="row product-summary"><div class="eyebrow" id="product-label" data-i18n="Last scanned product"></div>
              <div class="product-badge-slot"><span class="almost-out-badge" id="product-almost-out" data-i18n="Almost out" hidden></span></div>
              <span class="muted text-slot" id="result-mode"></span></div>
            <div class="product-body">
              <div class="product-heading" id="product-heading"><div><h2 id="product-name" class="text-slot"></h2>
                <p class="description text-slot" id="description"></p></div>
                <div class="stock"><strong id="stock" class="text-slot">-</strong><span data-i18n="Current stock"></span></div></div>
              <div class="product-fields">
              <section id="stock-alternatives" aria-labelledby="stock-alternatives-title" hidden>
                <h3 id="stock-alternatives-title" tabindex="-1" data-i18n="Equivalent products in stock"></h3>
                <p data-i18n="Stock has already been processed. Neither button decreases it again."></p>
                <ul class="stock-alternatives" id="stock-alternatives-list"></ul>
              </section>
              <div id="stock-details-fields">
              <div id="new-product-fields" hidden>
                <p id="new-product-help"></p>
                <div class="new-product-fields">
                  <label><span data-i18n="Product"></span><input id="new-name" type="text" maxlength="255" autocomplete="off" aria-describedby="edit-status"></label>
                  <label><span data-i18n="VH Product Description"></span><input id="new-description" type="text" maxlength="255" autocomplete="off"></label>
                </div>
              </div>
              <dl><div><dt class="barcode-label-row"><span data-i18n="Barcode"></span>
                  <span id="product-source" class="text-slot" role="status" aria-live="polite"></span></dt>
                <dd class="barcode text-slot" id="product-barcode"></dd></div>
                <div><dt><label for="manufacturer" data-i18n="Manufacturer"></label></dt>
                  <dd><input id="manufacturer" type="text" maxlength="255" autocomplete="off"></dd></div>
                <div><dt><label for="category" data-i18n="Category"></label></dt><dd><select id="category"></select></dd></div>
                <div><dt><label for="store" data-i18n="Store"></label></dt><dd><select id="store"></select></dd></div>
                <div><dt><label for="unit" data-i18n="Unit"></label></dt>
                  <dd><input id="unit" type="text" maxlength="255" autocomplete="off"></dd></div>
                <div><dt><label for="locations" data-i18n="Location"></label></dt><dd><select id="locations"></select></dd></div></dl>
              <div id="new-auto-fields" class="new-product-fields" hidden>
                <label><span data-i18n="AutoAdd"></span><input id="new-auto-add-enabled" type="checkbox"></label>
                <label><span data-i18n="Auto-Add threshold"></span><input id="new-auto-add-threshold" type="number" min="0" max="999" step="1"></label>
                <label><span data-i18n="Auto-Add quantity"></span><input id="new-auto-add-quantity" type="number" min="1" max="999" step="1"></label>
              </div>
              </div>
              </div>
            </div>
            <div class="product-footer"><div><div id="shopping" class="text-slot"></div>
              <p id="edit-status" class="text-slot" role="status" aria-live="polite"></p></div>
              <div class="edit-actions-slot"><div class="edit-actions" id="edit-actions" hidden>
                <button id="discard" type="button" data-i18n="Cancel editing"></button>
                <button class="primary" id="save" type="button" data-i18n="Save"></button>
              </div></div></div>
          </section>
          <section class="panel news-panel" id="news-panel" aria-labelledby="news-title" hidden>
            <div class="news-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.5" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/>
              <path d="M8 7h8M8 11h3v3H8zM14 11h2M14 14h2M8 17h8"/></svg>
              <div><h2 id="news-title" tabindex="-1" data-i18n="Dutch news"></h2>
                <span class="news-preview" id="news-preview" data-i18n="Sample news" hidden></span></div></div>
            <div class="news-content">
              <ul class="news-list" id="news-list"></ul>
              <article class="news-article" id="news-article" tabindex="-1" aria-labelledby="news-article-title" hidden>
                <div class="news-meta"><span class="news-source" id="news-article-source"></span>
                  <time id="news-article-time"></time></div>
                <div class="muted" data-i18n="RSS preview"></div>
                <h3 id="news-article-title"></h3><p id="news-article-summary"></p>
              </article>
            </div>
            <div class="news-article-actions" id="news-article-actions" hidden>
              <button id="news-back" type="button" data-i18n="Back to headlines"></button>
            </div>
            <div class="news-footer"><p class="muted" id="news-updated" hidden></p>
              <p class="muted" id="news-status" role="status" aria-live="polite"></p></div>
          </section>
        </div>
      </main>
      <dialog class="name-search-dialog" id="name-search-dialog" aria-labelledby="name-search-title">
        <div class="name-search-header"><h2 id="name-search-title" data-i18n="Find the product"></h2>
          <button id="name-search-close" type="button"><svg viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg></button></div>
        <form id="name-search-form"><label for="name-search-input" data-i18n="Product"></label>
          <div class="input-row"><input id="name-search-input" type="search" inputmode="text" maxlength="255"
            autocomplete="off" spellcheck="false" enterkeyhint="search" aria-describedby="name-search-help">
            <button class="primary" id="name-search-submit" type="submit" data-i18n="Lookup"></button></div>
          <p class="muted" id="name-search-help" data-i18n="Type at least 4 letters"></p></form>
        <section class="name-results-panel" id="name-results-panel" aria-labelledby="name-results-title" hidden>
          <h2 id="name-results-title" data-i18n="Matching products"></h2>
          <p id="name-results-status" role="status" aria-live="polite"></p>
          <div class="name-results" id="name-results" tabindex="-1"></div>
        </section>
      </dialog>`;
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
    this.shadowRoot.querySelector("#product-search").addEventListener("click", () => this._openNameSearch());
    this.shadowRoot.querySelector("#news-back").addEventListener("click", () => this._closeNewsArticle());
    this.shadowRoot.querySelector("#product-search").addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key.length === 1 &&
          !event.ctrlKey && !event.altKey && !event.metaKey && !event.isComposing) {
        event.preventDefault();
        this._openNameSearch(event.key === "Enter" ? undefined : event.key);
      }
    });
    this.shadowRoot.querySelector("#product-form").addEventListener("submit", event => {
      event.preventDefault();
      this._openNameSearch();
    });
    this.shadowRoot.querySelector("#name-search-input").addEventListener("input", event =>
      this._searchProducts(event.target.value, false));
    this.shadowRoot.querySelector("#name-search-form").addEventListener("submit", async event => {
      event.preventDefault();
      const pending = this._searchProducts(this.shadowRoot.querySelector("#name-search-input").value, true);
      const version = this._nameVersion;
      await pending;
      if (version === this._nameVersion && this.shadowRoot.querySelector("#name-search-dialog").open &&
          this._nameMatches.length > 1) this.shadowRoot.querySelector("#name-results").focus({ preventScroll: true });
    });
    const close = this.shadowRoot.querySelector("#name-search-close");
    vhTouchscreenAttribute(this, close, "aria-label", "Close search");
    vhTouchscreenAttribute(this, close, "title", "Close search");
    close.addEventListener("click", () => this._closeResult());
    this.shadowRoot.querySelector("#name-search-dialog").addEventListener("cancel", event => {
      event.preventDefault();
      this._closeResult();
    });
    this.shadowRoot.querySelector("#name-search-dialog").addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      this._closeResult();
    });
    for (const [id, mode] of [["lookup", "Lookup"], ["add", "Add"], ["almost-out", "AlmostOut"], ["use", "Use"]]) {
      this.shadowRoot.querySelector(`#${id}`).addEventListener("click", () => {
        if (this._dirty() || this._saving || this._hasPendingShoppingChoice()) return;
        this._mode = mode;
        this._closeResult();
      });
    }
    for (const [id, field] of [["manufacturer", "manufacturer"], ["unit", "unit"],
      ["category", "category_id"], ["store", "store_id"], ["locations", "location_id"],
      ["new-name", "name"], ["new-description", "description"],
      ["new-auto-add-enabled", "auto_add_enabled"], ["new-auto-add-threshold", "auto_add_threshold"],
      ["new-auto-add-quantity", "auto_add_quantity"]]) {
      const element = this.shadowRoot.querySelector(`#${id}`);
      element.addEventListener(element.tagName === "SELECT" || element.type === "checkbox" ? "change" : "input",
        () => this._editField(field, element.type === "checkbox" ? (element.checked ? "1" : "0") : element.value));
    }
    this.shadowRoot.querySelector("#save").addEventListener("click", () =>
      this._hasPendingShoppingChoice() ? this._resolveShoppingChoice(true)
        : this._hasPendingNameAction() ? this._confirmNameAction() : this._saveDetails());
    this.shadowRoot.querySelector("#discard").addEventListener("click", () => {
      if (this._saving) return;
      if (this._hasPendingShoppingChoice()) return this._resolveShoppingChoice(false);
      this._closeResult();
    });
    this.shadowRoot.querySelector("#recover").addEventListener("click", () => {
      this._blocked = false;
      this._notice = { title: "Ready to scan", detail: "Scan a barcode to begin.", state: "ready" };
      this._render();
      this._focusInput();
    });
  }

  _modeText(mode) {
    return this._t(mode === "AlmostOut" ? "Almost out" : mode === "Use" ? "Consumed" : mode);
  }

  _render() {
    if (!this._config || !this.shadowRoot.querySelector("main")) return;
    vhTouchscreenTranslate(this);
    this._updateReady();
    for (const [id, mode] of [["lookup", "Lookup"], ["add", "Add"], ["almost-out", "AlmostOut"], ["use", "Use"]]) {
      this.shadowRoot.querySelector(`#${id}`).setAttribute("aria-pressed", String(this._mode === mode));
    }
    const help = this._mode === "Lookup" ? "View product details without changing stock or the shopping list."
      : this._mode === "Add" ? "Each scan adds one item."
        : this._mode === "AlmostOut" ? "Count this package now; confirm it later with Use. Restocking keeps the marker."
          : "Each scan uses one item.";
    this._text("#mode-help", this._t(help));
    this._text("#scan-help", this._t("Scanner: keyboard mode with Enter suffix. You can also type a barcode."));
    this.shadowRoot.querySelector("#scan-help").hidden = this._blocked;
    const registrationError = this._saveError();
    this._text("#notice-title", this._t(registrationError ? "Product not saved." : this._notice.title));
    this._text("#notice-detail", registrationError ? this._t(this._editNotice) : this._notice.scan
      ? `${this._notice.scan.barcode} | ${this._modeText(this._notice.scan.mode)}`
      : this._notice.discarded !== undefined
        ? `${this._t("Check inventory in the main dashboard before scanning again. Do not automatically retry.")} ${this._t("Unsent scans discarded")}: ${this._notice.discarded}.`
        : this._notice.rawDetail || this._t(this._notice.detail));
    this.shadowRoot.querySelector("#notice").dataset.state = registrationError ? "error" : this._notice.state;
    this.shadowRoot.querySelector("#notice").hidden = !registrationError &&
      !["error", "warning"].includes(this._notice.state);
    this.shadowRoot.querySelector("#recover").hidden = !this._blocked;
    const result = this._result;
    const product = result?.product;
    const missingTitle = registrationError ? "Product not saved."
      : ["Use", "AlmostOut"].includes(result?.mode) ? "Product not found in stock"
      : result?.lookupFailed ? "Online lookup failed"
      : result?.suggestion ? result.mode === "Add" ? "New product found online" : "Online product found"
      : "Product not found";
    this._text("#product-name", product?.name || this._t(result ? missingTitle : "Waiting for the next product"));
    const description = result?.summary || (this._draft?.create ? "Not saved."
      : this._notice.title === "Product details saved." ? "Product details saved." : result?.mode === "Lookup"
      ? (product ? "Lookup only. Stock and shopping list are unchanged." : "Barcode not in the product catalogue. Nothing was changed.")
      : this._hasPendingNameAction() ? "Nothing has changed. Confirm the action or cancel."
      : result ? "Review the scan queue in the main dashboard." : "Product details and stock after scanning.");
    this._text("#description", result?.summary ? this._t(description) : product?.description || this._t(description));
    this._text("#stock", result?.stock ?? "-");
    this._text("#result-mode", result ? this._modeText(result.mode) : "");
    this.shadowRoot.querySelector("#product-almost-out").hidden = product?.almost_out !== 1;
    this._text("#product-barcode", result?.barcode || "-");
    this._text("#product-source", product ? this._t("From Database")
      : this._draft?.create && result?.suggestion ? this._t("Online") : "");
    this._renderDetails();
    this._renderNameSearch();
    this._renderNews();
    this._text("#shopping", result
      ? `${this._t("Shopping list quantity")}: ${result.shopping ?? "-"}`
      : this._t("No product scanned yet."));
    for (const id of ["connection-text", "mode-help", "scan-help", "notice-title", "notice-detail",
      "product-name", "description", "stock", "result-mode", "product-barcode", "product-source", "shopping", "edit-status"]) {
      vhTouchscreenTextSlot(this.shadowRoot.querySelector(`#${id}`));
    }
  }

  _updateReady() {
    if (!this._config || !this.shadowRoot.querySelector("#connection")) return;
    const available = this._available();
    const focused = this.shadowRoot.activeElement?.id === "barcode";
    const paused = this._dirty() || this._saving || this._hasPendingShoppingChoice();
    const registrationError = this._saveError();
    const state = !available || this._blocked || registrationError ? "error" : this._busy || this._saving ? "busy" : paused ? "warning" : focused ? "ready" : "warning";
    const label = !available ? "Home Assistant unavailable" : this._blocked ? "Check stock before continuing"
      : this._saving ? "Saving product details" : registrationError ? "Product not saved."
      : this._hasPendingShoppingChoice() ? "Choose a shopping-list action." : paused ? "Save or discard your edits"
      : this._busy ? "Processing scan" : focused ? "Ready to scan" : "Tap the barcode field";
    const indicator = this.shadowRoot.querySelector("#connection");
    indicator.dataset.state = state;
    indicator.hidden = Boolean(available && !this._blocked && !this._busy && !paused);
    this._text("#connection-text", this._t(label));
  }

  _focusInput() {
    if (this.shadowRoot.querySelector("#name-search-dialog")?.open) return;
    const requestedFrom = this.shadowRoot.activeElement;
    requestAnimationFrame(() => {
      const active = this.shadowRoot.activeElement;
      if (active !== requestedFrom && active?.id !== "barcode" &&
          (active?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(active?.tagName))) return;
      if (this.isConnected && this.getClientRects().length && !this._blocked && !this._dirty() &&
          !this._saving && !this._hasPendingShoppingChoice()) {
        this.shadowRoot.querySelector("#barcode")?.focus({ preventScroll: true });
      }
    });
  }

  _onKeyboard(event) {
    if (this.preview || !this.isConnected || !this.getClientRects().length || this._blocked || this._dirty() ||
        this._saving || this._hasPendingShoppingChoice() ||
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
    if (this._hasPendingShoppingChoice()) {
      this._notice = { title: "Choose a shopping-list action.",
        detail: "Finish the shopping-list decision before scanning or changing pages.", state: "warning" };
      this._render();
      return;
    }
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
      this._stopResultTimer();
      this._hideNameSearch();
      this._clearNameSearch();
      this._result = null;
      this._resetDraft(false);
      this._notice = { title: "Processing scan", scan, state: "busy" };
      this._render();
      let submitted = false;
      try {
        let outcome;
        const checked = this._readResult(await this._hass.callWS({ type: "get_states" }),
          { ...scan, mode: "Lookup" });
        if (!this.isConnected) break;
        if (scan.product_id != null && (!this._hass.connected || this.preview ||
            !this._hass.services?.pyscript?.vh_inventory_touchscreen_scan || !checked.product ||
            JSON.stringify(this._stockSnapshot(checked)) !== JSON.stringify({
              stock: scan.expected_stock, almostOut: scan.expected_almost_out,
            }))) {
          throw new Error("Stock state or service changed before the touchscreen action.");
        }
        if (!checked.product) {
          this._result = { ...checked, mode: scan.mode };
          if (["Lookup", "Add"].includes(scan.mode)) {
            await this._previewUnknownProduct(scan);
            if (this._queue.length) {
              this._notice.rawDetail = `${this._t(this._notice.detail)} ${this._t("Unsent scans discarded")}: ${this._queue.length}.`;
              this._queue = [];
            }
            break;
          } else {
            this._resetDraft();
            this._notice = { title: "Product not found in stock",
              detail: scan.mode === "AlmostOut" ? "Register this product before marking it Almost out."
                : "Barcode not in the product catalogue. Nothing was changed.", state: "warning" };
            this._render();
            continue;
          }
        }
        if (scan.mode !== "Lookup") {
          submitted = true;
          outcome = await vhTouchscreenScan(this, {
            ...(scan.product_id != null ? { product_id: scan.product_id,
              expected_stock: scan.expected_stock, expected_almost_out: scan.expected_almost_out }
              : { barcode: scan.barcode }),
            action: scan.mode,
            ...(scan.mode === "Use" ? { confirm_alternatives: true } : {}),
          });
        }
        this._result = scan.mode === "Lookup" ? checked
          : this._readResult(await this._hass.callWS({ type: "get_states" }), scan);
        if (outcome && (outcome.outcome === "notfound" ? Boolean(this._result.product) :
            (this._result.product?.id !== outcome.product_id || this._result.stock !== outcome.quantity ||
             this._result.product.almost_out !== outcome.almost_out ||
             Boolean(this._result.shopping) !== outcome.on_shopping))) {
          throw new Error("Touchscreen scan result could not be verified.");
        }
        if (this._result.product && outcome) {
          this._result.alternatives = outcome.alternatives || [];
          this._result.summary = {
            add: "One item added to stock.",
            use: "One item deducted from stock.",
            shopping: "No stock available. Shopping list checked.",
            almost_out: "Almost out recorded. Stock counted once.",
            already_almost_out: "Already marked almost out. Stock unchanged.",
            already_counted: "Already counted. Stock unchanged; Almost out cleared.",
          }[outcome.outcome];
        }
        this._resetDraft();
        if (!submitted) {
          this._notice = this._result.product
            ? { title: "Product found", detail: "Lookup only. Stock and shopping list are unchanged.", state: "ready" }
            : { title: "Product not found", detail: "Barcode not in the product catalogue. Nothing was changed.", state: "warning" };
        } else {
          this._notice = this._result.product
            ? { title: "Scan processed", detail: vhTouchscreenOutcome(outcome) ||
              "Product details and stock after scanning.", state: "ready" }
            : { title: "Product not found", detail: "Review the scan queue in the main dashboard.", state: "warning" };
        }
        if (outcome?.audio_requested === false) this._notice = {
          title: "Scan processed", detail: "Stock processed, but the audio confirmation could not be requested.", state: "warning",
        };
        if (this._hasPendingShoppingChoice()) {
          const discarded = this._queue.length;
          this._queue = [];
          this._notice = { title: "Choose a shopping-list action.", state: "warning",
            detail: "Stock has already been processed. Neither button decreases it again.",
            ...(discarded ? { rawDetail: `${this._t("Stock has already been processed. Neither button decreases it again.")} ` +
              `${this._t("Unsent scans discarded")}: ${discarded}.` } : {}) };
          break;
        }
      } catch (error) {
        console.error("VH-Inventory touchscreen request failed", error);
        this._result = null;
        this._resetDraft();
        if (!submitted) {
          this._notice = { title: "Lookup failed", detail: scan.product_id != null
            ? "Could not verify product data. No changes were requested. Search again before confirming."
            : "Could not read product data. No changes were requested. Try lookup again.", state: "error" };
          this._render();
          continue;
        }
        this._blocked = true;
        const count = this._queue.length;
        this._queue = [];
        this._notice = { title: "Scan result uncertain", state: "error", discarded: count };
        break;
      }
      this._render();
    }
    this._busy = false;
    this._render();
    if (this._hasPendingShoppingChoice()) this.shadowRoot.querySelector("#stock-alternatives-title")?.focus();
    if (this._result && this._result.mode !== "Lookup" && !this._draft?.create) this._scheduleResultDismissal();
  }

  async _previewUnknownProduct(scan) {
    const pending = this._result;
    this._resetDraft();
    try {
      if (!this._hass.services?.pyscript?.vh_inventory_touchscreen_lookup) {
        throw new Error("Online lookup service unavailable.");
      }
      const reply = await this._hass.callWS({ type: "call_service", domain: "pyscript",
        service: "vh_inventory_touchscreen_lookup", return_response: true,
        service_data: { barcode: scan.barcode } });
      const data = reply?.response;
      if (!data || typeof data.online_incomplete !== "boolean" ||
          data.suggestion !== null && (!data.suggestion || !data.suggestion.name?.trim() ||
            ["name", "description", "manufacturer", "unit"].some((field) =>
              typeof data.suggestion[field] !== "string" || data.suggestion[field].length > 255))) {
        throw new Error("Invalid online lookup response.");
      }
      const fresh = this._readResult(await this._hass.callWS({ type: "get_states" }),
        { ...scan, mode: "Lookup" });
      if (data.product_id != null && fresh.product?.id !== data.product_id) {
        throw new Error("Concurrent product registration could not be read.");
      }
      this._result = { ...fresh, mode: scan.mode, suggestion: data.suggestion,
        lookupFailed: data.online_incomplete && !data.suggestion };
      this._resetDraft();
      this._notice = fresh.product
        ? { title: "Product found", detail: "Product was registered during lookup. This scan did not change stock.", state: "warning" }
        : { title: data.suggestion ? scan.mode === "Add" ? "New product found online" : "Online product found"
          : "Product not found",
          detail: data.suggestion ? data.truncated
            ? "Not saved. Online text was shortened to fit the fields. Review the details before saving."
            : "Not saved. Review the online details and press Save to register this product."
            : data.online_incomplete
              ? "Online lookup was incomplete. Enter details manually or discard and look up again. Nothing has been saved."
              : "No online details found. Enter product details and press Save. Nothing has been saved.",
          state: data.suggestion ? "ready" : "warning" };
    } catch (error) {
      console.error("VH-Inventory touchscreen online lookup failed", error);
      this._result = { ...pending, lookupFailed: true };
      this._resetDraft();
      this._notice = { title: "Online lookup failed",
        detail: "Enter details manually or discard and look up again. Nothing has been saved.", state: "error" };
    }
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
    const product = scan.product_id != null ? products.find(item => item.id === scan.product_id)
      : products.find((item) => normalize(item.barcode) === normalize(scan.barcode));
    const references = Object.fromEntries(["categories", "stores", "locations"].map((name) => {
      const state = states.find((item) => item.entity_id === `sensor.vh_inventory_${name}`);
      return [name, state && !["unknown", "unavailable"].includes(state.state) &&
        Array.isArray(state.attributes?.[name]) ? state.attributes[name] : null];
    }));
    if (!product) {
      if (scan.mode !== "Lookup" &&
          !queue.some((item) => normalize(item.barcode) === normalize(scan.barcode) && item.state === "Unknown")) {
        throw new Error("Scan completion could not be confirmed.");
      }
      const pending = queue.filter((item) => normalize(item.barcode) === normalize(scan.barcode) &&
        item.state === "Unknown" && item.action === "Add").sort((a, b) => b.id - a.id)[0];
      return { ...scan, product: null, stock: null, shopping: null, locations: [], references,
        scan_id: scan.mode === "Add" ? pending?.id : null };
    }
    const inventory = stock.filter((item) => String(item.product_id) === String(product.id));
    const entries = shopping.filter((item) => String(item.product_id) === String(product.id));
    const total = (items) => items.reduce((sum, item) => {
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity)) throw new Error("Invalid inventory quantity.");
      return sum + quantity;
    }, 0);
    return { ...scan, barcode: scan.product_id != null ? String(product.barcode ?? "") : scan.barcode,
      product, stock: total(inventory), shopping: total(entries), inventory, references,
      locations: [...new Set(inventory.map((item) => item.location).filter(Boolean))] };
  }

  _values(result) {
    const product = result.product;
    const locations = [...new Set(result.inventory.map((row) => String(row.location_id ?? "")))].sort();
    return { name: product.name, description: product.description || "",
      manufacturer: product.manufacturer || "", unit: product.unit || "",
      auto_add_enabled: String(product.auto_add_enabled ?? 0),
      auto_add_threshold: String(product.auto_add_threshold ?? 0),
      auto_add_quantity: String(product.auto_add_quantity ?? 1),
      category_id: String(product.category_id ?? ""), store_id: String(product.store_id ?? ""),
      location_id: locations.length > 1 ? "__multiple__" : locations[0] || "" };
  }

  _resetDraft(allowCreate = true) {
    this._editNotice = "";
    if (["Save or discard your edits before scanning.", "Save or discard your edits before switching pages."].includes(this._notice.detail)) {
      this._notice = { title: "Ready to scan", detail: "Scan a barcode to begin.", state: "ready" };
    }
    this._draft = this._result?.product ? { id: this._result.product.id,
      original: this._values(this._result), values: this._values(this._result),
      locations: [...new Set(this._result.inventory.map((row) => String(row.location_id ?? "")))].sort() } : null;
    if (!this._draft && allowCreate && this._result && ["Lookup", "Add"].includes(this._result.mode)) {
      const values = { name: "", description: "", manufacturer: "", unit: "", category_id: "",
        store_id: "", location_id: "", auto_add_enabled: "0", auto_add_threshold: "0", auto_add_quantity: "1" };
      this._draft = { create: true, original: { ...values },
        values: { ...values, ...Object.fromEntries(["name", "description", "manufacturer", "unit"]
          .map((field) => [field, this._result.suggestion?.[field] ?? ""])) } };
    }
  }

  _dirty() {
    return Boolean(this._draft && Object.keys(this._draft.values)
      .some((field) => this._draft.values[field] !== this._draft.original[field]));
  }

  _canEdit() {
    return Boolean(!this.preview && this._hass?.connected && this._draft && !this._busy &&
      !this._saving && !this._blocked && !this._queue.length &&
      (this._result?.mode === "Lookup" || this._draft.create && this._result?.mode === "Add") &&
      !this._draft.uncertain && this._hass.services?.pyscript?.[
        this._draft.create ? "vh_inventory_touchscreen_create_product" : "vh_inventory_save_product_details"]);
  }

  _editField(field, value) {
    if (!this._canEdit() || !Object.hasOwn(this._draft.values, field) ||
        (field === "location_id" && !(this._result.stock > 0) &&
          !(this._draft.create && this._result.mode === "Add"))) return;
    this._draft.values[field] = String(value);
    this._stopResultTimer();
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
    const pendingAction = this._hasPendingNameAction();
    const shoppingChoice = this._hasPendingShoppingChoice();
    this.shadowRoot.querySelector("#stock-alternatives").hidden = !shoppingChoice;
    this.shadowRoot.querySelector("#stock-details-fields").hidden = shoppingChoice;
    const alternatives = this.shadowRoot.querySelector("#stock-alternatives-list");
    const signature = JSON.stringify(this._result?.alternatives || []);
    if (alternatives.dataset.rows !== signature) {
      alternatives.replaceChildren(...(this._result?.alternatives || []).map(row => {
        const item = document.createElement("li");
        item.textContent = `${row.quantity}x ${row.product}`;
        return item;
      }));
      alternatives.dataset.rows = signature;
    }
    const values = this._draft?.values;
    const creating = Boolean(this._draft?.create);
    const panel = this.shadowRoot.querySelector(".product-panel");
    if (panel) {
      panel.hidden = !this._result;
      panel.dataset.details = String(Boolean(this._result));
      panel.dataset.creating = String(creating);
      panel.dataset.saveError = String(this._saveError());
      panel.dataset.shoppingChoice = String(shoppingChoice);
      panel.dataset.unknown = String(Boolean(this._result && !this._result.product));
    }
    const heading = this.shadowRoot.querySelector("#product-heading");
    if (heading) heading.hidden = false;
    for (const id of ["new-product-fields", "new-auto-fields"]) {
      const element = this.shadowRoot.querySelector(`#${id}`);
      if (element) element.hidden = !creating && !this._result?.product;
    }
    this.shadowRoot.querySelector("#new-product-help").hidden = !creating;
    if (creating) {
      this._text("#new-product-help", this._t(this._result.mode === "Add"
        ? "New product: Save registers this barcode and adds one item to stock."
        : "New product: Save registers this barcode without changing stock or the shopping list."));
    }
    for (const [id, field] of [["new-name", "name"], ["new-description", "description"],
      ["new-auto-add-enabled", "auto_add_enabled"], ["new-auto-add-threshold", "auto_add_threshold"],
      ["new-auto-add-quantity", "auto_add_quantity"]]) {
      const input = this.shadowRoot.querySelector(`#${id}`);
      if (!input) continue;
      if (input.type === "checkbox") input.checked = values?.[field] === "1";
      else if (input.value !== (values?.[field] || "")) input.value = values?.[field] || "";
      input.disabled = !editable;
      if (field === "name") input.setAttribute("aria-invalid", String(this._editNotice ===
        "A product with this name already exists. Choose a different name."));
    }
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
      const options = [["", ""]];
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
      select.disabled = !editable || !rows || (field === "location_id" && !(this._result.stock > 0) &&
        !(creating && this._result.mode === "Add"));
    }
    const dirty = this._dirty();
    this.shadowRoot.querySelector("#edit-actions").hidden = !shoppingChoice && !pendingAction && !creating && this._result?.mode !== "Lookup";
    this._text("#save", shoppingChoice ? this._t("Add to shopping list")
      : pendingAction ? this._modeText(this._result.mode) : this._t("Save"));
    this._text("#discard", this._t(shoppingChoice ? "Do not add to shopping list" : "Cancel editing"));
    this.shadowRoot.querySelector("#save").disabled = shoppingChoice ? !this._canResolveShoppingChoice()
      : pendingAction ? !this._canConfirmNameAction()
      : !editable || (creating && !values.name.trim());
    this.shadowRoot.querySelector("#discard").disabled = this._saving || shoppingChoice && !this._canResolveShoppingChoice();
    for (const id of ["barcode", "add", "use", "lookup", "almost-out"]) {
      this.shadowRoot.querySelector(`#${id}`).disabled = dirty || this._saving || shoppingChoice;
    }
    let message = this._saving ? shoppingChoice ? "Saving shopping decision..." : "Saving product details"
      : shoppingChoice ? "Choose a shopping-list action." : dirty ? "Save or discard your edits before scanning."
      : pendingAction ? "Nothing has changed. Confirm the action or cancel."
      : this._draft && (creating || this._result.mode === "Lookup") && !this._hass?.services?.pyscript?.[
        creating ? "vh_inventory_touchscreen_create_product" : "vh_inventory_save_product_details"] ? "Product editing service unavailable."
      : creating ? ""
      : this._draft && this._result.mode === "Lookup" && !(this._result.stock > 0) ? "No stock: location editing is unavailable."
      : this._draft && this._result.mode === "Lookup" ? "Changing location moves all existing stock without changing quantities." : "";
    if (this._draft && ["categories", "stores", "locations"].some((name) => !this._referenceRows(name))) {
      message = "Reference lists unavailable. Reconnect or look up again.";
    }
    this._text("#edit-status", this._t(this._editNotice || message));
    this.shadowRoot.querySelector("#edit-status").dataset.state = this._saveError() || this._draft?.uncertain
      ? "error" : "ready";
  }

  async _saveDetails() {
    if (this._draft?.create) return this._saveNewProduct();
    if (!this._canEdit()) return;
    try { this._validateProductValues(); }
    catch (error) { this._editNotice = error.message; this._render(); return; }
    this._stopResultTimer();
    const draft = this._draft;
    const changes = {};
    const expected = {};
    for (const field of Object.keys(draft.values)) {
      if (draft.values[field] === draft.original[field]) continue;
      const numeric = field.endsWith("_id") || field.startsWith("auto_add_");
      changes[field] = numeric ? (draft.values[field] === "" ? null : Number(draft.values[field]))
        : field === "name" ? draft.values[field].trim() : draft.values[field];
      expected[field] = field === "location_id" ? draft.locations
        : numeric ? (draft.original[field] === "" ? null : Number(draft.original[field])) : draft.original[field];
    }
    this._saving = true;
    this._render();
    let submitted = false, saved = false;
    const identity = { product_id: Number(draft.id), barcode: this._result.barcode, mode: "Lookup" };
    try {
      if (changes.name) {
        const before = await this._hass.callWS({ type: "get_states" });
        const products = this._readResult(before, identity).product;
        if (!products || products.id !== Number(draft.id)) throw new Error("Product details changed; discard edits and look up again.");
        if (before.find(row => row.entity_id === "sensor.vh_inventory_products").attributes.products
          .some(row => row.id !== Number(draft.id) && row.name.toLocaleLowerCase() === changes.name.toLocaleLowerCase())) {
          throw new Error("A product with this name already exists. Choose a different name.");
        }
      }
      if (Object.keys(changes).length) {
        submitted = true;
        await this._hass.callService("pyscript", "vh_inventory_save_product_details",
          { id: Number(draft.id), changes, expected });
      }
      const states = await this._hass.callWS({ type: "get_states" });
      const refreshed = this._readResult(states, identity);
      if (!refreshed.product || String(refreshed.product.id) !== String(draft.id)) {
        throw new Error("Saved product could not be verified.");
      }
      const values = this._values(refreshed);
      if (Object.keys(changes).some((field) => values[field] !==
          (field === "name" ? draft.values[field].trim() : draft.values[field]))) {
        throw new Error("Saved fields do not match the requested changes.");
      }
      this._result = { ...refreshed, mode: this._result.mode };
      this._resetDraft();
      this._editNotice = "Product details saved.";
      this._notice = { title: "Product details saved.", detail: "Stock totals and shopping quantities are unchanged.", state: "ready" };
      saved = true;
    } catch (error) {
      console.error("VH-Inventory touchscreen save failed", error);
      draft.uncertain = submitted;
      this._editNotice = submitted
        ? "Product details could not be saved or verified. Edits retained. Check the product; discard edits and look up again before retrying."
        : error.message;
    } finally {
      this._saving = false;
      this._render();
      this._focusNameError();
      if (saved) this._scheduleResultDismissal();
      if (!this._dirty()) this._focusInput();
    }

  }

  _validateProductValues() {
    const values = this._draft.values;
    if (!values.name.trim() || values.name.trim() === "(none)" ||
        ["name", "manufacturer", "unit", "description"].some((field) => values[field].length > 255) ||
        !["0", "1"].includes(values.auto_add_enabled) ||
        !/^\d+$/.test(values.auto_add_threshold) || Number(values.auto_add_threshold) > 999 ||
        !/^\d+$/.test(values.auto_add_quantity) || Number(values.auto_add_quantity) < 1 ||
        Number(values.auto_add_quantity) > 999) {
      throw new Error("Enter valid product fields and Auto-Add values from 0/1 to 999.");
    }
  }

  _focusNameError() {
    if (this._editNotice === "A product with this name already exists. Choose a different name.") {
      const name = this.shadowRoot.querySelector("#new-name");
      name?.focus({ preventScroll: true });
      name?.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
  }

  _newProductDetails() {
    this._validateProductValues();
    const values = this._draft.values;
    const details = { ...values, name: values.name.trim() };
    for (const field of ["auto_add_enabled", "auto_add_threshold", "auto_add_quantity"]) details[field] = Number(values[field]);
    for (const [field, list] of [["category_id", "categories"], ["store_id", "stores"], ["location_id", "locations"]]) {
      const rows = this._referenceRows(list);
      if (!rows || (values[field] !== "" && !rows.some((row) => String(row.id) === values[field]))) {
        throw new Error("Reference lists unavailable. Reconnect or look up again.");
      }
      details[field] = values[field] === "" ? null : Number(values[field]);
    }
    if (this._result.mode === "Lookup" && details.location_id !== null) throw new Error("Lookup cannot change stock.");
    if (this._result.scan_id != null &&
        (!Number.isSafeInteger(this._result.scan_id) || this._result.scan_id < 1)) {
      throw new Error("The unresolved Add scan changed. Scan again.");
    }
    return details;
  }

  async _saveNewProduct() {
    if (!this._draft?.create || !this._canEdit()) return;
    let details;
    try { details = this._newProductDetails(); }
    catch (error) { this._editNotice = error.message; this._render(); return; }
    const draft = this._draft, scan = this._result;
    this._saving = true;
    this._render();
    let submitted = false, saved = false;
    try {
      const states = await this._hass.callWS({ type: "get_states" });
      const before = this._readResult(states, { barcode: scan.barcode, mode: "Lookup" });
      if (before.product) {
        throw new Error("A product with this name or barcode already exists. Look it up again.");
      }
      if (states.find((row) => row.entity_id === "sensor.vh_inventory_products").attributes.products
        .some((row) => row.name.toLocaleLowerCase() === details.name.toLocaleLowerCase())) {
        throw new Error("A product with this name already exists. Choose a different name.");
      }
      for (const [field, list] of [["category_id", "categories"], ["store_id", "stores"], ["location_id", "locations"]]) {
        if (!before.references[list] || details[field] !== null &&
            !before.references[list].some((row) => row.id === details[field])) {
          throw new Error("Reference lists unavailable. Reconnect or look up again.");
        }
      }
      submitted = true;
      const reply = await this._hass.callWS({ type: "call_service", domain: "pyscript",
        service: "vh_inventory_touchscreen_create_product", return_response: true,
        service_data: { barcode: scan.barcode, mode: scan.mode, details, scan_id: scan.scan_id ?? null } });
      const after = await this._hass.callWS({ type: "get_states" });
      const refreshed = this._readResult(after, { barcode: scan.barcode, mode: "Lookup" });
      const queue = after.find((row) => row.entity_id === "sensor.vh_inventory_scan_queue");
      if (!refreshed.product || refreshed.product.id !== reply?.response?.product_id ||
          refreshed.stock !== (scan.mode === "Add" ? 1 : 0) ||
          reply.response.quantity !== refreshed.stock ||
          scan.mode === "Lookup" && refreshed.shopping !== 0 ||
          Object.entries(details).some(([field, value]) => field !== "location_id" &&
            (refreshed.product[field] ?? (typeof value === "string" ? "" : null)) !== value) ||
          scan.mode === "Add" && (refreshed.inventory.length !== 1 ||
            (refreshed.inventory[0].location_id ?? null) !== details.location_id ||
            scan.scan_id != null && (!queue || ["unknown", "unavailable"].includes(queue.state) ||
              !Array.isArray(queue.attributes?.scan_queue) || queue.attributes.scan_queue.some((row) => row.id === scan.scan_id)))) {
        throw new Error("Created product could not be verified.");
      }
      this._result = { ...refreshed, mode: scan.mode,
        summary: scan.mode === "Add" ? "One item added to stock." : "Product saved." };
      this._resetDraft();
      this._notice = { title: "Product saved.", detail: scan.mode === "Add"
        ? "Product saved and one item added to stock." : "Product saved. Stock and shopping list are unchanged.", state: "ready" };
      saved = true;
    } catch (error) {
      console.error("VH-Inventory touchscreen registration failed", error);
      draft.uncertain = submitted;
      this._editNotice = submitted
        ? "Product creation could not be verified. Do not save again. Discard edits and look up the barcode first."
        : error.message;
    } finally {
      this._saving = false;
      this._render();
      this._focusNameError();
      if (saved) this._scheduleResultDismissal();
      if (!this._dirty()) this._focusInput();
    }
  }
}

async function vhTouchscreenPrint(card, service, message) {
  if (!card._canAct() || card._editor || card._confirmation || card._confirmId != null ||
      !card._hass.services?.script?.[service]) return;
  card._busy = true;
  card._status = message;
  card._render();
  try {
    await card._hass.callService("script", service, {});
    card._status = "Print request sent. Check the printer before printing again.";
  } catch (error) {
    console.error("VH-Inventory touchscreen print request failed", service, error);
    card._blocked = true;
    card._status = "Print result uncertain. Check the printer before trying again.";
  } finally {
    card._busy = false;
    card._render();
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
      .shopping-actions { display: flex; flex-wrap: wrap; gap: 12px; max-width: 100%; }
      .shopping-actions button { max-width: 100%; overflow-wrap: anywhere; }
      .table-scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 22px; }
      th { text-align: left; font-size: 17px; color: var(--cp-text-muted); }
      th:nth-child(4) { text-align: center; }
      th, td { padding: 20px 16px; border-bottom: 1px solid var(--cp-border); }
      td:first-child { min-width: 220px; overflow-wrap: anywhere; }
      .quantity-controls { display: flex; align-items: center; justify-content: center; gap: 16px; }
      .quantity-controls button { min-width: 68px; }
      .quantity-controls strong { width: 6ch; flex: 0 0 6ch; text-align: center; white-space: nowrap; }
      .remove-controls { display: flex; gap: 12px; justify-content: flex-end; }
      .confirm-row td { background: var(--cp-accent-soft); }
      .confirm-row p { font-size: 19px; }
      #shopping-status[data-state="error"] { color: var(--cp-danger); }
      .empty { font-size: 24px; padding: 32px 16px; }
      @media (max-width: 1000px) { th, td { padding: 16px 12px; } }
      </style><main>
      <header><div class="brand"><img id="brand-logo" class="brand-logo"
        alt="Van Hemert Home Automation" width="128" height="72">
        <div><div class="eyebrow">VH-INVENTORY</div><h1 id="shopping-title" data-i18n="Shopping"></h1></div></div>
        <div class="shopping-actions">
          <button id="shopping-print" type="button" data-i18n="Print Shopping list"></button>
          <div class="recovery-slot"><button id="shopping-refresh" type="button" hidden data-i18n="Refresh shopping list"></button></div>
        </div></header>
      <section class="panel" aria-labelledby="shopping-title">
        <p id="shopping-status" class="feedback-slot" role="status" aria-live="polite"></p>
        <p class="empty" id="shopping-empty" hidden data-i18n="Your shopping list is empty."></p>
        <div class="table-scroll"><table id="shopping-table">
          <thead><tr><th scope="col" data-i18n="Product"></th><th scope="col" data-i18n="Category"></th>
            <th scope="col" data-i18n="Store"></th><th scope="col" data-i18n="Quantity"></th>
            </tr></thead><tbody id="shopping-rows"></tbody>
        </table></div></section>
      </main>`;
    this.shadowRoot.querySelector("#brand-logo").src = config.logo || "/local/van-hemert-logo-hi.png";
    for (const element of this.shadowRoot.querySelectorAll("[data-i18n]")) {
      element.textContent = this._t(element.dataset.i18n);
    }
    this.shadowRoot.querySelector("#shopping-refresh").addEventListener("click", () => this._refresh());
    this.shadowRoot.querySelector("#shopping-print").addEventListener("click", () => this._print());
    this._render();
  }

  set hass(value) {
    this._hass = value;
    this._states = value?.states || {};
    this._render();
  }

  getCardSize() { return 18; }

  _t(key) {
    return vhTouchscreenText(this, key);
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
        category: adhoc ? this._t("Ad-Hoc item") : product?.category || "",
        store: product?.store || "" };
    }).sort((a, b) => a.name.localeCompare(b.name, vhTouchscreenLanguage(this)) || a.id - b.id);
  }

  _canAct() {
    return Boolean(!this.preview && this._hass?.connected && !this._busy && !this._blocked &&
      this._hass.services?.pyscript?.vh_inventory_adjust_shopping &&
      this._hass.services?.pyscript?.vh_inventory_delete);
  }

  _render() {
    if (!this._config || !this.shadowRoot.querySelector("main")) return;
    vhTouchscreenTranslate(this);
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
    vhTouchscreenTextSlot(status);
    const refresh = this.shadowRoot.querySelector("#shopping-refresh");
    refresh.hidden = !(error || this._blocked || !connected);
    refresh.disabled = this._busy || !connected;
    this.shadowRoot.querySelector("#shopping-empty").hidden = Boolean(error || rows.length);
    this.shadowRoot.querySelector("#shopping-table").hidden = Boolean(error || !rows.length);
    const canAct = this._canAct() && !error;
    this.shadowRoot.querySelector("#shopping-print").disabled =
      !canAct || this._confirmId !== null || !this._hass?.services?.script?.vh_print_shopping;
    const signature = JSON.stringify([rows, canAct, this._confirmId, vhTouchscreenLanguage(this)]);
    if (this._rowsSignature === signature) return;
    this._rowsSignature = signature;
    const body = this.shadowRoot.querySelector("#shopping-rows");
    const elements = [];
    const text = (tag, value) => {
      if (tag === "td") return vhTouchscreenTableCell(value);
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
      tr.append(quantity);
      elements.push(tr);
      if (this._confirmId === row.id) {
        const confirm = document.createElement("tr");
        confirm.className = "confirm-row";
        const cell = document.createElement("td");
        cell.colSpan = 4;
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

  _refreshText() {
    return {
      refreshing: "Refreshing shopping list",
      refreshed: "Shopping list refreshed. Review quantities before trying again.",
      unavailable: "Shopping list unavailable. Reconnect and refresh before making changes.",
    };
  }

  async _refresh() {
    if (this.preview || this._busy || !this._hass?.connected) return;
    this._busy = true;
    this._status = this._refreshText().refreshing;
    this._render();
    try {
      const states = Object.fromEntries((await this._hass.callWS({ type: "get_states" }))
        .map((row) => [row.entity_id, row]));
      this._rows(states);
      this._states = states;
      this._blocked = false;
      this._confirmId = null;
      this._status = this._refreshText().refreshed;
    } catch (error) {
      console.error("VH-Inventory touchscreen shopping refresh failed", error);
      this._blocked = true;
      this._status = this._refreshText().unavailable;
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _print() {
    if (!this._canAct() || this._confirmId !== null || !this._hass?.services?.script?.vh_print_shopping) return;
    try { this._rows(); }
    catch (error) {
      console.error("VH-Inventory touchscreen shopping print data unavailable", error);
      this._blocked = true;
      this._status = "Shopping list unavailable. Reconnect and refresh before making changes.";
      this._render();
      return;
    }
    await vhTouchscreenPrint(this, "vh_print_shopping", "Sending shopping list to printer");
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

class VhInventoryQuickShoppingTouchscreen extends VhInventoryShoppingTouchscreen {
  constructor() {
    super();
    this._search = "";
  }

  _gridText() {
    return {
      title: "Quick Shopping", add: "VH-Inventory Add to List", remove: "VH-Inventory Remove from List",
      addEmpty: "No matching products to add.", removeEmpty: "No matching products on the shopping list.",
      refresh: "Refresh shopping list",
      unavailable: "Shopping list unavailable. Reconnect and refresh before making changes.",
      servicesUnavailable: "Shopping list editing services unavailable.",
    };
  }

  _sectionOrder() { return ["add", "remove"]; }

  _listed(row) { return Boolean(row.shopping.length); }

  _buttonAction(row, listed) { return this._t(this._gridText()[listed ? "remove" : "add"]); }

  _buttonDetails(row) {
    return this._listed(row)
      ? [`${this._t("Quantity")}: ${row.shopping.reduce((sum, item) => sum + item.quantity, 0)}`] : [];
  }

  _decorateButton() {}

  setConfig(config) {
    super.setConfig(config);
    const labels = this._gridText();
    const theme = VH_TOUCHSCREEN_THEME.replace(":root", ":host")
      .replace('html[data-theme="dark"]', ':host([data-theme="dark"])');
    this._rowsSignature = null;
    this.shadowRoot.innerHTML = `<style>${theme}${VH_TOUCHSCREEN_STYLE}
      .panel { padding-top: 16px; }
      .brand > div { min-width: 0; }
      h1 { overflow-wrap: anywhere; }
      .quick-section h2 { font-size: 26px; margin: 0 0 20px; }
      .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
      .product-grid button { height: 176px; min-height: 176px; padding: 16px; overflow-wrap: anywhere;
        display: flex; flex-direction: column; justify-content: flex-start; gap: 8px; text-align: center; }
      .product-grid button strong { font-weight: 400; line-height: 1.65; height: 3.3em;
        flex-shrink: 0; width: 100%; overflow: auto; scrollbar-width: none; }
      .product-grid button strong::-webkit-scrollbar { display: none; }
      .product-grid button span { font-size: 15px; font-weight: 400; color: var(--cp-text-muted); }
      .product-grid button.stock-product { position: relative; padding-bottom: 62px; }
      .product-grid button .stock-quantity { position: absolute; bottom: 12px; left: 12px;
        min-width: 40px; box-sizing: border-box; padding: 4px 8px; border-radius: 10px;
        background: var(--cp-accent-soft); color: var(--cp-accent); font-size: 18px;
        font-weight: 650; line-height: 26px; font-variant-numeric: tabular-nums; }
      .quick-section[data-listed="true"] { border-color: var(--cp-success); }
      #shopping-status[data-state="error"] { color: var(--cp-danger); }
      .empty { color: var(--cp-text-muted); font-size: 19px; }
      @media (max-width: 550px) {
        .brand { gap: 12px; }
        .brand-logo { width: 80px; height: 45px; }
        .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .product-grid button { padding: 12px 8px; }
      }
      </style><main>
      <header><div class="brand"><img id="brand-logo" class="brand-logo"
        alt="Van Hemert Home Automation" width="128" height="72">
        <div><div class="eyebrow">VH-INVENTORY</div><h1 id="quick-title" data-i18n="${labels.title}"></h1></div></div>
        <div class="recovery-slot"><button id="shopping-refresh" type="button" hidden data-i18n="${labels.refresh}"></button></div></header>
      <section class="panel search-panel"><label for="quick-search" data-i18n="Search products"></label>
        <div class="input-row"><input id="quick-search" type="search" autocomplete="off">
          <button id="quick-clear" type="button" data-i18n="Clear search"></button></div></section>
      <p id="shopping-status" class="feedback-slot" role="status" aria-live="polite"></p>
      ${this._sectionOrder().map((target) => `<section class="panel quick-section"
        data-listed="${target === "remove"}" aria-labelledby="quick-${target}-title">
        <h2 id="quick-${target}-title" data-i18n="${labels[target]}"></h2>
        <p id="quick-${target}-empty" class="empty" hidden data-i18n="${labels[`${target}Empty`]}"></p>
        <div id="quick-${target}" class="product-grid"></div></section>`).join("")}
      </main>`;
    this.shadowRoot.querySelector("#brand-logo").src = config.logo || "/local/van-hemert-logo-hi.png";
    for (const element of this.shadowRoot.querySelectorAll("[data-i18n]")) {
      element.textContent = this._t(element.dataset.i18n);
    }
    const search = this.shadowRoot.querySelector("#quick-search");
    search.value = this._search;
    search.placeholder = this._t("Search by product name or barcode");
    search.dataset.i18nPlaceholder = "Search by product name or barcode";
    search.addEventListener("input", () => {
      this._search = search.value;
      this._render();
    });
    this.shadowRoot.querySelector("#quick-clear").addEventListener("click", () => {
      search.value = this._search = "";
      this._render();
      search.focus();
    });
    this.shadowRoot.querySelector("#shopping-refresh").addEventListener("click", () => this._refresh());
    this._render();
  }

  _rows(states = this._states) {
    super._rows(states);
    const products = states["sensor.vh_inventory_products"].attributes.products;
    const shopping = states["sensor.vh_inventory_shopping"].attributes.shopping;
    const ids = new Set();
    for (const product of products) {
      if (!Number.isSafeInteger(product.id) || product.id < 1 || ids.has(product.id) ||
          typeof product.name !== "string" || !product.name.trim()) {
        throw new Error("Invalid quick shopping product.");
      }
      ids.add(product.id);
    }
    for (const row of shopping) {
      if (row.product_id !== null && (!Number.isSafeInteger(row.product_id) || !ids.has(row.product_id))) {
        throw new Error("Shopping product link unavailable.");
      }
    }
    return products.map((product) => ({
      id: product.id, name: product.name, barcode: product.barcode == null ? "" : String(product.barcode),
      shopping: shopping.filter((row) => row.product_id === product.id)
        .map((row) => ({ id: row.id, quantity: row.quantity })).sort((a, b) => a.id - b.id),
    })).sort((a, b) => a.name.localeCompare(b.name, vhTouchscreenLanguage(this)) || a.id - b.id);
  }

  _filteredRows(rows = this._rows()) {
    const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const query = normalize(this._search.trim());
    return rows.filter((row) => normalize(row.name).includes(query) || row.barcode.includes(query));
  }

  _canAct() {
    return Boolean(!this.preview && this._hass?.connected && !this._busy && !this._blocked &&
      this._hass.services?.pyscript?.vh_inventory_shopping_toggle);
  }

  _servicesAvailable() { return Boolean(this._hass?.services?.pyscript?.vh_inventory_shopping_toggle); }

  _render() {
    vhTouchscreenTranslate(this);
    if (!this._config || !this.shadowRoot.querySelector("#quick-title")) return;
    const labels = this._gridText();
    let rows = [];
    let error = "";
    try { rows = this._filteredRows(); }
    catch (failure) { error = labels.unavailable; }
    const connected = !this.preview && this._hass?.connected;
    const message = error || (!connected ? "Home Assistant unavailable" : this._status ||
      (!this._servicesAvailable() ? labels.servicesUnavailable : ""));
    const status = this.shadowRoot.querySelector("#shopping-status");
    status.textContent = this._t(message);
    status.dataset.state = error || this._blocked || !connected ? "error" : "ready";
    vhTouchscreenTextSlot(status);
    const refresh = this.shadowRoot.querySelector("#shopping-refresh");
    refresh.hidden = !(error || this._blocked || !connected);
    refresh.disabled = this._busy || !connected;
    const canAct = this._canAct() && !error;
    const signature = JSON.stringify([rows, canAct, Boolean(error), vhTouchscreenLanguage(this)]);
    if (this._rowsSignature === signature) return;
    this._rowsSignature = signature;
    for (const listed of [false, true]) {
      const selected = rows.filter((row) => this._listed(row) === listed);
      const target = listed ? "remove" : "add";
      const buttons = selected.map((row) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.productId = String(row.productId ?? row.id);
        button.dataset.rowId = String(row.id);
        button.disabled = !canAct;
        const action = this._buttonAction(row, listed);
        const details = this._buttonDetails(row);
        button.setAttribute("aria-label", `${action}: ${row.name}${details.length ? `, ${details.join(", ")}` : ""}`);
        const name = document.createElement("strong");
        name.textContent = row.name;
        button.append(name);
        for (const detail of details) {
          const quantity = document.createElement("span");
          quantity.textContent = detail;
          button.append(quantity);
        }
        this._decorateButton(button, row);
        button.title = button.getAttribute("aria-label");
        button.addEventListener("click", () => this._change(row.id, listed, row));
        return button;
      });
      this.shadowRoot.querySelector(`#quick-${target}`).replaceChildren(...buttons);
      this.shadowRoot.querySelector(`#quick-${target}-empty`).hidden = Boolean(error || selected.length);
    }
  }

  async _change(id, listed) {
    if (!this._canAct() || typeof listed !== "boolean") return;
    let submitted = false;
    try {
      const original = this._rows().find((row) => row.id === id);
      if (!original || Boolean(original.shopping.length) !== listed) throw new Error("Shopping button changed.");
      this._busy = true;
      this._status = "Updating shopping list";
      this._render();
      const before = Object.fromEntries((await this._hass.callWS({ type: "get_states" }))
        .map((row) => [row.entity_id, row]));
      const fresh = this._rows(before).find((row) => row.id === id);
      if (!fresh || fresh.name !== original.name || JSON.stringify(fresh.shopping) !== JSON.stringify(original.shopping)) {
        throw new Error("Shopping list changed before the tap was submitted.");
      }
      if (!this._hass.connected || this.preview || !this._hass.services?.pyscript?.vh_inventory_shopping_toggle) {
        throw new Error("Shopping service unavailable.");
      }
      submitted = true;
      await this._hass.callService("pyscript", "vh_inventory_shopping_toggle", { product_id: id });
      const states = Object.fromEntries((await this._hass.callWS({ type: "get_states" }))
        .map((row) => [row.entity_id, row]));
      const updated = this._rows(states).find((row) => row.id === id);
      if (!updated || (listed ? updated.shopping.length !== 0 :
        updated.shopping.length !== 1 || updated.shopping[0].quantity !== 1)) {
        throw new Error("Shopping toggle could not be verified.");
      }
      this._states = states;
      this._status = "Shopping list updated. Stock is unchanged.";
    } catch (error) {
      console.error("VH-Inventory touchscreen quick shopping change failed", error);
      this._blocked = true;
      this._status = submitted
        ? "Shopping change uncertain. Do not repeat it. Refresh and check the list first."
        : "Shopping list changed or unavailable. Refresh and review before tapping again.";
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
    this._showAlmostOut = false;
    this._showZeroStock = false;
    this._busy = false;
    this._blocked = false;
    this._status = "";
    this._editor = null;
    this._confirmation = null;
  }

  _t(key) {
    return vhTouchscreenText(this, key);
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
      .inventory-tools { display: flex; flex-wrap: wrap; gap: 16px; align-items: end; }
      .inventory-tools label { margin: 0; flex: 1; }
      .inventory-visibility { display: flex; flex-wrap: wrap; gap: 16px; }
      .inventory-visibility button { display: flex; align-items: center; gap: 12px;
        flex: 1 1 260px; min-width: 0; text-align: left; padding: 12px 16px; font-weight: 400; }
      .visibility-track { width: 44px; height: 26px; border-radius: 13px; flex-shrink: 0;
        background: var(--cp-border-strong); padding: 4px; }
      .visibility-track::after { content: ""; display: block; width: 18px; height: 18px;
        border-radius: 50%; background: var(--cp-text); }
      [role="switch"][aria-checked="true"] .visibility-track { background: var(--cp-accent); }
      [role="switch"][aria-checked="true"] .visibility-track::after {
        transform: translateX(18px); background: var(--cp-accent-fg); }
      select { min-height: 68px; width: 100%; padding: 12px; font: inherit; font-size: 20px;
        border: 1px solid var(--cp-border-strong); border-radius: 10px;
        background: var(--cp-surface); color: var(--cp-text); }
      .panel { padding-top: 16px; }
      #inventory-status[data-state="error"] { color: var(--cp-danger); }
      .table-scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 21px; }
      th { text-align: left; font-size: 17px; color: var(--cp-text-muted); }
      th:nth-child(5), th:nth-child(6) { text-align: center; }
      th, td { padding: 16px 12px; border-bottom: 1px solid var(--cp-border); }
      td:first-child { min-width: 200px; overflow-wrap: anywhere; }
      .inventory-almost-out { display: inline-flex; vertical-align: middle; margin-inline-start: 10px; color: #facc15; }
      .inventory-almost-out svg { width: 24px; height: 24px; fill: currentColor; }
      td select { min-width: 160px; }
      .inventory-reference { display: grid; align-items: center; min-height: 68px; min-width: 160px;
        padding: 12px; border: 1px solid var(--cp-border-strong); border-radius: 10px;
        background: var(--cp-surface); font-size: 20px; }
      .inventory-reference span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .quantity-controls, .inventory-actions { display: flex; gap: 12px; align-items: center; justify-content: center; }
      .quantity-controls { display: grid; grid-template-columns: 68px 6ch 68px; }
      .quantity-controls button { width: 68px; min-width: 68px; padding-inline: 12px; }
      .quantity-controls button:last-child { grid-column: 3; }
      .quantity-controls strong { grid-column: 2; min-width: 40px; text-align: center; }
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
        <div class="recovery-slot"><button id="inventory-refresh" type="button" hidden data-i18n="Refresh inventory"></button></div></header>
      <section class="panel search-panel"><label for="inventory-search" data-i18n="Search products"></label>
        <div class="input-row"><input id="inventory-search" type="search" autocomplete="off">
          <button id="inventory-clear" type="button" data-i18n="Clear search"></button></div></section>
      <div class="inventory-tools"><button id="inventory-add" type="button" data-i18n="Add product to inventory"></button>
        <label><span data-i18n="Category"></span><select id="inventory-category"></select></label>
        <button id="inventory-print" type="button" data-i18n="Print full inventory"></button></div>
      <div class="inventory-visibility">
        <button id="inventory-show-almost-out" type="button" role="switch" aria-checked="false">
          <span class="visibility-track" aria-hidden="true"></span><span data-i18n="Show almost-out products"></span></button>
        <button id="inventory-show-zero-stock" type="button" role="switch" aria-checked="false">
          <span class="visibility-track" aria-hidden="true"></span><span data-i18n="Show products with stock 0"></span></button>
      </div>
      <section class="panel" aria-labelledby="inventory-title">
        <p id="inventory-status" class="feedback-slot" role="status" aria-live="polite"></p>
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
    this.shadowRoot.querySelector("#inventory-search").placeholder = this._t("Search by product name or barcode");
    this.shadowRoot.querySelector("#inventory-search").dataset.i18nPlaceholder = "Search by product name or barcode";
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
    for (const [id, field] of [["almost-out", "_showAlmostOut"], ["zero-stock", "_showZeroStock"]]) {
      this.shadowRoot.querySelector(`#inventory-show-${id}`).addEventListener("click", () => {
        this[field] = !this[field];
        this._render();
      });
    }
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
    return vhTouchscreenSearchText(value);
  }

  _rows(data = this._data()) {
    const search = this._normalize(this._search);
    const positive = data.stock.filter((row) => row.quantity >= 1);
    const stocked = new Set(positive.map((row) => row.product_id));
    const empty = data.products.filter((product) => !stocked.has(product.id)).map((product) => ({
      id: `empty-${product.id}`, product_id: product.id, location_id: null, quantity: 0,
    }));
    return [...positive, ...empty].map((row) => {
      const product = data.products.find((p) => p.id === row.product_id);
      return { ...row, name: product.name, barcode: product.barcode ?? "", category_id: product.category_id ?? null,
        store_id: product.store_id ?? null, store: product.store || "",
        almostOut: product.almost_out === 1, outOfStock: row.quantity === 0 };
    }).filter((row) => ((!row.outOfStock && !row.almostOut) ||
      (row.almostOut && this._showAlmostOut) || (row.outOfStock && this._showZeroStock)) &&
      (!search || this._normalize(row.name).includes(search) || this._normalize(row.barcode).includes(search)) &&
      (!this._category || (this._category === "none" ? row.category_id == null : String(row.category_id) === this._category)))
      .sort((a, b) => a.name.localeCompare(b.name, vhTouchscreenLanguage(this)) ||
        a.product_id - b.product_id || (a.id === b.id ? 0 : a.id - b.id));
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
    if (tag === "td") return vhTouchscreenTableCell(value);
    const element = document.createElement(tag);
    element.textContent = value;
    return element;
  }

  _label(tag, key, prefix = "", suffix = "") {
    const element = this._text(tag, `${prefix}${this._t(key)}${suffix}`);
    element.dataset.i18n = key;
    element.dataset.i18nPrefix = prefix;
    element.dataset.i18nSuffix = suffix;
    return element;
  }

  _button(label, action, disabled = false, translate = true) {
    const button = translate ? this._label("button", label) : this._text("button", label);
    button.type = "button";
    button.disabled = disabled;
    button.addEventListener("click", action);
    return button;
  }

  _iconButton(label, action, disabled, name) {
    const button = this._button("", action, disabled, false);
    button.className = "action-icon";
    vhTouchscreenAttribute(this, button, "aria-label", label, `: ${name}`);
    vhTouchscreenAttribute(this, button, "title", label, `: ${name}`);
    button.innerHTML = label === "Edit"
      ? '<svg data-icon="mdi:pencil" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25M20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"/></svg>'
      : '<svg data-icon="mdi:delete" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4H15.5L14.5 3H9.5L8.5 4H5V6H19M6 19A2 2 0 0 0 8 21H16A2 2 0 0 0 18 19V7H6V19Z"/></svg>';
    return button;
  }

  _editButton(action, disabled, name) {
    const button = this._iconButton("Edit", action, disabled, name);
    button.className += " inventory-edit";
    return button;
  }

  _options(select, rows, field, value, emptyLabel = "") {
    const entries = [this._label("option", emptyLabel)];
    entries[0].value = "";
    for (const row of [...rows].sort((a, b) => a[field].localeCompare(b[field], vhTouchscreenLanguage(this)))) {
      const option = this._text("option", row[field]);
      option.value = String(row.id);
      entries.push(option);
    }
    select.replaceChildren(...entries);
    select.value = value == null ? "" : String(value);
    if (value != null && select.value !== String(value)) {
      const missing = this._label("option", "Reference no longer available");
      missing.value = String(value);
      missing.disabled = true;
      select.append(missing);
      select.value = String(value);
    }
  }

  _render() {
    if (!this._config || !this.shadowRoot.querySelector("main")) return;
    vhTouchscreenTranslate(this);
    for (const [id, value] of [["almost-out", this._showAlmostOut], ["zero-stock", this._showZeroStock]]) {
      this.shadowRoot.querySelector(`#inventory-show-${id}`).setAttribute("aria-checked", String(value));
    }
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
    vhTouchscreenTextSlot(status);
    const refresh = this.shadowRoot.querySelector("#inventory-refresh");
    refresh.hidden = !error && connected && !this._blocked;
    refresh.disabled = !connected || this._busy;
    this.shadowRoot.querySelector("#inventory-add").disabled = !idle;
    this.shadowRoot.querySelector("#inventory-print").disabled = !idle || !this._hass?.services?.script?.vh_print_inventory;
    const category = this.shadowRoot.querySelector("#inventory-category");
    this._options(category, data?.categories || [], "category", this._category === "none" ? "" : this._category, "All");
    const unassigned = this._label("option", "Unassigned");
    unassigned.value = "none";
    category.append(unassigned);
    category.value = this._category;
    if (category.value !== this._category) {
      const missing = this._label("option", "Reference no longer available");
      missing.value = this._category;
      category.append(missing);
      category.value = this._category;
    }
    const empty = this.shadowRoot.querySelector("#inventory-empty");
    empty.hidden = error || rows.length > 0;
    empty.textContent = this._t("No inventory matches your filters.");
    this.shadowRoot.querySelector("#inventory-table").hidden = error || !rows.length;
    const signature = JSON.stringify([rows, data?.categories, data?.stores, data?.locations, idle,
      vhTouchscreenLanguage(this)]);
    if (signature !== this._rowsSignature) {
      this._rowsSignature = signature;
      const elements = rows.map((row) => {
        const tr = document.createElement("tr");
        tr.dataset.id = String(row.id);
        const name = this._text("td", row.name);
        if (row.almostOut) {
          const indicator = document.createElement("span");
          indicator.className = "inventory-almost-out";
          indicator.setAttribute("role", "img");
          vhTouchscreenAttribute(this, indicator, "aria-label", "Almost out");
          vhTouchscreenAttribute(this, indicator, "title", "Almost out");
          indicator.innerHTML = '<svg data-icon="mdi:exclamation-thick" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3H14V14H10V3M10 21V17H14V21H10Z"/></svg>';
          name.firstChild.append(indicator);
        }
        tr.append(name);
        if (row.outOfStock) {
          const category = data.categories.find((item) => item.id === row.category_id)?.category ||
            (row.category_id == null ? "" : this._t("Reference no longer available"));
          const actions = document.createElement("td");
          const group = document.createElement("div");
          group.className = "inventory-actions";
          group.append(this._editButton(() => this._editEmptyProduct(row.product_id), !idle, row.name));
          actions.append(group);
          const quantity = document.createElement("td");
          const controls = document.createElement("div");
          controls.className = "quantity-controls";
          const plus = this._button("+", () => this._addEmptyStock(row.product_id), !idle);
          vhTouchscreenAttribute(this, plus, "aria-label", "Increase quantity", `: ${row.name}`);
          controls.append(this._text("strong", "0"), plus);
          quantity.append(controls);
          for (const value of [category, row.store, ""]) {
            const cell = document.createElement("td");
            const field = document.createElement("div");
            field.className = "inventory-reference";
            field.title = value;
            field.append(this._text("span", value));
            cell.append(field);
            tr.append(cell);
          }
          tr.append(quantity, actions);
          return tr;
        }
        for (const [field, options, value] of [
          ["category", data.categories, row.category_id], ["store", data.stores, row.store_id],
          ["location", data.locations, row.location_id],
        ]) {
          const td = document.createElement("td");
          const select = document.createElement("select");
          this._options(select, options, field, value);
          const label = { category: "Category", store: "Store", location: "Location" }[field];
          vhTouchscreenAttribute(this, select, "aria-label", label, `: ${row.name}`);
          select.disabled = !idle;
          select.addEventListener("change", () => this._setField(row.id, field, select.value));
          td.append(select);
          tr.append(td);
        }
        const qty = document.createElement("td");
        const controls = document.createElement("div");
        controls.className = "quantity-controls";
        const minus = this._button("\u2212", () => this._change(row.id, -1), !idle);
        vhTouchscreenAttribute(this, minus, "aria-label", "Decrease quantity", `: ${row.name}`);
        const plus = this._button("+", () => this._change(row.id, 1), !idle || row.quantity >= 99999);
        vhTouchscreenAttribute(this, plus, "aria-label", "Increase quantity", `: ${row.name}`);
        controls.append(minus, this._text("strong", String(row.quantity)), plus);
        qty.append(controls);
        const actions = document.createElement("td");
        const group = document.createElement("div");
        group.className = "inventory-actions";
        group.append(this._editButton(() => this._openEditor(row.id), !idle, row.name));
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

  _writeMessages() {
    return {
      updating: "Updating inventory", updated: "Inventory updated.",
      uncertain: "Inventory change uncertain. Do not repeat it. Refresh and check stock and shopping first.",
      changed: "Inventory changed or unavailable. Refresh and check before trying again.",
      cancelRefresh: "Discard your inventory edits before refreshing.",
      refreshed: "Inventory refreshed. Review stock and shopping before trying again.",
      unavailable: "Inventory unavailable. Reconnect and refresh before making changes.",
    };
  }

  async _write(prepare) {
    if (!this._canAct()) return;
    this._busy = true;
    this._status = this._writeMessages().updating;
    this._render();
    let submitted = false;
    try {
      const previous = this._data();
      const currentStates = await this._read();
      const plan = prepare(previous, this._data(currentStates));
      for (const call of plan.calls) {
        if (!this._hass.services?.[call.domain || "pyscript"]?.[call.service]) throw new Error("Inventory service unavailable.");
      }
      for (const call of plan.calls) {
        submitted = true;
        await this._hass.callService(call.domain || "pyscript", call.service, call.data);
      }
      const states = await this._readback(plan);
      this._states = states;
      this._editor = null;
      this._confirmation = null;
      this._status = plan.successMessage ?? this._writeMessages().updated;
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
        ? this._writeMessages().uncertain : this._writeMessages().changed;
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _readback(plan) {
    const states = await this._read();
    if (!plan.verify(this._data(states))) throw new Error("Inventory change could not be verified.");
    return states;
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

  _editEmptyProduct(productId) {
    if (!this._canAct() || this._editor || this._confirmation) return;
    if (!this.onEditProduct?.(productId)) {
      this._status = "Product editing service unavailable.";
      this._render();
    }
  }

  async _addEmptyStock(productId) {
    if (!this._canAct() || this._editor || this._confirmation) return;
    await this._write((before, current) => {
      const original = before.products.find((p) => p.id === productId);
      const product = current.products.find((p) => p.id === productId);
      if (!original || !product || original.name !== product.name ||
          original.almost_out !== product.almost_out ||
          before.stock.some((row) => row.product_id === productId && row.quantity > 0) ||
          current.stock.some((row) => row.product_id === productId && row.quantity > 0)) {
        throw new Error("Product or stock details changed.");
      }
      const productName = this._name(current.products, productId, "name", true);
      return { calls: [{ service: "vh_inventory_add_stock",
        data: { product: productName, location: "(none)", quantity: 1 } }],
      verify: (after) => {
        const rows = after.stock.filter((row) => row.product_id === productId && row.quantity > 0);
        return rows.length === 1 && rows[0].quantity === 1 && rows[0].location_id == null &&
          after.products.find((p) => p.id === productId)?.almost_out === product.almost_out;
      } };
    });
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
      return { calls: [{ service: "vh_inventory_adjust_stock", data: { id, delta, check_alternatives: false } }],
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
      return { calls: [{ service: "vh_inventory_delete", data: { table: "stock", id, check_alternatives: false } }],
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

  _openEditor(id = null, productId = null) {
    if (!this._canAct() || this._editor || this._confirmation) return;
    const data = this._data();
    const row = id == null ? null : data.stock.find((item) => item.id === id && item.quantity >= 1);
    if (id != null && !row) return;
    const product = data.products.find((p) => p.id === (row?.product_id ?? productId)) || null;
    if (productId != null && !product) {
      this._blocked = true;
      this._status = this._writeMessages().changed;
      this._render();
      return;
    }
    this._editor = { id, originalRow: row ? { ...row } : null, originalProduct: product ? { ...product } : null,
      values: { product_id: product ? String(product.id) : "",
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
    host.replaceChildren(this._label("h2", this._editor.id == null ? "Add Inventory" : "Edit Inventory"));
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
      const wrapper = this._label("label", label);
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
      this._status = this._writeMessages().cancelRefresh;
      this._render();
      return;
    }
    this._busy = true;
    this._render();
    try {
      this._states = await this._read();
      this._blocked = false;
      this._confirmation = null;
      this._status = this._writeMessages().refreshed;
    } catch (error) {
      console.error("VH-Inventory touchscreen inventory refresh failed", error);
      this._blocked = true;
      this._status = this._writeMessages().unavailable;
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _print() {
    await vhTouchscreenPrint(this, "vh_print_inventory", "Sending inventory to printer");
  }
}

class VhInventoryQuickStockTouchscreen extends VhInventoryQuickShoppingTouchscreen {
  _gridText() {
    return {
      title: "Quick Stock", add: "VH-Inventory Add Item to Stock", remove: "VH-Inventory Quick Use",
      addEmpty: "No matching products to add to stock.", removeEmpty: "No matching products in stock.",
      refresh: "Refresh inventory",
      unavailable: "Inventory unavailable. Reconnect and refresh before making changes.",
      servicesUnavailable: "Inventory editing services unavailable.",
    };
  }

  _refreshText() {
    return {
      refreshing: "Refreshing inventory",
      refreshed: "Inventory refreshed. Review stock and shopping before trying again.",
      unavailable: this._gridText().unavailable,
    };
  }

  _sectionOrder() { return ["remove", "add"]; }

  _listed(row) { return row.quantity > 0 || row.pendingUse === true; }

  _buttonAction(row, listed) {
    return row.almostOut && listed ? this._t("Confirm used up") : super._buttonAction(row, listed);
  }

  _buttonDetails(row = {}) {
    return row.almostOut && this._listed(row) ? [this._t("Confirm used up")] : [];
  }

  _decorateButton(button, row) {
    if (row.almostOut) {
      const badge = document.createElement("span");
      badge.className = "almost-out-badge";
      badge.textContent = this._t("Almost out");
      button.append(badge);
    }
    if (!this._listed(row)) return;
    button.className = "stock-product";
    const quantity = document.createElement("span");
    quantity.className = "stock-quantity";
    quantity.textContent = String(row.quantity);
    quantity.setAttribute("aria-hidden", "true");
    button.setAttribute("aria-label", `${button.getAttribute("aria-label")}, ${this._t("Stock:")} ${row.quantity}`);
    button.append(quantity);
  }

  _rows(states = this._states) {
    const read = (name) => {
      const sensor = states[`sensor.vh_inventory_${name}`];
      if (!sensor || ["unknown", "unavailable"].includes(sensor.state) || !Array.isArray(sensor.attributes?.[name])) {
        throw new Error(`Quick stock data unavailable: ${name}`);
      }
      return sensor.attributes[name];
    };
    const products = read("products");
    const stock = read("stock");
    const productIds = new Set();
    const stockIds = new Set();
    for (const product of products) {
      if (!Number.isSafeInteger(product.id) || product.id < 1 || productIds.has(product.id) ||
          typeof product.name !== "string" || !product.name.trim() ||
          ![0, 1].includes(product.almost_out)) {
        throw new Error("Invalid quick stock product.");
      }
      productIds.add(product.id);
    }
    for (const row of stock) {
      if (!Number.isSafeInteger(row.id) || row.id < 1 || stockIds.has(row.id) || !productIds.has(row.product_id) ||
          !Number.isSafeInteger(row.quantity) || row.quantity < 0 ||
          (row.location_id != null && (!Number.isSafeInteger(row.location_id) || row.location_id < 1)) ||
          (row.location != null && typeof row.location !== "string")) {
        throw new Error("Invalid quick stock row.");
      }
      stockIds.add(row.id);
    }
    const rows = products.flatMap((product) => {
      const linked = stock.filter((row) => row.product_id === product.id).sort((a, b) => a.id - b.id);
      const common = {
        productId: product.id, name: product.name, barcode: product.barcode == null ? "" : String(product.barcode),
        almostOut: product.almost_out === 1,
        stock: linked.map((row) => ({ id: row.id, quantity: row.quantity, location_id: row.location_id ?? null })),
      };
      const positive = linked.filter((row) => row.quantity > 0);
      return positive.length
        ? positive.map((row) => ({ ...common, id: row.id, quantity: row.quantity,
          location: row.location || "" }))
        : common.almostOut
          ? [{ ...common, id: `pending-${product.id}`, quantity: 0, pendingUse: true },
            { ...common, id: product.id, quantity: 0 }]
          : [{ ...common, id: product.id, quantity: 0 }];
    });
    return rows.sort((a, b) => a.name.localeCompare(b.name, vhTouchscreenLanguage(this)) ||
      a.productId - b.productId || a.id - b.id);
  }

  _servicesAvailable() {
    return Boolean(this._hass?.services?.pyscript?.vh_inventory_touchscreen_scan);
  }

  _canAct() {
    return Boolean(!this.preview && this._hass?.connected && !this._busy && !this._blocked && this._servicesAvailable());
  }

  async _change(id, inStock, expected) {
    if (!this._canAct() || typeof inStock !== "boolean") return;
    let submitted = false;
    try {
      const original = this._rows().find((row) => row.id === id && this._listed(row) === inStock);
      if (!original || (expected && JSON.stringify(expected) !== JSON.stringify(original))) {
        throw new Error("Stock button changed.");
      }
      this._busy = true;
      this._status = "Updating inventory";
      this._render();
      const before = Object.fromEntries((await this._hass.callWS({ type: "get_states" }))
        .map((row) => [row.entity_id, row]));
      const fresh = this._rows(before).find((row) => row.id === id && this._listed(row) === inStock);
      const shoppingBefore = before["sensor.vh_inventory_shopping"];
      if (!shoppingBefore || ["unknown", "unavailable"].includes(shoppingBefore.state) ||
          !Array.isArray(shoppingBefore.attributes?.shopping)) throw new Error("Shopping state unavailable.");
      if (!fresh || JSON.stringify(fresh) !== JSON.stringify(original)) {
        throw new Error("Inventory changed before the tap was submitted.");
      }
      if (!this._hass.connected || this.preview || !this._servicesAvailable()) throw new Error("Stock service unavailable.");
      submitted = true;
      const result = await vhTouchscreenScan(this, {
        product_id: original.productId, action: inStock ? "Use" : "Add",
        ...(inStock && original.quantity > 0 ? { stock_id: id } : {}),
        expected_stock: original.stock, expected_almost_out: original.almostOut ? 1 : 0,
      });
      const states = Object.fromEntries((await this._hass.callWS({ type: "get_states" }))
        .map((row) => [row.entity_id, row]));
      const updated = this._rows(states).find((row) => row.productId === original.productId);
      if (!updated) throw new Error("Stock product no longer available.");
      const actual = updated.stock.filter((row) => row.quantity > 0);
      const shopping = states["sensor.vh_inventory_shopping"];
      if (!shopping || ["unknown", "unavailable"].includes(shopping.state) ||
          !Array.isArray(shopping.attributes?.shopping) ||
          shopping.attributes.shopping.some((row) => row.product_id === original.productId) !== result.on_shopping) {
        throw new Error("Shopping outcome could not be verified.");
      }
      if (result.product_id !== original.productId || !Array.isArray(result.stock) ||
          result.almost_out !== (inStock ? 0 : original.almostOut ? 1 : 0) ||
          result.quantity !== original.stock.reduce((sum, row) => sum + row.quantity, 0) +
            (inStock ? original.almostOut ? 0 : -1 : 1) ||
          updated.almostOut !== Boolean(result.almost_out)) throw new Error("Stock outcome could not be verified.");
      const requested = result.stock.filter((row) => row.quantity > 0);
      if (JSON.stringify(actual) !== JSON.stringify(requested)) throw new Error("Stock change could not be verified.");
      this._states = states;
      this._status = result.audio_requested === false
        ? "Stock processed, but the audio confirmation could not be requested."
        : vhTouchscreenOutcome(result) || "Inventory updated.";
    } catch (error) {
      console.error("VH-Inventory touchscreen quick stock change failed", error);
      this._blocked = true;
      this._status = submitted
        ? "Inventory change uncertain. Do not repeat it. Refresh and check stock and shopping first."
        : "Inventory changed or unavailable. Refresh and check before trying again.";
    } finally {
      this._busy = false;
      this._render();
    }
  }
}

const VH_TOUCHSCREEN_MANAGEMENT = {
  products: { title: "Products", field: "name", label: "Product", add: "Add Product", edit: "Edit Product", service: "product" },
  locations: { title: "Locations", field: "location", label: "Location", add: "Add Location", edit: "Edit Location", service: "location" },
  categories: { title: "Categories", field: "category", label: "Category", add: "Add Category", edit: "Edit Category", service: "category" },
  stores: { title: "Stores", field: "store", label: "Store", add: "Add Store", edit: "Edit Store", service: "store" },
};

class VhInventoryManagementTouchscreen extends VhInventoryStockTouchscreen {
  setConfig(config) {
    if (!Object.hasOwn(VH_TOUCHSCREEN_MANAGEMENT, config.table) || !config.translations?.en ||
        !config.translations?.nl || (config.language && !config.translations[config.language])) {
      throw new Error("Build a supported touchscreen management page first.");
    }
    this._config = config;
    this._table = config.table;
    this._meta = VH_TOUCHSCREEN_MANAGEMENT[this._table];
    this._rowsSignature = null;
    this._confirmationView = null;
    const theme = VH_TOUCHSCREEN_THEME.replace(":root", ":host")
      .replace('html[data-theme="dark"]', ':host([data-theme="dark"])');
    this.setAttribute("data-theme", config.theme === "light" ? "light" : "dark");
    this.shadowRoot.innerHTML = `<style>${theme}${VH_TOUCHSCREEN_STYLE}
      .brand > div { min-width: 0; } h1 { overflow-wrap: anywhere; }
      .table-scroll { overflow-x: auto; } table { width: 100%; border-collapse: collapse; font-size: 19px; }
      th { text-align: left; color: var(--cp-text-muted); font-size: 17px; }
      th:last-child { text-align: center; }
      th, td { padding: 16px 12px; border-bottom: 1px solid var(--cp-border); }
      td:first-child { min-width: 180px; overflow-wrap: anywhere; }
      select, .inline-number { min-height: 68px; padding: 12px; font: inherit;
        border: 1px solid var(--cp-border-strong); border-radius: 10px;
        background: var(--cp-bg-elevated); color: var(--cp-text); }
      td select { width: 170px; } .inline-number { width: 90px; }
      td:nth-child(4) > .table-text { width: 100px; }
      td:nth-child(5) > .table-text { width: 48px; }
      .record-actions, .editor-actions { display: flex; gap: 12px; }
      .record-actions { justify-content: center; }
      .confirmation-actions { display: flex; flex-wrap: wrap; gap: 12px; }
      .editor-actions { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 200px));
        justify-content: end; }
      .record-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 24px; }
      .record-fields label { font-size: 19px; }
      .record-fields input, .record-fields select { width: 100%; margin-top: 8px;
        font-family: inherit; font-size: 21px; font-weight: 400; }
      .record-fields input[type="checkbox"] { width: 28px; min-height: 28px; height: 28px; display: block;
        accent-color: var(--cp-accent); }
      .wide { grid-column: 1 / -1; } .usage { display: block; font-size: 15px; color: var(--cp-text-muted); }
      #record-status[data-state="error"] { color: var(--cp-danger); }
      @media (max-width: 550px) { .record-fields { grid-template-columns: minmax(0, 1fr); }
        .brand { gap: 12px; } .brand-logo { width: 80px; height: 45px; }
        .editor-actions button { min-width: 0; padding: 12px; font-size: 18px; } }
      </style><main>
      <header><div class="brand"><img id="brand-logo" class="brand-logo"
        alt="Van Hemert Home Automation" width="128" height="72">
        <div><div class="eyebrow">VH-INVENTORY</div><h1 id="record-title"></h1></div></div>
        <div class="recovery-slot"><button id="record-refresh" type="button" hidden data-i18n="Refresh records"></button></div></header>
      <section class="panel search-panel"><label for="record-search" data-i18n="Search"></label>
        <div class="input-row"><input id="record-search" type="search" autocomplete="off">
          <button id="record-clear" type="button" data-i18n="Clear search"></button></div></section>
      <p id="record-status" class="feedback-slot" role="status" aria-live="polite"></p>
      <section id="record-editor" class="panel" hidden></section>
      <section id="record-confirmation" class="panel" role="alertdialog" hidden></section>
      <section class="panel"><button id="record-add" type="button"></button>
        <p id="record-empty" hidden data-i18n="No matching records."></p>
        <div class="table-scroll"><table id="record-table"><thead id="record-head"></thead>
          <tbody id="record-rows"></tbody></table></div></section></main>`;
    this.shadowRoot.querySelector("#brand-logo").src = config.logo || "/local/van-hemert-logo-hi.png";
    this.shadowRoot.querySelector("#record-title").textContent = this._t(this._meta.title);
    this.shadowRoot.querySelector("#record-title").dataset.i18n = this._meta.title;
    this.shadowRoot.querySelector("#record-add").textContent = this._t(this._meta.add);
    this.shadowRoot.querySelector("#record-add").dataset.i18n = this._meta.add;
    for (const element of this.shadowRoot.querySelectorAll("[data-i18n]")) element.textContent = this._t(element.dataset.i18n);
    const search = this.shadowRoot.querySelector("#record-search");
    search.value = this._search;
    search.placeholder = this._t(this._table === "products" ? "Search by product name or barcode" : "Search by name");
    search.dataset.i18nPlaceholder = this._table === "products" ? "Search by product name or barcode" : "Search by name";
    search.addEventListener("input", () => { this._search = search.value; this._render(); });
    this.shadowRoot.querySelector("#record-clear").addEventListener("click", () => {
      search.value = this._search = ""; this._render(); search.focus();
    });
    this.shadowRoot.querySelector("#record-add").addEventListener("click", () => this._openEditor());
    this.shadowRoot.querySelector("#record-refresh").addEventListener("click", () => this._refresh());
    const head = document.createElement("tr");
    const labels = this._table === "products"
      ? ["Product", "Barcode", "Manufacturer", "Unit", "AutoAdd", "Thr.", "Qty", "Category", "Store", "Action"]
      : [this._meta.label, "Action"];
    for (const label of labels) {
      const th = this._label("th", label);
      th.scope = "col";
      head.append(th);
    }
    this.shadowRoot.querySelector("#record-head").append(head);
    this._render();
  }

  _writeMessages() {
    return {
      updating: "Updating records", updated: "Records updated.",
      uncertain: "Change uncertain. Do not repeat it. Cancel editing, refresh and review the records first.",
      changed: "Records changed or unavailable. Cancel editing, refresh and review before trying again.",
      cancelRefresh: "Cancel editing before refreshing.", refreshed: "Records refreshed. Review before trying again.",
      unavailable: "Records unavailable. Reconnect and refresh before making changes.",
    };
  }

  _data(states = this._states) {
    const data = super._data(states);
    for (const product of data.products) {
      if ((product.description != null && typeof product.description !== "string") ||
          [product.auto_add_enabled, product.auto_add_threshold, product.auto_add_quantity]
            .some((value) => value != null && (!Number.isSafeInteger(value) || value < 0)) ||
          (product.auto_add_enabled != null && ![0, 1].includes(product.auto_add_enabled))) {
        throw new Error("Invalid product settings.");
      }
    }
    if (this._table === "products") {
      const sensor = states["sensor.vh_inventory_shopping"];
      if (!sensor || ["unknown", "unavailable"].includes(sensor.state) || !Array.isArray(sensor.attributes?.shopping)) {
        throw new Error("Shopping dependencies unavailable.");
      }
      const ids = new Set();
      data.shopping = sensor.attributes.shopping;
      for (const row of data.shopping) {
        if (!Number.isSafeInteger(row.id) || row.id < 1 || ids.has(row.id) ||
            !Number.isSafeInteger(row.quantity) || row.quantity < 1 ||
            (row.product_id !== null && !data.products.some((p) => p.id === row.product_id))) {
          throw new Error("Invalid shopping dependency.");
        }
        ids.add(row.id);
      }
    }
    return data;
  }

  _rows(data = this._data()) {
    const query = this._normalize(this._search);
    return data[this._table].filter((row) => this._normalize(row[this._meta.field]).includes(query) ||
      (this._table === "products" && this._normalize(row.barcode).includes(query)))
      .sort((a, b) => a[this._meta.field].localeCompare(b[this._meta.field], vhTouchscreenLanguage(this)) || a.id - b.id);
  }

  _canAct() {
    if (!this._meta || this.preview || !this._hass?.connected || this._busy || this._blocked) return false;
    const required = [`vh_inventory_add_${this._meta.service}`, "vh_inventory_delete",
      this._table === "products" ? "vh_inventory_update_product" : "vh_inventory_update_simple"];
    if (this._table === "products") required.push("vh_inventory_set_product_field");
    if (!required.every((name) => this._hass.services?.pyscript?.[name])) return false;
    try { this._data(); return true; }
    catch (error) { console.error("VH-Inventory management data unavailable", error); return false; }
  }

  _canDelete() {
    return this._canAct() && (this._table === "products" ||
      Boolean(this._hass.services.pyscript.vh_inventory_delete.fields?.require_unused));
  }

  _record(row) {
    if (this._table !== "products") return { id: row.id, value: row[this._meta.field] };
    return {
      id: row.id, name: row.name, barcode: row.barcode == null || row.barcode === "" ? null : Number(row.barcode),
      manufacturer: row.manufacturer || "", unit: row.unit || "", description: row.description || "",
      category_id: row.category_id ?? null, store_id: row.store_id ?? null,
      auto_add_enabled: row.auto_add_enabled ?? 0, auto_add_threshold: row.auto_add_threshold ?? 0,
      auto_add_quantity: row.auto_add_quantity ?? 1,
    };
  }

  _usage(data, id) {
    if (this._table === "products") return {
      stock: data.stock.filter((row) => row.product_id === id)
        .map((row) => ({ id: row.id, quantity: row.quantity, location_id: row.location_id ?? null })).sort((a, b) => a.id - b.id),
      shopping: data.shopping.filter((row) => row.product_id === id)
        .map((row) => ({ id: row.id, quantity: row.quantity })).sort((a, b) => a.id - b.id),
    };
    const rows = this._table === "locations" ? data.stock : data.products;
    return rows.filter((row) => row[`${this._meta.field}_id`] === id).map((row) => row.id).sort((a, b) => a - b);
  }

  _render() {
    if (!this._meta || !this.shadowRoot.querySelector("#record-title")) return;
    vhTouchscreenTranslate(this);
    let data, rows = [], error = false;
    try { data = this._data(); rows = this._rows(data); } catch (failure) { error = true; }
    const connected = !this.preview && this._hass?.connected;
    const canAct = !error && this._canAct();
    const idle = canAct && !this._editor && !this._confirmation;
    const status = this.shadowRoot.querySelector("#record-status");
    status.textContent = this._t(error ? this._writeMessages().unavailable : !connected ? "Home Assistant unavailable" :
      this._status || (!this._busy && !this._blocked && !canAct ? "Record editing services unavailable." :
        this._table !== "products" && !this._hass.services?.pyscript?.vh_inventory_delete?.fields?.require_unused
          ? "Guarded deletion unavailable. Update the backend." : ""));
    status.dataset.state = error || !connected || this._blocked ? "error" : "ready";
    vhTouchscreenTextSlot(status);
    const refresh = this.shadowRoot.querySelector("#record-refresh");
    refresh.hidden = !error && connected && !this._blocked;
    refresh.disabled = !connected || this._busy;
    this.shadowRoot.querySelector("#record-add").disabled = !idle;
    this.shadowRoot.querySelector("#record-empty").hidden = error || rows.length > 0;
    this.shadowRoot.querySelector("#record-table").hidden = error || !rows.length;
    const signature = JSON.stringify([rows, data?.categories, data?.stores, data?.products, data?.stock, idle,
      this._canDelete(), vhTouchscreenLanguage(this)]);
    if (signature !== this._rowsSignature) {
      this._rowsSignature = signature;
      const elements = rows.map((row) => {
        const tr = document.createElement("tr");
        tr.dataset.id = String(row.id);
        const name = this._text("td", row[this._meta.field]);
        const used = this._table !== "products" && this._usage(data, row.id).length > 0;
        if (used) {
          const usage = this._label("span", "In use", "", `: ${this._usage(data, row.id).length}`);
          usage.className = "usage";
          name.firstChild.append(usage);
          vhTouchscreenTextSlot(name.firstChild);
        }
        tr.append(name);
        if (this._table === "products") {
          for (const value of [row.barcode ?? "", row.manufacturer || "", row.unit || "",
            row.auto_add_enabled === 1 ? "\u2713" : "\u2717"]) tr.append(this._text("td", String(value)));
          for (const field of ["auto_add_threshold", "auto_add_quantity", "category", "store"]) {
            const cell = document.createElement("td");
            const select = ["category", "store"].includes(field);
            const control = document.createElement(select ? "select" : "input");
            vhTouchscreenAttribute(this, control, "aria-label", { category: "Category", store: "Store",
              auto_add_threshold: "Auto-Add threshold", auto_add_quantity: "Auto-Add quantity" }[field], `: ${row.name}`);
            control.dataset.field = field;
            if (select) this._options(control, field === "category" ? data.categories : data.stores, field, row[`${field}_id`]);
            else {
              control.type = "number"; control.className = "inline-number";
              control.min = field === "auto_add_threshold" ? "0" : "1"; control.max = "999"; control.step = "1";
              control.value = String(row[field] ?? (field === "auto_add_threshold" ? 0 : 1));
            }
            control.disabled = !idle;
            control.addEventListener("change", () => this._setField(row.id, field, control.value));
            cell.append(control);
            tr.append(cell);
          }
        }
        const cell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "record-actions";
        const remove = this._iconButton("Remove item", () => this._remove(row.id),
          !idle || used || !this._canDelete(), row[this._meta.field]);
        if (used) vhTouchscreenAttribute(this, remove, "title", "Cannot delete a record that is in use.");
        actions.append(this._editButton(() => this._openEditor(row.id), !idle, row[this._meta.field]), remove);
        cell.append(actions); tr.append(cell);
        return tr;
      });
      this.shadowRoot.querySelector("#record-rows").replaceChildren(...elements);
    }
    const confirmation = this.shadowRoot.querySelector("#record-confirmation");
    confirmation.hidden = !this._confirmation;
    if (this._confirmation) {
      const pending = this._confirmation;
      if (this._confirmationView?.pending !== pending) {
        const actions = this._text("div", "");
        actions.className = "confirmation-actions";
        const cancel = this._button("Cancel", () => { this._confirmation = null; this._render(); });
        const confirm = this._button("Confirm removal", pending.run);
        const detail = this._text("p", "");
        actions.append(cancel, confirm);
        confirmation.replaceChildren(this._label("p", pending.message, "", ` ${pending.name}`), detail, actions);
        this._confirmationView = { pending, detail, cancel, confirm };
      }
      const view = this._confirmationView;
      view.detail.textContent = pending.counts
        ? `${this._t("Inventory")}: ${pending.counts.stock}; ${this._t("Shopping")}: ${pending.counts.shopping}` : pending.detail;
      view.cancel.disabled = this._busy;
      view.confirm.disabled = !canAct;
    } else {
      this._confirmationView = null;
    }
    const editor = this.shadowRoot.querySelector("#record-editor");
    editor.hidden = !this._editor;
    for (const control of editor.querySelectorAll("input,select,button")) {
      control.disabled = control.id === "record-cancel" ? this._busy : !canAct || Boolean(this._confirmation);
    }
  }

  _openEditor(id = null) {
    if (!this._canAct() || this._editor || this._confirmation) return;
    const data = this._data();
    const row = id === null ? null : data[this._table].find((record) => record.id === id);
    if (id !== null && !row) return;
    const original = row ? this._record(row) : null;
    const values = this._table === "products" ? {
      name: original?.name ?? "", barcode: String(original?.barcode ?? ""),
      manufacturer: original?.manufacturer ?? "", unit: original?.unit ?? "", description: original?.description ?? "",
      category_id: String(original?.category_id ?? ""), store_id: String(original?.store_id ?? ""),
      auto_add_enabled: original?.auto_add_enabled ?? 0, auto_add_threshold: String(original?.auto_add_threshold ?? 1),
      auto_add_quantity: String(original?.auto_add_quantity ?? 1),
    } : { value: original?.value ?? "" };
    this._editor = { id, original, values };
    this._buildEditor(data);
    this._render();
    this.shadowRoot.querySelector("#record-editor")?.scrollIntoView({ block: "nearest" });
  }

  _buildEditor(data) {
    const host = this.shadowRoot.querySelector("#record-editor");
    if (!host) return;
    host.replaceChildren(this._label("h2", this._editor.id === null ? this._meta.add : this._meta.edit));
    const form = document.createElement("form");
    form.className = "record-fields";
    const fields = this._table === "products" ? [
      ["barcode", "Barcode", "text"], ["name", "Product", "text"],
      ["manufacturer", "Manufacturer", "text"], ["store_id", "Store", "select"],
      ["category_id", "Category", "select"], ["unit", "Unit", "text"],
      ["description", "VH Product Description", "text"], ["auto_add_enabled", "AutoAdd", "checkbox"],
      ["auto_add_threshold", "Auto-Add threshold", "number"], ["auto_add_quantity", "Auto-Add quantity", "number"],
    ] : [["value", this._meta.label, "text"]];
    for (const [field, label, type] of fields) {
      const wrapper = this._label("label", label);
      if (["description", "auto_add_enabled"].includes(field)) wrapper.className = "wide";
      const input = document.createElement(type === "select" ? "select" : "input");
      input.name = field;
      if (type === "select") {
        this._options(input, field === "category_id" ? data.categories : data.stores,
          field === "category_id" ? "category" : "store", this._editor.values[field]);
      } else {
        input.type = type;
        if (type === "checkbox") input.checked = this._editor.values[field] === 1;
        else input.value = this._editor.values[field];
        if (type === "number") {
          input.min = field === "auto_add_quantity" ? "1" : "0"; input.max = "999"; input.step = "1"; input.required = true;
        } else if (type === "text") input.maxLength = field === "barcode" ? 15 : 255;
        if (["name", "value"].includes(field)) input.required = true;
        if (field === "barcode") { input.inputMode = "numeric"; input.pattern = "[0-9]{0,15}"; }
      }
      input.addEventListener(["select", "checkbox"].includes(type) ? "change" : "input", () => {
        this._editor.values[field] = type === "checkbox" ? (input.checked ? 1 : 0) : input.value;
      });
      wrapper.append(input); form.append(wrapper);
    }
    const actions = document.createElement("div");
    actions.className = "editor-actions";
    const save = this._button("Save", () => {}); save.type = "submit";
    const cancel = this._button("Cancel editing", () => {
      if (this._busy) return;
      this._editor = null; this._confirmation = null;
      if (!this._blocked) this._status = "";
      this._render();
    });
    cancel.id = "record-cancel";
    actions.append(save, cancel); form.append(actions);
    form.addEventListener("submit", (event) => { event.preventDefault(); this._save(); });
    host.append(form);
  }

  _validate(values, data, id) {
    const name = (this._table === "products" ? values.name : values.value).trim();
    if (!name || name === "(none)" || name.length > 255) throw new Error("Enter a name of up to 255 characters.");
    const original = data[this._table].find((row) => row.id === id);
    if (original?.[this._meta.field] !== name && data[this._table].some((row) =>
      row.id !== id && row[this._meta.field].toLocaleLowerCase() === name.toLocaleLowerCase())) {
      throw new Error("A record with this name already exists.");
    }
    if (this._table !== "products") return { value: name };
    const barcode = values.barcode.trim();
    if ((barcode && !/^\d{1,15}$/.test(barcode)) ||
        [values.manufacturer, values.unit, values.description].some((value) => value.length > 255) ||
        ![0, 1].includes(values.auto_add_enabled) ||
        !/^\d+$/.test(values.auto_add_threshold) || Number(values.auto_add_threshold) > 999 ||
        !/^\d+$/.test(values.auto_add_quantity) || Number(values.auto_add_quantity) < 1 ||
        Number(values.auto_add_quantity) > 999) throw new Error("Enter valid product fields and Auto-Add values from 0/1 to 999.");
    const numericBarcode = barcode ? Number(barcode) : null;
    if (numericBarcode !== null && (!original || this._record(original).barcode !== numericBarcode) &&
        data.products.some((row) => row.id !== id && row.barcode != null &&
      row.barcode !== "" && Number(row.barcode) === numericBarcode)) throw new Error("Barcode already belongs to another product.");
    this._name(data.categories, values.category_id, "category");
    this._name(data.stores, values.store_id, "store");
    return { name, barcode: numericBarcode, manufacturer: values.manufacturer, unit: values.unit,
      description: values.description, category_id: values.category_id === "" ? null : Number(values.category_id),
      store_id: values.store_id === "" ? null : Number(values.store_id), auto_add_enabled: values.auto_add_enabled,
      auto_add_threshold: Number(values.auto_add_threshold), auto_add_quantity: Number(values.auto_add_quantity) };
  }

  async _save() {
    if (!this._canAct() || !this._editor || this._confirmation) return;
    const editor = this._editor;
    const values = { ...editor.values };
    try { this._validate(values, this._data(), editor.id); }
    catch (error) { this._status = error.message; this._render(); return; }
    await this._write((before, current) => {
      const proposed = this._validate(values, current, editor.id);
      const row = current[this._table].find((item) => item.id === editor.id);
      if (editor.id !== null && (!row || JSON.stringify(this._record(row)) !== JSON.stringify(editor.original))) {
        throw new Error("Record changed before saving.");
      }
      const product = this._table === "products";
      const service = editor.id === null ? `vh_inventory_add_${this._meta.service}` :
        product ? "vh_inventory_update_product" : "vh_inventory_update_simple";
      const payload = product ? { ...proposed, category: this._name(current.categories, values.category_id, "category"),
        store: this._name(current.stores, values.store_id, "store") } :
        editor.id === null ? { [this._meta.field]: proposed.value } : { table: this._table, value: proposed.value };
      if (product) { delete payload.category_id; delete payload.store_id; }
      if (editor.id !== null) payload.id = editor.id;
      const unchanged = editor.id !== null && Object.entries(proposed).every(([key, value]) => this._record(row)[key] === value);
      const oldIds = new Set(current[this._table].map((item) => item.id));
      return { calls: unchanged ? [] : [{ service, data: payload }], verify: (after) => {
        const candidates = editor.id === null ? after[this._table].filter((item) => !oldIds.has(item.id) &&
          item[this._meta.field] === (product ? proposed.name : proposed.value)) :
          after[this._table].filter((item) => item.id === editor.id);
        return candidates.length === 1 && Object.entries(proposed).every(([key, value]) =>
          product && editor.id === null && key === "category_id" && value === null ||
          this._record(candidates[0])[key] === value);
      } };
    });
  }

  async _setField(id, field, value) {
    if (!this._canAct() || this._table !== "products" || this._editor || this._confirmation ||
        !["category", "store", "auto_add_threshold", "auto_add_quantity"].includes(field)) return;
    const numeric = field.startsWith("auto_add_");
    if (numeric && (!/^\d+$/.test(value) || Number(value) < (field === "auto_add_quantity" ? 1 : 0) || Number(value) > 999)) {
      this._status = "Enter valid product fields and Auto-Add values from 0/1 to 999.";
      this._rowsSignature = null; this._render(); return;
    }
    const key = numeric ? field : `${field}_id`;
    await this._write((before, current) => {
      const original = before.products.find((row) => row.id === id);
      const fresh = current.products.find((row) => row.id === id);
      if (!original || !fresh || original.name !== fresh.name || this._record(original)[key] !== this._record(fresh)[key]) {
        throw new Error("Inline product field changed.");
      }
      const requested = numeric ? Number(value) : value === "" ? null : Number(value);
      const serviceValue = numeric ? requested : this._name(field === "category" ? current.categories : current.stores, value, field);
      return { calls: [{ service: "vh_inventory_set_product_field", data: { id, field, value: serviceValue } }],
        verify: (after) => {
          const row = after.products.find((item) => item.id === id);
          return Boolean(row && this._record(row)[key] === requested);
        } };
    });
  }

  async _remove(id, expected = null) {
    if (!this._canDelete() || this._editor || (this._confirmation && !expected)) return;
    const data = this._data();
    const row = data[this._table].find((item) => item.id === id);
    if (!row) return;
    const usage = this._usage(data, id);
    if (this._table !== "products" && usage.length) {
      this._status = "Cannot delete a record that is in use."; this._render(); return;
    }
    if (!expected) {
      const captured = { row: this._record(row), usage };
      this._confirmation = { name: row[this._meta.field],
        message: this._table === "products" ? "Delete this product and all its stock and shopping entries?" : "Delete this record?",
        detail: this._table === "products" ? `${this._t("Inventory")}: ${usage.stock.length}; ${this._t("Shopping")}: ${usage.shopping.length}` : "",
        counts: this._table === "products" ? { stock: usage.stock.length, shopping: usage.shopping.length } : null,
        run: () => this._remove(id, captured) };
      this._render(); return;
    }
    await this._write((before, current) => {
      const fresh = current[this._table].find((item) => item.id === id);
      if (!fresh || JSON.stringify(this._record(fresh)) !== JSON.stringify(expected.row) ||
          JSON.stringify(this._usage(current, id)) !== JSON.stringify(expected.usage)) throw new Error("Deletion dependencies changed.");
      return { calls: [{ service: "vh_inventory_delete", data: this._table === "products" ? { table: this._table, id } :
        { table: this._table, id, require_unused: true, expected_value: expected.row.value } }],
      verify: (after) => !after[this._table].some((item) => item.id === id) && (this._table !== "products" ||
        !after.stock.some((item) => item.product_id === id) && !after.shopping.some((item) => item.product_id === id)) };
    });
  }
}

async function vhTouchscreenReadback(card, plan) {
  for (let attempt = 0; attempt < 11; attempt += 1) {
    const states = await card._read();
    if (plan.verify(card._data(states))) return states;
    if (attempt < 10) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Control change could not be verified.");
}

class VhInventoryConfigurationTouchscreen extends VhInventoryStockTouchscreen {
  setConfig(config) {
    if (!config.translations?.en || !config.translations?.nl || config.configuration?.version !== 1 ||
        !Array.isArray(config.configuration.sections) || !Array.isArray(config.configuration.scanners?.sections)) {
      throw new Error("Rebuild the touchscreen configuration schema first.");
    }
    this._config = config;
    this._fields = new Map();
    this._controls = new Map();
    this._speakers = null;
    this._discoveryBusy = false;
    this._discoveryError = false;
    this._selectionControls = new Map();
    this._selections = [
      { id: "speakers", title: "Sonos speakers for TTS announcements", helper: "input_text.vh_tts_media_players",
        service: "vh_inventory_tts_toggle_player", parameter: "player" },
      { id: "notifications", title: "Mobile devices for notifications", helper: "input_text.vh_notify_devices",
        service: "vh_inventory_notify_toggle_device", parameter: "device" },
    ];
    const theme = VH_TOUCHSCREEN_THEME.replace(":root", ":host")
      .replace('html[data-theme="dark"]', ':host([data-theme="dark"])');
    this.setAttribute("data-theme", config.theme === "light" ? "light" : "dark");
    this.shadowRoot.innerHTML = `<style>${theme}${VH_TOUCHSCREEN_STYLE}
      .brand > div { min-width: 0; } h1 { overflow-wrap: anywhere; }
      .configuration-sections { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 24px; }
      .configuration-sections .panel { margin: 0; min-width: 0; }
      h2 { font-size: 26px; font-weight: 500; margin: 0 0 16px; }
      button { font-weight: 500; }
      .setting-row { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr);
        gap: 16px; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--cp-border); }
      .setting-label { font-size: 19px; overflow-wrap: anywhere; }
      .setting-control { min-width: 0; min-height: 68px; display: grid;
        grid-template-columns: minmax(0,1fr) min(200px,55%); gap: 12px; align-items: center; }
      .setting-control > button { width: 100%; height: 68px; padding: 10px;
        font-size: 18px; line-height: 1.2; overflow-wrap: anywhere; }
      .setting-control > button.action-icon { width: 68px; justify-self: end; }
      .setting-value { min-width: 0; height: 3em; line-height: 1.5; white-space: pre-wrap; font-size: 18px; }
      .hint { font-size: 16px; color: var(--cp-text-muted); overflow-wrap: anywhere; }
      .target-buttons { display: flex; flex-wrap: wrap; gap: 12px; height: 228px;
        overflow: auto; align-content: flex-start; scrollbar-width: none; }
      .target-buttons::-webkit-scrollbar { display: none; }
      .target-buttons button { width: 200px; max-width: 100%; height: 68px; font-size: 18px;
        white-space: normal; overflow-wrap: anywhere; overflow: auto; }
      .scanner-scroll { overflow-x: auto; } table { border-collapse: collapse; width: 100%; min-width: 1120px; }
      th,td { text-align: left; padding: 14px 12px; border-bottom: 1px solid var(--cp-border); width: 25%; }
      th { font-size: 18px; } .scanner-section th { color: var(--cp-accent); }
      #configuration-status[data-state="error"] { color: var(--cp-danger); }
      .setting-form { display: grid; gap: 20px; }
      .setting-form input,.setting-form select { width: 100%; min-height: 68px; padding: 12px;
        border: 1px solid var(--cp-border-strong); border-radius: 10px; background: var(--cp-bg-elevated);
        color: var(--cp-text); font-family: inherit; font-size: 21px; font-weight: 400; }
      .setting-actions { display: grid; grid-template-columns: repeat(2,minmax(0,200px)); gap:12px; justify-content:end; }
      @media (max-width:1000px) { .configuration-sections { grid-template-columns: minmax(0,1fr); } }
      @media (max-width:550px) { .setting-row { grid-template-columns:minmax(0,1fr); }
        .setting-control { grid-template-columns: minmax(0,1fr); grid-template-rows: 54px 68px; }
        .brand { gap:12px; } .brand-logo { width:80px; height:45px; }
        h1 { font-size:24px; }
        .setting-actions button { min-width:0; padding:12px; font-size:18px; } }
      </style><main><header><div class="brand"><img id="configuration-logo" class="brand-logo"
        alt="Van Hemert Home Automation" width="128" height="72"><div><div class="eyebrow">VH-INVENTORY</div>
        <h1>Configuration</h1></div></div><button id="configuration-refresh" type="button"></button></header>
      <p id="configuration-scope" data-i18n="Language is shared by both dashboards. ID columns and Hide header (kiosk) apply only to the main dashboard. Full screen applies to all Keuken Touchscreen browsers."></p>
      <p id="configuration-status" class="feedback-slot" role="status" aria-live="polite"></p>
      <section id="configuration-editor" class="panel" hidden></section>
      <section id="configuration-confirmation" class="panel" role="alertdialog" hidden></section>
      <div class="configuration-sections"></div><section id="scanner-settings" class="panel"></section></main>`;
    this.shadowRoot.querySelector("#configuration-logo").src = config.logo || "/local/van-hemert-logo-hi.png";
    this.shadowRoot.querySelector("#configuration-scope").textContent = this._t(
      "Language is shared by both dashboards. ID columns and Hide header (kiosk) apply only to the main dashboard. Full screen applies to all Keuken Touchscreen browsers.");
    const refresh = this.shadowRoot.querySelector("#configuration-refresh");
    refresh.textContent = this._t("Refresh configuration");
    refresh.dataset.i18n = "Refresh configuration";
    refresh.addEventListener("click", () => this._refresh());
    const groups = this.shadowRoot.querySelector(".configuration-sections");
    for (const section of config.configuration.sections) {
      const panel = document.createElement("section");
      panel.className = "panel";
      panel.append(this._label("h2", section.title));
      for (const field of section.fields) {
        const row = document.createElement("div");
        row.className = "setting-row";
        row.append(this._label("span", field.name));
        row.firstChild.className = "setting-label";
        this._addControl(row, field);
        panel.append(row);
      }
      for (const hint of section.hints || []) {
        const text = this._label("p", hint);
        text.className = "hint"; panel.append(text);
      }
      const selection = section.id === "tts" ? this._selections[0] :
        section.id === "notifications" ? this._selections[1] : null;
      if (selection) {
        panel.append(this._label("h3", selection.title));
        const buttons = document.createElement("div");
        buttons.className = "target-buttons";
        this._selectionControls.set(selection.id, buttons); panel.append(buttons);
      }
      groups.append(panel);
    }
    const scanner = this.shadowRoot.querySelector("#scanner-settings");
    scanner.append(this._label("h2", "Scanner configuration"));
    const scroll = document.createElement("div"); scroll.className = "scanner-scroll";
    const table = document.createElement("table");
    const header = document.createElement("tr");
    for (const label of ["Setting name", ...config.configuration.scanners.devices]) {
      const th = this._label("th", label); th.scope = "col"; header.append(th);
    }
    const thead = document.createElement("thead"); thead.append(header); table.append(thead);
    const body = document.createElement("tbody");
    for (const section of config.configuration.scanners.sections) {
      const tr = document.createElement("tr"); tr.className = "scanner-section";
      const th = this._label("th", section.title); th.colSpan = 4; tr.append(th); body.append(tr);
      for (const row of section.rows) {
        const tr = document.createElement("tr");
        const name = this._label("th", row.name); name.scope = "row"; tr.append(name);
        row.entities.forEach((entity, index) => {
          const td = document.createElement("td");
          if (entity) this._addControl(td, { entity, name: row.name, device: config.configuration.scanners.devices[index] });
          tr.append(td);
        });
        body.append(tr);
      }
    }
    table.append(body); scroll.append(table); scanner.append(scroll);
    this._render();
  }

  _addControl(parent, field) {
    if (!/^(input_(boolean|number|select|text)\.vh_[a-z0-9_]+|counter\.vh_[a-z0-9_]+|(switch|light|number|select|text|event|sensor)\.(barcode_0[12]|scanner_01)_[a-z0-9_]+)$/.test(field.entity) ||
        this._fields.has(field.entity)) throw new Error("Unsupported or duplicate configuration entity.");
    this._fields.set(field.entity, field);
    const host = document.createElement("div"); host.className = "setting-control";
    host.dataset.setting = field.entity;
    this._controls.set(field.entity, { host, signature: null });
    parent.append(host);
  }

  _writeMessages() {
    return {
      updating: "Updating configuration", updated: "Configuration updated.",
      uncertain: "Configuration change uncertain. Do not repeat it. Cancel editing, refresh and check the setting first.",
      changed: "Configuration changed or unavailable. Cancel editing, refresh and check before trying again.",
      cancelRefresh: "Cancel editing before refreshing.", refreshed: "Configuration refreshed. Review settings before trying again.",
      unavailable: "Configuration unavailable. Reconnect and refresh before making changes.",
    };
  }

  _data(states = this._states) {
    return Object.fromEntries([...this._fields.keys(), ...this._selections.map((item) => item.helper)]
      .map((entity) => [entity, states?.[entity] || null]));
  }

  _canAct() { return Boolean(this._fields && !this.preview && this._hass?.connected && !this._busy && !this._blocked); }

  _info(entity, data = this._data()) {
    const row = data[entity], domain = entity.split(".")[0], attrs = row?.attributes || {};
    if (!row || typeof row.state !== "string" || ["unavailable", "unknown"].includes(row.state)) return { available: false };
    const info = { available: true, domain, value: row.state, attrs };
    if (["input_boolean", "switch", "light"].includes(domain) && ["on", "off"].includes(row.state)) info.type = "boolean";
    if (["input_select", "select"].includes(domain) && Array.isArray(attrs.options) &&
        attrs.options.every((option) => typeof option === "string") && attrs.options.includes(row.state)) info.type = "select";
    if (["input_number", "number"].includes(domain) && [attrs.min, attrs.max, attrs.step].every(Number.isFinite) &&
        attrs.min <= attrs.max && attrs.step > 0 && row.state !== "" && Number.isFinite(Number(row.state))) info.type = "number";
    if (["input_text", "text"].includes(domain) && attrs.mode !== "password" &&
        Number.isSafeInteger(attrs.min) && Number.isSafeInteger(attrs.max) && attrs.min >= 0 && attrs.max >= attrs.min) info.type = "text";
    const service = info.type === "boolean" ? (info.value === "on" ? "turn_off" : "turn_on") :
      info.type === "select" ? "select_option" : "set_value";
    info.editable = Boolean(info.type && this._hass?.services?.[domain]?.[service]);
    return info;
  }

  _snapshot(entity, data) {
    const info = this._info(entity, data);
    return JSON.stringify({ value: info.value, type: info.type, options: info.attrs?.options,
      min: info.attrs?.min, max: info.attrs?.max, step: info.attrs?.step, mode: info.attrs?.mode });
  }

  _render() {
    if (!this._fields || !this.shadowRoot.querySelector("#configuration-status")) return;
    vhTouchscreenTranslate(this);
    const data = this._data(), canAct = this._canAct(), idle = canAct && !this._editor && !this._confirmation;
    const status = this.shadowRoot.querySelector("#configuration-status");
    status.textContent = this._t(!this._hass?.connected || this.preview ? "Home Assistant unavailable" :
      this._status || (this._discoveryError ? "Speaker discovery unavailable. Refresh configuration to try again." : ""));
    status.dataset.state = this._blocked || !this._hass?.connected || this._discoveryError ? "error" : "ready";
    vhTouchscreenTextSlot(status);
    this.shadowRoot.querySelector("#configuration-refresh").disabled = !this._hass?.connected || this.preview || this._busy;
    for (const [entity, control] of this._controls) {
      const info = this._info(entity, data);
      const signature = JSON.stringify([info, idle, vhTouchscreenLanguage(this)]);
      if (signature === control.signature) continue;
      control.signature = signature;
      const value = this._text("span", info.available ? info.attrs.mode === "password" ? this._t("Protected value") :
        info.type === "boolean" ? this._t(info.value === "on" ? "On" : "Off") : info.value : this._t("Unavailable"));
      value.className = "setting-value text-slot";
      vhTouchscreenTextSlot(value);
      const children = [value];
      if (info.type) {
        const field = this._fields.get(entity);
        const name = `${field.device ? `${field.device}: ` : ""}${this._t(field.name)}`;
        const disabled = !idle || !info.editable;
        const button = info.type === "boolean"
          ? this._button(info.value === "on" ? "Turn off" : "Turn on", () => this._toggle(entity), disabled)
          : this._editButton(() => this._openEditor(entity), disabled, name);
        if (info.type === "boolean") button.setAttribute("aria-label", `${name}: ${button.textContent}`);
        children.push(button);
      }
      control.host.replaceChildren(...children);
    }
    for (const selection of this._selections) {
      const host = this._selectionControls.get(selection.id);
      if (!host) continue;
      const targets = selection.id === "speakers" ? this._speakers : this._notificationTargets();
      const tokens = this._tokens(data[selection.helper]);
      const signature = JSON.stringify([targets, tokens, idle, Boolean(this._hass?.services?.pyscript?.[selection.service]),
        vhTouchscreenLanguage(this)]);
      if (host.dataset.signature === signature) continue;
      host.dataset.signature = signature;
      host.replaceChildren(...(targets?.length ? targets.map((target) => {
        const button = this._button(target.label, () => this._toggleTarget(selection.id, target.value),
          !idle || tokens === null || !this._hass?.services?.pyscript?.[selection.service], false);
        button.title = target.label;
        button.setAttribute("aria-pressed", String(tokens?.includes(target.value) || false)); return button;
      }) : [this._text("p", this._t(selection.id === "speakers" && this._speakers === null ?
        this._discoveryError ? "Speaker discovery unavailable. Refresh configuration to try again." :
          "Loading speaker choices" : selection.id === "speakers" ? "No Sonos players found." : "No mobile devices found."))]));
    }
    const editor = this.shadowRoot.querySelector("#configuration-editor");
    editor.hidden = !this._editor;
    for (const control of editor.querySelectorAll("input,select,button")) {
      control.disabled = control.id === "configuration-cancel" ? this._busy : !canAct;
    }
    const confirmation = this.shadowRoot.querySelector("#configuration-confirmation");
    confirmation.hidden = !this._confirmation;
    if (this._confirmation) confirmation.replaceChildren(
      this._text("p", this._t("This control can start a real print job. Continue?")),
      this._button("Cancel", () => { this._confirmation = null; this._render(); }, this._busy),
      this._button("Confirm", this._confirmation.run, !canAct));
  }

  async activate(force = false) {
    if (!this._hass?.connected || this.preview || this._discoveryBusy ||
        (!force && (this._speakers !== null || this._discoveryError))) return;
    this._discoveryBusy = true;
    try {
      const registry = await this._hass.callWS({ type: "config/entity_registry/list" });
      if (!Array.isArray(registry)) throw new Error("Invalid speaker registry response.");
      const rows = registry.filter((row) => row.platform === "sonos" && /^media_player\.[a-z0-9_]+$/.test(row.entity_id));
      const names = rows.map((row) => this._hass.states?.[row.entity_id]?.attributes?.friendly_name || row.entity_id.split(".")[1]);
      this._speakers = rows.map((row, index) => ({ value: row.entity_id,
        label: names.filter((name) => name === names[index]).length > 1 ? `${names[index]} (${row.entity_id.split(".")[1]})` : names[index] }))
        .sort((a, b) => a.label.localeCompare(b.label));
      this._discoveryError = false;
    } catch (error) {
      console.error("VH-Inventory configuration speaker discovery failed", error);
      this._discoveryError = true;
    } finally { this._discoveryBusy = false; this._render(); }
  }

  _notificationTargets() {
    return Object.entries(this._hass?.services?.notify || {}).filter(([name]) => /^mobile_app_[a-z0-9_]+$/.test(name))
      .map(([value, service]) => ({ value, label: service.name || value.replace(/^mobile_app_/, "").replaceAll("_", " ") }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  _tokens(row) {
    if (!row || typeof row.state !== "string" || ["unknown", "unavailable"].includes(row.state)) return null;
    return row.state.split(",").map((value) => value.trim()).filter(Boolean).sort();
  }

  _openEditor(entity) {
    if (!this._canAct() || this._editor || this._confirmation || !this._fields.has(entity)) return;
    const data = this._data(), info = this._info(entity, data);
    if (!info.editable || !["text", "number", "select"].includes(info.type)) return;
    this._editor = { entity, original: this._snapshot(entity, data), values: { value: info.value } };
    this._buildEditor(info);
    this._render();
    this.shadowRoot.querySelector("#configuration-editor")?.scrollIntoView({ block: "nearest" });
  }

  _buildEditor(info) {
    const host = this.shadowRoot.querySelector("#configuration-editor");
    if (!host) return;
    const field = this._fields.get(this._editor.entity);
    host.replaceChildren(this._label("h2", field.name, field.device ? `${field.device}: ` : ""));
    const form = document.createElement("form"); form.className = "setting-form";
    const label = this._label("label", "Value");
    const input = document.createElement(info.type === "select" ? "select" : "input");
    input.name = "value";
    if (info.type === "select") {
      for (const value of info.attrs.options) { const option = this._text("option", value); option.value = value; input.append(option); }
    } else {
      input.type = info.type;
      if (info.type === "number") { input.min = info.attrs.min; input.max = info.attrs.max; input.step = info.attrs.step; input.required = true; }
      else { input.minLength = info.attrs.min; input.maxLength = info.attrs.max; input.required = info.attrs.min > 0; }
    }
    input.value = info.value;
    input.addEventListener(info.type === "select" ? "change" : "input", () => { this._editor.values.value = input.value; });
    label.append(input); form.append(label);
    const actions = document.createElement("div"); actions.className = "setting-actions";
    const save = this._button("Save", () => {}); save.type = "submit";
    const cancel = this._button("Cancel editing", () => {
      if (this._busy) return;
      this._editor = null;
      if (!this._blocked) this._status = "";
      this._render();
    });
    cancel.id = "configuration-cancel"; actions.append(save, cancel); form.append(actions);
    form.addEventListener("submit", (event) => { event.preventDefault(); this._save(); });
    host.append(form);
  }

  _requested(info, value) {
    if (!info.available || !info.editable) throw new Error("Setting unavailable.");
    if (info.type === "boolean" && ["on", "off"].includes(value)) return value;
    if (info.type === "select" && info.attrs.options.includes(value)) return value;
    if (info.type === "text" && Array.from(value).length >= info.attrs.min && Array.from(value).length <= info.attrs.max) return value;
    if (info.type === "number" && value.trim() !== "" && Number.isFinite(Number(value))) {
      const number = Number(value), steps = (number - info.attrs.min) / info.attrs.step;
      if (number >= info.attrs.min && number <= info.attrs.max && Math.abs(steps - Math.round(steps)) < 1e-7) return number;
    }
    throw new Error("Enter a value within the setting limits.");
  }

  async _save() {
    if (!this._canAct() || !this._editor) return;
    const { entity, original, values } = this._editor;
    try { this._requested(this._info(entity), values.value); }
    catch (error) { this._status = "Enter a value within the setting limits."; this._render(); return; }
    await this._apply(entity, original, values.value);
  }

  async _toggle(entity) {
    if (!this._canAct() || this._editor || this._confirmation || !this._fields.has(entity)) return;
    const data = this._data(), info = this._info(entity, data);
    if (!info.editable || info.type !== "boolean") return;
    const original = this._snapshot(entity, data), requested = info.value === "on" ? "off" : "on";
    if (/_(print_inventory_list|print_shopping_list)$/.test(entity) && requested === "on") {
      this._confirmation = { run: () => this._apply(entity, original, requested) }; this._render(); return;
    }
    await this._apply(entity, original, requested);
  }

  async _apply(entity, original, value) {
    if (!this._fields.has(entity)) return;
    await this._write((before, current) => {
      if (this._snapshot(entity, current) !== original) throw new Error("Setting changed before saving.");
      const info = this._info(entity, current), requested = this._requested(info, value);
      const service = info.type === "boolean" ? (requested === "on" ? "turn_on" : "turn_off") :
        info.type === "select" ? "select_option" : "set_value";
      const payload = { entity_id: entity };
      if (info.type !== "boolean") payload[info.type === "select" ? "option" : "value"] = requested;
      const unchanged = info.type === "number" ? Number(info.value) === requested : requested === info.value;
      return { calls: unchanged ? [] : [{ domain: info.domain, service, data: payload }],
        verify: (after) => this._info(entity, after).type === info.type &&
          (info.type === "number" ? Number(after[entity].state) === requested : after[entity].state === requested) };
    });
  }

  async _toggleTarget(group, value) {
    if (!this._canAct() || this._editor || this._confirmation) return;
    const selection = this._selections.find((row) => row.id === group);
    const targets = group === "speakers" ? this._speakers : this._notificationTargets();
    if (!selection || !targets?.some((target) => target.value === value)) return;
    const original = this._data()[selection.helper]?.state;
    const tokens = this._tokens(this._data()[selection.helper]);
    if (tokens === null) return;
    const desired = tokens.includes(value) ? tokens.filter((token) => token !== value) : [...tokens, value].sort();
    if (desired.join(",").length > 255) { this._status = "Selected targets exceed the setting limit."; this._render(); return; }
    await this._write((before, current) => {
      if (current[selection.helper]?.state !== original) throw new Error("Selected targets changed.");
      return { calls: [{ service: selection.service, data: { [selection.parameter]: value } }],
        verify: (after) => JSON.stringify(this._tokens(after[selection.helper])) === JSON.stringify(desired) };
    });
  }

  async _readback(plan) {
    return vhTouchscreenReadback(this, plan);
  }

  async _refresh() {
    await super._refresh();
    if (!this._editor && !this._busy) await this.activate(true);
  }
}

const VH_TOUCHSCREEN_RADIO_IMAGES = {
  "NPO Radio 2 - myTuner": "/local/vh-radio-favorites/npo-radio-2.png",
  "Omroep Brabant - myTuner": "/local/vh-radio-favorites/omroep-brabant.png",
  "Radio 10 - myTuner": "/local/vh-radio-favorites/radio-10.png",
  "Radio 538 - myTuner": "/local/vh-radio-favorites/radio-538.png",
  "Radio Veronica - myTuner": "/local/vh-radio-favorites/radio-veronica.jpg",
};

// Material Design Icons (Apache-2.0): github.com/Templarian/MaterialDesign.
const VH_TOUCHSCREEN_KITCHEN_ICONS = {
  "lightbulb-group": "M15 14V16A1 1 0 0 1 14 17H10A1 1 0 0 1 9 16V14A5 5 0 1 1 15 14M14 18H10V19A1 1 0 0 0 11 20H13A1 1 0 0 0 14 19M7 19V18H5V19A1 1 0 0 0 6 20H7.17A2.93 2.93 0 0 1 7 19M5 10A6.79 6.79 0 0 1 5.68 7A4 4 0 0 0 4 14.45V16A1 1 0 0 0 5 17H7V14.88A6.92 6.92 0 0 1 5 10M17 18V19A2.93 2.93 0 0 1 16.83 20H18A1 1 0 0 0 19 19V18M18.32 7A6.79 6.79 0 0 1 19 10A6.92 6.92 0 0 1 17 14.88V17H19A1 1 0 0 0 20 16V14.45A4 4 0 0 0 18.32 7Z",
  "lightbulb-group-off-outline": "M22.11 21.46L2.39 1.73L1.11 3L5.2 7.09C3.25 7.5 1.85 9.27 2 11.31C2.12 12.62 2.86 13.79 4 14.45V16C4 16.55 4.45 17 5 17H7V14.88C5.72 13.58 5 11.83 5 10C5 9.11 5.18 8.23 5.5 7.4L7.12 9C6.74 10.84 7.4 12.8 9 14V16C9 16.55 9.45 17 10 17H14C14.31 17 14.57 16.86 14.75 16.64L17 18.89V19C17 19.34 16.94 19.68 16.83 20H18C18.03 20 18.06 20 18.09 20L20.84 22.73L22.11 21.46M9.23 11.12L10.87 12.76C10.11 12.46 9.53 11.86 9.23 11.12M13 15H11V12.89L13 14.89V15M10.57 7.37L9.13 5.93C10.86 4.72 13.22 4.67 15 6C16.26 6.94 17 8.43 17 10C17 11.05 16.67 12.05 16.08 12.88L14.63 11.43C14.86 11 15 10.5 15 10C15 8.34 13.67 7 12 7C11.5 7 11 7.14 10.57 7.37M17.5 14.31C18.47 13.09 19 11.57 19 10C19 8.96 18.77 7.94 18.32 7C19.63 7.11 20.8 7.85 21.46 9C22.57 10.9 21.91 13.34 20 14.45V16C20 16.22 19.91 16.42 19.79 16.59L17.5 14.31M10 18H14V19C14 19.55 13.55 20 13 20H11C10.45 20 10 19.55 10 19V18M7 19C7 19.34 7.06 19.68 7.17 20H6C5.45 20 5 19.55 5 19V18H7V19Z",
  "help-circle-outline": "M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z",
  "skip-previous": "M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z",
  "skip-next": "M16,18H18V6H16M6,18L14.5,12L6,6V18Z",
  play: "M8,5.14V19.14L19,12.14L8,5.14Z",
  pause: "M14,19H18V5H14M6,19H10V5H6V19Z",
  "volume-high": "M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z",
  "volume-off": "M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z",
};

function vhTouchscreenKitchenIcon(element, icon) {
  if (element.dataset.icon === icon) return;
  if (!Object.hasOwn(VH_TOUCHSCREEN_KITCHEN_ICONS, icon)) throw new Error("Unknown kitchen icon.");
  element.innerHTML = `<svg data-icon="mdi:${icon}" viewBox="0 0 24 24" aria-hidden="true"><path d="${VH_TOUCHSCREEN_KITCHEN_ICONS[icon]}"/></svg>`;
  element.dataset.icon = icon;
}

class VhKitchenTouchscreen extends VhInventoryStockTouchscreen {
  setConfig(config) {
    if (!config.translations?.en || !config.translations?.nl ||
        !/^light\.[a-z0-9_]+$/.test(config.kitchen?.worktop) ||
        !/^light\.[a-z0-9_]+$/.test(config.kitchen?.ceiling) ||
        !/^media_player\.[a-z0-9_]+$/.test(config.kitchen?.speaker) ||
        !/^switch\.[a-z0-9_]+$/.test(config.kitchen?.ledstripPower) ||
        !["ledstripWarm", "ledstripCold", "ledstripOff", "worktopAutoOff"]
          .every((key) => /^automation\.[a-z0-9_]+$/.test(config.kitchen?.[key])) ||
        new Set(["ledstripWarm", "ledstripCold", "ledstripOff", "worktopAutoOff"]
          .map((key) => config.kitchen?.[key])).size !== 4 ||
        config.kitchen.worktop === config.kitchen.ceiling) {
      throw new Error("Build the touchscreen dashboard with valid kitchen entities first.");
    }
    this._config = config;
    const theme = VH_TOUCHSCREEN_THEME.replace(":root", ":host")
      .replace('html[data-theme="dark"]', ':host([data-theme="dark"])');
    this.setAttribute("data-theme", config.theme === "light" ? "light" : "dark");
    this.shadowRoot.innerHTML = `<style>${theme}${VH_TOUCHSCREEN_STYLE}
      .kitchen-panels { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 24px; }
      .worktop-panels { display: grid; align-content: start; gap: 24px; min-width: 0; }
      .kitchen-panel h2 { font-size: 28px; margin: 0; }
      .device-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
      .device-heading > button { flex: 0 0 200px; }
      .device-state { font-size: 20px; color: var(--cp-text-muted); }
      .media-panel .device-heading { display: grid; grid-template-columns: minmax(0,1fr) min(200px,50%); }
      #speaker-state { height: 3em; line-height: 1.5; white-space: nowrap; }
      .recovery-slot { width: 280px; max-width: 100%; height: 68px; flex-shrink: 0; }
      #kitchen-refresh { width: 100%; height: 68px; padding: 12px; font-size: 18px; white-space: nowrap; }
      button[data-pending-lock="true"]:disabled, input[data-pending-lock="true"]:disabled {
        opacity: 1; cursor: progress; }
      .light-indicator { display: inline-flex; align-items: center; justify-content: center;
        width: 56px; height: 56px; flex: 0 0 56px; border-radius: 50%;
        color: var(--light-color, var(--cp-text-muted));
        background: color-mix(in srgb, var(--light-color, var(--cp-text-muted)) 20%, transparent);
        opacity: var(--light-level, 1); }
      .light-indicator svg, .media-controls svg { width: 32px; height: 32px; fill: currentColor; }
      .kitchen-panel label { margin: 24px 0 8px; }
      .kitchen-panel input[type="range"] { width: 100%; min-height: 68px; margin: 0;
        padding: 0; border: 0; border-radius: 0; background: transparent; touch-action: pan-y;
        appearance: none; -webkit-appearance: none; --range-color: var(--cp-accent); }
      .kitchen-panel input[type="range"]:not(:disabled) { cursor: pointer; }
      .kitchen-panel input[type="range"]:disabled:not([data-pending-lock="true"]) {
        --range-color: var(--cp-text-muted); opacity: 0.55; cursor: not-allowed; }
      .kitchen-panel input[type="range"]::-webkit-slider-runnable-track {
        height: 6px; border-radius: 3px;
        background: linear-gradient(to right, var(--range-color) var(--range-fill, 0%),
          var(--cp-border-strong) var(--range-fill, 0%)); }
      .kitchen-panel input[type="range"]::-webkit-slider-thumb {
        appearance: none; -webkit-appearance: none; width: 18px; height: 18px;
        margin-top: -6px; border: 0; border-radius: 50%; background: var(--range-color); }
      .kitchen-panel input[type="range"]::-moz-range-track {
        height: 6px; border-radius: 3px;
        background: linear-gradient(to right, var(--range-color) var(--range-fill, 0%),
          var(--cp-border-strong) var(--range-fill, 0%)); }
      .kitchen-panel input[type="range"]::-moz-range-thumb {
        width: 18px; height: 18px; border: 0; border-radius: 50%; background: var(--range-color); }
      .range-label { display: grid; grid-template-columns: minmax(0,1fr) 8ch;
        gap: 16px; align-items: center; min-height: 30px; line-height: 30px; }
      .range-label output { font-size: 20px; line-height: 30px; text-align: right; white-space: nowrap; }
      .ledstrip-actions { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; margin-top: 16px; }
      .ledstrip button { min-width: 0; padding: 12px; overflow-wrap: anywhere; }
      .media-controls { display: grid; grid-template-columns: repeat(4,minmax(68px,1fr));
        gap: 12px; margin: 24px 0; overflow-x: auto; }
      .media-controls button { min-width: 0; padding: 12px; overflow-wrap: anywhere; }
      .media-controls button:focus-visible { outline-offset: -4px; }
      .now-playing { font-size: 25px; height: 2.4em; line-height: 1.2; margin-top: 24px; }
      .media-artist { font-size: 20px; height: 1.2em; line-height: 1.2; color: var(--cp-text-muted); }
      .speaker-group-slot { font-size: 16px; height: 2.8em; line-height: 1.4; }
      #speaker-group { height: 100%; line-height: inherit; margin: 0; }
      #speaker-source { display: grid; grid-template-columns: repeat(auto-fill,minmax(76px,1fr)); gap: 12px; margin-top: 8px; }
      .source-tile { aspect-ratio: 1; min-width: 0; min-height: 76px; padding: 6px;
        border: 3px solid var(--cp-border-strong); border-radius: 10px; background: #fff; color: #18181b; }
      .source-tile[aria-pressed="true"] { border-color: var(--cp-accent); box-shadow: 0 0 0 1px var(--cp-accent); }
      .source-tile img { display: block; width: 100%; height: 100%; object-fit: contain; }
      .source-tile span { font-size: 15px; overflow-wrap: anywhere; }
      #kitchen-status { font-size: 19px; height: 3em; flex: 0 0 3em; line-height: 1.5; margin: 0; }
      #kitchen-status, #speaker-state, #speaker-title-text, #speaker-artist, #speaker-group {
        overflow: auto; overflow-wrap: anywhere; scrollbar-width: none; }
      #kitchen-status::-webkit-scrollbar, #speaker-state::-webkit-scrollbar,
      #speaker-title-text::-webkit-scrollbar, #speaker-artist::-webkit-scrollbar,
      #speaker-group::-webkit-scrollbar { display: none; }
      #kitchen-status[data-state="error"] { color: var(--cp-danger); }
      @media(max-width:1200px) { .kitchen-panels { grid-template-columns: repeat(2,minmax(0,1fr)); }
        .media-panel { grid-column: 1 / -1; } }
      @media(max-width:800px) { .kitchen-panels { grid-template-columns: minmax(0,1fr); }
        .media-panel { grid-column: auto; } }
      </style><main>
      <header><div class="brand"><img id="kitchen-logo" class="brand-logo"
        alt="Van Hemert Home Automation" width="128" height="72"><div><div class="eyebrow">VH-INVENTORY</div>
        <h1 data-i18n="Kitchen - Lighting and music"></h1></div></div>
        <div class="recovery-slot"><button id="kitchen-refresh" type="button" data-i18n="Refresh controls" hidden></button></div></header>
      <p id="kitchen-status" role="status" aria-live="polite" aria-atomic="true"></p>
      <div class="kitchen-panels">
      ${[["worktop", "Worktop"], ["ceiling", "Ceiling"]].map(([id, label]) => `
        ${id === "worktop" ? '<div class="worktop-panels">' : ""}
        <section class="panel kitchen-panel" aria-labelledby="${id}-title">
        <div class="device-heading"><h2 id="${id}-title" data-i18n="${label}"></h2>
          <span id="${id}-state" class="device-state light-indicator" role="img"></span>
          <button id="${id}-power" type="button"></button></div>
        <label class="range-label" for="${id}-brightness"><span data-i18n="Brightness"></span>
          <output id="${id}-brightness-value" for="${id}-brightness"></output></label>
        <input id="${id}-brightness" type="range" min="1" max="100" step="1">
        <label class="range-label" for="${id}-temperature"><span data-i18n="White temperature (warm to cool)"></span>
          <output id="${id}-temperature-value" for="${id}-temperature"></output></label>
        <input id="${id}-temperature" type="range" step="1">
        </section>
        ${id === "worktop" ? `<section class="panel kitchen-panel ledstrip" aria-labelledby="ledstrip-title">
          <div class="device-heading"><h2 id="ledstrip-title" data-i18n="LED strip"></h2>
          </div>
          <div class="ledstrip-actions">
            <button id="ledstrip-warm" type="button" data-i18n="Warm"></button>
            <button id="ledstrip-cold" type="button" data-i18n="Cold"></button>
            <button id="ledstrip-off" type="button" data-i18n="Off"></button>
          </div></section></div>` : ""}`).join("")}
      <section class="panel kitchen-panel media-panel" aria-labelledby="speaker-title">
        <div class="device-heading"><h2 id="speaker-title" data-i18n="Kitchen Sonos"></h2>
          <span id="speaker-state" class="device-state"></span></div>
        <div id="speaker-title-text" class="now-playing"></div><div id="speaker-artist" class="media-artist"></div>
        <div class="speaker-group-slot"><p id="speaker-group" class="muted" data-i18n="Playback controls may affect other speakers in this Sonos group." hidden></p></div>
        <div class="media-controls">
          <button id="speaker-play" type="button"></button>
          <button id="speaker-mute" type="button"></button>
          <button id="speaker-previous" type="button"></button>
          <button id="speaker-next" type="button"></button></div>
        <label class="range-label" for="speaker-volume"><span data-i18n="Volume"></span>
          <output id="speaker-volume-value" for="speaker-volume"></output></label>
        <input id="speaker-volume" type="range" min="0" max="100" step="1">
        <label id="speaker-source-label" data-i18n="Radio / source"></label>
        <div id="speaker-source" role="group" aria-labelledby="speaker-source-label"></div>
      </section></div></main>`;
    this.shadowRoot.querySelector("#kitchen-logo").src = config.logo || "/local/van-hemert-logo-hi.png";
    this.shadowRoot.querySelector("#kitchen-refresh").addEventListener("click", () => this._refresh());
    for (const [id, key, action] of [
      ["ledstrip-warm", "ledstripWarm", "preset"], ["ledstrip-cold", "ledstripCold", "preset"],
      ["ledstrip-off", "ledstripOff", "preset"],
    ]) this.shadowRoot.querySelector(`#${id}`).addEventListener("click", () => this._control(key, action));
    for (const id of ["worktop", "ceiling"]) {
      this.shadowRoot.querySelector(`#${id}-power`).addEventListener("click", () => this._control(id, "power"));
      for (const action of ["brightness", "temperature"]) this._bindRange(id, action);
    }
    for (const action of ["previous", "play", "next", "mute"]) {
      this.shadowRoot.querySelector(`#speaker-${action}`).addEventListener("click", () => this._control("speaker", action));
    }
    this._bindRange("speaker", "volume");
    this._render();
  }

  _bindRange(id, action) {
    const input = this.shadowRoot.querySelector(`#${id}-${action}`);
    input.addEventListener("input", () => {
      this.shadowRoot.querySelector(`#${id}-${action}-value`).textContent =
        `${input.value}${action === "temperature" ? " K" : "%"}`;
      this._rangeFill(input);
    });
    input.addEventListener("change", () => this._control(id, action, Number(input.value)));
  }

  _data(states = this._states) {
    return Object.fromEntries(Object.entries(this._config?.kitchen || {}).map(([key, entity]) => [key, states[entity] || null]));
  }

  _canAct() { return Boolean(this._config && !this.preview && this._hass?.connected && !this._busy && !this._blocked); }

  _info(key, data = this._data()) {
    const row = data[key], attrs = row?.attributes || {};
    const available = Boolean(row && (key === "speaker" ?
      ["playing", "paused", "idle", "buffering", "on"] : ["on", "off"]).includes(row.state));
    return { available, state: row?.state, attrs };
  }

  _supports(key, action, info) {
    if (!info.available) return false;
    if (["ledstripWarm", "ledstripCold", "ledstripOff"].includes(key)) return action === "preset";
    if (["ledstripPower", "worktopAutoOff"].includes(key)) return action === "power";
    if (!["worktop", "ceiling", "speaker"].includes(key)) return false;
    if (key !== "speaker") {
      if (action === "power") return true;
      const modes = Array.isArray(info.attrs.supported_color_modes) ? info.attrs.supported_color_modes : [];
      return info.state === "on" && (action === "brightness"
        ? modes.some((mode) => ["brightness", "color_temp", "hs", "xy", "rgb", "rgbw", "rgbww", "white"].includes(mode)) &&
          Number.isFinite(info.attrs.brightness) && info.attrs.brightness >= 0 && info.attrs.brightness <= 255
        : action === "temperature" && modes.includes("color_temp") &&
          Number.isFinite(info.attrs.min_color_temp_kelvin) && Number.isFinite(info.attrs.max_color_temp_kelvin) &&
          info.attrs.min_color_temp_kelvin > 0 && info.attrs.min_color_temp_kelvin < info.attrs.max_color_temp_kelvin &&
          Number.isFinite(info.attrs.color_temp_kelvin) &&
          info.attrs.color_temp_kelvin >= info.attrs.min_color_temp_kelvin &&
          info.attrs.color_temp_kelvin <= info.attrs.max_color_temp_kelvin);
    }
    const bits = { play: info.state === "playing" ? 1 : 512, previous: 16, next: 32, volume: 4, mute: 8, source: 2048 };
    return Boolean(Number.isSafeInteger(info.attrs.supported_features) && info.attrs.supported_features >= 0 &&
      (info.attrs.supported_features & bits[action]) &&
      (action !== "volume" || (Number.isFinite(info.attrs.volume_level) &&
        info.attrs.volume_level >= 0 && info.attrs.volume_level <= 1)) &&
      (action !== "mute" || typeof info.attrs.is_volume_muted === "boolean") &&
      (action !== "source" || (Array.isArray(info.attrs.source_list) && info.attrs.source_list.some((s) => typeof s === "string" && s))));
  }

  _request(key, action, info, value) {
    if (!this._supports(key, action, info)) throw new Error("Kitchen control unavailable.");
    const domain = this._config.kitchen[key].split(".")[0];
    const data = { entity_id: this._config.kitchen[key] };
    let service, matches;
    if (action === "preset") {
      service = "trigger"; data.skip_condition = true;
      matches = (after) => after.available;
    } else if (action === "power") {
      const desired = info.state === "on" ? "off" : "on";
      service = `turn_${desired}`; matches = (after) => after.state === desired;
    } else if (["brightness", "temperature", "volume"].includes(action)) {
      const min = action === "temperature" ? info.attrs.min_color_temp_kelvin : action === "volume" ? 0 : 1;
      const max = action === "temperature" ? info.attrs.max_color_temp_kelvin : 100;
      if (!Number.isInteger(value) || value < min || value > max) throw new Error("Kitchen control value outside limits.");
      service = action === "volume" ? "volume_set" : "turn_on";
      const field = action === "temperature" ? "color_temp_kelvin" : action === "volume" ? "volume_level" : "brightness_pct";
      data[field] = action === "volume" ? value / 100 : value;
      matches = (after) => action === "volume" ? Number.isFinite(after.attrs.volume_level) &&
        Math.abs(after.attrs.volume_level - value / 100) <= 0.015
        : after.state === "on" && (action === "brightness" ? Number.isFinite(after.attrs.brightness) &&
          Math.abs(after.attrs.brightness / 255 * 100 - value) <= 2
          : Number.isFinite(after.attrs.color_temp_kelvin) && Math.abs(after.attrs.color_temp_kelvin - value) <= 75);
    } else if (action === "play") {
      service = info.state === "playing" ? "media_pause" : "media_play";
      matches = (after) => service === "media_pause" ? after.state === "paused" :
        ["playing", "buffering"].includes(after.state);
    } else if (action === "mute") {
      service = "volume_mute"; data.is_volume_muted = !info.attrs.is_volume_muted;
      matches = (after) => after.attrs.is_volume_muted === data.is_volume_muted;
    } else if (action === "source") {
      if (typeof value !== "string" || !value || !info.attrs.source_list.includes(value)) {
        throw new Error("Kitchen source no longer available.");
      }
      service = "select_source"; data.source = value;
      matches = (after) => after.attrs.source === value;
    } else {
      service = action === "next" ? "media_next_track" : "media_previous_track";
      // A radio stream may keep the same title after a successful skip request.
      matches = (after) => after.available;
    }
    return { domain, service, data, matches };
  }

  _stamp(info) {
    const fields = ["brightness", "color_temp_kelvin", "min_color_temp_kelvin", "max_color_temp_kelvin",
      "supported_color_modes", "supported_features", "volume_level", "is_volume_muted", "source", "source_list", "media_content_id"];
    return JSON.stringify([info.state, fields.map((field) => info.attrs[field])]);
  }

  async _control(key, action, value) {
    if (!this._canAct()) return;
    await this._write((before, current) => {
      if (!Object.hasOwn(this._config.kitchen, key)) throw new Error("Kitchen entity unavailable.");
      const previous = this._info(key, before), fresh = this._info(key, current);
      if (this._stamp(previous) !== this._stamp(fresh)) throw new Error("Kitchen device changed.");
      const request = this._request(key, action, fresh, value);
      return { calls: [{ domain: request.domain, service: request.service, data: request.data }],
        successMessage: ["preset", "previous", "next"].includes(action) ?
          "Control request sent." : "Successfully executed.",
        verify: (after) => {
          const info = this._info(key, after);
          return info.available && request.matches(info);
        } };
    });
  }

  _range(id, enabled, value, min, max, unit) {
    const input = this.shadowRoot.querySelector(`#${id}`), output = this.shadowRoot.querySelector(`#${id}-value`);
    this._enableControl(input, enabled);
    input.min = String(min); input.max = String(max);
    if (this.shadowRoot.activeElement !== input) {
      input.value = String(Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min);
      output.textContent = Number.isFinite(value) ? `${Math.round(value)}${unit}` : "";
    }
    this._rangeFill(input);
  }

  _rangeFill(input) {
    const span = Number(input.max) - Number(input.min);
    const fill = span > 0 ? (Number(input.value) - Number(input.min)) / span * 100 : 0;
    input.style.setProperty("--range-fill", `${Math.max(0, Math.min(100, fill))}%`);
  }

  _enableControl(control, available) {
    control.disabled = !available || this._busy;
    control.dataset.pendingLock = String(Boolean(available && this._busy));
  }

  _render() {
    if (!this._config || !this.shadowRoot.querySelector("main")) return;
    vhTouchscreenTranslate(this);
    const ready = Boolean(this._config && !this.preview && this._hass?.connected && !this._blocked);
    this.shadowRoot.querySelector("main").setAttribute("aria-busy", String(this._busy));
    const status = this.shadowRoot.querySelector("#kitchen-status");
    status.textContent = this._t(!this._hass?.connected ? "Home Assistant unavailable" : this._status);
    status.dataset.state = this._blocked || !this._hass?.connected ? "error" : "ready";
    const refresh = this.shadowRoot.querySelector("#kitchen-refresh");
    refresh.hidden = !this._blocked;
    refresh.disabled = !this._hass?.connected || this._busy;
    for (const [key, id] of [["ledstripWarm", "warm"], ["ledstripCold", "cold"], ["ledstripOff", "off"]]) {
      this._enableControl(this.shadowRoot.querySelector(`#ledstrip-${id}`),
        ready && this._supports(key, "preset", this._info(key)) && Boolean(this._hass?.services?.automation?.trigger));
    }
    for (const key of ["worktop", "ceiling", "speaker"]) {
      const info = this._info(key);
      if (key !== "speaker") {
        this._lightIndicator(key, info);
        const power = this.shadowRoot.querySelector(`#${key}-power`);
        const request = info.available ? this._request(key, "power", info) : null;
        power.textContent = this._t(info.state === "on" ? "Turn off" : "Turn on");
        power.setAttribute("aria-pressed", String(info.state === "on"));
        this._enableControl(power, ready && Boolean(request && this._hass?.services?.light?.[request.service]));
        for (const action of ["brightness", "temperature"]) {
          const temperature = action === "temperature";
          this._range(`${key}-${action}`, ready && this._supports(key, action, info) &&
            Boolean(this._hass?.services?.light?.turn_on),
          temperature ? info.attrs.color_temp_kelvin : Number.isFinite(info.attrs.brightness) ? info.attrs.brightness / 255 * 100 : null,
          temperature ? info.attrs.min_color_temp_kelvin ?? 0 : 1,
          temperature ? info.attrs.max_color_temp_kelvin ?? 1 : 100, temperature ? " K" : "%");
        }
      } else {
        this.shadowRoot.querySelector("#speaker-state").textContent = this._t(!info.available ? "Device unavailable" :
          ({ on: "On", playing: "Playing", paused: "Paused", idle: "Idle", buffering: "Buffering" })[info.state]);
        this.shadowRoot.querySelector("#speaker-title-text").textContent = info.attrs.media_title || "";
        this.shadowRoot.querySelector("#speaker-artist").textContent = info.attrs.media_artist || "";
        this.shadowRoot.querySelector("#speaker-group").hidden = !Array.isArray(info.attrs.group_members) || info.attrs.group_members.length < 2;
        for (const action of ["play", "previous", "next", "mute"]) {
          const button = this.shadowRoot.querySelector(`#speaker-${action}`);
          const [icon, label] = action === "play" ? (info.state === "playing" ? ["pause", "Pause"] : ["play", "Play"])
            : action === "mute" ? (info.attrs.is_volume_muted ? ["volume-off", "Unmute"] : ["volume-high", "Mute"])
            : action === "previous" ? ["skip-previous", "Previous track"] : ["skip-next", "Next track"];
          vhTouchscreenKitchenIcon(button, icon);
          vhTouchscreenAttribute(this, button, "aria-label", label);
          vhTouchscreenAttribute(this, button, "title", label);
          if (action === "mute" || action === "play") {
            button.setAttribute("aria-pressed", String(action === "play" ?
              info.state === "playing" : info.attrs.is_volume_muted === true));
          }
          const request = this._supports(key, action, info) ? this._request(key, action, info) : null;
          this._enableControl(button, ready && Boolean(request && this._hass?.services?.media_player?.[request.service]));
        }
        this._range("speaker-volume", ready && this._supports(key, "volume", info) &&
          Boolean(this._hass?.services?.media_player?.volume_set),
        Number.isFinite(info.attrs.volume_level) ? info.attrs.volume_level * 100 : null, 0, 100, "%");
        this._renderSources(info, ready);
      }
    }
    for (const id of ["kitchen-status", "speaker-state", "speaker-title-text", "speaker-artist", "speaker-group"]) {
      const element = this.shadowRoot.querySelector(`#${id}`);
      element.tabIndex = element.textContent && !element.hidden ? 0 : -1;
      element.title = element.textContent;
    }
  }

  _lightIndicator(key, info) {
    const indicator = this.shadowRoot.querySelector(`#${key}-state`);
    const on = info.available && info.state === "on";
    vhTouchscreenKitchenIcon(indicator, !info.available ? "help-circle-outline" :
      on ? "lightbulb-group" : "lightbulb-group-off-outline");
    indicator.style.setProperty("--light-color", "var(--cp-text-muted)");
    indicator.style.setProperty("--light-level", "1");
    const details = [this._t(info.available ? on ? "On" : "Off" : "Device unavailable")];
    if (on) {
      const brightness = info.attrs.brightness;
      if (Number.isFinite(brightness) && brightness >= 0 && brightness <= 255) {
        const level = brightness / 255;
        indicator.style.setProperty("--light-level", String(0.25 + 0.75 * level));
        details.push(`${Math.round(level * 100)}%`);
      }
      const kelvin = info.attrs.color_temp_kelvin;
      if (Number.isFinite(kelvin) && kelvin >= 1000 && kelvin <= 40000 &&
          (!info.attrs.color_mode || info.attrs.color_mode === "color_temp")) {
        const t = kelvin / 100;
        const rgb = [
          t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592,
          t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492,
          t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307,
        ].map((channel) => Math.round(Math.min(255, Math.max(0, channel))));
        indicator.style.setProperty("--light-color", `rgb(${rgb.join(", ")})`);
        details.push(`${Math.round(kelvin)} K`);
      }
    }
    const label = `${this._t(key === "worktop" ? "Worktop" : "Ceiling")}: ${details.join(", ")}`;
    indicator.setAttribute("aria-label", label);
    indicator.setAttribute("title", label);
  }

  _renderSources(info, available) {
    const group = this.shadowRoot.querySelector("#speaker-source");
    const sources = [...new Set((Array.isArray(info.attrs.source_list) ? info.attrs.source_list : [])
      .filter((item) => typeof item === "string" && item))];
    const signature = JSON.stringify(sources);
    if (group.dataset.options !== signature) {
      group.replaceChildren(...sources.map((value) => {
        const button = this._button("", () => this._control("speaker", "source", value), false, false);
        button.className = "source-tile";
        button.dataset.source = value;
        button.title = value;
        button.setAttribute("aria-label", value);
        const label = this._text("span", value);
        if (Object.hasOwn(VH_TOUCHSCREEN_RADIO_IMAGES, value)) {
          const image = document.createElement("img");
          image.alt = "";
          image.src = VH_TOUCHSCREEN_RADIO_IMAGES[value];
          image.addEventListener("error", () => {
            console.warn("VH-Inventory radio artwork unavailable", value);
            image.hidden = true;
            label.hidden = false;
          }, { once: true });
          label.hidden = true;
          button.append(image);
        }
        button.append(label);
        return button;
      }));
      group.dataset.options = signature;
    }
    const enabled = available && this._supports("speaker", "source", info) &&
      Boolean(this._hass?.services?.media_player?.select_source);
    for (const button of group.children) {
      this._enableControl(button, enabled);
      button.setAttribute("aria-pressed", String(button.dataset.source === info.attrs.source));
    }
  }

  _writeMessages() {
    return { updating: "Sending control request", updated: "Control request sent.",
      uncertain: "Device response uncertain. Do not repeat the action. Refresh and check the device first.",
      changed: "Device changed or unavailable. Refresh and check before trying again.",
      refreshed: "Device states refreshed.", cancelRefresh: "Wait for the current action before refreshing.",
      unavailable: "Kitchen controls unavailable. Reconnect and refresh before trying again." };
  }

  async _readback(plan) { return vhTouchscreenReadback(this, plan); }
}

const VH_TOUCHSCREEN_RECIPE_ICON_PATH = "M4 3h7a3 3 0 0 1 3 3v15a4 4 0 0 0-4-2H4V3zm10 3a3 3 0 0 1 3-3h3v16h-3a4 4 0 0 0-3 2M7 7h3M7 11h3";

class VhRecipesTouchscreen extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._active = false;
    this._busy = false;
    this._loaded = false;
    this._recipes = [];
    this._recipe = null;
    this._detailId = null;
    this._cookMode = false;
    this._detailScroll = 0;
    this._cookToggle = null;
    this._error = false;
    this._search = "";
    this._status = "";
    this._request = 0;
    this._revision = 0;
    this._background = false;
    this._refreshTimer = null;
    this._visibilityChanged = () => {
      this._stopRefresh();
      if (document.visibilityState !== "hidden") this._refreshOverview();
    };
  }

  setConfig(config) {
    this._stopRefresh();
    this._config = config;
    this._request++;
    this._busy = false;
    this._background = false;
    this._loaded = false;
    this._recipes = [];
    this._recipe = null;
    this._detailId = null;
    this._cookMode = false;
    this._detailScroll = 0;
    this._cookToggle = null;
    this._error = false;
    this._search = "";
    this._status = "";
    this._translatedLanguage = null;
    this._contentSignature = null;
    this._imageConfigInvalid = false;
    this._imageOrigin = null;
    const imageOrigin = config.recipes?.image_origin;
    if (imageOrigin != null && imageOrigin !== "") {
      try {
        const address = new URL(imageOrigin);
        if (typeof imageOrigin !== "string" || !["http:", "https:"].includes(address.protocol) ||
            address.username || address.password || address.pathname !== "/" || address.search || address.hash ||
            window.location.protocol === "https:" && address.protocol !== "https:") {
          this._imageConfigInvalid = true;
        } else this._imageOrigin = address.origin;
      } catch {
        this._imageConfigInvalid = true;
      }
    }
    const theme = VH_TOUCHSCREEN_THEME.replace(":root", ":host")
      .replace('html[data-theme="dark"]', ':host([data-theme="dark"])');
    this.setAttribute("data-theme", config.theme === "light" ? "light" : "dark");
    this.shadowRoot.innerHTML = `<style>${theme}${VH_TOUCHSCREEN_STYLE}
      main { gap: 16px; }
      .recipe-recovery { width: 200px; }
      .recipe-toolbar { display: grid; grid-template-columns: minmax(0,1fr); }
      .recipe-toolbar label { margin: 0; }
      .recipe-toolbar input { margin-top: 12px; font-family: inherit; }
      .recipe-feedback { display: flex; align-items: center; gap: 16px; height: 28px; flex: 0 0 28px; min-width: 0; }
      #recipes-status { flex: 1 1 auto; height: 28px; font-size: 17px; line-height: 28px; white-space: nowrap; }
      #recipe-count { display: block; flex: 0 0 auto; height: 28px; line-height: 28px; margin: 0; white-space: nowrap; }
      .recipe-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(min(100%,300px),1fr)); gap: 24px; }
      .recipe-tile { display: grid; grid-template-columns: 112px minmax(0,1fr); align-items: center; gap: 16px;
        height: 176px; text-align: left; padding: 16px; min-width: 0; }
      .recipe-copy { min-width: 0; }
      .recipe-tile strong { display: block; height: 2.6em; line-height: 1.3; overflow: auto; overflow-wrap: anywhere; }
      .recipe-tile .recipe-description { display: block; height: 3em; line-height: 1.5; margin-top: 12px; overflow: auto;
        font-size: 17px; font-weight: 400; overflow-wrap: anywhere; }
      .recipe-photo { position: relative; width: 100%; height: 112px; min-width: 0; overflow: hidden;
        border-radius: 8px; background: transparent; border: 0; }
      .recipe-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; }
      .recipe-photo img[data-loaded="true"] { opacity: 1; }
      .recipe-photo-fallback { position: absolute; inset: 0; display: grid; place-items: center; padding: 8px;
        color: var(--cp-accent); }
      .recipe-photo-fallback svg { width: 56px; height: 56px; max-width: 100%; max-height: 100%; }
      .recipe-intro .recipe-photo-fallback svg { width: 88px; height: 88px; }
      .recipe-intro { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 24px;
        align-items: start; margin-bottom: 24px; }
      .recipe-intro > div { min-width: 0; }
      .recipe-intro .recipe-photo { height: 220px; }
      .recipe-intro .recipe-photo img { object-fit: contain; }
      .recipe-columns { display: grid; grid-template-columns: minmax(240px,.65fr) minmax(0,1.35fr); gap: 32px; }
      .recipe-columns > section { min-width: 0; }
      .recipe-detail { font-size: 21px; }
      .recipe-detail h3 { font-size: 28px; }
      .recipe-detail li { padding-left: 8px; margin-bottom: 20px; }
      .recipe-detail p, .recipe-detail li { white-space: pre-wrap; overflow-wrap: anywhere; }
      .recipe-detail ul, .recipe-detail ol { padding-left: 28px; }
      .recipe-preparation-heading { display: flex; align-items: center; gap: 12px; margin: 16px 0; }
      .recipe-preparation-heading h3 { margin: 0; min-width: 0; overflow-wrap: anywhere; }
      .recipe-cook-toggle { flex-shrink: 0; }
      .recipe-cook-toggle svg { fill: none; }
      main[data-cook-mode="true"] { gap: 0; padding-block: 24px; }
      main[data-cook-mode="true"] > header, main[data-cook-mode="true"] > .recipe-feedback,
      main[data-cook-mode="true"] .recipe-intro, main[data-cook-mode="true"] .recipe-ingredients,
      main[data-cook-mode="true"] .recipe-notes { display: none; }
      main[data-cook-mode="true"] .recipe-detail {
        padding: 0; border: 0; background: transparent; font-size: clamp(28px, 2.1vw, 42px); }
      main[data-cook-mode="true"] .recipe-columns { display: block; }
      main[data-cook-mode="true"] .recipe-preparation-heading { position: sticky; top: 0; z-index: 1;
        margin: 0 0 24px; padding: 8px 0; padding-inline-end: var(--vh-navigation-header-inset, 0px);
        padding-block-start: calc(8px + var(--vh-navigation-header-block-inset, 0px));
        min-height: calc(16px + var(--vh-navigation-header-min-height, 0px));
        background: var(--cp-bg); }
      main[data-cook-mode="true"] .recipe-preparation-heading h3 { font-size: clamp(32px, 2.6vw, 44px); }
      main[data-cook-mode="true"] .recipe-detail ol { margin: 0; padding-left: 1.5em; }
      main[data-cook-mode="true"] .recipe-detail li { margin-bottom: 32px; padding-left: 12px; }
      main[data-cook-mode="true"] .recipe-detail p { line-height: 1.6; }
      @media (max-width: 900px) {
        .recipe-columns { grid-template-columns: minmax(0,1fr); }
        .recipe-intro { grid-template-columns: minmax(0,1fr) minmax(0,.6fr); }
      }
      @media (max-width: 550px) {
        .recipe-detail { font-size: 19px; }
        main[data-cook-mode="true"] { padding: 16px; }
        .recipe-tile { grid-template-columns: 80px minmax(0,1fr); gap: 12px; padding: 12px; }
        .recipe-tile .recipe-photo { height: 96px; }
        .recipe-intro { grid-template-columns: minmax(0,1fr); }
        .recipe-intro .recipe-photo { height: 180px; }
      }
      </style><main>
      <header><div class="brand"><img id="recipe-logo" class="brand-logo" alt="Van Hemert Home Automation">
        <div><div class="eyebrow">Keuken Touchscreen</div><h1 data-i18n="Recipes"></h1></div></div>
        <div class="recovery-slot recipe-recovery"><button id="recipes-refresh" type="button" data-i18n="Refresh" hidden></button></div></header>
      <div id="recipe-toolbar" class="recipe-toolbar"><label><span data-i18n="Search recipes"></span>
        <input id="recipe-search" type="search" autocomplete="off" data-i18n-aria-label="Search recipes"></label></div>
      <div class="recipe-feedback"><p id="recipes-status" class="feedback-slot" role="status" aria-live="polite"></p>
        <p id="recipe-count" class="muted"></p></div>
      <section><div id="recipe-content"></div></section>
      </main>`;
    this.shadowRoot.querySelector("#recipe-logo").src = config.logo || "/local/van-hemert-logo-hi.png";
    this.shadowRoot.querySelector("#recipes-refresh").addEventListener("click", () => this._load(this._detailId));
    this.shadowRoot.querySelector("#recipe-search").addEventListener("input", (event) => {
      this._search = event.target.value;
      this._recipe = null;
      this._revision++;
      this._render();
    });
    this._render();
  }

  set hass(value) {
    const wasAvailable = this._available();
    this._hass = value;
    this._render();
    if (!this._loaded || !wasAvailable) this._refreshOverview();
    else this._scheduleRefresh();
  }

  setActive(active) {
    if (this._active === active) return;
    this._active = active;
    if (!active) this._stopRefresh();
    if (!active && (this._busy || this._background)) {
      this._request++;
      this._busy = false;
      this._background = false;
      this._status = "";
      this._error = false;
      this._detailId = this._recipe?.recipe_id || null;
      this._render();
    }
    if (active) this._refreshOverview();
  }

  connectedCallback() {
    document.addEventListener("visibilitychange", this._visibilityChanged);
    this._refreshOverview();
  }

  disconnectedCallback() {
    document.removeEventListener("visibilitychange", this._visibilityChanged);
    this.setActive(false);
    this._stopRefresh();
  }

  _canRefreshOverview() {
    return this._active && this.isConnected && document.visibilityState !== "hidden" &&
      !this._recipe && !this._detailId && !this._busy && !this._background && !this._error &&
      this._available() && typeof this._config?.recipes?.config_entry_id === "string" &&
      Boolean(this._config.recipes.config_entry_id.trim());
  }

  _refreshOverview() {
    if (this._canRefreshOverview()) this._load(null, { background: this._loaded });
  }

  _stopRefresh() {
    if (this._refreshTimer != null) clearTimeout(this._refreshTimer);
    this._refreshTimer = null;
  }

  _scheduleRefresh() {
    if (!this._canRefreshOverview()) {
      this._stopRefresh();
      return;
    }
    if (this._refreshTimer != null) return;
    this._refreshTimer = setTimeout(() => {
      this._refreshTimer = null;
      this._load(null, { background: true });
    }, 30000);
  }

  showList() {
    if (!this._recipe && !this._detailId) {
      this._refreshOverview();
      return;
    }
    this._stopRefresh();
    this._request++;
    this._busy = false;
    this._background = false;
    this._recipe = null;
    this._detailId = null;
    this._cookMode = false;
    this._detailScroll = 0;
    this._error = false;
    this._status = "";
    this._revision++;
    this._render();
    this._refreshOverview();
  }
  getCardSize() { return 18; }
  _t(key) { return vhTouchscreenText(this, key); }
  _available() {
    return Boolean((this._hass?.connection?.connected ?? this._hass?.connected) &&
      this._hass?.services?.mealie?.get_recipes && this._hass?.services?.mealie?.get_recipe);
  }

  async _read(service, data) {
    const entry = this._config.recipes?.config_entry_id;
    if (!["get_recipes", "get_recipe"].includes(service) ||
        !this._available() || typeof entry !== "string" || !entry.trim()) throw new Error("Recipe integration unavailable");
    let timer;
    try {
      return (await Promise.race([
        this._hass.callWS({ type: "call_service", domain: "mealie", service,
          service_data: { config_entry_id: entry, ...data }, return_response: true }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Recipe read timed out")), 30000); }),
      ]))?.response;
    } finally { clearTimeout(timer); }
  }

  async _load(recipeId = null, { background = false } = {}) {
    if (this._busy || background && !this._canRefreshOverview()) return;
    this._stopRefresh();
    const request = ++this._request;
    this._background = background;
    if (!background) {
      this._cookMode = false;
      this._detailScroll = 0;
      this._busy = true;
      this._detailId = recipeId;
      this._error = false;
      this._status = recipeId ? "Loading recipe..." : "Loading recipes...";
      this._render();
    }
    try {
      const response = await this._read(recipeId ? "get_recipe" : "get_recipes",
        recipeId ? { recipe_id: recipeId } : { result_limit: -1 });
      if (request !== this._request) return;
      if (recipeId) {
        const recipe = response?.recipe;
        if (!this._validSummary(recipe) || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.instructions) ||
            !recipe.ingredients.every((item) => item && typeof item === "object" &&
              ["display", "original_text", "note", "title"].every((key) => item[key] == null || typeof item[key] === "string") &&
              (this._ingredient(item).trim() || item.title?.trim())) ||
            !recipe.instructions.every((step) => step && typeof step.text === "string" &&
              (step.title == null || typeof step.title === "string")) ||
            recipe.notes != null && (!Array.isArray(recipe.notes) ||
              !recipe.notes.every((note) => note && typeof note.text === "string" &&
                (note.title == null || typeof note.title === "string")))) throw new Error("Invalid recipe details");
        if (recipe.recipe_id !== recipeId && recipe.slug !== recipeId) throw new Error("Recipe identity changed");
        this._recipe = recipe;
        this._revision++;
      } else {
        const items = response?.recipes?.items;
        if (!Array.isArray(items) || !items.every((item) => this._validSummary(item))) throw new Error("Invalid recipe list");
        const recipes = items.map((item) => ({recipe_id: item.recipe_id, slug: item.slug,
          name: item.name, description: item.description || "", image: this._imageVersion(item)}))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!this._loaded || this._recipe || JSON.stringify(recipes) !== JSON.stringify(this._recipes)) this._revision++;
        this._recipes = recipes;
        this._loaded = true;
        this._recipe = null;
      }
      this._status = "";
      this._error = false;
    } catch (error) {
      if (request !== this._request) return;
      this._error = true;
      this._status = recipeId ? "Unable to load this recipe. Check Mealie and refresh." :
        "Unable to load recipes. Check Mealie and refresh.";
      console.error("Mealie recipe read failed.", { service: recipeId ? "get_recipe" : "get_recipes", code: error?.code || "read_failed" });
    } finally {
      if (request === this._request) {
        this._busy = false;
        this._background = false;
        const scrollParent = background ? this.parentElement : null;
        const scrollTop = scrollParent?.scrollTop;
        this._render();
        if (scrollParent) scrollParent.scrollTop = scrollTop;
        this._scheduleRefresh();
      }
    }
  }

  _validSummary(recipe) {
    return recipe && ["recipe_id", "slug", "name"].every((key) => typeof recipe[key] === "string" && recipe[key].trim()) &&
      (recipe.description == null || typeof recipe.description === "string");
  }

  _ingredient(item) {
    if (item.display?.trim()) return item.display;
    if (item.original_text?.trim()) return item.original_text;
    return [typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : "",
      typeof item.unit?.name === "string" ? item.unit.name : "",
      typeof item.food?.name === "string" ? item.food.name : "", item.note || ""].filter(Boolean).join(" ");
  }

  _imageVersion(recipe) {
    return typeof recipe.image === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(recipe.image) ? recipe.image : null;
  }

  _icon(pathData) {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [name, value] of Object.entries({viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
      "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round",
      "aria-hidden": "true", focusable: "false"})) icon.setAttribute(name, value);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    icon.append(path);
    return icon;
  }

  _renderCookToggle() {
    const button = this._cookToggle;
    if (!button) return;
    button.disabled = this._busy;
    const mode = String(this._cookMode), label = this._t(this._cookMode ? "Show full recipe" : "Enter cook mode");
    if (button.dataset.cookMode === mode && button.title === label) return;
    button.dataset.cookMode = mode;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", mode);
    button.replaceChildren(this._icon(this._cookMode ?
      "M3 9h6V3M9 9 3 3M21 9h-6V3M15 9l6-6M3 15h6v6M9 15l-6 6M21 15h-6v6M15 15l6 6" :
      "M9 3H3v6M3 3l6 6M15 3h6v6M21 3l-6 6M3 15v6h6M3 21l6-6M21 15v6h-6M21 21l-6-6"));
  }

  _toggleCookMode() {
    if (!this._recipe || this._busy) return;
    const scrolling = this.parentElement;
    if (!this._cookMode) this._detailScroll = scrolling?.scrollTop || 0;
    this._cookMode = !this._cookMode;
    this._render();
    if (scrolling) scrolling.scrollTop = this._cookMode ? 0 : this._detailScroll;
    this._cookToggle.focus({preventScroll: true});
  }

  _renderPhoto(recipe, parent, detail = false) {
    const frame = document.createElement("div");
    frame.className = "recipe-photo";
    const fallback = document.createElement("span");
    fallback.className = "recipe-photo-fallback";
    fallback.setAttribute("role", "img");
    fallback.setAttribute("aria-label", this._t("Photo unavailable"));
    fallback.append(this._icon(VH_TOUCHSCREEN_RECIPE_ICON_PATH));
    frame.append(fallback);
    parent.append(frame);
    const version = this._imageVersion(recipe);
    if (!this._imageOrigin || !version ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(recipe.recipe_id)) return;
    const image = document.createElement("img");
    image.alt = "";
    image.loading = detail ? "eager" : "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("load", () => {
      image.hidden = false;
      image.dataset.loaded = "true";
      fallback.hidden = true;
    });
    image.addEventListener("error", () => {
      image.hidden = true;
      fallback.hidden = false;
    });
    image.src = `${this._imageOrigin}/api/media/recipes/${recipe.recipe_id}/images/` +
      `${detail ? "original.webp" : "tiny-original.webp"}?version=${encodeURIComponent(version)}`;
    frame.append(image);
  }

  _render() {
    if (!this._config || !this.shadowRoot.querySelector("#recipes-status")) return;
    vhTouchscreenTranslate(this);
    const configured = typeof this._config.recipes?.config_entry_id === "string" && this._config.recipes.config_entry_id.trim();
    const status = !configured ? "Recipes are not configured. Select the Mealie integration in the dashboard configuration." :
      !this._available() ? "Recipes unavailable. Check the Home Assistant connection." : this._status ||
      (this._imageConfigInvalid ? "Recipe photos unavailable. Check the Mealie image address." : "");
    const feedback = this.shadowRoot.querySelector("#recipes-status");
    feedback.textContent = this._t(status);
    vhTouchscreenTextSlot(feedback);
    const refresh = this.shadowRoot.querySelector("#recipes-refresh");
    refresh.hidden = !this._error && Boolean(configured) && this._available();
    refresh.disabled = this._busy || !configured || !this._available();
    const showDetail = Boolean(this._recipe || this._detailId);
    this.shadowRoot.querySelector("#recipe-toolbar").hidden = showDetail;
    this.shadowRoot.querySelector("#recipe-count").hidden = showDetail;
    this.shadowRoot.querySelector("#recipe-search").disabled = this._busy;
    this.shadowRoot.querySelector("main").setAttribute("aria-busy", String(this._busy));
    this.shadowRoot.querySelector("main").dataset.cookMode = String(this._cookMode && Boolean(this._recipe));
    this._renderCookToggle();
    for (const button of this.shadowRoot.querySelectorAll(".recipe-tile")) button.disabled = this._busy;
    const signature = JSON.stringify([this._revision, this._detailId, vhTouchscreenLanguage(this)]);
    if (signature === this._contentSignature) return;
    this._contentSignature = signature;
    const content = this.shadowRoot.querySelector("#recipe-content");
    const node = (tag, text, parent) => {
      const element = document.createElement(tag);
      if (text != null) element.textContent = text;
      parent.append(element);
      return element;
    };
    content.replaceChildren();
    this._cookToggle = null;
    const filtered = this._recipes.filter((recipe) =>
      `${recipe.name} ${recipe.description || ""}`.toLocaleLowerCase().includes(this._search.toLocaleLowerCase().trim()));
    this.shadowRoot.querySelector("#recipe-count").textContent = this._loaded && !this._recipe ?
      `${filtered.length} / ${this._recipes.length}` : "";
    if (!this._recipe) {
      if (this._detailId) return;
      const grid = node("div", null, content);
      grid.className = "recipe-grid";
      if (this._loaded && !filtered.length) node("p", this._t("No recipes found."), grid);
      for (const recipe of filtered) {
        const button = node("button", null, grid);
        button.type = "button";
        button.className = "recipe-tile";
        button.title = recipe.name;
        button.setAttribute("aria-label", recipe.name);
        button.disabled = this._busy;
        this._renderPhoto(recipe, button);
        const copy = node("div", null, button);
        copy.className = "recipe-copy";
        node("strong", recipe.name, copy);
        node("span", recipe.description || "", copy).className = "recipe-description";
        button.addEventListener("click", () => this._load(recipe.recipe_id));
      }
      return;
    }
    const recipe = this._recipe;
    const detail = node("article", null, content);
    detail.className = "panel recipe-detail";
    const intro = node("div", null, detail);
    intro.className = "recipe-intro";
    const summary = node("div", null, intro);
    node("h2", recipe.name, summary);
    if (recipe.description) node("p", recipe.description, summary);
    if (typeof recipe.recipe_servings === "number" && recipe.recipe_servings > 0) {
      node("p", `${this._t("Servings")}: ${recipe.recipe_servings}`, summary);
    } else if (typeof recipe.recipe_yield === "string" && recipe.recipe_yield) node("p", recipe.recipe_yield, summary);
    if (typeof recipe.total_time === "string" && recipe.total_time) node("p", `${this._t("Total time")}: ${recipe.total_time}`, summary);
    this._renderPhoto(recipe, intro, true);
    const columns = node("div", null, detail);
    columns.className = "recipe-columns";
    const ingredients = node("section", null, columns);
    ingredients.className = "recipe-ingredients";
    node("h3", this._t("Ingredients"), ingredients);
    const list = node("ul", null, ingredients);
    for (const item of recipe.ingredients) {
      const row = node("li", null, list);
      if (item.title) node("strong", item.title, row);
      node("p", this._ingredient(item), row);
    }
    const instructions = node("section", null, columns);
    instructions.className = "recipe-preparation";
    const heading = node("div", null, instructions);
    heading.className = "recipe-preparation-heading";
    node("h3", this._t("Preparation"), heading);
    const toggle = node("button", null, heading);
    toggle.type = "button";
    toggle.className = "action-icon recipe-cook-toggle primary";
    toggle.addEventListener("click", () => this._toggleCookMode());
    this._cookToggle = toggle;
    this._renderCookToggle();
    const steps = node("ol", null, instructions);
    for (const step of recipe.instructions) {
      const row = node("li", null, steps);
      if (step.title) node("strong", step.title, row);
      node("p", step.text, row);
    }
    if (recipe.notes?.length) {
      const notes = node("section", null, detail);
      notes.className = "recipe-notes";
      node("h3", this._t("Notes"), notes);
      for (const note of recipe.notes) {
        if (note.title) node("strong", note.title, notes);
        node("p", note.text, notes);
      }
    }
  }
}

const VH_TOUCHSCREEN_MAINTENANCE_PAGES = ["inventory", "products", "locations", "categories", "stores"];
const VH_TOUCHSCREEN_SETTINGS_PAGES = [...VH_TOUCHSCREEN_MAINTENANCE_PAGES, "configuration"];
const VH_TOUCHSCREEN_PAGES = ["kitchen", "scan", "quick-shopping", "shopping", "quick-stock", ...VH_TOUCHSCREEN_SETTINGS_PAGES, "recipes"];

class VhInventoryTouchscreenDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._page = "scan";
    this._cards = {};
    this._menuOpen = false;
    this._maintenanceOpen = false;
    this._menuViewportChanged = () => this._positionMenu();
    this._beforeUnload = (event) => {
      if (VH_TOUCHSCREEN_SETTINGS_PAGES.some((page) => this._cards[page]?._editor || this._cards[page]?._busy) ||
          this._cards["quick-stock"]?._busy || this._cards.kitchen?._busy || this._cards.shopping?._busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    this._hashChanged = () => {
      const page = window.location.hash.slice(1);
      if (!page || VH_TOUCHSCREEN_PAGES.includes(page)) {
        this._switchPage(page || "scan");
      }
    };
  }

  setConfig(config) {
    this._setMenuOpen(false);
    this._config = config;
    const theme = VH_TOUCHSCREEN_THEME.replace(":root", ":host")
      .replace('html[data-theme="dark"]', ':host([data-theme="dark"])');
    this.setAttribute("data-theme", config.theme === "light" ? "light" : "dark");
    this.shadowRoot.innerHTML = `<style>${theme}${VH_TOUCHSCREEN_STYLE}
      :host { display: grid; grid-template-rows: minmax(0, 1fr); position: relative;
        height: calc(100dvh - var(--kiosk-header-height, var(--header-height, 0px))); overflow: hidden;
        --vh-touchscreen-main-height: 100%; --vh-navigation-header-inset: 580px;
        --vh-navigation-header-min-height: 104px; --vh-navigation-header-block-inset: 0px; }
      .pages { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
      .pages, .page-navigation { scrollbar-width: none; }
      .pages::-webkit-scrollbar, .page-navigation::-webkit-scrollbar { width: 0; }
      .pages > * { height: 100%; }
      .navigation-shortcuts { position: absolute; top: 32px; right: 16px; z-index: 3;
        display: grid; grid-template-columns: repeat(5, 104px); gap: 12px; }
      .navigation-shortcuts button { display: grid; place-items: center;
        width: 104px; height: 104px; min-height: 104px; padding: 12px; color: var(--cp-accent); }
      .navigation-shortcuts svg { display: block; width: 74.8px; height: 74.8px; }
      .navigation-shortcuts .navigation-shortcut[aria-current="page"] { border-color: #fd8ea1; background: #fd8ea1; color: #000; }
      .navigation-popup { display: none; position: fixed; margin: 0; min-width: 0;
        left: auto; right: calc(100vw - var(--vh-menu-left, 0px) - var(--vh-menu-width, 100vw) + 12px);
        top: calc(var(--vh-menu-top, 0px) + 12px);
        width: min(400px, calc(var(--vh-menu-width, 100vw) - 24px)); max-width: none;
        max-height: calc(var(--vh-menu-height, 100dvh) - 24px); overflow: hidden;
        padding: 12px; border: 1px solid var(--cp-border-strong); border-radius: 16px;
        color: var(--cp-text); background: var(--cp-bg-elevated);
        box-shadow: 0 8px 32px rgba(0, 0, 0, .35); }
      .navigation-popup[open] { display: flex; flex-direction: column; gap: 12px; }
      .navigation-popup::backdrop { background: var(--cp-overlay); }
      .navigation-heading { display: flex; align-items: center; justify-content: space-between;
        gap: 12px; flex-shrink: 0; }
      .navigation-heading h2 { font-size: 24px; margin: 0; }
      #navigation-close { width: 48px; min-height: 48px; padding: 12px; flex-shrink: 0; }
      #navigation-close svg { display: block; width: 22px; height: 22px; }
      .page-navigation { display: flex; flex-direction: column; gap: 8px;
        flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
      .page-navigation button { display: flex; width: 100%; flex-shrink: 0; align-items: center;
        justify-content: flex-start; min-width: 0; min-height: 56px; padding: 12px 16px;
        font-size: 20px; line-height: 1.2; gap: 12px; }
      .page-navigation button:focus-visible { outline-offset: -3px; }
      .page-navigation svg { width: 28px; height: 28px; flex-shrink: 0; }
      .navigation-label { min-width: 0; overflow-wrap: anywhere; text-align: left; }
      #maintenance-toggle .navigation-label { flex: 1; }
      #maintenance-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
      #maintenance-toggle[data-active="true"] { border-color: var(--cp-accent); color: var(--cp-accent); }
      .maintenance-group { display: flex; flex-direction: column; gap: 8px;
        margin-left: 12px; padding-left: 12px; border-left: 2px solid var(--cp-accent); }
      @media (max-width: 1400px) {
        :host { --vh-navigation-header-inset: 0px; --vh-navigation-header-block-inset: 116px; }
      }
      @media (max-width: 600px) {
        :host { --vh-navigation-header-block-inset: 348px; }
        .navigation-shortcuts { top: 16px; right: 12px; grid-template-columns: repeat(2, 104px); }
        .page-navigation button { padding: 12px; font-size: 18px; }
      }
      </style><div class="pages"></div>`;
    const pages = this.shadowRoot.querySelector(".pages");
    for (const [page, tag] of [["kitchen", "vh-kitchen-touchscreen"],
      ["scan", "vh-inventory-touchscreen"], ["shopping", "vh-inventory-shopping-touchscreen"],
      ["inventory", "vh-inventory-stock-touchscreen"], ["quick-shopping", "vh-inventory-quick-shopping-touchscreen"],
      ["quick-stock", "vh-inventory-quick-stock-touchscreen"],
      ...Object.keys(VH_TOUCHSCREEN_MANAGEMENT).map((page) => [page, "vh-inventory-management-touchscreen"]),
      ["configuration", "vh-inventory-configuration-touchscreen"], ["recipes", "vh-recipes-touchscreen"]]) {
      const card = document.createElement(tag);
      card.preview = this.preview;
      card.setConfig({ ...config, table: page, type: `custom:${tag}` });
      this._cards[page] = card;
      pages.append(card);
      if (this._hass) card.hass = this._hass;
    }
    this._cards.inventory.onEditProduct = (id) => this._editInventoryProduct(id);
    const nav = document.createElement("nav");
    nav.className = "page-navigation";
    nav.setAttribute("aria-label", this._cards.scan._t("Page navigation"));
    nav.dataset.i18nAriaLabel = "Page navigation";
    const toggle = document.createElement("button");
    toggle.id = "navigation-toggle";
    toggle.className = "menu-launcher";
    toggle.type = "button";
    vhTouchscreenAttribute(this, toggle, "aria-label", "Open navigation");
    vhTouchscreenAttribute(this, toggle, "title", "Open navigation");
    toggle.setAttribute("aria-haspopup", "dialog");
    toggle.setAttribute("aria-controls", "navigation-popup");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `<svg id="mdi-menu" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z"/></svg>`;
    const shortcuts = document.createElement("div");
    shortcuts.id = "navigation-shortcuts";
    shortcuts.className = "navigation-shortcuts";
    shortcuts.setAttribute("role", "group");
    vhTouchscreenAttribute(this, shortcuts, "aria-label", "Page navigation");
    this._shortcutButtons = [];
    for (const [target, label, icon] of [
      ["scan", "Home", '<path d="M12 3 2 12h3v9h5v-6h4v6h5v-9h3L12 3Z"/>'],
      ["recipes", "Recipes", '<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6C9 3.5 5.5 3.5 3 4.5v15c3-1 6-.5 9 1.5 3-2 6-2.5 9-1.5v-15C18.5 3.5 15 3.5 12 6Z"/><path d="M12 6v15M6 8h3M6 11h3M6 14h3M15 8h3M15 11h3M15 14h3"/></g>'],
      ["kitchen", "Lighting", `<path d="${VH_TOUCHSCREEN_KITCHEN_ICONS["lightbulb-group"]}"/>`],
      ["shopping", "Shopping", '<path fill="none" stroke="currentColor" stroke-width="2" d="M3 4h2l3 11h10l3-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>'],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `shortcut-${target}`;
      button.className = "navigation-shortcut";
      button.dataset.page = target;
      vhTouchscreenAttribute(this, button, "aria-label", label);
      vhTouchscreenAttribute(this, button, "title", label);
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${icon}</svg>`;
      button.addEventListener("click", () => this._navigateTo(target));
      shortcuts.append(button);
      this._shortcutButtons.push(button);
    }
    shortcuts.append(toggle);
    const popup = document.createElement("dialog");
    popup.id = "navigation-popup";
    popup.className = "navigation-popup";
    popup.setAttribute("aria-labelledby", "navigation-title");
    const heading = document.createElement("div");
    heading.className = "navigation-heading";
    const title = document.createElement("h2");
    title.id = "navigation-title";
    title.dataset.i18n = "Page navigation";
    title.textContent = this._t("Page navigation");
    const close = document.createElement("button");
    close.id = "navigation-close";
    close.type = "button";
    vhTouchscreenAttribute(this, close, "aria-label", "Close navigation");
    vhTouchscreenAttribute(this, close, "title", "Close navigation");
    close.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg>`;
    heading.append(title, close);
    popup.append(heading, nav);
    this._menuButton = toggle;
    this._menuPopup = popup;
    toggle.addEventListener("click", () => this._setMenuOpen(!this._menuOpen));
    close.addEventListener("click", () => this._setMenuOpen(false, true));
    popup.addEventListener("cancel", event => {
      event.preventDefault();
      this._setMenuOpen(false, true);
    });
    popup.addEventListener("keydown", event => {
      if (event.key !== "Tab") return;
      const buttons = [...popup.querySelectorAll("button:not(:disabled)")].filter(button => button.getClientRects().length);
      const first = buttons[0], last = buttons.at(-1), active = this.shadowRoot.activeElement;
      if (first && (event.shiftKey ? active === first : active === last)) {
        event.preventDefault();
        const target = event.shiftKey ? last : first;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      }
    });
    popup.addEventListener("close", () => {
      if (!popup.open) this._setMenuOpen(false);
    });
    popup.addEventListener("pointerdown", event => {
      if (event.target !== popup) return;
      const box = popup.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right ||
          event.clientY < box.top || event.clientY > box.bottom) {
        event.preventDefault();
        this._setMenuOpen(false, true);
      }
    });
    const maintenanceToggle = document.createElement("button");
    maintenanceToggle.id = "maintenance-toggle";
    maintenanceToggle.type = "button";
    maintenanceToggle.setAttribute("aria-controls", "maintenance-pages");
    maintenanceToggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
    const maintenanceLabel = document.createElement("span");
    maintenanceLabel.className = "navigation-label";
    maintenanceLabel.dataset.i18n = "Maintenance";
    maintenanceLabel.textContent = this._t("Maintenance");
    maintenanceToggle.append(maintenanceLabel);
    const maintenance = document.createElement("div");
    maintenance.id = "maintenance-pages";
    maintenance.className = "maintenance-group";
    maintenance.setAttribute("role", "group");
    vhTouchscreenAttribute(this, maintenance, "aria-label", "Maintenance");
    this._maintenanceButton = maintenanceToggle;
    this._maintenanceGroup = maintenance;
    maintenanceToggle.addEventListener("click", () => this._setMaintenanceOpen(!this._maintenanceOpen));
    for (const [target, label, icon] of [
      ["scan", "Scan products", '<path d="M4 8V4h4m8 0h4v4M4 16v4h4m8 0h4v-4M8 8v8m3-8v8m3-8v8m3-8v8"/>'],
      ["recipes", "Recipes", `<path d="${VH_TOUCHSCREEN_RECIPE_ICON_PATH}"/>`],
      ["kitchen", "Kitchen", '<path d="M3 3h18v18H3V3zm0 6h18M8 3v6m8-6v6M3 13h18M12 13v8M6 16v2m12-2v2"/><circle cx="12" cy="6" r="1"/>'],
      ["shopping", "Shopping", '<path d="M3 4h2l3 11h10l3-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>'],
      ["quick-shopping", "Quick Shopping", '<path d="M3 4h2l3 11h10l3-8H6M12 8v6m-3-3h6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>'],
      ["quick-stock", "Quick Stock", '<path d="M4 7l8-4 8 4v10l-8 4-8-4V7zm0 0l8 4 8-4M12 11v10m-4-7h8"/>'],
      ["inventory", "Inventory", '<path d="M4 7l8-4 8 4v10l-8 4-8-4V7zm0 0l8 4 8-4M12 11v10"/>'],
      ["products", "Products", '<path d="M4 7l8-4 8 4v10l-8 4-8-4V7zm0 0l8 4 8-4M12 11v10"/>'],
      ["locations", "Locations", '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>'],
      ["categories", "Categories", '<path d="M3 3h8l10 10-8 8L3 11V3z"/><circle cx="7" cy="7" r="1"/>'],
      ["stores", "Stores", '<path d="M3 10l2-7h14l2 7M4 10v11h16V10M3 10c0 3 6 3 6 0 0 3 6 3 6 0 0 3 6 3 6 0M9 21v-7h6v7"/>'],
      ["configuration", "Configuration", '<path d="M9 3h6l.5 2 1.5 1 2-.5 2 3.5-1.5 1.5v3L21 15l-2 3.5-2-.5-1.5 1-.5 2H9l-.5-2L7 18l-2 .5L3 15l1.5-1.5v-3L3 9l2-3.5L7 6l1.5-1L9 3z"/><circle cx="12" cy="12" r="3"/>'],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.page = target;
      vhTouchscreenAttribute(this, button, "aria-label", label);
      vhTouchscreenAttribute(this, button, "title", label);
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${icon}</svg>`;
      const text = document.createElement("span");
      text.className = "navigation-label";
      text.dataset.i18n = label;
      text.textContent = this._cards.scan._t(label);
      button.append(text);
      button.addEventListener("click", () => this._navigateTo(target));
      (VH_TOUCHSCREEN_MAINTENANCE_PAGES.includes(target) ? maintenance : nav).append(button);
    }
    nav.append(maintenanceToggle, maintenance);
    this.shadowRoot.append(shortcuts, popup);
    this._setMaintenanceOpen(false);
    this._page = VH_TOUCHSCREEN_PAGES.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "scan";
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
    this._setMenuOpen(false);
    this._cards.recipes?.setActive(false);
  }

  _setMenuOpen(open, restoreFocus = false) {
    this._menuOpen = Boolean(open);
    this._menuButton?.setAttribute("aria-expanded", String(this._menuOpen));
    if (this._menuOpen && this._menuPopup) {
      this._positionMenu();
      if (!this._menuPopup.open) this._menuPopup.showModal();
      this._setMaintenanceOpen(VH_TOUCHSCREEN_MAINTENANCE_PAGES.includes(this._page));
      window.addEventListener("resize", this._menuViewportChanged);
      window.visualViewport?.addEventListener("resize", this._menuViewportChanged);
      window.visualViewport?.addEventListener("scroll", this._menuViewportChanged);
      const current = this._menuPopup.querySelector(`button[data-page="${this._page}"]`);
      current?.focus({ preventScroll: true });
      current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    } else {
      window.removeEventListener("resize", this._menuViewportChanged);
      window.visualViewport?.removeEventListener("resize", this._menuViewportChanged);
      window.visualViewport?.removeEventListener("scroll", this._menuViewportChanged);
      if (this._menuPopup?.open) this._menuPopup.close();
      this._setMaintenanceOpen(false);
      if (restoreFocus) this._menuButton?.focus({ preventScroll: true });
    }
  }

  _positionMenu() {
    if (this._menuPopup) vhTouchscreenViewport(this._menuPopup, "menu");
  }

  _setMaintenanceOpen(open) {
    this._maintenanceOpen = Boolean(open);
    if (this._maintenanceGroup) this._maintenanceGroup.hidden = !this._maintenanceOpen;
    this._maintenanceButton?.setAttribute("aria-expanded", String(this._maintenanceOpen));
  }

  getCardSize() { return 18; }

  _syncHash() {
    if (this.preview) return;
    const hash = this._page === "scan" ? "" : `#${this._page}`;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${hash}`);
  }

  _editInventoryProduct(id) {
    const products = this._cards.products;
    if (!products?._canAct() || !products._data().products.some((p) => p.id === id)) return false;
    this._switchPage("products");
    if (this._page !== "products") return false;
    products._openEditor(id);
    return products._editor?.id === id;
  }

  _navigateTo(page) {
    this._switchPage(page);
    if (page === "recipes" && this._page === "recipes") {
      this._cards.recipes.showList();
      this.shadowRoot.querySelector(".pages").scrollTop = 0;
    }
  }

  _switchPage(page) {
    if (!VH_TOUCHSCREEN_PAGES.includes(page) || !this._cards[page]) return;
    this._setMenuOpen(false, true);
    const scan = this._cards.scan;
    const shopping = this._cards.shopping;
    const management = VH_TOUCHSCREEN_SETTINGS_PAGES.map((name) => this._cards[name]).filter(Boolean);
    if (page !== this._page) {
      const editing = management.find((card) => card._editor || card._busy);
      if (editing) {
        editing._status = "Save or discard your edits before switching pages.";
        editing._render();
        this._syncHash();
        return;
      }
      if (scan._dirty() || scan._saving) {
        scan._notice = { title: "Save or discard your edits", detail: "Save or discard your edits before switching pages.", state: "warning" };
        scan._render();
        this._syncHash();
        return;
      }
      if (scan._hasPendingShoppingChoice()) {
        scan._notice = { title: "Choose a shopping-list action.",
          detail: "Finish the shopping-list decision before scanning or changing pages.", state: "warning" };
        scan._render();
        this._syncHash();
        return;
      }
      if (scan._busy || scan._queue.length || shopping._busy || this._cards["quick-shopping"]?._busy ||
          this._cards["quick-stock"]?._busy || this._cards.kitchen?._busy) {
        if (this._page === "scan") {
          scan._notice = { title: "Processing scan", detail: "Wait for the current action before switching pages.", state: "busy" };
          scan._render();
        }
        this._syncHash();
        return;
      }
      shopping._confirmId = null;
      shopping._render();
      for (const card of management) {
        card._confirmation = null;
        card._render();
      }
    }
    this._page = page;
    this._syncHash();
    this._renderNavigation();
    if (page === "scan") scan._focusInput();
  }

  _renderNavigation() {
    vhTouchscreenTranslate(this);
    for (const [page, card] of Object.entries(this._cards)) {
      card.hidden = this._page !== page;
    }
    for (const button of [...this.shadowRoot.querySelectorAll(".page-navigation button[data-page]"),
      ...(this._shortcutButtons || [])]) {
      button.setAttribute("aria-pressed", String(button.dataset.page === this._page));
      button.setAttribute("aria-current", button.dataset.page === this._page ? "page" : "false");
    }
    if (this._maintenanceButton) {
      this._maintenanceButton.dataset.active = String(VH_TOUCHSCREEN_MAINTENANCE_PAGES.includes(this._page));
    }
    if (this._page === "configuration") this._cards.configuration?.activate();
    this._cards.recipes?.setActive(this._page === "recipes");
  }

  _t(key) { return vhTouchscreenText(this, key); }
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
if (!customElements.get("vh-inventory-quick-shopping-touchscreen")) {
  customElements.define("vh-inventory-quick-shopping-touchscreen", VhInventoryQuickShoppingTouchscreen);
}
if (!customElements.get("vh-inventory-quick-stock-touchscreen")) {
  customElements.define("vh-inventory-quick-stock-touchscreen", VhInventoryQuickStockTouchscreen);
}
if (!customElements.get("vh-inventory-management-touchscreen")) {
  customElements.define("vh-inventory-management-touchscreen", VhInventoryManagementTouchscreen);
}
if (!customElements.get("vh-inventory-configuration-touchscreen")) {
  customElements.define("vh-inventory-configuration-touchscreen", VhInventoryConfigurationTouchscreen);
}
if (!customElements.get("vh-inventory-touchscreen-dashboard")) {
  customElements.define("vh-inventory-touchscreen-dashboard", VhInventoryTouchscreenDashboard);
}
if (!customElements.get("vh-kitchen-touchscreen")) {
  customElements.define("vh-kitchen-touchscreen", VhKitchenTouchscreen);
}
if (!customElements.get("vh-recipes-touchscreen")) {
  customElements.define("vh-recipes-touchscreen", VhRecipesTouchscreen);
}
