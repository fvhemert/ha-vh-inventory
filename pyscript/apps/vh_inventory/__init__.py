import sqlite3
import datetime
import json

import requests

DB_PATH = "/config/vh_inventory.db"
NONE = "(none)"

HISTORY_DISPLAY_LIMIT = 50      # rows surfaced by sensor.vh_inventory_history
HISTORY_RETENTION_MONTHS = 3    # history rows older than this are auto-purged

TABLES = {
    "sensor.vh_inventory_locations": (
        "locations", ["id", "location"], "VH Inventory Locations",
        "mdi:map-marker", "locations"),
    "sensor.vh_inventory_categories": (
        "categories", ["id", "category"], "VH Inventory Categories",
        "mdi:shape", "categories"),
    "sensor.vh_inventory_stores": (
        "stores", ["id", "store"], "VH Inventory Stores",
        "mdi:store", "stores"),
}

SIMPLE = {"locations": "location", "categories": "category", "stores": "store"}


# ---------------------------------------------------------------------------
# Database schema - SINGLE SOURCE OF TRUTH.
# Each table lists (column_name, column_definition) in order. On startup
# _ensure_schema() runs CREATE TABLE IF NOT EXISTS for a fresh install and
# ALTER TABLE ADD COLUMN for any column missing from an existing table.
# When adding a NEW TABLE: add it here and to DB_SCHEMA_ORDER (respect FK order).
# When adding a NEW COLUMN: add it to the table's list here. Both fresh installs
# and existing databases then pick it up automatically on the next restart/reload.
# NOTE: ALTER ADD COLUMN cannot add PRIMARY KEY / UNIQUE columns to an EXISTING
# table - such columns only apply to fresh installs (added by CREATE).
# ---------------------------------------------------------------------------
DB_SCHEMA = {
    "categories": [
        ("id", "INTEGER PRIMARY KEY AUTOINCREMENT"),
        ("category", "TEXT NOT NULL UNIQUE"),
    ],
    "stores": [
        ("id", "INTEGER PRIMARY KEY AUTOINCREMENT"),
        ("store", "TEXT NOT NULL UNIQUE"),
    ],
    "locations": [
        ("id", "INTEGER PRIMARY KEY AUTOINCREMENT"),
        ("location", "TEXT NOT NULL UNIQUE"),
    ],
    "products": [
        ("id", "INTEGER PRIMARY KEY AUTOINCREMENT"),
        ("barcode", "INTEGER UNIQUE"),
        ("name", "TEXT NOT NULL"),
        ("description", "TEXT"),
        ("manufacturer", "TEXT"),
        ("unit", "TEXT"),
        ("auto_add_enabled", "INTEGER NOT NULL DEFAULT 0"),
        ("auto_add_threshold", "INTEGER NOT NULL DEFAULT 0"),
        ("auto_add_quantity", "INTEGER NOT NULL DEFAULT 1"),
        ("category_id", "INTEGER REFERENCES categories(id)"),
        ("store_id", "INTEGER REFERENCES stores(id)"),
    ],
    "stock": [
        ("id", "INTEGER PRIMARY KEY AUTOINCREMENT"),
        ("product_id", "INTEGER REFERENCES products(id)"),
        ("location_id", "INTEGER REFERENCES locations(id)"),
        ("quantity", "INTEGER NOT NULL DEFAULT 0"),
    ],
    "shopping_list": [
        ("id", "INTEGER PRIMARY KEY AUTOINCREMENT"),
        ("product_id", "INTEGER REFERENCES products(id)"),
        ("quantity", "INTEGER DEFAULT 1"),
    ],
    "scan_queue": [
        ("id", "INTEGER PRIMARY KEY AUTOINCREMENT"),
        ("barcode", "TEXT"),
        ("action", "TEXT CHECK(action IN ('Add','Use'))"),
        ("state", "TEXT CHECK(state IN ('New','Lookup','Unknown','Manual','Exist'))"),
        ("name", "TEXT"),
        ("manufacturer", "TEXT"),
        ("description", "TEXT"),
        ("unit", "TEXT"),
        ("category", "TEXT"),
        ("image_url", "TEXT"),
        ("provider", "TEXT"),
    ],
    "history": [
        ("id", "INTEGER PRIMARY KEY AUTOINCREMENT"),
        ("timestamp", "TEXT"),
        ("action", "TEXT"),
        ("entity", "TEXT"),
        ("entity_id", "INTEGER"),
        ("detail", "TEXT"),
    ],
}

# Creation/migration order - parents before children for FK references.
DB_SCHEMA_ORDER = [
    "categories", "stores", "locations",
    "products", "stock", "shopping_list", "scan_queue", "history",
]


def _conn():
    return sqlite3.connect(DB_PATH)


def _ensure_schema():
    """Idempotently build the whole database. Creates missing tables (fresh
    install) and adds any missing columns to existing tables (migrations).
    Runs on startup so DB_SCHEMA above is always reflected in the live DB."""
    conn = _conn()
    try:
        # One-time table renames (naming-convention migration). Idempotent:
        # only fires when the old table still exists and the new one does not.
        renames = [("inventory", "stock"), ("scanqueue", "scan_queue")]
        have = []
        for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"):
            have.append(r[0])
        for old, new in renames:
            if old in have and new not in have:
                conn.execute("ALTER TABLE %s RENAME TO %s" % (old, new))
                log.info("vh_inventory: renamed table %s -> %s" % (old, new))
        conn.commit()
        for table in DB_SCHEMA_ORDER:
            cols = DB_SCHEMA[table]
            parts = ["%s %s" % (n, d) for (n, d) in cols]
            coldefs = ", ".join(parts)
            conn.execute("CREATE TABLE IF NOT EXISTS %s (%s)" % (table, coldefs))
            existing = []
            for r in conn.execute("PRAGMA table_info(%s)" % table):
                existing.append(r[1])
            for (n, d) in cols:
                if n not in existing:
                    try:
                        conn.execute(
                            "ALTER TABLE %s ADD COLUMN %s %s" % (table, n, d))
                    except Exception as e:
                        log.warning(
                            "vh_inventory schema: cannot add %s.%s (%s)"
                            % (table, n, e))
        _purge_history(conn)
        conn.commit()
    finally:
        conn.close()


def _load(table, cols, order):
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT %s FROM %s ORDER BY %s" % (",".join(cols), table, order)
        ).fetchall()
    finally:
        conn.close()
    return [dict(zip(cols, r)) for r in rows]


def _name_maps():
    """Return (cat_by_id, cat_by_name, store_by_id, store_by_name)."""
    conn = _conn()
    try:
        cats = conn.execute("SELECT id,category FROM categories").fetchall()
        stores = conn.execute("SELECT id,store FROM stores").fetchall()
    finally:
        conn.close()
    return ({i: n for i, n in cats}, {n: i for i, n in cats},
            {i: n for i, n in stores}, {n: i for i, n in stores})


