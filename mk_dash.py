import json, websocket, os, glob

# --- Connection settings -----------------------------------------------------
# Set these via environment variables before running:
#   HA_HOST  = your Home Assistant host:port      (e.g. 192.168.1.50:8123)
#   HA_TOKEN = a Long-Lived Access Token from your HA user profile
HOST = os.environ.get("HA_HOST", "YOUR_HA_HOST:8123")
TOKEN = os.environ.get("HA_TOKEN", "YOUR_LONG_LIVED_ACCESS_TOKEN")

# Translation files live next to this script; adding a language = drop a JSON
# here and add its display name to input_select.vh_language (vh_inventory.yaml).
_TRANS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "translations")


def _load_translations():
    maps, langs = {}, {}
    for fp in sorted(glob.glob(os.path.join(_TRANS_DIR, "*.json"))):
        with open(fp, encoding="utf-8") as f:
            d = json.load(f)
        code = d.get("__code__") or os.path.splitext(os.path.basename(fp))[0]
        name = d.get("__name__") or code
        maps[code] = {k: v for k, v in d.items() if not k.startswith("__")}
        langs[name] = code
    keys = {}
    for strings in maps.values():
        for k in strings:
            keys[k] = 1
    return maps, langs, keys


I18N_MAP, I18N_LANGS, I18N_KEYS = _load_translations()

# Table styling ported from the production "VH-Inventory" barcode dashboard:
# transparent row striping + subtle row separators + theme font, on glass cards.
CSS = {"table+": "width:100%;padding-top:0 !important;",
       "thead th": "text-align:left;color:var(--vh-table-header-color,#4dabf5);"
                   "font-weight:bold;",
       "td,th": "padding:4px 8px;white-space:nowrap;"
                "font-size:var(--vh-font-size-primary,13px);",
       "tbody tr:nth-child(odd)": "background-color:transparent !important;",
       "tbody tr:nth-child(even)": "background-color:transparent !important;",
       "td+": "border-bottom:1px solid rgba(255,255,255,0.28);"}

# Glass card frame (square corners + subtle white border) applied to every
# flex-table card, matching the VH-Inventory look.
FLEX_CM = {"style": {
    ".": "ha-card { border: var(--vh-card-border,1px solid rgba(255,255,255,0.25))"
         " !important; border-radius: var(--vh-card-radius,0px) !important; }"
         " {% if is_state('input_boolean.vh_show_id_columns','off') %}"
         " #Col0, tbody td:first-child { display: none !important; }"
         " {% endif %}",
    "ha-card$": ".card-header { padding-bottom: 4px !important; }"}}

# Filter block (search + buttons in one background), ported from the production
# Woonkamer-TS dashboard. WRAP_CM gives the surrounding vertical-stack a single
# card background + border; SEARCH_CM blends the search entities row into it
# (transparent card, keeping the input field's own fill + icon).
WRAP_CM = {"style": ":host { border: var(--vh-card-border,1px solid rgba(255,255,255,0.25))"
                    " !important; border-radius: var(--vh-card-radius,0px) !important;"
                    " background: var(--ha-card-background, var(--card-background-color))"
                    " !important; padding: 8px !important; }"}
SEARCH_CM = {"style": "ha-card { background: transparent !important; border: none"
                      " !important; box-shadow: none !important; padding: 0px !important; }"
                      " #states { padding-top: 0px !important; }"}


# Styles the search row's magnify/close state-badge into an icon button matching
# the other dashboard buttons (same border, radius, background). The icon swaps
# to mdi:close when the search has a value, via a card_mod Jinja template driving
# --card-mod-icon. Must pierce hui-generic-entity-row's shadow root.
def icon_btn_cm(entity):
    icon = ("{%% if states('%s') | trim not in ['','unknown','unavailable'] %%}"
            "mdi:close{%% else %%}mdi:magnify{%% endif %%}" % entity)
    # Styles inside hui-generic-entity-row's shadow root: the magnify/close icon
    # button + the ha-input search field (collapsed to button height, vertically
    # centred, with a gap from the button).
    row_css = (
        ":host { min-height: 38px !important; }"
        " state-badge { --card-mod-icon: " + icon + "; cursor: pointer;"
        " border: var(--vh-card-border, 1px solid rgba(255,255,255,0.25));"
        " border-radius: var(--vh-card-radius, 0px);"
        " background: var(--vh-card-background); width: 38px; height: 38px;"
        " margin-right: 10px; display: inline-flex; align-items: center;"
        " justify-content: center; --mdc-icon-size: 22px;"
        " transition: background .15s ease, border-color .15s ease; }"
        " state-badge:hover { background: var(--vh-table-header-color,#4dabf5);"
        " border-color: var(--vh-table-header-color,#4dabf5); }"
        " state-badge:hover ha-state-icon { color: #fff; }")
    # Styles inside the Web Awesome wa-input shadow root: hide the label, collapse
    # height to match the button, and overlay our own placeholder text (the native
    # "(empty value)" placeholder text cannot be changed via CSS, so it is made
    # transparent and replaced with an ::after only while the field is empty).
    wa_css = (
        "[part~='form-control-label'] { display: none !important; }"
        " [part~='base'] { position: relative !important; min-height: 38px !important;"
        " height: 38px !important; }"
        " input[part~='input']::placeholder { color: transparent !important; }"
        " [part~='base']:has(input:placeholder-shown)::before {"
        " content: '(enter a search text)' !important; position: absolute !important;"
        " left: 14px; top: 50%; transform: translateY(-50%);"
        " color: var(--secondary-text-color); pointer-events: none; z-index: 2; }")
    return {"style": {
        ".": "ha-input { display: flex; align-items: center; width: 100%;"
             " height: 38px; position: relative; top: 4px; }",
        "hui-generic-entity-row$": row_css,
        "ha-input$": {"wa-input$": wa_css}}}


