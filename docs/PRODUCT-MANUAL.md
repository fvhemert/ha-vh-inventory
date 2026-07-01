# VH-Inventory — Product Manual

VH-Inventory is a home **inventory & grocery system** that runs inside Home Assistant. It
lets you track what you own, where it is stored, how much you have, and what you need to
buy — driven either by barcode scanning or manual entry. The interface is fully
multi-language (English / Nederlands out of the box).

> **Audience:** end users of the dashboard. For installation, see `INSTALLATION.md`.

---

## 1. Core concepts

| Concept | Meaning |
|---|---|
| **Product** | A catalogue item (name, barcode, manufacturer, unit, category, store, auto-add settings). Defined once, reused everywhere. |
| **Inventory (Stock)** | How many of a product you currently have, at a **location**. |
| **Location** | Where stock is stored (e.g. *Pantry*, *Garage freezer*). |
| **Category** | A grouping for products (e.g. *Coffee*, *Cleaning*). |
| **Store** | Where you usually buy a product (e.g. *Jumbo*, *Kruidvat*). |
| **Shopping list** | Items you need to buy. Populated manually or automatically. |
| **Scan queue** | A staging area for scanned barcodes awaiting resolution into products. |
| **History** | An audit log of every add/edit/delete action. |

**Auto-Add** is the link between stock and the shopping list: when a product is enabled
for auto-add and its stock drops to/under its **threshold**, the product can be placed on
the shopping list at its configured **quantity**.

---

## 2. The dashboard at a glance

The dashboard lives at `/vh-inventory/main` and is organised as a row of tabs. Each tab has
an **Add** button (opens a pop-up), a data table, and per-row **Edit** / **Delete**
controls.

![Scan tab](images/01-scan.png)

The tabs, left to right:

| Tab | Purpose |
|---|---|
| **Scan** | Scan or type barcodes; Add/Use flow; resolve unknown items. |
| **Shopping list** | Items to buy; print to a thermal receipt printer (grouped per store). |
| **Quick add** | One-tap toggle of any product on/off the shopping list. |
| **Inventory** | Current stock per product, category and location; filter and print by category. |
| **Products** | The product catalogue. |
| **Locations** | Storage locations. |
| **Categories** | Product categories. |
| **Stores** | Shops. |
| **History** | Audit log of all changes. |
| **Setup** | App settings: language selector and the *Show ID columns* toggle. |

---

## 3. Setting up your reference data

Before scanning or tracking stock, create the building blocks. Order doesn't strictly
matter, but **Locations**, **Categories** and **Stores** are useful first because products
reference them.

### Locations

Open the **Locations** tab, press **Add**, type the location name, and save.

![Locations tab](images/05-locations.png)

### Categories

Open the **Categories** tab, press **Add**, type the category name, and save.

![Categories tab](images/06-categories.png)

### Stores

Open the **Stores** tab, press **Add**, type the store name, and save.

![Stores tab](images/07-stores.png)

> Newly added locations, categories and stores become immediately available in the
> dropdowns used by products and inventory (the inline pickers refresh on open).

---

## 4. Products

The **Products** tab is your catalogue. Each product carries a name, barcode,
manufacturer, unit, category, store, and its auto-add settings.

![Products tab](images/04-products.png)

### Adding a product manually

Press **Add** to open the **Add Product** pop-up and fill in the fields:

![Add Product pop-up](images/10-add-product-popup.png)

| Field | Notes |
|---|---|
| **Name** | Required. |
| **Barcode** | Optional; numeric. Used to match future scans. |
| **Manufacturer / Unit / Description** | Optional descriptive fields. |
| **Category / Store** | Pick from your reference lists (or `(none)`). |
| **Auto-Add Enabled** | Turn on automatic shopping-list top-up. |
| **Auto-Add Threshold** | Stock level at/under which the item is needed. |
| **Auto-Add Quantity** | How many to put on the shopping list. |

Press **Save** to store the product (the pop-up closes automatically). Use **Cancel** to
discard.

### Editing / deleting a product

Each row has an **Edit** (pencil) and **Delete** (trash) control. Editing opens a pre-filled
pop-up. Deleting a product also removes its related **inventory** and **shopping-list**
rows (cascade delete).

---

## 5. Tracking stock (Inventory)

The **Inventory** tab shows how much of each product you have, its category, and where it
is stored.

![Inventory tab](images/03-inventory.png)

- Press **Add product to inventory** to record stock: pick a product, a location, and a
  quantity.
- Each row shows the product's **Category** (read-only here — set it on the Products tab)
  and its **Location**, which you can change inline.
- Quick **+ / –** controls adjust quantity.
- Stock changes feed the auto-add logic and are written to **History**.

### Filtering and printing by category

Next to the *Add product to inventory* button are a **printer** icon and a **category
dropdown**:

- Pick a category from the dropdown to **filter the table** to just that category's
  products. Leave it on **All** to show everything.
- Press the **printer icon** to print the inventory to the thermal printer. The printout is
  grouped by category; if a specific category is selected it prints only that one, otherwise
  it prints every category.

---

## 5a. Quick add

The **Quick add** tab is the fastest way to build a shopping list. Every product is shown as
a button:

![Quick add tab](images/12-quick-add.png)