def _prod_loc_maps():
    """Return (prod_by_id, prod_by_name, loc_by_id, loc_by_name)."""
    conn = _conn()
    try:
        prods = conn.execute("SELECT id,name FROM products").fetchall()
        locs = conn.execute("SELECT id,location FROM locations").fetchall()
    finally:
        conn.close()
    return ({i: n for i, n in prods}, {n: i for i, n in prods},
            {i: n for i, n in locs}, {n: i for i, n in locs})


def _load_inventory():
    prod_id, _, loc_id, _ = _prod_loc_maps()
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT inv.id,inv.product_id,inv.location_id,inv.quantity,"
            "COALESCE(c.category,'') "
            "FROM stock inv "
            "LEFT JOIN products p ON inv.product_id=p.id "
            "LEFT JOIN categories c ON p.category_id=c.id "
            "ORDER BY inv.id").fetchall()
    finally:
        conn.close()
    out = []
    for rid, pid, lid, qty, cat in rows:
        out.append({"id": rid, "product_id": pid, "location_id": lid,
                    "quantity": qty,
                    "product": prod_id.get(pid, "") if pid else "",
                    "location": loc_id.get(lid, "") if lid else "",
                    "category": cat or ""})
    return out


def _load_shopping():
    prod_id, _, _, _ = _prod_loc_maps()
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT id,product_id,quantity FROM shopping_list ORDER BY id").fetchall()
    finally:
        conn.close()
    out = []
    for rid, pid, qty in rows:
        out.append({"id": rid, "product_id": pid, "quantity": qty,
                    "product": prod_id.get(pid, "") if pid else ""})
    return out


def _load_products():
    cat_id, _, store_id, _ = _name_maps()
    cols = ["id", "barcode", "name", "description", "manufacturer", "unit",
            "auto_add_enabled", "auto_add_threshold", "auto_add_quantity",
            "category_id", "store_id"]
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT %s FROM products ORDER BY name" % ",".join(cols)).fetchall()
    finally:
        conn.close()
    out = []
    for r in rows:
        d = dict(zip(cols, r))
        d["category"] = cat_id.get(d["category_id"], "") if d["category_id"] else ""
        d["store"] = store_id.get(d["store_id"], "") if d["store_id"] else ""
        out.append(d)
    return out


def _sync_selects():
    _, cat_by_name, _, store_by_name = _name_maps()
    _, prod_by_name, _, loc_by_name = _prod_loc_maps()
    pairs = [
        ("input_select.vh_product_category", [NONE] + sorted(cat_by_name.keys())),
        ("input_select.vh_product_store", [NONE] + sorted(store_by_name.keys())),
        ("input_select.vh_stock_product", [NONE] + sorted(prod_by_name.keys())),
        ("input_select.vh_stock_location", [NONE] + sorted(loc_by_name.keys())),
        ("input_select.vh_shopping_product", [NONE] + sorted(prod_by_name.keys())),
        ("input_select.vh_print_category", ["All"] + sorted(cat_by_name.keys())),
    ]
    for ent, opts in pairs:
        try:
            input_select.set_options(entity_id=ent, options=opts)
        except Exception:
            pass


def _product_totals():
    """Return {product_id: total quantity across all inventory locations}."""
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT product_id, COALESCE(SUM(quantity),0) FROM stock "
            "GROUP BY product_id").fetchall()
    finally:
        conn.close()
    return {pid: tot for pid, tot in rows}


def _reconcile_shopping(before, after):
    """Reconcile the shopping list against an inventory change.
    before/after are {product_id: total}. For each product whose total:
      - increased (a > b): remove it from the shopping list, and
      - decreased (a < b): add it to the shopping list (qty = auto_add_quantity)
        if auto-add is enabled, threshold > 0, new total < threshold, and it
        is not already on the list.
    Direct connection (no _exec) to avoid recursive publishes."""
    pids = set(before) | set(after)
    if not pids:
        return False
    conn = _conn()
    try:
        pinfo = {r[0]: (r[1], r[2], r[3]) for r in conn.execute(
            "SELECT id,auto_add_enabled,auto_add_threshold,auto_add_quantity "
            "FROM products").fetchall()}
        on_list = {r[0] for r in conn.execute(
            "SELECT product_id FROM shopping_list").fetchall()}
        changed = False
        for pid in pids:
            b = before.get(pid, 0)
            a = after.get(pid, 0)
            if a > b:
                if pid in on_list:
                    conn.execute("DELETE FROM shopping_list WHERE product_id=?", [pid])
                    on_list.discard(pid)
                    _hist_row(conn, "auto-remove", "shopping_list", pid,
                              "Auto-removed product_id=%d (stock %d >= %d)"
                              % (pid, a, b))
                    changed = True
            elif a < b:
                info = pinfo.get(pid)
                if not info:
                    continue
                enabled, threshold, add_qty = info
                if enabled and threshold and a < threshold and pid not in on_list:
                    conn.execute(
                        "INSERT INTO shopping_list(product_id,quantity) VALUES(?,?)",
                        [pid, int(add_qty or 1)])
                    on_list.add(pid)
                    _hist_row(conn, "auto-add", "shopping_list", pid,
                              "Auto-added product_id=%d qty=%d (stock %d < %d)"
                              % (pid, int(add_qty or 1), a, threshold))
                    changed = True
                    _announce_shopping_add(pid)
        if changed:
            conn.commit()
    finally:
        conn.close()
    return changed


def _publish():
    products = _load_products()
    conn = _conn()
    try:
        on_list = {r[0] for r in conn.execute(
            "SELECT DISTINCT product_id FROM shopping_list").fetchall()}
    finally:
        conn.close()
    for p in products:
        p["on_shopping"] = 1 if p["id"] in on_list else 0
    state.set("sensor.vh_inventory_products", len(products), {
        "friendly_name": "VH Inventory Products",
        "icon": "mdi:package-variant-closed", "products": products})
    inv = _load_inventory()
    state.set("sensor.vh_inventory_stock", len(inv), {
        "friendly_name": "VH Inventory Stock",
        "icon": "mdi:clipboard-list", "stock": inv})
    shopping = _load_shopping()
    state.set("sensor.vh_inventory_shopping", len(shopping), {
        "friendly_name": "VH Inventory Shopping List",
        "icon": "mdi:cart", "shopping": shopping})
    scanq = _load("scan_queue", ["id", "barcode", "action", "state", "name",
        "manufacturer", "description", "unit", "category", "image_url",
        "provider"], "id DESC")
    state.set("sensor.vh_inventory_scan_queue", len(scanq), {
        "friendly_name": "VH Inventory Scan Queue",
        "icon": "mdi:barcode-scan", "scan_queue": scanq})
    hist = _load("history", ["id", "timestamp", "action", "entity",
        "entity_id", "detail"], "id DESC LIMIT %d" % HISTORY_DISPLAY_LIMIT)
    state.set("sensor.vh_inventory_history", len(hist), {
        "friendly_name": "VH Inventory History",
        "icon": "mdi:history", "history": hist})
    for sensor, (table, cols, fname, icon, attr) in TABLES.items():
        items = _load(table, cols, cols[1])
        state.set(sensor, len(items), {
            "friendly_name": fname, "icon": icon, attr: items})
    _sync_selects()