def scan_icon_cm(placeholder):
    """Like icon_btn_cm but for the Scan tab's barcode field: the leading icon is
    a plain, non-clickable mdi:barcode-scan (no button border/background/hover and
    no icon-swap), while the field keeps the same height/vertical-centring and a
    custom placeholder overlay. Same coordinates as the search field so the field
    and the buttons below line up identically across tabs."""
    row_css = (
        ":host { min-height: 38px !important; }"
        " state-badge { width: 38px; height: 38px; margin-right: 10px;"
        " display: inline-flex; align-items: center; justify-content: center;"
        " --mdc-icon-size: 22px; }")
    wa_css = (
        "[part~='form-control-label'] { display: none !important; }"
        " [part~='base'] { position: relative !important; min-height: 38px !important;"
        " height: 38px !important; }"
        " input[part~='input']::placeholder { color: transparent !important; }"
        " [part~='base']:has(input:placeholder-shown)::before {"
        " content: '" + placeholder + "' !important; position: absolute !important;"
        " left: 14px; top: 50%; transform: translateY(-50%);"
        " color: var(--secondary-text-color); pointer-events: none; z-index: 2; }")
    return {"style": {
        ".": "ha-input { display: flex; align-items: center; width: 100%;"
             " height: 38px; position: relative; top: 4px; }",
        "hui-generic-entity-row$": row_css,
        "ha-input$": {"wa-input$": wa_css}}}


def filter_block(entity, add_hash, add_label):
    """One background containing: a search row whose icon clears the search when
    clicked (tap_action on the row) — magnify when empty, close when a filter is
    applied — then the Add button below it. The Add button is nudged right so its
    left edge lines up with the search-icon button, and pulled up to tighten the
    gap to the search field."""
    row = {"type": "entities", "card_mod": SEARCH_CM,
      "entities": [{"entity": entity, "name": "", "icon": "mdi:magnify",
        "card_mod": icon_btn_cm(entity),
        "tap_action": {"action": "call-service", "service": "input_text.set_value",
          "service_data": {"entity_id": entity, "value": ""}}}]}
    ab = add_btn(add_hash, add_label)
    ab["styles"]["card"] += [{"margin-left": "16px"}, {"margin-top": "-20px"}]
    return {"type": "vertical-stack", "card_mod": WRAP_CM, "cards": [row, ab]}


def search_block(entity):
    """Like filter_block but just the boxed search field + clear-icon (no Add
    button). Used by the Add tab, whose product grid has no separate add action."""
    row = {"type": "entities", "card_mod": SEARCH_CM,
      "entities": [{"entity": entity, "name": "", "icon": "mdi:magnify",
        "card_mod": icon_btn_cm(entity),
        "tap_action": {"action": "call-service", "service": "input_text.set_value",
          "service_data": {"entity_id": entity, "value": ""}}}]}
    return {"type": "vertical-stack", "card_mod": WRAP_CM, "cards": [row]}


HASS = "document.querySelector('home-assistant').hass"


def fld(name):
    """Null-safe field render: empty string when undefined/null, but keeps 0."""
    return "x.%s==null?'':x.%s" % (name, name)


def id_col(attr):
    """First column showing the row's database id."""
    return {"name": "ID", "data": attr, "align": "center", "modify": fld("id"), "_w": "56px"}


def css_w(columns):
    """Per-table CSS = shared CSS + fixed-width rules for columns carrying a
    '_w' hint. flex-table-card renders headers as <th id="Col<idx>">, so we
    target each fixed column positionally. Auto table-layout keeps the
    descriptive columns flexible so they absorb the remaining width."""
    out = dict(CSS)
    for idx, col in enumerate(columns):
        w = col.pop("_w", None)
        if w:
            out["#Col%d" % idx] = "width:%s;" % w
    return out


_SET_SVC = ("document.querySelector('home-assistant').hass.callService"
            "('pyscript','vh_inventory_set_product_field',")


def inline_select(sensor_attr, name, svc="vh_inventory_set_product_field"):
    """Inline <select> whose options are (re)built live when the control is
    opened (focus/mousedown), so newly added options appear without a full
    dashboard refresh. onchange calls svc with {id, field, value}.
    sensor_attr: list sensor suffix (e.g. 'locations'); name: row/field key."""
    # JS run on open: rebuild <option>s from the live list sensor, keep current.
    rebuild = (
        "var s=document.querySelector('home-assistant').hass.states"
        "['sensor.vh_inventory_" + sensor_attr + "'];"
        "var items=(s&&s.attributes." + sensor_attr + ")||[];"
        "var c=this.getAttribute('data-cur')||'';"
        "var o=`<option value=''></option>`;"
        "for(var i=0;i<items.length;i++){var v=items[i]." + name + ";"
        "o+=`<option value='${v}'${v===c?' selected':''}>${v}</option>`;}"
        "this.innerHTML=o;this.value=c;"
    )
    return (
        "(function(){"
        "var cur=x." + name + "==null?'':x." + name + ";"
        "var h=\"" + rebuild + "\";"
        "var onch=\"document.querySelector('home-assistant').hass.callService"
        "('pyscript','" + svc + "',{id:\"+x.id+\",field:'" + name
        + "',value:this.value})\";"
        "return `<select style='max-width:140px;cursor:pointer' "
        "data-cur=\"${cur}\" onfocus=\"${h}\" onmousedown=\"${h}\" "
        "onchange=\"${onch}\">"
        "<option value=\"${cur}\" selected>${cur}</option></select>`;"
        "})()"
    )


def inline_number(name):
    """Inline <input type=number> for a product field."""
    return (
        "'<input type=\"number\" min=\"0\" step=\"1\" value=\"'+(x." + name
        + "==null?'':x." + name + ")+'\" style=\"width:52px;text-align:center\" onchange=\"' + "
        "\"" + _SET_SVC.replace('"', '\\\"') + "{id:\"+x.id+\",field:'" + name + "',value:this.value})\""
        " + '\">'"
    )



def edit_icon(table, pophash):
    js = ("%s.callService('pyscript','vh_inventory_edit_load',{table:'%s',id:${x.id}})"
          ".then(()=>{location.hash='%s'})" % (HASS, table, pophash))
    return ("`<ha-icon icon=\"mdi:pencil\" style=\"cursor:pointer\" "
            "onclick=\"%s\"></ha-icon>`" % js)


def del_icon(table):
    js = ("%s.callService('pyscript',"
          "'vh_inventory_delete',{table:'%s',id:${x.id}})" % (HASS, table))
    return ("`<ha-icon icon=\"mdi:delete\" style=\"cursor:pointer;color:var(--error-color)\" "
            "onclick=\"%s\"></ha-icon>`" % js)


