# Keuken Touchscreen

Workstreams: general

This dashboard is for a separate 1920 x 1080 landscape touchscreen running Home
Assistant in a browser. Page one handles barcode scanning with a USB or Bluetooth
scanner that acts as a keyboard. It is separate from the existing `/vh-inventory`
dashboard. Its name is **Keuken Touchscreen**, with URL path
`/keuken-touchscreen/scan`. **Scannen**, **Boodschappenlijst**, and **Voorraad** share one
stationary bottom bar, highlighting the active page without a separate black
Home Assistant tab strip. The buttons stay in the same position on all three pages;
long lists scroll in the content area above them without covering any items.
All navigation buttons have the same fixed 68px height, regardless of the active page.
The shopping-list deep link is `/keuken-touchscreen/scan#shopping`; update older
bookmarks that used `/keuken-touchscreen/shopping`.
The inventory deep link is `/keuken-touchscreen/scan#inventory`.
A separate offline preview remains available for review.

Installed in production on 2026-10-19 as a new sidebar dashboard. The existing
inventory dashboard was not changed. The live page, logo, backend connection,
and scan-ready state were verified without submitting a barcode or changing stock.
No backend update or Home Assistant restart was needed.
Read-only Opzoeken was added the same day and verified with known and unknown
barcodes in production. Product, inventory, shopping-list, scan-queue, and history
data were unchanged after both lookups.
Editable details were added afterward with a scoped backend reload. The approved
production Save check temporarily changed one product's unit and restored it.
Stock and shopping quantities stayed unchanged; two normal history entries record
the saves.

## Local review

From the repository root, run:

```powershell
python build_touchscreen.py
Invoke-Item .copilot\touchscreen\preview.html
```

The preview is one HTML file with synthetic products and an in-memory inventory.
It does not contact Home Assistant, use credentials, or change real inventory.
Reloading the page resets the demo. The buttons in the demo strip simulate scans;
they are not part of the Home Assistant dashboard.
The bottom **Scannen**, **Boodschappenlijst**, and **Voorraad** buttons switch between the
pages in both the preview and production. The sample shopping list includes two catalogue products and one
ad-hoc item; changes affect only the in-memory demo data.

Use either of these demo barcodes, followed by Enter:

| Barcode | Demo product | Starting stock |
|---|---|---|
| `2000000000015` | Voorbeeld havermelk | 3 |
| `2000000000022` | Voorbeeld volkoren pasta | 2 |

Select **Toevoegen** to add one item per scan, or **Gebruiken** to use one.
Select **Opzoeken** to read a product without making any changes.
An unknown barcode clears the previous product details and shows a warning.
The demo does not reproduce online lookups, AI matching, announcements, or all
production shopping-list rules.

The preview follows the browser's light/dark preference. To select a theme
explicitly, append `?scoutTheme=dark` or `?scoutTheme=light` to its URL.
The generated Home Assistant card defaults to dark with Dutch labels.

## Page layout

The top of the page has Toevoegen, Gebruiken, and Opzoeken mode buttons.
The scan-status badge is hidden during normal idle use. It appears only while
processing, editing/saving details, or when an error requires attention.
The supplied Van Hemert Home Automation logo appears beside the page title,
within the existing header height. The high-resolution image in
`www\van-hemert-logo-hi.png` has a transparent background and is embedded in the
local preview. The supplied original image is unchanged.
The left panel contains the barcode input and scan feedback. The right panel
shows the last product's name, description, barcode, manufacturer, category,
store, unit, stock locations, total stock, and shopping-list quantity.

The mode belongs to this card instance. Changing it does not change the MQTT
handheld mode, the ESPHome scanner modes, or the existing dashboard. Reloading or
recreating the card resets the mode to **Opzoeken**, so opening the page cannot
accidentally add or use stock. Select **Toevoegen** or **Gebruiken** explicitly
when you want to change stock.
The last result is a snapshot after the scan or lookup, not a continuously updating stock
monitor.