def _exec(sql, params):
    conn = _conn()
    try:
        conn.execute(sql, params)
        conn.commit()
    finally:
        conn.close()
    _publish()


def _insert_id(sql, params):
    """Run an INSERT and return the new row id (does not publish)."""
    conn = _conn()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def _months_ago(months):
    """Return the datetime `months` calendar months before now (day-clamped so
    e.g. 3 months before 31 May yields the last valid day of February)."""
    now = datetime.datetime.now()
    idx = now.year * 12 + (now.month - 1) - months
    year, month = idx // 12, idx % 12 + 1
    if month == 12:
        first_next = datetime.date(year + 1, 1, 1)
    else:
        first_next = datetime.date(year, month + 1, 1)
    last_day = (first_next - datetime.timedelta(days=1)).day
    return now.replace(year=year, month=month, day=min(now.day, last_day))


def _purge_history(conn):
    """Delete history rows older than the retention window (no commit). Safe on
    string timestamps because '%Y-%m-%d %H:%M:%S' sorts chronologically."""
    cutoff = _months_ago(HISTORY_RETENTION_MONTHS).strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("DELETE FROM history WHERE timestamp < ?", [cutoff])


def _hist_row(conn, action, entity, entity_id, detail):
    """Insert a history row on an existing connection (no commit/publish)."""
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    eid = int(entity_id) if entity_id not in (None, "") else None
    conn.execute(
        "INSERT INTO history(timestamp,action,entity,entity_id,detail) "
        "VALUES(?,?,?,?,?)", [ts, action, entity, eid, detail])
    _purge_history(conn)


def _log_history(action, entity, entity_id=None, detail=None):
    """Record an action in the history table and refresh sensors."""
    conn = _conn()
    try:
        _hist_row(conn, action, entity, entity_id, detail)
        conn.commit()
    finally:
        conn.close()
    _publish()


def _announce_shopping_add(pid):
    """Fire a fire-and-forget event announcing that a product was added to the
    shopping list. A separate HA automation (vh_inventory_announce) does the
    slow chime-tts work, so TTS runs fully independently of the inventory logic.
    Wrapped in try/except so a notification problem can never break core
    functionality."""
    try:
        name, _ = _product_name_mfr(pid)
        if name:
            event.fire("vh_inventory_announce", kind="shopping_add", product=name)
    except Exception:
        pass


def _announce_scan_unresolved(bc):
    """Fire a fire-and-forget event announcing that a scanned barcode could not
    be resolved and needs a manual update. The separate vh_inventory_announce
    automation does the slow chime-tts work, so this never affects core scan
    handling. Wrapped in try/except for the same reason."""
    try:
        event.fire("vh_inventory_announce", kind="scan_unresolved",
                   barcode=bc or "")
    except Exception:
        pass


def _fetch_one(table, cols, rid):
    conn = _conn()
    try:
        row = conn.execute(
            "SELECT %s FROM %s WHERE id=?" % (",".join(cols), table), [rid]
        ).fetchone()
    finally:
        conn.close()
    return dict(zip(cols, row)) if row else None


def _resolve(value, name_to_id):
    if value in (None, "", NONE):
        return None
    return name_to_id.get(value)


def _fetch_one_sql(sql, params):
    """Run a SELECT and return the first row as a dict keyed by column name."""
    conn = _conn()
    try:
        cur = conn.execute(sql, params)
        row = cur.fetchone()
        cols = [d[0] for d in cur.description]
    finally:
        conn.close()
    return dict(zip(cols, row)) if row else None


@time_trigger("startup", "period(0, 60s)")
def vh_inventory_poll():
    _ensure_schema()
    _publish()


@service
def vh_inventory_refresh():
    """Refresh all VH inventory sensors from vh_inventory.db."""
    _ensure_schema()
    _publish()


# ---------- ADD ----------
@service
def vh_inventory_add_product(barcode=None, name=None, description=None,
                             manufacturer=None, unit=None, auto_add_enabled=0,
                             auto_add_threshold=0, auto_add_quantity=1,
                             category=None, store=None):
    """Add a product. Warns (and skips) if a product with the same name
    already exists, since duplicate products are usually a mistake."""
    if not name:
        return
    if _fetch_one_sql("SELECT id FROM products WHERE LOWER(name)=LOWER(?)", [name]):
        service.call("persistent_notification", "create",
            title="VH Inventory",
            message="Product '%s' already exists - not added again." % name,
            notification_id="vh_dup_product")
        return
    _, cat_by_name, _, store_by_name = _name_maps()
    bc = int(barcode) if barcode not in (None, "") else None
    _exec("INSERT INTO products(barcode,name,description,manufacturer,unit,"
          "auto_add_enabled,auto_add_threshold,auto_add_quantity,category_id,store_id) "
          "VALUES(?,?,?,?,?,?,?,?,?,?)",
          [bc, name, description, manufacturer, unit,
           1 if auto_add_enabled in (1, "1", True, "on") else 0,
           int(auto_add_threshold or 0), int(auto_add_quantity or 1),
           _resolve(category, cat_by_name), _resolve(store, store_by_name)])
    _log_history("add", "products", None, "Added product '%s'" % name)


@service
def vh_inventory_add_location(location=None):
    if location:
        _exec("INSERT INTO locations(location) VALUES(?)", [location])
        _log_history("add", "locations", None, "Added location '%s'" % location)


@service
def vh_inventory_add_category(category=None):
    if category:
        _exec("INSERT INTO categories(category) VALUES(?)", [category])
        _log_history("add", "categories", None, "Added category '%s'" % category)


@service
def vh_inventory_add_store(store=None):
    if store:
        _exec("INSERT INTO stores(store) VALUES(?)", [store])
        _log_history("add", "stores", None, "Added store '%s'" % store)