def resolve_icon():
    """Wrench icon shown only on Unknown scan_queue rows: pre-fills and opens the
    Resolve Product popup so the user can fill in details manually."""
    js = ("%s.callService('pyscript','vh_inventory_scan_resolve_manual',{id:${x.id}})"
          ".then(()=>{location.hash='#vh-resolve-product'})" % HASS)
    icon = ("`<ha-icon icon=\"mdi:wrench\" style=\"cursor:pointer\" "
            "onclick=\"%s\"></ha-icon>`" % js)
    return "x.state=='Unknown'?" + icon + ":''"


def adjust_icon(icon, delta):
    js = ("%s.callService('pyscript','vh_inventory_adjust_stock',{id:${x.id},delta:%d})"
          % (HASS, delta))
    return ("`<ha-icon icon=\"%s\" style=\"cursor:pointer\" onclick=\"%s\"></ha-icon>`"
            % (icon, js))


def actions_cols(table, pophash, attr):
    return [
        {"name": "Edit", "data": attr, "align": "center", "modify": edit_icon(table, pophash), "_w": "56px"},
        {"name": "Del", "data": attr, "align": "center", "modify": del_icon(table), "_w": "56px"},
    ]


# Button matching the VH-Inventory dashboard buttons: dark glass card,
# light bold text, subtle white border, square (theme) corners.
def btn(name, action):
    return {"type": "custom:button-card", "name": name, "show_icon": False,
      "tap_action": action,
      "styles": {"card": [{"height": "36px"},
        {"background": "var(--vh-card-background)"},
        {"border-radius": "var(--vh-card-radius, 0px)"},
        {"border": "var(--vh-card-border, 1px solid rgba(255,255,255,0.25))"},
        {"box-shadow": "none"}, {"padding": "0 16px"}, {"cursor": "pointer"},
        {"width": "fit-content"}, {"min-width": "90px"},
        {"display": "flex"}, {"align-items": "center"}, {"justify-content": "center"}],
        "name": [{"color": "var(--vh-text-primary, rgba(230,230,230,1))"},
          {"font-size": "13px"}, {"font-weight": "bold"}]}}


def add_btn(hsh, label="Add"):
    return btn(label, {"action": "navigate", "navigation_path": "#%s" % hsh})


# Index of the "Quick add" tab inside the tabbed card's `tabs` list (see the
# `tabbed` assembly below; guarded by an assert there). Used by goto_tab_btn to
# switch tabs programmatically via _GOTAB_JS instead of opening a popup.
QUICK_ADD_TAB_INDEX = 2


# A button that switches the tabbed card to another tab (by index) instead of
# navigating to a popup hash. tap_action is "none"; the actual tab switch is done
# by _GOTAB_JS, which reads the `vh_goto_tab` config key off the button-card.
def goto_tab_btn(name, idx):
    b = btn(name, {"action": "none"})
    b["vh_goto_tab"] = idx
    return b


# Square icon-only button matching the search magnifier (border, glass background,
# hover to the table-header blue). Used for the Inventory print-category action.
def icon_action_btn(icon, action):
    return {"type": "custom:button-card", "icon": icon, "show_name": False,
      "show_icon": True, "tap_action": action,
      "card_mod": {"style": "ha-card:hover { background: var(--vh-table-header-color,#4dabf5)"
        " !important; border-color: var(--vh-table-header-color,#4dabf5) !important; }"
        " ha-card:hover ha-icon { color: #fff !important; }"},
      "styles": {"card": [{"height": "36px"}, {"width": "36px"}, {"min-width": "36px"},
        {"background": "var(--vh-card-background)"},
        {"border-radius": "var(--vh-card-radius, 0px)"},
        {"border": "var(--vh-card-border, 1px solid rgba(255,255,255,0.25))"},
        {"box-shadow": "none"}, {"padding": "0"}, {"cursor": "pointer"},
        {"display": "flex"}, {"align-items": "center"}, {"justify-content": "center"}],
        "icon": [{"width": "22px"}, {"color": "var(--vh-text-primary, rgba(230,230,230,1))"}]}}


def popup(hsh, title, icon, rows, save_svc, reset_svc=None):
    save = btn("Save", {"action": "perform-action", "perform_action": save_svc,
      "data": {}, "confirmation": False})
    cancel = btn("Cancel", {"action": "navigate", "navigation_path": "#"})
    p = {"type": "custom:bubble-card", "card_type": "pop-up", "hash": "#%s" % hsh,
      "name": title, "icon": icon,
      "cards": [{"type": "entities", "entities": rows},
        {"type": "horizontal-stack", "cards": [save, cancel]}]}
    if reset_svc:
        p["open_action"] = {"action": "perform-action", "perform_action": reset_svc, "data": {}}
    return p


# ----- Inventory tab -----
inv_tbl = {"type": "custom:flex-table-card", "title": "VH-Inventory Stock",
  "entities": {"include": "sensor.vh_inventory_stock_filtered"}, "css": CSS,
  "columns": [id_col("stock"), {"name": "Product", "data": "stock", "modify": fld("product")},
    {"name": "Category", "data": "stock", "modify": fld("category"), "_w": "140px"},
    {"name": "Location", "data": "stock", "modify": inline_select("locations", "location", svc="vh_inventory_set_stock_field"), "_w": "160px"},
    {"name": "Quantity", "data": "stock", "align": "center", "modify": fld("quantity"), "_w": "80px"},
    {"name": "-", "data": "stock", "align": "center", "modify": adjust_icon("mdi:minus", -1), "_w": "40px"},
    {"name": "+", "data": "stock", "align": "center", "modify": adjust_icon("mdi:plus", 1), "_w": "40px"}]
    + actions_cols("stock", "#vh-edit-inventory", "stock")}
inv_rows = ["input_select.vh_stock_product", "input_select.vh_stock_location",
  "input_number.vh_stock_quantity"]