- **Blue** button — the product is *not* on the shopping list.
- **Green** button — the product is already on the shopping list.

Tapping a button toggles the product on/off the list, and the colour updates immediately.
Use the search box to narrow the buttons by name.

---

## 6. The shopping list

The **Shopping list** tab holds what you need to buy.

![Shopping list tab](images/02-shopping.png)

- Add items manually with **Add product to shoppinglist** (pick a product and quantity), use
  the **Quick add** tab, or let **Auto-Add** populate it when stock runs low.
- Adjust quantities with **+ / –**, edit, or delete rows.
- When the shopping list contains items, the cart icon is highlighted (styling cue).

### Printing the shopping list

Press **Print** to send the list to the connected **Epson TM-T20II** (ESC/POS) thermal
printer. The receipt is organised **per store**: each store from the Stores tab prints as a
header followed by its items, and a final **Algemeen** section lists everything with no store
assigned (or set to *All*). Add or rename stores on the Stores tab and the next printout
reflects the change automatically.

---

## 7. Scanning workflow

The **Scan** tab is the fastest way to update inventory using a barcode scanner (or by
typing a barcode). When you open the Scan tab, the cursor automatically lands in the
**Barcode** field so you can scan straight away.

![Scan tab](images/01-scan.png)

### Add vs. Use

After entering a barcode, choose an action:

- **Add** — you are *putting an item in* (bought/restocked). Increases stock.
- **Use** — you are *consuming an item*. Decreases stock and, for items that run out, can
  add them to the shopping list.

Each scan creates a row in the **Scan Queue** with a **State**:

| State | Meaning |
|---|---|
| **Exist** | The barcode matches a product already in your catalogue. The action is applied directly. |
| **New / Lookup** | The barcode was resolved online (Open Food Facts / UPC Item DB) and pre-filled details are available to create the product. |
| **Unknown** | The barcode could not be resolved online. You resolve it manually (see below). |
| **Manual** | Reserved for manual handling. |

The **Source** column shows which provider resolved the item; the **Resolve** column offers
an action to (re)resolve a row.

### Resolving an Unknown barcode

When a scan can't be resolved automatically, its row shows the **Unknown** state with a
**Resolve** (wrench) action. Pressing it opens a product pop-up pre-filled with the
unresolvable barcode. Enter the product details and save:

- If the original action was **Add**, the new product is created and stocked
  (quantity 1).
- If the original action was **Use**, the product is created with stock 0 and added to the
  shopping list (at its auto-add quantity).

The scan-queue row is removed once resolved. Completed scans are cleared automatically.

---

## 8. History (audit log)

Every add, edit, and delete is recorded on the **History** tab with a timestamp, the
action, the affected entity, its id, and a detail string. Use it to trace what changed and
when.

![History tab](images/08-history.png)

---

## 9. Settings & language (Setup tab)

The **Setup** tab holds application settings: the **Language** selector and a **Show ID
columns** toggle.

![Setup tab](images/09-setup.png)

### Show ID columns

Off by default. Turn it on to reveal the database **ID** column on every table (useful for
troubleshooting or cross-referencing); toggling it updates all tables instantly.

### Switching language

Pick a language from the **Language** dropdown. The entire interface — tabs, table titles,
column headers, pop-up titles, buttons, and field labels — switches **instantly**. Your
data (product names, locations, categories, etc.) is never translated.

Here is the **Products** tab with the language set to **Nederlands**:

![Products tab in Dutch](images/11-products-dutch.png)

Notice that the chrome is translated (*Producten, Naam, Fabrikant, Eenheid, Categorie,
Winkel, Bewerk, Verw., Toevoegen*) while the product data stays exactly as entered.

> **Adding more languages:** drop a new `translations/<code>.json` file, add its display
> name to the language selector, and rebuild the dashboard. See the Installation Guide,
> section 10.

---

## 10. Tips & behaviours

- **Autofocus:** selecting the Scan tab focuses the Barcode field automatically — no extra
  click needed before scanning.
- **Quick add colours:** blue = not on the shopping list, green = on it; tap to toggle.
- **Printing:** the shopping list prints grouped per store; the inventory prints grouped per
  category (filtered to the selected category, or all). Both use the ESC/POS thermal printer.
- **Pop-ups close on Save:** Add/Edit dialogs close themselves after a successful save.
- **Cascade delete:** deleting a product cleans up its inventory and shopping-list rows.
- **Duplicate-name guard:** locations, categories and stores must be unique.
- **Self-healing data model:** the database and any new columns are created automatically;
  you never run SQL by hand.

---

## 11. Data model (reference)

| Table | Key columns |
|---|---|
| `products` | name, barcode, manufacturer, unit, auto_add_enabled, auto_add_threshold, auto_add_quantity, category_id → categories, store_id → stores |
| `inventory` | product_id → products, location_id → locations, quantity |
| `shopping_list` | product_id → products, quantity |
| `locations` | location (unique) |
| `categories` | category (unique) |
| `stores` | store (unique) |
| `scanqueue` | barcode, action (Add/Use), state (New/Lookup/Unknown/Manual/Exist), name, manufacturer, description, unit, category, image_url, provider |
| `history` | timestamp, action, entity, entity_id, detail |

Each table is published to a matching `sensor.vh_inventory_*` entity that the dashboard
reads.