@service
def vh_inventory_scan_enqueue(barcode=None, action=None, device=None):
    """Add a scanned barcode to the scan_queue with the given action.
    action must be 'Add' or 'Use'; empty barcodes are ignored.
    When device is given (e.g. 'barcode-01') the resolved product name,
    description and resulting stock quantity are pushed back to that ESPHome
    scanner's on-screen text entities.
    If the barcode already matches a product, state is 'Exist'. Otherwise the
    row is inserted as 'Lookup' and an online resolution is attempted, setting
    state to 'New' (resolved) or 'Unknown' (not resolvable)."""
    if action not in ("Add", "Use"):
        return
    bc = ("" if barcode is None else str(barcode)).strip()
    if not bc:
        return
    exists = bc.isdigit() and _fetch_one_sql(
        "SELECT 1 FROM products WHERE barcode=?", [int(bc)]) is not None
    if exists:
        rid = _insert_id("INSERT INTO scan_queue(barcode, action, state) "
                         "VALUES(?, ?, 'Exist')", [bc, action])
        _log_history("scan", "scan_queue", rid,
                     "Scanned %s (%s) - already a product (Exist)" % (bc, action))
        # Case 2: Add + Exist -> add 1 to stock (merge if already present).
        if action == "Add":
            pid = _product_id_for_barcode(bc)
            if pid:
                _add_inventory_qty(pid, 1)
                nm, mf = _product_name_mfr(pid)
                _update_scanner_display(device, nm, mf, _total_stock(pid))
                _delete_scan_queue_row(rid, action, "Exist")
        # Case 3: Use + Exist -> remove 1 from stock, never below 0.
        elif action == "Use":
            pid = _product_id_for_barcode(bc)
            if pid:
                _remove_inventory_qty(pid, 1)
                nm, mf = _product_name_mfr(pid)
                _update_scanner_display(device, nm, mf, _total_stock(pid))
                _delete_scan_queue_row(rid, action, "Exist")
        return
    rid = _insert_id(
        "INSERT INTO scan_queue(barcode, action, state) VALUES(?, ?, 'Lookup')",
        [bc, action])
    _log_history("scan", "scan_queue", rid, "Scanned %s (%s)" % (bc, action))
    info = _scan_resolve_row(rid, bc)
    # Case 1: Add + New -> create the product and stock 1.
    if action == "Add" and info:
        pid = _create_product_from_scan(bc, info)
        if pid:
            _add_inventory_qty(pid, 1)
            nm, mf = _product_name_mfr(pid)
            _update_scanner_display(device, nm, mf, _total_stock(pid))
            _delete_scan_queue_row(rid, action, "New")
    # Case 4: Use + New -> create product (same settings), stock 0, and put it
    # on the shopping list at its auto-add quantity (as if below threshold).
    elif action == "Use" and info:
        pid = _create_product_from_scan(bc, info)
        if pid:
            prod = _fetch_one_sql(
                "SELECT auto_add_quantity FROM products WHERE id=?", [pid])
            add_qty = int((prod or {}).get("auto_add_quantity") or 1)
            inv_id = _insert_id(
                "INSERT INTO stock(product_id,location_id,quantity) "
                "VALUES(?,NULL,0)", [pid])
            _log_history("add", "stock", inv_id,
                         "Scan-use(new): stock 0 (product_id=%d)" % pid)
            shop_id = _insert_id(
                "INSERT INTO shopping_list(product_id,quantity) VALUES(?,?)",
                [pid, add_qty])
            _log_history("auto-add", "shopping_list", shop_id,
                         "Scan-use(new): added to shopping qty=%d (product_id=%d)"
                         % (add_qty, pid))
            _announce_shopping_add(pid)
            nm, mf = _product_name_mfr(pid)
            _update_scanner_display(device, nm, mf, _total_stock(pid))
            _delete_scan_queue_row(rid, action, "New")
    # Unresolved (Unknown): no product created; reflect the failed lookup on the
    # scanner display so the user gets feedback instead of a stale screen.
    if not info:
        _update_scanner_display(device, "Handmatig toevoegen", "Niet gevonden", "-")


@service
def vh_inventory_scan_resolve(id=None):
    """Re-run the online product lookup for a scan_queue row by id."""
    if id in (None, ""):
        return
    row = _fetch_one_sql(
        "SELECT id, barcode FROM scan_queue WHERE id=?", [int(id)])
    if row:
        _scan_resolve_row(row["id"], row["barcode"])


@service
def vh_inventory_scan_resolve_manual(id=None):
    """Prepare the Resolve Product popup for an Unknown scan_queue row.
    Pre-fills the barcode, resets the other product fields to defaults, and
    records which scan_queue row is being resolved (in input_text.
    vh_pending_scan_id) so the save can finish the queued Add/Use action."""
    if id in (None, ""):
        return
    row = _fetch_one_sql(
        "SELECT id, barcode, action, state FROM scan_queue WHERE id=?", [int(id)])
    if not row:
        return
    input_text.set_value(entity_id="input_text.vh_pending_scan_id",
                         value=str(row["id"]))
    input_text.set_value(entity_id="input_text.vh_product_barcode",
                         value="" if row["barcode"] is None else str(row["barcode"]))
    input_text.set_value(entity_id="input_text.vh_product_name", value="")
    input_text.set_value(entity_id="input_text.vh_product_description", value="")
    input_text.set_value(entity_id="input_text.vh_product_manufacturer", value="")
    input_text.set_value(entity_id="input_text.vh_product_unit", value="")
    input_boolean.turn_on(entity_id="input_boolean.vh_product_auto_add_enabled")
    input_number.set_value(
        entity_id="input_number.vh_product_auto_add_threshold", value=1)
    input_number.set_value(
        entity_id="input_number.vh_product_auto_add_quantity", value=1)
    _sync_selects()
    for ent in ("input_select.vh_product_category",
                "input_select.vh_product_store"):
        try:
            input_select.select_option(entity_id=ent, option=NONE)
        except Exception:
            pass


@service
def vh_inventory_save_resolved(name=None, barcode=None, description=None,
                               manufacturer=None, unit=None, auto_add_enabled=0,
                               auto_add_threshold=0, auto_add_quantity=1,
                               category=None, store=None):
    """Save a manually-resolved product (from the Resolve Product popup) and, in
    the same call, finish the queued scan action recorded in
    input_text.vh_pending_scan_id. This is one service (not a chain of two) so
    HA-script execution stays reliable. Add -> stock 1; Use -> stock 0 +
    shopping at the product's auto-add quantity; then the scan_queue row is
    deleted and the pending marker cleared. With no pending resolve it simply
    adds the product, like vh_inventory_add_product."""
    if not name:
        return
    if _fetch_one_sql("SELECT id FROM products WHERE LOWER(name)=LOWER(?)", [name]):
        service.call("persistent_notification", "create", title="VH Inventory",
            message="Product '%s' already exists - not added again." % name,
            notification_id="vh_dup_product")
        return
    _, cat_by_name, _, store_by_name = _name_maps()
    bc = int(barcode) if barcode not in (None, "") else None
    add_qty = int(auto_add_quantity or 1)
    pid = _insert_id(
        "INSERT INTO products(barcode,name,description,manufacturer,unit,"
        "auto_add_enabled,auto_add_threshold,auto_add_quantity,category_id,store_id) "
        "VALUES(?,?,?,?,?,?,?,?,?,?)",
        [bc, name, description, manufacturer, unit,
         1 if auto_add_enabled in (1, "1", True, "on") else 0,
         int(auto_add_threshold or 0), add_qty,
         _resolve(category, cat_by_name), _resolve(store, store_by_name)])
    _log_history("add", "products", pid,
                 "Added product '%s' (manual resolve)" % name)
    pend = state.get("input_text.vh_pending_scan_id")
    if pend in (None, "", "unknown", "unavailable"):
        _publish()
        return
    input_text.set_value(entity_id="input_text.vh_pending_scan_id", value="")
    try:
        rid = int(pend)
    except (TypeError, ValueError):
        _publish()
        return
    row = _fetch_one_sql("SELECT id, action FROM scan_queue WHERE id=?", [rid])
    if not row:
        _publish()
        return
    action = row["action"]
    if action == "Add":
        _add_inventory_qty(pid, 1)
    elif action == "Use":
        inv_id = _insert_id(
            "INSERT INTO stock(product_id,location_id,quantity) "
            "VALUES(?,NULL,0)", [pid])
        _log_history("add", "stock", inv_id,
                     "Resolve-use: stock 0 (product_id=%d)" % pid)
        shop_id = _insert_id(
            "INSERT INTO shopping_list(product_id,quantity) VALUES(?,?)",
            [pid, add_qty])
        _log_history("auto-add", "shopping_list", shop_id,
                     "Resolve-use: added to shopping qty=%d (product_id=%d)"
                     % (add_qty, pid))
        _announce_shopping_add(pid)
    _delete_scan_queue_row(rid, action, "Unknown")