inv_add = popup("vh-add-inventory", "Add Inventory", "mdi:clipboard-list", inv_rows, "script.vh_save_stock", "script.vh_reset_stock_add")
inv_edit = popup("vh-edit-inventory", "Edit Inventory", "mdi:clipboard-list", inv_rows, "script.vh_update_stock")
# Accent-insensitive filter (server-side via sensor.vh_inventory_stock_filtered),
# mirroring the production barcode dashboard. The clickable magnify icon clears
# the search; strip_accents matching lives in vh_inventory.yaml. The Inventory tab
# also carries a Print button + a category selector (input_select.vh_print_category,
# kept in sync by pyscript) that chooses which category to print ("All" = every
# category) via script.vh_print_stock.
print_inv_btn = btn("Print", {"action": "perform-action",
  "perform_action": "script.vh_print_stock", "data": {}})
# Printer icon button that prints the inventory for the selected category. Sits
# directly in front of the category selector, styled like the search magnifier.
inv_print_icon = icon_action_btn("mdi:printer-pos-outline",
  {"action": "perform-action", "perform_action": "script.vh_print_stock", "data": {}})
# Category selector: width capped to fit the name + arrow; the built-in shape icon
# is hidden (a printer button sits in front instead); the picker is collapsed to
# 36px to match the buttons by overriding the md-list-item height var on the
# ha-combo-box-item deep inside the ha-select / ha-dropdown / ha-picker-field shadows.
inv_cat_dd = {"type": "entities",
  "card_mod": {"style": {
    ".": ":host{width:190px!important;display:block!important;}"
      " ha-card{background:var(--vh-card-background)!important;"
      "border:var(--vh-card-border,1px solid rgba(255,255,255,0.25))!important;"
      "border-radius:var(--vh-card-radius,0px)!important;"
      "box-shadow:none!important;padding:0!important;width:190px!important;"
      "height:36px!important;box-sizing:border-box!important;}"
      " #states{padding:0!important;overflow:hidden!important;}"
      " .card-content{overflow:hidden!important;}",
    "hui-input-select-entity-row$": {
      "hui-generic-entity-row$": {
        ".": "state-badge{display:none!important;}"
          " .info{display:none!important;}"
          " .row{padding:0!important;min-height:36px!important;gap:0!important;}"
          " ha-select{width:190px!important;}"},
        "hui-generic-entity-row ha-select$": {
          "ha-dropdown ha-picker-field$": {
            ".": "ha-combo-box-item{"
              "--md-list-item-one-line-container-height:36px!important;"
              "--md-list-item-top-space:0px!important;"
              "--md-list-item-bottom-space:0px!important;"
              "min-height:36px!important;"
              "background:transparent!important;border-radius:0!important;}"
              " ha-combo-box-item::before,ha-combo-box-item::after{"
              "display:none!important;content:none!important;}",
            "ha-combo-box-item$": {
              ".": ".surface{background:transparent!important;box-shadow:none!important;"
                "border:none!important;}"
                " .surface::before,.surface::after{"
                "display:none!important;content:none!important;background:transparent!important;}"
                " ha-ripple{display:none!important;}"
                " md-focus-ring{display:none!important;}"
                " md-item{padding-left:4px!important;padding-right:4px!important;}"}}}}}},
  "entities": [{"entity": "input_select.vh_print_category", "name": ""}]}
inv_search_row = {"type": "entities", "card_mod": SEARCH_CM,
  "entities": [{"entity": "input_text.vh_stock_search", "name": "", "icon": "mdi:magnify",
    "card_mod": icon_btn_cm("input_text.vh_stock_search"),
    "tap_action": {"action": "call-service", "service": "input_text.set_value",
      "service_data": {"entity_id": "input_text.vh_stock_search", "value": ""}}}]}
inv_top_row = {"type": "horizontal-stack",
  "card_mod": {"style": ":host { margin-left: 16px !important; margin-top: -20px !important; }"
    " #root { display: flex; justify-content: flex-start; gap: 8px; align-items: center; }"
    " #root > * { flex: 0 0 auto !important; }"},
  "cards": [add_btn("vh-add-inventory", "Add product to inventory"),
    inv_print_icon, inv_cat_dd]}
inv_box = {"type": "vertical-stack", "card_mod": WRAP_CM, "cards": [inv_search_row, inv_top_row]}
inv_tab = {"attributes": {"label": "Inventory", "icon": "mdi:clipboard-list", "stacked": True},
  "card": {"type": "vertical-stack", "cards": [inv_box, inv_tbl, inv_add, inv_edit]}}

# ----- Shopping List tab -----
def shop_adjust(icon, delta):
    js = ("%s.callService('pyscript','vh_inventory_adjust_shopping',{id:${x.id},delta:%d})"
          % (HASS, delta))
    return ("`<ha-icon icon=\"%s\" style=\"cursor:pointer\" onclick=\"%s\"></ha-icon>`"
            % (icon, js))


shop_tbl = {"type": "custom:flex-table-card", "title": "VH-Inventory Shopping List",
  "entities": {"include": "sensor.vh_inventory_shopping"}, "css": CSS,
  "columns": [id_col("shopping"), {"name": "Product", "data": "shopping", "modify": fld("product")},
    {"name": "Quantity", "data": "shopping", "align": "center", "modify": fld("quantity"), "_w": "80px"},
    {"name": "-", "data": "shopping", "align": "center", "modify": shop_adjust("mdi:minus", -1), "_w": "40px"},
    {"name": "+", "data": "shopping", "align": "center", "modify": shop_adjust("mdi:plus", 1), "_w": "40px"},
    {"name": "Edit", "data": "shopping", "align": "center", "modify": edit_icon("shopping_list", "#vh-edit-shopping"), "_w": "56px"},
    {"name": "Del", "data": "shopping", "align": "center", "modify": del_icon("shopping_list"), "_w": "56px"}]}
shop_rows = ["input_select.vh_shopping_product", "input_number.vh_shopping_quantity"]
shop_edit = popup("vh-edit-shopping", "Edit Shopping Item", "mdi:cart", shop_rows, "script.vh_update_shopping")