All three pages run inside one full-width Lovelace view using
`custom:vh-inventory-touchscreen-dashboard`. The existing scan and shopping cards
are retained while switching pages, preserving the last scanned product and current
scan mode. The hidden scan page does not capture scanner input or steal focus.
The wrapper fills the viewport below the Home Assistant header and reserves a
separate bottom row for navigation. Only the content above that row scrolls,
including long shopping lists. The last item remains reachable above the bar.
None of the pages shows the decorative footer text, waiting-scan counter, or
page-switching hint. Scan processing and error/recovery feedback remain unchanged.
Unsaved product/inventory edits, pending scans, and active save/shopping/inventory actions block page
switching. Save or discard edits before using the other page. Returning to Scannen
focuses the barcode input when scanning is allowed. Home Assistant's normal menu/header
remains available; no global kiosk setting or theme override is used.

The main layout is designed for 1920 x 1080 at 100% browser zoom. It stacks on
narrower screens and allows scrolling rather than clipping long product data.
Home Assistant's normal header remains available. Browser fullscreen and hiding
the Home Assistant header are separate choices for the eventual kiosk setup.

## Scanner setup and behavior

For a read-only lookup, select **Opzoeken**, then type or scan a barcode and press
Enter, or tap the **Opzoeken** button beside the field. The page searches only the
existing product catalogue and shows the product details, total stock, locations,
and shopping-list quantity. Leading zeroes are accepted.

Lookup does not call an inventory service, run an online product resolver, create
a product, add a scan-queue row, or change inventory or shopping-list entries.
A barcode absent from the catalogue shows **Product niet gevonden** with an
explicit message that nothing changed. A failed lookup can be retried without
the stock-confirmation step used for uncertain Add/Use results.

Configure the scanner as a USB HID keyboard or Bluetooth HID keyboard, with
**Enter/CR as the suffix** and no prefix. Serial-port scanners and scanners
publishing MQTT are not the input source for this page.

The barcode field receives focus when the card opens and after pressing a mode
button or submitting a scan. Tap it if the indicator asks you to. Numeric scanner
input can recover focus when no other field or dialog is active. The card does
not capture typing in other input fields, dialogs, hidden views, or card-editor
previews.

The first version accepts 1 to 15 numeric digits, including leading zeroes.
This covers UPC, EAN and GTIN grocery barcodes. Longer or alphanumeric codes are
rejected before calling the backend. The limit also avoids losing precision when
reading the existing numeric product barcodes from Home Assistant's JSON states.

Scans are processed one at a time. Scanning the same barcode twice counts as two
items; scans are not debounced. Each buffered scan keeps the mode selected when
it was entered, even if the mode changes before it is processed. Up to 20 scans
can wait behind the current scan. An additional scan is rejected with a message.
Leaving the page discards unsent scans; an already submitted scan can still
finish.

In Toevoegen or Gebruiken mode, if a service call or result refresh fails, the
outcome may be uncertain. The page
stops accepting scans and discards unsent buffered scans. Check the real inventory
in the main dashboard, then press **Voorraad gecontroleerd, verder scannen**.
There is no automatic retry because a failed connection can occur after stock
has already changed.

## Editing product details

After a scan or lookup finds an existing product, edit **Fabrikant** and **Eenheid**
as text. **Categorie**, **Winkel**, and **Locatie** use the existing reference lists,
including a **Niet toegewezen** option. Unknown barcodes cannot be edited into new
products from this panel.

**Opslaan** appears at the bottom-right of the details panel only while at least
one value differs from its original value. Nothing is saved automatically.
Reverting all edits hides the button. **Wijzigingen verwerpen** restores the original
values without a service call. New scans, mode changes, and in-page navigation are paused until edits
are saved or discarded. Ordinary Home Assistant state updates preserve draft values
and typing focus. Save or discard before navigating away; drafts are not persistent
across dashboard recreation. Browser refresh/close requests a confirmation when
the browser supports unsaved-change warnings.

A location change moves **all existing stock** to the selected location, merging
multiple stock rows while preserving their total quantity. It does not change the
shopping list or create a default location for future scans. At zero stock, the
location dropdown is disabled; the other product fields remain editable. Multiple
current locations are displayed until a single destination is selected.

An explicit save uses one SQLite transaction for the edited fields, stock relocation,
and history entry. Barcode, name, description, automatic-shopping settings, and other
unedited fields are untouched. Deleted references and concurrent changes to edited
fields or stock locations are rejected rather than overwritten. Concurrent stock
quantity changes are preserved. The UI reads back the result before reporting success.
Failed or unverified saves retain the draft and show an error; check the product,
discard the draft, and look it up again before retrying.