def _scan_resolve_row(rid, bc):
    """Look the barcode up online and store the result on the scan_queue row.
    Sets state 'New' with product details on success, else 'Unknown'.
    Returns the resolved info dict (or None if not resolvable)."""
    info = _resolve_barcode(bc)
    if info:
        _exec(
            "UPDATE scan_queue SET state='New', name=?, manufacturer=?, "
            "description=?, unit=?, category=?, image_url=?, provider=? "
            "WHERE id=?",
            [info.get("name"), info.get("manufacturer"),
             info.get("description"), info.get("unit"), info.get("category"),
             info.get("image_url"), info.get("provider"), rid])
        _log_history("resolve", "scan_queue", rid,
                     "Resolved %s -> '%s' via %s"
                     % (bc, info.get("name"), info.get("provider")))
    else:
        _exec("UPDATE scan_queue SET state='Unknown' WHERE id=?", [rid])
        _log_history("resolve", "scan_queue", rid,
                     "Could not resolve %s (Unknown)" % bc)
        _announce_scan_unresolved(bc)
    return info


def _product_id_for_barcode(bc):
    """Return the products.id for a numeric barcode, or None."""
    if bc and str(bc).isdigit():
        row = _fetch_one_sql("SELECT id FROM products WHERE barcode=?", [int(bc)])
        if row:
            return row["id"]
    return None


def _create_product_from_scan(bc, info):
    """Create a product from a resolved scan with auto-add enabled (1/1/1).
    Returns the new products.id."""
    info = info or {}
    name = (info.get("name") or "").strip() or ("Product %s" % bc)
    barcode = int(bc) if (bc and str(bc).isdigit()) else None
    pid = _insert_id(
        "INSERT INTO products(barcode,name,description,manufacturer,unit,"
        "auto_add_enabled,auto_add_threshold,auto_add_quantity) "
        "VALUES(?,?,?,?,?,1,1,1)",
        [barcode, name, info.get("description"), info.get("manufacturer"),
         info.get("unit")])
    _log_history("add", "products", pid,
                 "Auto-created product '%s' from scan %s (auto-add 1/1/1)"
                 % (name, bc))
    return pid


def _add_inventory_qty(pid, qty):
    """Add qty to a product's stock at the NULL location, merging with an
    existing row if present. Reconciles the shopping list afterwards."""
    before = _product_totals()
    existing = _fetch_one_sql(
        "SELECT id,quantity FROM stock "
        "WHERE product_id=? AND location_id IS NULL", [pid])
    if existing:
        _exec("UPDATE stock SET quantity=quantity+? WHERE id=?",
              [int(qty), existing["id"]])
        _log_history("adjust", "stock", existing["id"],
                     "Scan-add: stock +%d (product_id=%d)" % (int(qty), pid))
    else:
        nid = _insert_id(
            "INSERT INTO stock(product_id,location_id,quantity) "
            "VALUES(?,NULL,?)", [pid, int(qty)])
        _log_history("add", "stock", nid,
                     "Scan-add: stock %d (product_id=%d)" % (int(qty), pid))
    if _reconcile_shopping(before, _product_totals()):
        _publish()


def _remove_inventory_qty(pid, qty):
    """Subtract qty from a product's NULL-location stock, flooring at 0.
    Reconciles the shopping list afterwards."""
    before = _product_totals()
    existing = _fetch_one_sql(
        "SELECT id,quantity FROM stock "
        "WHERE product_id=? AND location_id IS NULL", [pid])
    if existing:
        newq = existing["quantity"] - int(qty)
        if newq < 0:
            newq = 0
        _exec("UPDATE stock SET quantity=? WHERE id=?", [newq, existing["id"]])
        _log_history("adjust", "stock", existing["id"],
                     "Scan-use: stock -%d -> %d (product_id=%d)"
                     % (int(qty), newq, pid))
    if _reconcile_shopping(before, _product_totals()):
        _publish()


def _delete_scan_queue_row(rid, action, state):
    """Remove a scan_queue row whose action has been fully completed.
    The action is preserved in the history audit trail."""
    if not rid:
        return
    _exec("DELETE FROM scan_queue WHERE id=?", [rid])
    _log_history("delete", "scan_queue", rid,
                 "Completed %s (%s) - removed from scan queue" % (action, state))


def _product_name_mfr(pid):
    """Return (name, manufacturer) for a product id, or (None, None).
    Used to feed the ESPHome scanner display, which shows the manufacturer
    in its 'description' text field."""
    row = _fetch_one_sql("SELECT name, manufacturer FROM products WHERE id=?", [pid])
    if not row:
        return (None, None)
    return (row.get("name"), row.get("manufacturer"))


def _total_stock(pid):
    """Total stock quantity across all locations for a product id."""
    row = _fetch_one_sql(
        "SELECT COALESCE(SUM(quantity),0) AS q FROM stock WHERE product_id=?", [pid])
    return int((row or {}).get("q") or 0)


def _update_scanner_display(device, name, description, qty):
    """Push the resolved product name, description and resulting stock quantity
    to an ESPHome scanner's on-screen text entities (text.<device>_product_name
    / _product_description / _stock). Values are clipped to the entities'
    64-char limit. No-op when device is empty (e.g. manual dashboard entry)."""
    if not device:
        return
    dev = str(device).replace("-", "_")
    nm = ("" if name is None else str(name))[:64]
    ds = ("" if description is None else str(description))[:64]
    qt = ("-" if qty is None else str(qty))[:64]
    text.set_value(entity_id="text.%s_product_name" % dev, value=nm)
    text.set_value(entity_id="text.%s_product_description" % dev, value=ds)
    text.set_value(entity_id="text.%s_stock" % dev, value=qt)


# ---------- ONLINE BARCODE RESOLUTION ----------
# Provider approach ported from blaineventurine/simple_inventory (MIT):
# query free, no-key databases and normalise to common product fields.
_HTTP_TIMEOUT = 10
_HTTP_UA = "VH-Inventory/0.1 (HomeAssistant pyscript)"
_MAX_CATEGORIES = 3

# Open*Facts family: identical API shape, different host (food/beauty/pet).
_OFF_PROVIDERS = [
    ("openfoodfacts", "https://world.openfoodfacts.org"),
    ("openbeautyfacts", "https://world.openbeautyfacts.org"),
    ("openpetfoodfacts", "https://world.openpetfoodfacts.org"),
]
_OFF_FIELDS = "product_name,brands,categories,generic_name,quantity,image_url"
_UPC_URL = "https://api.upcitemdb.com/prod/trial/lookup"
_UPCDB_URL_BASE = "https://api.upcdatabase.org/product/"