# ----- Products tab -----
prod_tbl = {"type": "custom:flex-table-card", "title": "VH-Inventory Products",
  "entities": {"include": "sensor.vh_inventory_products_filtered"}, "css": CSS,
  "columns": [id_col("products"), {"name": "Name", "data": "products", "modify": fld("name")},
    {"name": "Barcode", "data": "products", "modify": fld("barcode")},
    {"name": "Manufacturer", "data": "products", "modify": fld("manufacturer")},
    {"name": "Unit", "data": "products", "modify": fld("unit")},
    {"name": "AutoAdd", "data": "products", "align": "center", "modify": "x.auto_add_enabled==1?'\u2713':'\u2717'", "_w": "80px"},
    {"name": "Thr.", "data": "products", "align": "center", "modify": inline_number("auto_add_threshold"), "_w": "64px"},
    {"name": "Qty", "data": "products", "align": "center", "modify": inline_number("auto_add_quantity"), "_w": "64px"},
    {"name": "Category", "data": "products", "modify": inline_select("categories", "category")},
    {"name": "Store", "data": "products", "modify": inline_select("stores", "store")}]
    + actions_cols("products", "#vh-edit-product", "products")}
prod_rows = ["input_text.vh_product_name", "input_text.vh_product_barcode",
  "input_text.vh_product_manufacturer", "input_text.vh_product_unit",
  "input_text.vh_product_description", "input_select.vh_product_category",
  "input_select.vh_product_store", "input_boolean.vh_product_auto_add_enabled",
  "input_number.vh_product_auto_add_threshold", "input_number.vh_product_auto_add_quantity"]
prod_add = popup("vh-add-product", "Add Product", "mdi:package-variant", prod_rows, "script.vh_save_product", "script.vh_reset_product_add")
prod_edit = popup("vh-edit-product", "Edit Product", "mdi:package-variant", prod_rows, "script.vh_update_product")
# Resolve popup for Unknown scans: same fields, saved via the resolve script,
# and NO reset-on-open (which would wipe the pre-filled barcode).
prod_resolve = popup("vh-resolve-product", "Resolve Product", "mdi:help-box", prod_rows, "script.vh_save_resolved_product")
# Products filter — its own search helper (input_text.vh_products_search), so the
# value is NOT shared with the Inventory search box. Magnify icon clears it.
prod_tab = {"attributes": {"label": "Products", "icon": "mdi:package-variant", "stacked": True},
  "card": {"type": "vertical-stack", "cards": [
    filter_block("input_text.vh_products_search", "vh-add-product", "Add new product"),
    prod_tbl, prod_add, prod_edit]}}


# ----- Add tab (product-button grid, ported from production "Toevoegen") -----
# Each product is a button: blue (--primary-color) when not on the shopping list,
# green (#4CAF50) when it is. Tapping toggles it via vh_inventory_shopping_toggle.
# The grid layout (flex-wrap of buttons) comes from the flex-table css below.
GRID_CSS = {"table+": "display:block;width:100%;padding-top:0 !important;",
  "thead+": "display:none;",
  "tbody+": "display:flex;flex-wrap:wrap;gap:8px;",
  "tr+": "display:contents;",
  "td+": "padding:0 !important;border:none !important;background:transparent !important;",
  "tbody tr:nth-child(odd)": "background:transparent !important;",
  "tbody tr:nth-child(even)": "background:transparent !important;"}

# Glass frame for the grid card WITHOUT the id-column hide rule (its single column
# is the buttons; the hide rule would target td:first-child and hide them).
GRID_CM = {"style": {
    ".": "ha-card { border: var(--vh-card-border,1px solid rgba(255,255,255,0.25))"
         " !important; border-radius: var(--vh-card-radius,0px) !important; }",
    "ha-card$": ".card-header { padding-bottom: 4px !important; }"}}

_addlist_btn = (
  "(function(){"
  "var on=x.on_shopping==1;"
  "var bg=on?'#4CAF50':'var(--primary-color)';"
  "var nm=(x.name==null?'':x.name);"
  "return \"<button style='cursor:pointer;padding:4px;border:none;"
  "border-radius:var(--vh-card-radius,4px);background-color:\"+bg+\";color:#fff;"
  "font-size:0.95em;width:130px;height:75px;box-sizing:border-box;overflow:hidden;"
  "word-break:break-word;white-space:normal;' onclick=\\\"" + HASS +
  ".callService('pyscript','vh_inventory_shopping_toggle',{product_id:\"+x.id+\"})\\\">\""
  "+nm+\"</button>\";"
  "})()")

addlist_tbl = {"type": "custom:flex-table-card", "title": "VH-Inventory Add to List",
  "entities": {"include": "sensor.vh_inventory_shopping_filtered"}, "css": GRID_CSS,
  "strict": True, "card_mod": GRID_CM, "_skip_flex_cm": True,
  "grid_options": {"columns": "full", "rows": "auto"},
  "columns": [{"name": "", "data": "products", "modify": _addlist_btn}]}

addlist_tab = {"attributes": {"label": "Quick add", "icon": "mdi:cart-plus", "stacked": True},
  "card": {"type": "vertical-stack", "cards": [
    search_block("input_text.vh_shopping_search"), addlist_tbl]}}


def simple_tbl(title, sensor, attr, col, table, pophash):
    return {"type": "custom:flex-table-card", "title": title,
      "entities": {"include": sensor}, "css": CSS,
      "columns": [id_col(attr), {"name": col, "data": attr, "modify": fld(col.lower())}]
      + actions_cols(table, pophash, attr)}


loc_tbl = simple_tbl("VH-Inventory Locations", "sensor.vh_inventory_locations", "locations", "Location", "locations", "#vh-edit-location")
cat_tbl = simple_tbl("VH-Inventory Categories", "sensor.vh_inventory_categories", "categories", "Category", "categories", "#vh-edit-category")
sto_tbl = simple_tbl("VH-Inventory Stores", "sensor.vh_inventory_stores", "stores", "Store", "stores", "#vh-edit-store")
loc_add = popup("vh-add-location", "Add Location", "mdi:map-marker", ["input_text.vh_new_location"], "script.vh_save_location", "script.vh_reset_location_add")
loc_edit = popup("vh-edit-location", "Edit Location", "mdi:map-marker", ["input_text.vh_new_location"], "script.vh_update_location")
cat_add = popup("vh-add-category", "Add Category", "mdi:shape", ["input_text.vh_new_category"], "script.vh_save_category", "script.vh_reset_category_add")
cat_edit = popup("vh-edit-category", "Edit Category", "mdi:shape", ["input_text.vh_new_category"], "script.vh_update_category")
sto_add = popup("vh-add-store", "Add Store", "mdi:store", ["input_text.vh_new_store"], "script.vh_save_store", "script.vh_reset_store_add")
sto_edit = popup("vh-edit-store", "Edit Store", "mdi:store", ["input_text.vh_new_store"], "script.vh_update_store")