**Opzoeken itself remains read-only.** Pressing **Opslaan** is a separate, explicit
write action. It changes product details and possibly stock locations, never total
stock or shopping-list quantities.

## Boodschappenlijst page

The page title appears once in the header. The list panel has no repeated title,
article count, or introductory explanation. It uses compact top padding and
reserves no space for an empty status message. It displays the existing shopping
list with product name, category, store, and quantity. It joins catalogue products by product ID and keeps ad-hoc
items visible without requiring a catalogue record. Rows are sorted by product
name; missing category/store values show **Niet toegewezen**. Ad-hoc items show
**Ad-hocartikel** in the category column.

Use the large **- / +** buttons to decrease or increase a row by one. Changes are
saved immediately to the shopping list using the existing
`pyscript.vh_inventory_adjust_shopping` service. **Verwijderen** opens an inline
confirmation for that exact shopping row. Decreasing a quantity of one also asks
for confirmation, because it would remove the item. **Annuleren** makes no change;
**Verwijderen bevestigen** calls `pyscript.vh_inventory_delete` with
`table: shopping_list` and the row ID. These actions never add to or consume stock.

The page follows live Home Assistant sensor updates. **Boodschappenlijst vernieuwen**
is hidden during normal use and appears only for unavailable data, a lost
connection, or recovery after a failed/unverified change. It explicitly reads the
list again and disappears after successful recovery. While disconnected or
refreshing, the button is disabled. An empty list has its own message; unavailable
or malformed sensor data is shown as an error, not as an empty list. Offline and
card-editor previews cannot make changes. Controls are temporarily disabled while
an action is in flight, so repeated taps are not queued.

Each action reads back the result before reporting success. If a write or readback
fails, the page does not automatically retry: the change may already have been
applied. Mutation controls stay disabled until an explicit successful refresh.
Review the refreshed quantity before trying again. Concurrent edits from another
dashboard/scanner use the existing service behavior; a mismatched readback is
reported as uncertain rather than as a successful update.

This page needs no backend update or extra credentials. It uses the existing
Home Assistant session and service permissions. Its explicit changes affect the
same shared shopping list shown on other dashboards.

## Voorraad page

**Voorraad** shows every stock row with quantity **1 or higher**, with Product,
Categorie, Winkel, Locatie, Aantal and actions. Winkel displays the catalogue
product's assigned store, or Niet toegewezen when no store is assigned. Its
dropdown updates the product's store everywhere. Like the main dashboard's Inventory tab,
stock is shown per location, not collapsed into a single total per product.
Aantal is centered above the quantity, and Actie above the combined edit/remove controls.
The editor uses matching dropdown/input colors. Opslaan and Afbreken share one
horizontal action row with equal-height buttons, including on narrow screens.
Products without positive stock remain in the catalogue and the Add selector,
but do not appear in this overview.

The search field at the top filters immediately by partial product name or
barcode, ignoring case and accents. **Wissen** clears the text search.
The category selector supports all categories and unassigned products. Both
filters are local to this touchscreen card and survive page switches; they do
not write to the main dashboard's search/category helpers. Live sensor updates
refresh the overview without resetting filters or unsaved editor values.

The user-approved full inventory controls use the following backend services:

| Control | Behavior and existing service |
|---|---|
| **- / +** | Adjust this stock row by one using `vh_inventory_adjust_stock`. Removing the last unit needs confirmation. |
| **Categorie** | Immediately updates the linked product via `vh_inventory_set_stock_field`, affecting its category everywhere. |
| **Winkel** | Immediately updates the linked product via `vh_inventory_set_product_field` with `field: store`, affecting every location of that product. Niet toegewezen clears the assignment. |
| **Locatie** | Immediately moves this row via `vh_inventory_set_stock_field`. If the destination already contains that product, quantities merge without changing total stock. |
| **Product aan voorraad toevoegen** | Opens an explicit-save form for catalogue product, location and quantity. `vh_inventory_add_stock` creates a row or adds to the existing product/location quantity. |
| **Bewerk** | Opens an explicit-save form for the selected stock row and its linked product. Product is a free-text name, not a product selector. `vh_inventory_save_stock_details` patches only changed fields by the existing product and stock-row IDs in one SQLite transaction. Opslaan saves; Afbreken discards. Unrelated settings, IDs, stock at other locations and existing links remain untouched. |
| **Verwijderen** | Requires confirmation, then deletes only this stock row using `vh_inventory_delete` with `table: stock`. The catalogue product remains. Setting quantity to zero in the editor also needs confirmation. |
| **Volledige voorraad afdrukken** | Calls the existing `script.vh_print_inventory`. Prints the full positive-stock overview grouped by category, irrespective of the on-screen search/category filters. |