def _cfg(key, default=""):
    """Read a value from this pyscript app's config block, safely."""
    try:
        val = pyscript.app_config.get(key)
    except Exception:
        return default
    return default if val in (None, "") else val


def _resolve_barcode(bc):
    """Try each provider in order; return the first normalised hit or None."""
    for name, base in _OFF_PROVIDERS:
        res = _lookup_off(name, base, bc)
        if res:
            return res
    res = _lookup_upcdb(bc)
    if res:
        return res
    return _lookup_upc(bc)


def _strip_lang_prefix(category):
    """'en:canned-foods' -> 'canned-foods' (only short language prefixes)."""
    if ":" in category:
        head, _sep, tail = category.partition(":")
        if len(head) <= 3:
            return tail.strip()
    return category


def _lookup_off(name, base, bc):
    """Open Food/Beauty/Pet Facts lookup (product API v2)."""
    url = "%s/api/v2/product/%s.json?fields=%s" % (base, bc, _OFF_FIELDS)
    try:
        r = task.executor(requests.get, url,
                          headers={"User-Agent": _HTTP_UA},
                          timeout=_HTTP_TIMEOUT)
    except Exception as e:
        log.debug("vh_inventory %s lookup failed for %s (%s)" % (name, bc, e))
        return None
    if r.status_code != 200:
        return None
    data = r.json()
    if data.get("status") != 1:
        return None
    p = data.get("product") or {}
    nm = (p.get("product_name") or "").strip()
    if not nm:
        return None
    out = {"name": nm, "provider": name}
    brand = (p.get("brands") or "").strip()
    if brand:
        out["manufacturer"] = brand
    gen = (p.get("generic_name") or "").strip()
    if gen:
        out["description"] = gen
    raw = (p.get("categories") or "").strip()
    if raw:
        cats = [_strip_lang_prefix(c.strip()) for c in raw.split(",")]
        cats = [c for c in cats if c][:_MAX_CATEGORIES]
        if cats:
            out["category"] = ", ".join(cats)
    unit = (p.get("quantity") or "").strip()
    if unit:
        out["unit"] = unit
    img = (p.get("image_url") or "").strip()
    if img:
        out["image_url"] = img
    return out


def _lookup_upc(bc):
    """UPC Item DB lookup (trial tier; 429 = rate limited)."""
    try:
        r = task.executor(requests.get, _UPC_URL,
                          params={"upc": bc},
                          headers={"User-Agent": _HTTP_UA},
                          timeout=_HTTP_TIMEOUT)
    except Exception as e:
        log.debug("vh_inventory upcitemdb lookup failed for %s (%s)" % (bc, e))
        return None
    if r.status_code == 429:
        log.warning("vh_inventory upcitemdb rate limit hit for %s" % bc)
        return None
    if r.status_code != 200:
        return None
    data = r.json()
    if data.get("code") != "OK" or not data.get("items"):
        return None
    it = data["items"][0]
    title = (it.get("title") or "").strip()
    if not title:
        return None
    out = {"name": title, "provider": "upcitemdb"}
    brand = (it.get("brand") or "").strip()
    if brand:
        out["manufacturer"] = brand
    desc = (it.get("description") or "").strip()
    if desc:
        out["description"] = desc
    cat = (it.get("category") or "").strip()
    if cat:
        out["category"] = cat
    size = (it.get("size") or "").strip()
    if size:
        out["unit"] = size
    return out


def _lookup_upcdb(bc):
    """upcdatabase.org lookup (only runs when upcdb_api_key is configured)."""
    key = _cfg("upcdb_api_key")
    if not key:
        return None
    base = _cfg("upcdb_url_base", _UPCDB_URL_BASE)
    url = "%s%s?apikey=%s" % (base, bc, key)
    try:
        r = task.executor(requests.get, url,
                          headers={"User-Agent": _HTTP_UA,
                                   "Accept": "application/json"},
                          timeout=_HTTP_TIMEOUT)
    except Exception as e:
        log.debug("vh_inventory upcdatabase lookup failed for %s (%s)" % (bc, e))
        return None
    if r.status_code != 200:
        return None
    text = r.text or ""
    start = text.find("{")
    if start < 0:
        return None
    try:
        data = json.loads(text[start:])
    except Exception:
        return None
    if not data.get("success"):
        return None
    title = (data.get("title") or "").strip()
    if not title:
        title = (data.get("alias") or "").strip()
    if not title:
        title = (data.get("description") or "").strip()
    if not title:
        return None
    out = {"name": title, "provider": "upcdatabase"}
    brand = (data.get("brand") or "").strip()
    if brand:
        out["manufacturer"] = brand
    desc = (data.get("description") or "").strip()
    if desc and desc != title:
        out["description"] = desc
    cat = (data.get("category") or "").strip()
    if cat:
        out["category"] = cat
    meta = data.get("metadata") or {}
    unit = str(meta.get("quantity") or meta.get("unit") or "").strip()
    if unit:
        out["unit"] = unit
    return out



# ---------- DELETE ----------
@service
def vh_inventory_delete(table=None, id=None):
    """Delete a row by id from an allowed VH table."""
    if table not in {"products", "locations", "categories", "stores", "stock", "shopping_list", "scan_queue"} or id in (None, ""):
        return
    if table == "stock":
        before = _product_totals()
        _exec("DELETE FROM stock WHERE id=?", [int(id)])
        if _reconcile_shopping(before, _product_totals()):
            _publish()
        _log_history("delete", "stock", id, "Deleted inventory id=%s" % id)
        return
    if table == "products":
        pid = int(id)
        invc = _fetch_one_sql(
            "SELECT COUNT(*) AS c FROM stock WHERE product_id=?", [pid])
        shopc = _fetch_one_sql(
            "SELECT COUNT(*) AS c FROM shopping_list WHERE product_id=?", [pid])
        ninv = invc["c"] if invc else 0
        nshop = shopc["c"] if shopc else 0
        _exec("DELETE FROM stock WHERE product_id=?", [pid])
        _exec("DELETE FROM shopping_list WHERE product_id=?", [pid])
        _exec("DELETE FROM products WHERE id=?", [pid])
        _log_history("delete", "products", id,
                     "Deleted product id=%s (cascade: %d inventory, %d shopping)"
                     % (id, ninv, nshop))
        return
    _exec("DELETE FROM %s WHERE id=?" % table, [int(id)])
    _log_history("delete", table, id, "Deleted %s id=%s" % (table, id))