def tab(label, icon, tbl, add_hash, *popups, add_label="Add"):
    return {"attributes": {"label": label, "icon": icon, "stacked": True},
      "card": {"type": "vertical-stack", "cards": [add_btn(add_hash, add_label), tbl] + list(popups)}}


def tab_boxed(label, icon, tbl, add_hash, *popups, add_label="Add", extra=None, nav_btn=None):
    """Like tab() but the Add button sits inside a single bordered background
    (WRAP_CM) and is shifted right (margin-left:16px) so its left edge lines up
    with the Add button on the search tabs (e.g. Inventory/Products). When
    `extra` (another button card) is given, it sits next to the Add button in a
    horizontal row inside the same box. When `nav_btn` is given it is used as the
    button instead of a popup-opening Add button (e.g. a goto_tab_btn)."""
    ab = nav_btn if nav_btn is not None else add_btn(add_hash, add_label)
    ab["styles"]["card"] += [{"margin-left": "16px"}]
    row = ab if extra is None else {"type": "horizontal-stack", "cards": [ab, extra]}
    box = {"type": "vertical-stack", "card_mod": WRAP_CM, "cards": [row]}
    return {"attributes": {"label": label, "icon": icon, "stacked": True},
      "card": {"type": "vertical-stack", "cards": [box, tbl] + list(popups)}}


# Print button for the Shopping tab — calls the ESC/POS print script.
print_shopping_btn = btn("Print", {"action": "perform-action",
  "perform_action": "script.vh_print_shopping", "data": {}})
print_shopping_btn["styles"]["card"] += [{"margin-left": "8px"}]


# ----- Scan tab -----
scan_tbl = {"type": "custom:flex-table-card", "title": "VH-Inventory Scan Queue",
  "entities": {"include": "sensor.vh_inventory_scan_queue"}, "css": CSS,
  "columns": [id_col("scan_queue"), {"name": "Barcode", "data": "scan_queue", "modify": fld("barcode")},
    {"name": "Action", "data": "scan_queue", "align": "center", "modify": fld("action")},
    {"name": "State", "data": "scan_queue", "align": "center", "modify": fld("state")},
    {"name": "Name", "data": "scan_queue", "modify": fld("name")},
    {"name": "Brand", "data": "scan_queue", "modify": fld("manufacturer")},
    {"name": "Source", "data": "scan_queue", "align": "center", "modify": fld("provider")},
    {"name": "Resolve", "data": "scan_queue", "align": "center", "modify": resolve_icon()},
    {"name": "Del", "data": "scan_queue", "align": "center", "modify": del_icon("scan_queue"), "_w": "56px"}]}
scan_input = {"type": "entities", "card_mod": SEARCH_CM,
  "entities": [{"entity": "input_text.vh_scan_barcode", "name": "",
    "icon": "mdi:barcode-scan", "card_mod": scan_icon_cm("(barcode)")}]}
scan_buttons = {"type": "horizontal-stack",
  "card_mod": {"style": ":host { margin-left: 16px !important;"
                        " margin-top: -20px !important; }"},
  "cards": [
    btn("Add", {"action": "perform-action", "perform_action": "script.vh_scan_add", "data": {}}),
    btn("Use", {"action": "perform-action", "perform_action": "script.vh_scan_use", "data": {}})]}
scan_box = {"type": "vertical-stack", "card_mod": WRAP_CM,
  "cards": [scan_input, scan_buttons]}
scan_tab = {"attributes": {"label": "Scan", "icon": "mdi:barcode-scan", "stacked": True},
  "card": {"type": "vertical-stack", "cards": [scan_box, scan_tbl, prod_resolve]}}

hist_tbl = {"type": "custom:flex-table-card", "title": "VH-Inventory History",
  "entities": {"include": "sensor.vh_inventory_history"}, "css": CSS,
  "columns": [id_col("history"), {"name": "Time", "data": "history", "modify": fld("timestamp")},
    {"name": "Action", "data": "history", "align": "center", "modify": fld("action")},
    {"name": "Entity", "data": "history", "align": "center", "modify": fld("entity")},
    {"name": "Id", "data": "history", "align": "center", "modify": fld("entity_id")},
    {"name": "Detail", "data": "history", "modify": fld("detail")}]}
hist_tab = {"attributes": {"label": "History", "icon": "mdi:history", "stacked": True},
  "card": {"type": "vertical-stack", "cards": [hist_tbl]}}

# Replace each flex-table's shared CSS with a per-table copy that also carries
# fixed-width rules for the columns flagged with '_w' (id/action/quantity/etc.).
# css_w() pops the '_w' hints, so this must run after all columns are built.
for _t in (inv_tbl, shop_tbl, prod_tbl, loc_tbl, cat_tbl, sto_tbl, scan_tbl, hist_tbl):
    _t["css"] = css_w(_t["columns"])

lang_card = {"type": "entities", "entities": [
  {"entity": "input_select.vh_language", "name": "Language", "icon": "mdi:translate"},
  {"entity": "input_boolean.vh_show_id_columns", "name": "Show ID columns", "icon": "mdi:identifier"}]}
setup_tab = {"attributes": {"label": "Setup", "icon": "mdi:cog", "stacked": True},
  "card": {"type": "vertical-stack", "cards": [lang_card]}}


CART_RED = (
  ":host {\n"
  "  --md-sys-color-on-surface: var(--vh-text-primary, rgba(230,230,230,1));\n"
  "  --md-sys-color-on-surface-variant: var(--vh-text-secondary, rgba(200,200,200,0.9));\n"
  "  --md-sys-color-primary: var(--amber-color, #ffc107);\n"
  "  --md-sys-color-secondary-container: rgba(255,255,255,0.08);\n"
  "  --md-sys-color-on-secondary-container: var(--vh-text-primary, rgba(230,230,230,1));\n"
  "  --mdc-theme-primary: var(--amber-color, #ffc107);\n"
  "  --mdc-tab-text-label-color-default: var(--vh-text-secondary, rgba(200,200,200,0.9));\n"
  "  --mdc-tab-color-default: var(--vh-text-secondary, rgba(200,200,200,0.9));\n"
  "}\n"
  "section { margin-top: 10px !important; }\n"
  "{% if states('sensor.vh_inventory_shopping')|int(0) > 0 %}\n"
  "ha-icon[icon=\"mdi:cart\"] { color: var(--error-color, red) !important; }\n"
  "{% endif %}\n")