Stock edits use the same shopping-list reconciliation and history behavior as the
main dashboard, so changes can also affect automatic shopping-list entries.
The quantity editor accepts whole numbers up to 99999. Barcodes are empty or
1-15 digits. References must exist and names used by the name-based backend
services must be unambiguous. To avoid duplicate stock rows, the full editor
rejects a destination already occupied by the same product. Use the inline
location dropdown to merge rows, or adjust the destination row instead.

The edit form uses this two-column order, stacking in the same reading order on
narrow screens:

| Row | Left | Right |
|---|---|---|
| 1 | Barcode | Product |
| 2 | Fabrikant | Winkel |
| 3 | Categorie | Eenheid |
| 4 | Locatie | Aantal |

Barcode, Product, Fabrikant, Winkel, Categorie and Eenheid update the existing
`products` record. Locatie and Aantal update only the selected `stock` row.
Renaming never creates or selects a different product. Product IDs, stock-row IDs,
foreign-key relationships and the database/table structure do not change.
The [database reference](PRODUCT-MANUAL.md#11-data-model-reference) includes every
table/column and an embedded relationship diagram. Product references, stock
locations and optional ad-hoc shopping links remain the same on both dashboards.
Product names must be nonempty and at most 255 characters; duplicate names and
barcodes belonging to another product are rejected. Add Inventory still selects
an existing catalogue product, as before.

Writes are serialized, never automatically retried, and checked with fresh sensor
data before and after each operation. Stale rows or product metadata block a save.
Full edits validate original values again inside a `BEGIN IMMEDIATE` transaction,
then update product fields, the selected stock fields and history atomically.
They never update `stock.product_id` or insert a new product. Existing inline
adjustment/location/category/store services retain their original behavior and
cannot eliminate races between clients. Shopping reconciliation and sensor
publication follow the committed edit; a failed response or unverified operation
still blocks further writes and retains the editor. Discard the
draft, explicitly refresh, and review both stock and shopping before retrying.
**Voorraad vernieuwen** appears only for errors/recovery, not normal use.

The existing print script provides no physical-printer acknowledgement. The UI
reports that the request was sent, not that printing succeeded. Failed print
requests are not retried automatically; check the printer before another request.
Production verification uses navigation, filtering and unsaved edit/discard only.
Stock writes and printing are exercised against the synthetic demo unless the
user separately agrees to a live test.

## Home Assistant installation

These steps install or reproduce the dedicated dashboard. The local builder does
not execute them and does not connect to Home Assistant.

1. Install the current `pyscript\apps\vh_inventory\__init__.py` backend and reload
   the VH Inventory pyscript app. The editing feature requires
   `pyscript.vh_inventory_save_product_details` for scanner details and
   `pyscript.vh_inventory_save_stock_details` for the ID-based inventory editor.
   Older backends remain usable for scanning and lookup, but unsupported editing
   controls stay disabled. This update does not change the database schema.
2. Copy `www\vh-inventory-touchscreen.js` to the Home Assistant file
   `/config/www/vh-inventory-touchscreen.js`, and `www\van-hemert-logo-hi.png` to
   `/config/www/van-hemert-logo-hi.png`.
3. Register `/local/vh-inventory-touchscreen.js?v=20261019-inventory-id-editor1` as a **JavaScript module**
   dashboard resource. Increment the version when replacing the file.
4. Create a new, empty, user-managed dashboard named **Keuken Touchscreen**
   with URL path **keuken-touchscreen**. Do not select the current inventory
   dashboard.
5. In the new dashboard's raw configuration editor, paste the generated
   `.copilot\touchscreen\dashboard.json`. JSON is valid YAML. Save only this new
   dashboard.
6. Open `/keuken-touchscreen/scan`, `/keuken-touchscreen/scan#shopping`, or
   `/keuken-touchscreen/scan#inventory` while signed in
   to Home Assistant. The generated dashboard contains one full-width panel view
   with all three pages and integrated navigation. A
   test scan in Toevoegen or Gebruiken mode changes real stock; agree on a test
   product first. Opzoeken is read-only.

When updating an existing installation, update the dedicated resource's URL rather
than adding a duplicate. Reload the dashboard page to load the new card code.
When updating the earlier two-view touchscreen dashboard, preserve the scan view
and its card settings, change the card type to
`custom:vh-inventory-touchscreen-dashboard`, and update its translation maps.
Remove only the old dedicated shopping view from Keuken Touchscreen, because the
wrapper now contains the pages. Do not replace the main `/vh-inventory` dashboard.
When adding Voorraad to the single-view installation, preserve card settings and
update the card's translation maps as well as the module resource.

Scanning uses `pyscript.vh_inventory_scan_enqueue`; explicit product saves use
`pyscript.vh_inventory_save_product_details`. Shopping quantities/removal use the
existing adjust/delete services described above. The card reads the existing products,
stock, shopping, scan-queue, categories, stores, and locations sensors. Editing
requires the backend update above, but no database-schema change, new helpers,
Home Assistant restart, or extra HACS cards.
The generated configuration uses Home Assistant's full-width panel view.

To change the labels to English, set the card's `language` to `en`. To select the
light theme, set `theme` to `light`. Strings are maintained in the existing
`translations\en.json` and `translations\nl.json` files. Rebuild after changing
translations.

**Existing Add/Use scan behavior still applies.** Unknown products use the backend's
online resolver, Use mode can add products to the shopping list, and configured
announcements can play. This page does not yet implement touchscreen Yes/No
dialogs for similarity, Ad-Hoc matching, or alternative-stock prompts. Because
these are normal dashboard scans without an ESPHome device ID, those backend
prompts still use the existing fallback scanner. Review that behavior before
using the touchscreen as a replacement for the physical scanners.

## Security and isolation

The installed card uses the current Home Assistant session and its permissions.
Do not put access tokens in the card or preview. No extra server, external script,
CDN, or network port is needed for deployment. Product fields are rendered as
text, not HTML. Use an appropriately restricted Home Assistant account for an
unattended screen.
Home Assistant's `/local` static files are not secret storage; only the frontend
code and logo are installed there.

To remove this dashboard later, delete only the new dashboard and its dedicated
resource/file. Do not remove the shared backend, sensors, or existing dashboard.

## Development checks

```powershell
node --check www\vh-inventory-touchscreen.js
node --test tests\touchscreen.test.cjs
python -m unittest discover -s tests -p test_touchscreen_details.py
python build_touchscreen.py
```

The tests use mocked Home Assistant calls and do not need a server connection.
Lookup tests assert that no service is called for found, unknown, invalid, or
failed lookups, including mixed queued Add/Lookup/Use requests.
Editing checks cover draft retention, conditional saving, explicit dirty-field
patches, failed-save handling, zero stock, and live dropdown lists. SQLite tests
use temporary synthetic databases to check atomic rollback, location merging,
quantity preservation, and concurrent-edit protection without touching household data.
Shopping tests cover catalogue joins, ad-hoc entries, empty/unavailable data, row-ID
updates, removal confirmations, repeated-tap blocking, live updates and uncertain
outcomes. Browser checks use synthetic data for quantity changes and deletion;
production list changes require a separately agreed test.
Inventory checks cover positive-stock filtering per location, accent-insensitive
name/barcode search, local category filters, full add/edit/delete and inline
category/location changes, location merges, stale drafts, partial saves, recovery,
quantity/barcode validation, and print requests without physical-print claims.
Navigation checks cover page highlighting, retained product state, draft/in-flight
guards, shopping/inventory deep links, restored barcode focus, and inactive-scanner behavior.
Before deployment, review the local page at 1920 x 1080, try both modes, scan the
same product twice, and check unknown-barcode feedback. Physical USB/Bluetooth
scanner testing still needs the target hardware. Production rendering and
connection checks do not replace an end-to-end test with an agreed test product.

References: [Home Assistant custom cards](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/),
[custom resources](https://contributors.home-assistant.io/frontend/custom-ui/resources/),
[panel views](https://www.home-assistant.io/dashboards/panel/), and
[WebSocket API](https://developers.home-assistant.io/docs/api/websocket/).