# ---------- EDIT LOAD ----------
@service
def vh_inventory_edit_load(table=None, id=None):
    """Load a row's values into the matching VH input helpers for editing."""
    if id in (None, ""):
        return
    rid = int(id)
    if table == "products":
        cat_id, _, store_id, _ = _name_maps()
        cols = ["id", "barcode", "name", "description", "manufacturer", "unit",
                "auto_add_enabled", "auto_add_threshold", "auto_add_quantity",
                "category_id", "store_id"]
        row = _fetch_one("products", cols, rid)
        if not row:
            return
        input_text.set_value(entity_id="input_text.vh_edit_product_id", value=str(rid))
        input_text.set_value(entity_id="input_text.vh_product_name", value=row["name"] or "")
        input_text.set_value(entity_id="input_text.vh_product_barcode",
                             value="" if row["barcode"] is None else str(row["barcode"]))
        input_text.set_value(entity_id="input_text.vh_product_description", value=row["description"] or "")
        input_text.set_value(entity_id="input_text.vh_product_manufacturer", value=row["manufacturer"] or "")
        input_text.set_value(entity_id="input_text.vh_product_unit", value=row["unit"] or "")
        if row["auto_add_enabled"]:
            input_boolean.turn_on(entity_id="input_boolean.vh_product_auto_add_enabled")
        else:
            input_boolean.turn_off(entity_id="input_boolean.vh_product_auto_add_enabled")
        input_number.set_value(entity_id="input_number.vh_product_auto_add_threshold",
                               value=row["auto_add_threshold"] or 0)
        input_number.set_value(entity_id="input_number.vh_product_auto_add_quantity",
                               value=row["auto_add_quantity"] or 1)
        _sync_selects()
        cat_name = cat_id.get(row["category_id"], NONE) if row["category_id"] else NONE
        store_name = store_id.get(row["store_id"], NONE) if row["store_id"] else NONE
        try:
            input_select.select_option(entity_id="input_select.vh_product_category", option=cat_name)
        except Exception:
            pass
        try:
            input_select.select_option(entity_id="input_select.vh_product_store", option=store_name)
        except Exception:
            pass
    elif table == "stock":
        prod_id, _, loc_id, _ = _prod_loc_maps()
        row = _fetch_one("stock", ["id", "product_id", "location_id", "quantity"], rid)
        if not row:
            return
        _sync_selects()
        input_text.set_value(entity_id="input_text.vh_edit_stock_id", value=str(rid))
        input_number.set_value(entity_id="input_number.vh_stock_quantity", value=row["quantity"] or 0)
        pname = prod_id.get(row["product_id"], NONE) if row["product_id"] else NONE
        lname = loc_id.get(row["location_id"], NONE) if row["location_id"] else NONE
        try:
            input_select.select_option(entity_id="input_select.vh_stock_product", option=pname)
        except Exception:
            pass
        try:
            input_select.select_option(entity_id="input_select.vh_stock_location", option=lname)
        except Exception:
            pass
    elif table == "shopping_list":
        prod_id, _, _, _ = _prod_loc_maps()
        row = _fetch_one("shopping_list", ["id", "product_id", "quantity"], rid)
        if not row:
            return
        _sync_selects()
        input_text.set_value(entity_id="input_text.vh_edit_shopping_id", value=str(rid))
        input_number.set_value(entity_id="input_number.vh_shopping_quantity", value=row["quantity"] or 1)
        pname = prod_id.get(row["product_id"], NONE) if row["product_id"] else NONE
        try:
            input_select.select_option(entity_id="input_select.vh_shopping_product", option=pname)
        except Exception:
            pass
    elif table in SIMPLE:
        col = SIMPLE[table]
        row = _fetch_one(table, ["id", col], rid)
        if not row:
            return
        input_text.set_value(entity_id="input_text.vh_edit_%s_id" % col, value=str(rid))
        input_text.set_value(entity_id="input_text.vh_new_%s" % col, value=row[col] or "")


# ---------- UPDATE ----------
@service
def vh_inventory_update_product(id=None, barcode=None, name=None, description=None,
                                manufacturer=None, unit=None, auto_add_enabled=0,
                                auto_add_threshold=0, auto_add_quantity=1,
                                category=None, store=None):
    """Update a product by id."""
    if id in (None, "") or not name:
        return
    _, cat_by_name, _, store_by_name = _name_maps()
    bc = int(barcode) if barcode not in (None, "") else None
    _exec("UPDATE products SET barcode=?,name=?,description=?,manufacturer=?,unit=?,"
          "auto_add_enabled=?,auto_add_threshold=?,auto_add_quantity=?,category_id=?,store_id=? "
          "WHERE id=?",
          [bc, name, description, manufacturer, unit,
           1 if auto_add_enabled in (1, "1", True, "on") else 0,
           int(auto_add_threshold or 0), int(auto_add_quantity or 1),
           _resolve(category, cat_by_name), _resolve(store, store_by_name), int(id)])
    _log_history("update", "products", id, "Updated product '%s'" % name)


@service
def vh_inventory_set_product_field(id=None, field=None, value=None):
    """Inline-edit a single product field from the Products table.
    Allowed fields: category, store, auto_add_threshold, auto_add_quantity."""
    if id in (None, "") or field is None:
        return
    rid = int(id)
    if field == "category":
        _, cat_by_name, _, _ = _name_maps()
        _exec("UPDATE products SET category_id=? WHERE id=?",
              [_resolve(value, cat_by_name), rid])
    elif field == "store":
        _, _, _, store_by_name = _name_maps()
        _exec("UPDATE products SET store_id=? WHERE id=?",
              [_resolve(value, store_by_name), rid])
    elif field == "auto_add_threshold":
        _exec("UPDATE products SET auto_add_threshold=? WHERE id=?",
              [int(float(value or 0)), rid])
    elif field == "auto_add_quantity":
        _exec("UPDATE products SET auto_add_quantity=? WHERE id=?",
              [int(float(value or 1)), rid])
    else:
        return
    _log_history("update", "products", rid, "Set %s = %s" % (field, value))


@service
def vh_inventory_set_stock_field(id=None, field=None, value=None):
    """Inline-edit a single inventory field from the Inventory table.
    Allowed fields: location. Changing location to one the product already has
    stock at merges the quantities into the existing row (no duplicates)."""
    if id in (None, "") or field is None:
        return
    rid = int(id)
    if field == "location":
        _, _, _, loc_by_name = _prod_loc_maps()
        lid = _resolve(value, loc_by_name)
        row = _fetch_one_sql(
            "SELECT product_id,quantity FROM stock WHERE id=?", [rid])
        if not row:
            return
        pid = row["product_id"]
        other = _fetch_one_sql(
            "SELECT id FROM stock WHERE product_id=? "
            "AND IFNULL(location_id,-1)=IFNULL(?,-1) AND id<>?", [pid, lid, rid])
        if other:
            _exec("UPDATE stock SET quantity=quantity+? WHERE id=?",
                  [int(row["quantity"] or 0), other["id"]])
            _exec("DELETE FROM stock WHERE id=?", [rid])
            _log_history("update", "stock", other["id"],
                         "Moved inventory id=%s to '%s' (merged)"
                         % (rid, value or NONE))
        else:
            _exec("UPDATE stock SET location_id=? WHERE id=?", [lid, rid])
            _log_history("update", "stock", rid,
                         "Set location = %s" % (value or NONE))
    else:
        return