# Tab colour variables for custom:tabbed-card-programmable (MD3 md-primary-tab).
# Ported from the production Woonkamer-TS dashboard's `styles` block, adapted to
# keep dev's amber active accent. The `--md-primary-tab-hover-*` + ripple vars are
# the fix for tab labels/icons turning black on hover (default MD3 hover colour).
AMBER = "var(--amber-color, #ffc107)"
# Selected tab = bright white; unselected tabs = dimmed grey.
ACTIVE = "rgba(255,255,255,1)"
TXT_HI = "var(--vh-text-primary, rgba(230,230,230,1))"
TXT_LO = "rgba(150,150,150,0.6)"
TAB_STYLES = {
  "--md-sys-color-primary": ACTIVE,
  "--md-sys-color-on-surface": ACTIVE,
  "--md-sys-color-on-surface-variant": TXT_LO,
  "--md-primary-tab-container-color": "transparent",
  "--md-divider-color": "transparent",
  "--md-primary-tab-icon-color": TXT_LO,
  "--md-primary-tab-label-text-color": TXT_LO,
  "--md-primary-tab-active-indicator-color": ACTIVE,
  "--md-primary-tab-active-icon-color": ACTIVE,
  "--md-primary-tab-active-label-text-color": ACTIVE,
  "--md-primary-tab-active-focus-icon-color": ACTIVE,
  "--md-primary-tab-active-focus-label-text-color": ACTIVE,
  # --- hover fix (was turning black) ---
  "--md-primary-tab-hover-icon-color": ACTIVE,
  "--md-primary-tab-hover-label-text-color": ACTIVE,
  "--md-primary-tab-active-hover-icon-color": ACTIVE,
  "--md-primary-tab-active-hover-label-text-color": ACTIVE,
  "--md-ripple-hover-color": "rgba(255,255,255,0.1)",
}

# One-time, event-driven focus of the Scan tab's Barcode field. Installs a
# single document click listener (guarded by a window flag); when a click
# (e.g. selecting the Scan tab) makes the Barcode field transition from hidden
# to visible, it is focused once. No polling, and it won't steal focus during
# normal use because it only acts on the hidden->visible edge.
_FOCUS_JS = (
  "if(!window.__vhScanFocus){window.__vhScanFocus=true;"
  "var cached=null,lastShown=false;"
  "function dq(root,test){var q=[root];while(q.length){var n=q.shift();"
  "var k=n.querySelectorAll?n.querySelectorAll('*'):[];"
  "for(var i=0;i<k.length;i++){var el=k[i];if(test(el))return el;"
  "if(el.shadowRoot)q.push(el.shadowRoot);}}return null;}"
  "function findBc(){if(cached&&!cached.isConnected)cached=null;"
  "if(!cached)cached=dq(document.body,function(el){return el.tagName==='HA-TEXTFIELD';});"
  "if(!cached)cached=dq(document.body,function(el){return el.tagName==='INPUT'&&(el.type==='text'||el.type==='');});"
  "return cached;}"
  "function tryFocus(){var tf=findBc();"
  "if(!tf){lastShown=false;return false;}"
  "var rect=tf.getBoundingClientRect();var vis=rect.width>0&&rect.height>0;"
  "if(!vis){lastShown=false;return false;}"
  "if(!lastShown){var inp=tf.shadowRoot&&tf.shadowRoot.querySelector('input');(inp||tf).focus();}"
  "lastShown=true;return true;}"
  "function onClick(){var n=0;(function retry(){"
  "if(tryFocus())return;if(++n<8)setTimeout(retry,150);})();}"
  "document.addEventListener('click',onClick,true);"
  "setTimeout(onClick,800);}"
)

# One-time listener that closes the bubble-card pop-up after a "Save" button is
# clicked. The Save button-card still performs its save service on the same
# click; this independently clears the URL hash (native bubble-card close) a
# moment later. Matches the button-card whose config name is 'Save'.
_CLOSE_JS = (
  "if(!window.__vhSaveClose){window.__vhSaveClose=true;"
  "document.addEventListener('click',function(e){"
  "var p=e.composedPath?e.composedPath():[];"
  "for(var i=0;i<p.length;i++){var el=p[i];"
  "if(el&&el.localName==='button-card'){"
  "var c=el._config||el.config;"
  "if(c&&c.name==='Save'){setTimeout(function(){location.hash='';"
  "window.dispatchEvent(new Event('location-changed'));},120);}break;}}"
  "},true);}"
)

# Live i18n layer. Reads input_select.vh_language, deep-walks the shadow DOM and
# swaps chrome text (tab labels, titles, headers, popup titles, buttons, field
# labels) by exact match against the embedded maps. Data cells, dropdown values
# and inputs are excluded, so user-entered names are never translated. Re-applies
# on clicks/re-renders (MutationObserver) and on language change (state event).
_I18N_JS = (
  "if(!window.__vhI18n){window.__vhI18n=true;"
  "var MAP=" + json.dumps(I18N_MAP) + ";"
  "var LANGS=" + json.dumps(I18N_LANGS) + ";"
  "var KEYS=" + json.dumps(I18N_KEYS) + ";"
  "var EXCL={TD:1,OPTION:1,SELECT:1,INPUT:1,TEXTAREA:1,STYLE:1,SCRIPT:1,"
  "'HA-SELECT':1,'MWC-SELECT':1,'HA-COMBO-BOX':1};"
  "var orig=new WeakMap();var seen=new WeakSet();var tmr=null;"
  "function curLang(){try{var ha=document.querySelector('home-assistant');"
  "var s=ha&&ha.hass&&ha.hass.states['input_select.vh_language'];"
  "var nm=s?s.state:'English';return LANGS[nm]||'en';}catch(e){return 'en';}}"
  "function tx(node,lang){var key=orig.get(node);"
  "if(key===undefined){var raw=node.nodeValue;"
  "var k=raw==null?'':raw.replace(/\\s+/g,' ').trim();"
  "if(KEYS[k]!==1)return;orig.set(node,k);key=k;}"
  "var dict=MAP[lang];"
  "var val=(dict&&dict[key]!=null)?dict[key]:key;"
  "if(node.nodeValue!==val)node.nodeValue=val;}"
  "function obs(root){try{var m=new MutationObserver(schedule);"
  "m.observe(root,{childList:true,subtree:true,characterData:true});}catch(e){}}"
  "function walk(root,lang){var c=root.childNodes;"
  "for(var i=0;i<c.length;i++){var n=c[i];"
  "if(n.nodeType===3){tx(n,lang);}"
  "else if(n.nodeType===1){if(EXCL[n.tagName])continue;"
  "if(n.shadowRoot){if(!seen.has(n.shadowRoot)){seen.add(n.shadowRoot);obs(n.shadowRoot);}"
  "walk(n.shadowRoot,lang);}walk(n,lang);}}}"
  "function run(){walk(document.body,curLang());}"
  "function schedule(){if(tmr)clearTimeout(tmr);tmr=setTimeout(run,120);}"
  "obs(document.body);document.addEventListener('click',schedule,true);"
  "setTimeout(run,800);"
  "try{var ha=document.querySelector('home-assistant');"
  "if(ha&&ha.hass&&ha.hass.connection){ha.hass.connection.subscribeEvents(function(e){"
  "if(e&&e.data&&e.data.entity_id==='input_select.vh_language')schedule();},'state_changed');}}catch(e){}"
  "}"
)

# Programmatic tab switch. A one-time capture-phase click listener: when a
# button-card carrying a `vh_goto_tab` config key is clicked, it deep-searches
# the shadow DOM for the tab elements (…-TAB) and clicks the one at that index.
# Switching by index (not label) is language-proof, since _I18N_JS translates the
# visible tab labels. Used by the Shopping tab's "Add item" button to open the
# Quick add tab instead of a redundant popup.
_GOTAB_JS = (
  "if(!window.__vhGoTab){window.__vhGoTab=true;"
  "function dqa(root,test){var out=[],q=[root];while(q.length){var n=q.shift();"
  "var k=n.querySelectorAll?n.querySelectorAll('*'):[];"
  "for(var i=0;i<k.length;i++){var el=k[i];if(test(el))out.push(el);"
  "if(el.shadowRoot)q.push(el.shadowRoot);}}return out;}"
  "function tabsList(){return dqa(document.body,function(el){"
  "return el.tagName&&/-TAB$/.test(el.tagName);});}"
  "document.addEventListener('click',function(e){"
  "var p=e.composedPath?e.composedPath():[];"
  "for(var i=0;i<p.length;i++){var el=p[i];"
  "if(el&&el.localName==='button-card'){var c=el._config||el.config;"
  "if(c&&c.vh_goto_tab!=null){var idx=c.vh_goto_tab;"
  "setTimeout(function(){var t=tabsList();if(t[idx])t[idx].click();},60);}"
  "break;}}"
  "},true);}"
)
focus_boot = {"type": "custom:button-card", "show_name": False, "show_icon": False,
  "show_label": True, "label": "[[[ " + _FOCUS_JS + _CLOSE_JS + _I18N_JS + _GOTAB_JS + " return ''; ]]]",
  "styles": {"card": [{"height": "0px"}, {"min-height": "0"}, {"padding": "0"},
    {"margin": "0"}, {"border": "none"}, {"box-shadow": "none"},
    {"overflow": "hidden"}, {"opacity": "0"}]}}

tabbed = {"type": "custom:tabbed-card-programmable", "grid_options": {"columns": "full", "rows": "auto"},
  "card_mod": {"style": CART_RED}, "styles": TAB_STYLES,
  "tabs": [
    scan_tab,
    tab_boxed("Shopping", "mdi:cart", shop_tbl, None, shop_edit, add_label="Add item", extra=print_shopping_btn, nav_btn=goto_tab_btn("Add item", QUICK_ADD_TAB_INDEX)),
    addlist_tab,
    inv_tab,
    prod_tab,
    tab_boxed("Locations", "mdi:map-marker", loc_tbl, "vh-add-location", loc_add, loc_edit, add_label="Add new location"),
    tab_boxed("Categories", "mdi:shape", cat_tbl, "vh-add-category", cat_add, cat_edit, add_label="Add new category"),
    tab_boxed("Stores", "mdi:store", sto_tbl, "vh-add-store", sto_add, sto_edit, add_label="Add new store"),
    hist_tab,
    setup_tab]}
assert tabbed["tabs"][QUICK_ADD_TAB_INDEX] is addlist_tab, \
  "QUICK_ADD_TAB_INDEX is out of sync with the tabs order"
view = {"type": "sections", "max_columns": 4, "title": "Main", "path": "main",
  "theme": "VH-Inventory", "background": "var(--vh-dashboard-gradient)",
  "sections": [{"type": "grid", "column_span": 4, "cards": [tabbed, focus_boot]}]}

# Apply the glass card frame to every flex-table card in the view.
def _apply_flex_cm(o):
    if isinstance(o, dict):
        if o.get("type") == "custom:flex-table-card":
            if not o.pop("_skip_flex_cm", False):
                o["card_mod"] = FLEX_CM
        for v in o.values():
            _apply_flex_cm(v)
    elif isinstance(o, list):
        for v in o:
            _apply_flex_cm(v)
_apply_flex_cm(view)

ws = websocket.create_connection(f"ws://{HOST}/api/websocket")
def r(): return json.loads(ws.recv())
r(); ws.send(json.dumps({"type": "auth", "access_token": TOKEN})); r()
ws.send(json.dumps({"id": 1, "type": "lovelace/config/save", "url_path": "vh-inventory",
  "config": {"title": "VH-Inventory", "resources": [
    {"url": "/hacsfiles/button-card/button-card.js", "type": "module"},
    {"url": "/hacsfiles/lovelace-card-mod/card-mod.js", "type": "module"}],
    "views": [view]}}))
print("save:", r().get("success")); ws.close()