@service
def vh_inventory_update_simple(table=None, id=None, value=None):
    """Update the single value column of a simple VH table by id."""
    if table not in SIMPLE or id in (None, "") or not value:
        return
    _exec("UPDATE %s SET %s=? WHERE id=?" % (table, SIMPLE[table]), [value, int(id)])
    _log_history("update", table, id, "Updated %s id=%s to '%s'" % (table, id, value))


# ---------- INVENTORY ----------
@service
def vh_inventory_add_stock(product=None, location=None, quantity=0):
    """Add stock for a product+location. If a row already exists for the same
    product and location, increase its quantity instead of inserting a new row."""
    _, prod_by_name, _, loc_by_name = _prod_loc_maps()
    pid = prod_by_name.get(product) if product not in (None, "", NONE) else None
    lid = loc_by_name.get(location) if location not in (None, "", NONE) else None
    if pid is None:
        return
    qty = int(quantity or 0)
    before = _product_totals()
    existing = _fetch_one_sql(
        "SELECT id,quantity FROM stock "
        "WHERE product_id=? AND IFNULL(location_id,-1)=IFNULL(?,-1)", [pid, lid])
    if existing:
        _exec("UPDATE stock SET quantity=quantity+? WHERE id=?",
              [qty, existing["id"]])
    else:
        _exec("INSERT INTO stock(product_id,location_id,quantity) VALUES(?,?,?)",
              [pid, lid, qty])
    if _reconcile_shopping(before, _product_totals()):
        _publish()
    _log_history("add", "stock", None,
                 "Added %d to stock of '%s'%s" % (
                     qty, product,
                     "" if lid is None else " @ '%s'" % location))


@service
def vh_inventory_update_stock(id=None, product=None, location=None, quantity=0):
    """Update an inventory row by id."""
    if id in (None, ""):
        return
    _, prod_by_name, _, loc_by_name = _prod_loc_maps()
    pid = prod_by_name.get(product) if product not in (None, "", NONE) else None
    lid = loc_by_name.get(location) if location not in (None, "", NONE) else None
    if pid is None:
        return
    before = _product_totals()
    _exec("UPDATE stock SET product_id=?,location_id=?,quantity=? WHERE id=?",
          [pid, lid, int(quantity or 0), int(id)])
    if _reconcile_shopping(before, _product_totals()):
        _publish()
    _log_history("update", "stock", id,
                 "Updated inventory id=%s ('%s' qty %d)"
                 % (id, product, int(quantity or 0)))


@service
def vh_inventory_adjust_stock(id=None, delta=0):
    """Increment/decrement an inventory row's quantity by delta (clamped at 0)."""
    if id in (None, ""):
        return
    before = _product_totals()
    _exec("UPDATE stock SET quantity=MAX(0, quantity + ?) WHERE id=?",
          [int(delta), int(id)])
    if _reconcile_shopping(before, _product_totals()):
        _publish()
    _log_history("adjust", "stock", id,
                 "Stock id=%s quantity %+d" % (id, int(delta)))


# ---------- SHOPPING LIST ----------
@service
def vh_inventory_add_shopping(product=None, quantity=1):
    """Add a shopping-list row (product + quantity to buy)."""
    _, prod_by_name, _, _ = _prod_loc_maps()
    pid = prod_by_name.get(product) if product not in (None, "", NONE) else None
    if pid is None:
        return
    _exec("INSERT INTO shopping_list(product_id,quantity) VALUES(?,?)",
          [pid, int(quantity or 1)])
    _log_history("add", "shopping_list", None,
                 "Added '%s' x%d to shopping list" % (product, int(quantity or 1)))
    _announce_shopping_add(pid)


@service
def vh_inventory_update_shopping(id=None, product=None, quantity=1):
    """Update a shopping-list row by id."""
    if id in (None, ""):
        return
    _, prod_by_name, _, _ = _prod_loc_maps()
    pid = prod_by_name.get(product) if product not in (None, "", NONE) else None
    if pid is None:
        return
    _exec("UPDATE shopping_list SET product_id=?,quantity=? WHERE id=?",
          [pid, int(quantity or 1), int(id)])
    _log_history("update", "shopping_list", id,
                 "Updated shopping id=%s ('%s' x%d)"
                 % (id, product, int(quantity or 1)))


@service
def vh_inventory_adjust_shopping(id=None, delta=0):
    """Increment/decrement a shopping-list row's quantity by delta. When a
    decrement brings the quantity to 0 (or below), the row is removed from the
    shopping list instead of being left at 0."""
    if id in (None, ""):
        return
    rid, d = int(id), int(delta)
    conn = _conn()
    try:
        row = conn.execute(
            "SELECT quantity FROM shopping_list WHERE id=?", [rid]).fetchone()
    finally:
        conn.close()
    if row is None:
        return
    newq = int(row[0]) + d
    if newq <= 0:
        _exec("DELETE FROM shopping_list WHERE id=?", [rid])
        _log_history("remove", "shopping_list", rid,
                     "Removed shopping id=%s (quantity reached 0)" % rid)
    else:
        _exec("UPDATE shopping_list SET quantity=? WHERE id=?", [newq, rid])
        _log_history("adjust", "shopping_list", rid,
                     "Shopping id=%s quantity %+d" % (rid, d))


@service
def vh_inventory_shopping_toggle(product_id=None):
    """Toggle a product's presence on the shopping list (used by the Add tab's
    product-button grid). If the product is on the list, remove all its rows;
    otherwise add a single row (qty 1)."""
    if product_id in (None, ""):
        return
    pid = int(product_id)
    conn = _conn()
    try:
        n = conn.execute(
            "SELECT COUNT(*) FROM shopping_list WHERE product_id=?", [pid]).fetchone()[0]
    finally:
        conn.close()
    if n > 0:
        _exec("DELETE FROM shopping_list WHERE product_id=?", [pid])
        _log_history("remove", "shopping_list", None,
                     "Removed product_id=%d from shopping list (tap)" % pid)
    else:
        _exec("INSERT INTO shopping_list(product_id,quantity) VALUES(?,1)", [pid])
        _log_history("add", "shopping_list", None,
                     "Added product_id=%d to shopping list (tap)" % pid)
        _announce_shopping_add(pid)


@service
def vh_inventory_tts_toggle_player(player=None):
    """Toggle a media_player entity_id in the TTS announcement target list
    (stored as a comma-separated list in input_text.vh_tts_media_players).
    Used by the auto-populated Sonos toggle chips on the Setup page. The
    parameter is named `player` (not `entity_id`) so HA does not treat it as a
    service target."""
    if player in (None, ""):
        return
    cur = state.get("input_text.vh_tts_media_players") or ""
    if cur in ("unknown", "unavailable"):
        cur = ""
    items = [x.strip() for x in cur.split(",")
             if x.strip() and x.strip() not in ("unknown", "unavailable")]
    if player in items:
        items = [x for x in items if x != player]
    else:
        items.append(player)
    input_text.set_value(entity_id="input_text.vh_tts_media_players",
                         value=",".join(items))
