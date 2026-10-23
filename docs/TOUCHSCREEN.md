# Keuken Touchscreen

Workstreams: general

**ThinkSmart Hub 500 LED ring:** optional native Windows scripts control the
device's physical ring and expose green/red/white/off through Home Assistant MQTT
discovery. See the [LED setup and Word guide](../hardware/ThinkSmart-Hub-500-LED/README.md).
This is separate from the kitchen Ledstrip controls and does not add dashboard
buttons or inventory automations.

This dashboard is for a separate 1920 x 1080 landscape touchscreen running Home
Assistant in a browser. Page one handles barcode scanning with a USB or Bluetooth
scanner that acts as a keyboard. It is separate from the existing `/vh-inventory`
dashboard. Its name is **Keuken Touchscreen**, with URL path
`/keuken-touchscreen/scan`. A pink **mdi:menu** hamburger button at the top right
opens **Boodschappenlijst en voorraad**, **Recepten**, **Keuken**,
**Boodschappenlijst**, **Snelle Boodschappen**, **Snelle Voorraad**,
**Configuratie**, and **Onderhoud**, in that order.
The Keuken page heading is **Keuken - Verlichting en muziek**; its menu label
remains **Keuken**. Existing hashes and the default scan page are unchanged.
Four icon-only shortcuts sit immediately left of the hamburger, in this order:
**Home**, **Recepten**, **Verlichting**, **Boodschappenlijst**. Home returns to
**Boodschappenlijst en voorraad**, the combined scan page. Verlichting opens the kitchen
view without changing any lights or music. Boodschappenlijst opens the shopping
list, not the combined scan page. All five glyphs are 74.8px, exactly 70% larger
than the previous 44px hamburger, in equal 104px buttons with accessible labels.
They use the same pending-scan, shopping-choice and unsaved-edit navigation guards.
The recipe shortcut also returns from cook mode to the recipe list.
Selected shortcut icons are black on solid pink in both themes, including hover.
The recipe shortcut uses an outlined open book with visible page lines, not a solid silhouette.
Narrow layouts reserve space above page headings; at widths up to 600px the
buttons wrap into three rows without shrinking the icons or covering content.
Expand **Onderhoud** for **Voorraad**, **Producten**, **Locaties**, **Categorieën**
and **Winkels**. All twelve pages share this menu. There is no bottom navigation
bar or replacement toolbar; page content uses the recovered height.
The active page is highlighted in the menu. Page content and long menu lists
scroll independently. Vertical scrollbar indicators are hidden; wide tables
retain horizontal scrolling. Menu buttons have at least 56px touch targets.
The shopping-list deep link is `/keuken-touchscreen/scan#shopping`; update older
bookmarks that used `/keuken-touchscreen/shopping`.
The inventory deep link is `/keuken-touchscreen/scan#inventory`.
The quick-shopping deep link is `/keuken-touchscreen/scan#quick-shopping`.
The quick-stock deep link is `/keuken-touchscreen/scan#quick-stock`.
The kitchen-controls deep link is `/keuken-touchscreen/scan#kitchen`.
Management deep links use `#products`, `#locations`, `#categories`, and `#stores`
after `/keuken-touchscreen/scan`.
Configuration opens at `/keuken-touchscreen/scan#configuration`.
A separate offline preview remains available for review.

**Current backend: `20261023-alt-stock-batch1`; frontend: `20261023-home-shortcut1`.**
The backend correction replaces unsupported Pyscript generator-based history
logging and collects all touchscreen equivalents in one AI request. It does not
retry or undo a scan that already deducted stock. A failed scan can therefore
still require checking stock and shopping before continuing.
The scan card opts into the same configured semantic matcher and policy used by
ESPHome scanners. When a Use action would add the scanned product to shopping
and equivalent products remain in stock, the right-hand card lists their names
and quantities at scan time. It shows **Zet op de boodschappen lijst** and
**Niet op de boodschappen lijst zetten**. Consumption is already recorded once;
neither button consumes stock again. Yes adds the original scanned product at
its configured shopping quantity, not the alternative. No does not add or remove
shopping entries. An entry added by another client is never removed by No.
After the choice, the card explicitly reports whether the product was added,
shows the already-updated stock, and returns to news after ten seconds.

The configured auto-add threshold is preserved, not replaced by a zero-stock rule.
For threshold 2, both 2 to 1 and 1 to 0 can offer the choice while the product is
not already listed. Choose No at stock 1 to keep it off shopping; consuming the
last unit can then offer the choice again. Choosing Yes at stock 1 means it is
already listed, so the next consumption does not add it or prompt again.
Houdbare Magere Melk (PLUS) and Houdbare Magere Melk (JUMBO) are eligible brand-only
equivalents under the existing policy. The installed predecessor matched this
pair at 100% confidence in approximately 1.8 to 3.1 seconds per AI call.
The semantic check still takes time, but all touchscreen equivalents are now
selected in one request instead of repeated requests for successive matches.
Actual delay still depends on the configured agent.

The user selected the existing equivalence policy: brand and shelf-life differences
can match; milk-type differences do not. Halfvolle melk Houdbaar can match
Halfvolle melk; Magere melk is not an equivalent under the AI policy.
The touchscreen also rejects explicitly conflicting magere, halfvolle and volle
variants before both AI matching and the configured fallback. A permissive AI
answer cannot override this safeguard. Unknown variants still need the semantic
matcher; matching brands or words alone does not establish equivalence.
This is not a new frontend string comparison. The same configured AI matcher
returns all equivalents in one response, using the existing policy and counters.
Confidence in this batch response describes the complete selection. Candidate
names are validated against the offered list; invalid responses explicitly use
the existing degraded/error fallback. A valid empty selection remains authoritative.
It uses the existing AI toggle/agent/policy, usage counters, degraded notifications
and configured lexical fallback when AI is disabled or fails. Semantic matching
therefore requires the existing AI feature to be enabled and healthy. No new
external service or matching policy is configured.

Only positive stock for other product IDs is eligible. Normal auto-add settings,
already-listed products, no-match behavior, multi-location selection and Bijna op
acknowledgement remain unchanged. Existing empty-stock Use actions can also offer
equivalents without inventing a decrement. The scanner card and confirmed
name-search Use actions share the flow. Touchscreen Add does not schedule a
physical-scanner similarity popup. Bijna op, Quick Inventory and inventory
quantity edits/deletions use normal auto-add rules without deferring shopping
to a physical scanner. The inventory adjustment/delete requests explicitly send
`check_alternatives: false`; the dedicated touchscreen stock editor also opts out.
Physical-origin ESPHome scans and shared-service callers that omit this flag
retain their existing behavior. Touchscreen actions do not change ESPHome
popup/context entities or dismiss a scanner's own pending question.

Pending choices do not expire. Barcode input, mode/page changes and further scans
pause until a choice is made; already buffered but unsent scans are visibly
discarded. Fresh snapshots and atomic checks protect the shopping-only decision.
If stock changed, review the updated quantity and choose again; consumption is
not repeated. Uncertain writes block further actions and are never retried.
Refreshing or leaving the application does not undo the recorded consumption
and never implicitly adds shopping; the browser warns about the unresolved choice.

The new response-only `vh_inventory_touchscreen_shopping_decision` service must be
available before the scan card accepts Use. Deploy backend, frontend and updated
translations together only with approval and a verified rollback. There is no
schema, news-worker or original-dashboard change. The offline demo exposes
**Demo: melk verbruiken** to seed and scan the explicitly synthetic milk example.
Its fixed match result does not call an AI service.

**Previous release:** `20261023-news-kiosk1` removes the full-story control.
HA-WinKiosk opens new-tab links in external Edge windows rather than inside the
kiosk. NOS and Omroep Brabant block embedded original articles, so news stays
inside the card as a short RSS preview with **Terug naar de koppen** only.
No news anchor, iframe or external-window action remains. Scanner priority,
card alignment, refresh/caching and the news worker are unchanged.
This is a frontend-only update; no configuration or backend reload is needed.

Each headline is a touch/keyboard button that opens a short, plain-text RSS
preview in the same card, with **Terug naar de koppen** as its only action.
No publisher request is made to read a preview. Original articles are not
embedded, proxied or opened in another window. Optional publisher URL metadata
remains in the worker output for compatibility but is not used by this frontend.
The selected preview stays open through feed refreshes and temporary scanner
results; Back returns to the latest headlines. Product details retain priority.
Card sizing/internal scrolling are unchanged.

The preceding `20261023-idle-news1` shows six real Dutch news headlines,
two each from NOS, NU.nl and Omroep Brabant, when product details are idle.
News and every product-details/registration card share the bottom edge of the
visible left-hand controls on desktop. In Toevoegen this is Scan je product,
because name search is hidden. Long content scrolls inside the right-hand card;
actions remain accessible. Narrow screens retain natural stacked scrolling.
The independent `pyscript/vh_touchscreen_news.py` worker refreshes public RSS
every 15 minutes. It does not import, reload or write to inventory.
Failed sources are named and their cached headlines are labelled; an absent,
invalid or unavailable sensor never blocks scanning.

The preceding `20261023-page-margins1` removes the obsolete left-hand menu
gutter from the scan view. All twelve pages and recipe cook mode now inherit the
same responsive horizontal margins: 64px on large, tall desktops, 48px otherwise,
24px at tablet widths and 16px on narrow screens. The scan-page logo and three
cards retain their shared left edge. Right-hand menu clearance remains intact.
The Dutch scan-page title is **Boodschappenlijst en voorraad**.
The buttons beside Barcode and Product are removed in every mode. Submit a
barcode with the scanner's Enter suffix or the keyboard Enter key; tap the
Product field to open search. The four mode selectors and detail actions remain.
This frontend/title correction changes no scanner actions, data or settings.

The preceding `20261023-stock-search1` moves the hamburger and its popup
to the top right, keeping the logo and cards aligned. Product-name search is
available in Opzoeken, Bijna op and Verbruikt, but remains hidden in Toevoegen.
Stock-mode search opens read-only details with **Afbreken** and the selected
**Bijna op** or **Verbruikt** action. Selection changes nothing. Confirmation uses
the existing scanner service by product ID, including products without barcodes,
with fresh stock checks and atomic expected-value guards. Changed data requires
a new search; uncertain writes are never retried automatically. Pending actions
remain visible until confirmed, cancelled or replaced. Successful actions dismiss
after 10 seconds. Barcode scans retain their immediate behavior. No backend change
or live stock test is required for this frontend release.

The preceding `20261023-scanner-cards1` renames the scan-page title to
**Boodschappen lijst en Voorraad** (**Shopping list and stock** in English).
Scanmodus, Scan je product and Zoek je product are three separate matching cards,
aligned with the logo. Scanmodus includes its explanation and all four mode buttons
inside the same surface, with a pink **mdi:tune-variant** icon matching the other
section icons. The hamburger icon grows from 30px to 44px inside a 72px button.
Desktop content reserves a left gutter; narrow screens put the scan-page logo
below the menu button so nothing overlaps. Scanning and stock behavior are unchanged.

The preceding `20261023-scanner-stack1` aligns Scanmodus and its framed
four-button group above the scan/search card in the left column. Barcode scanning
and product search use compact, top-aligned spacing. The last-product panel stays
on the right at desktop widths. Narrow screens stack both columns and retain
scrolling. Recovery keeps its full-size touch button in normal flow when needed.
This is a frontend-only layout update; scanning, saving and stock are unchanged.

The preceding `20261023-hamburger1` replaces the fixed bottom bar with the
top-left hamburger menu and an expandable **Onderhoud** group. Existing page
cards, hash links, filters, scanner state, and unsaved/busy action guards remain.
The overlay fits the visible viewport and leaves no permanent navigation row.

The preceding `20261022-search-keyboard1` uses **mdi:keyboard-outline** beside
**Zoek je product**. It shares the scan icon's pink color, 88px size (56px on narrow
screens), and vertically centered icon/text layout.

The preceding `20261022-search-popup1` moves product-name typing and matches
into a keyboard-aware popup. **Zoek je product** has an enabled
**Opzoeken** launcher, even before four characters. The entire search section is
hidden in stock modes. Typing keeps the popup open; select a match or submit a
unique match to open editable details. Barcode scanning, stock and backend are unchanged.

The earlier `20261022-scan-feedback1` release keeps product-field focus outlines
inside the scrollable form, uses **Nieuw product gevonden online** for online
matches in **Toevoegen**, and shows **Product niet gevonden in de voorraad** for
unknown **Bijna op/Verbruikt** barcodes. These informational misses dismiss after
10 seconds. Registration drafts, stock behavior and backend are unchanged.

The earlier `20261022-scan-flow1` release implements the scanner scenario flow:
results start hidden, existing products are fully editable only in **Opzoeken**,
and known stock actions show read-only outcomes. Unknown **Opzoeken/Toevoegen**
products require explicit registration. Successful saves/actions dismiss after
10 seconds or the next scan; **Afbreken** closes immediately, while unsaved drafts
and errors stay visible. Barcode and existing Bijna op stock semantics are unchanged.
The matched backend/frontend update was deployed after a verified full HA backup.

The earlier `20261022-delete-confirmation1` release adds a 12px gap between
management delete-confirmation buttons and retains them during routine HA updates.
This prevents a click from being lost when an update occurs between press and
release. Deletion guards, backend behavior and data are unchanged.

The earlier `20261022-save-error1` release makes rejected product registrations
clearly visible: **Product niet opgeslagen** replaces the generic unsaved-edits
message, with the specific error in readable red text. Duplicate names remain
blocked; the product-name field is highlighted and focused so you can rename
the product and save again. Other entered details remain intact.
Only the touchscreen frontend and two translated messages changed.

The earlier `20261022-result-heading1` release restores the large scanner result
heading above unknown-product registration: **Product niet gevonden**,
**Online product gevonden** or **Online opzoeken mislukt**, with a readable
**Nog niet opgeslagen.** subtitle. Fields scroll below the heading and stock box;
bottom navigation stays stationary. Saving and database behavior are unchanged.
This frontend/resource-only update does not change the backend, data or settings.

The earlier `20261022-cancel-label1` release renames the scanner discard button
to **Afbreken** in Dutch and **Cancel** in English. Discard behavior is unchanged.

The earlier `20261022-lookup-preview1` release makes unknown barcode handling
consistent in Opzoeken and Toevoegen. Both show online details as an unsaved draft;
only Opslaan creates the product. Toevoegen adds one stock item when saved.
Unknown touchscreen scans no longer enter the automatic-import queue.
The main dashboard and physical-scanner online importer are unchanged.

The earlier `20261021-recipes-borderless1` release removes the recipe photo-frame outline.
Photo frames remain transparent, with no background or border.
The cook-mode button stays pink in both views.
Cook mode is available on the read-only **Recepten** page at
`/keuken-touchscreen/scan#recipes`. Search all recipes accessible to the configured
Mealie account and tap a recipe for ingredients, preparation and notes.
Search is shown only in the overview. There is no separate back button:
choose the **Recepten** shortcut or hamburger entry to return to the overview with your search
preserved. **Vernieuwen** appears only when an error needs recovery; a failed
recipe read retries that recipe, while a failed list read retries the list.
Its header slot remains reserved so appearing feedback cannot move the controls.
The overview reloads when opened and checks for changes every 30 seconds while
visible. Background reads keep search and scroll position and do not lock controls.
Unchanged results do not rebuild the recipe tiles. Polling pauses in hidden browser
tabs, on other pages and while reading a recipe; returning to the overview fetches
the current list. A failed read retains existing recipes, reports the error and
pauses polling until an explicit **Vernieuwen** succeeds.
There are no recipe editing, importing, meal-plan or shopping-list controls.
Feedback reserves space while loading or reporting errors. Recipe content can
scroll naturally, while the navigation remains stationary.

Tap the expand icon beside **Bereiding / Preparation** to enter cook mode.
Only preparation steps remain visible, filling the content area above the unchanged
page menu. The text grows to about 40px at 1920px, with a 28px minimum
on narrow screens. Long recipes scroll without hiding the top-right navigation.
The preparation heading and collapse icon stay visible while scrolling.
The collapse icon beside the heading returns to the full recipe and restores its
previous scroll position. Both buttons use the pink accent background with a
contrasting icon. Both icons keep 68px touch targets, accessible labels
and keyboard focus. Toggling uses the existing recipe DOM, without additional
recipe or image requests. No browser-fullscreen permission is involved.
Routine HA updates and hidden tabs do not exit cook mode or reload an open recipe.
The **Recepten** menu entry still returns to the overview and exits cook mode;
opening another recipe starts in the normal detail view.

Recipe tiles have fixed-size thumbnails beside the text. Details show a compact,
uncropped photo beside the title and serving/time information, not a full-width
banner. Photo frames are transparent, so unused space around different image sizes
matches the surrounding card. Photo frames have no outline; image sizing and the
surrounding card borders are unchanged.
Missing or failed photos show a centered cookbook icon in the accent color
inside the same reserved frame, so image loading never shifts other controls.
The placeholder is embedded locally and needs no extra image request.
The navigation shortcut uses its own outlined open book with page lines.
**Foto niet beschikbaar / Photo unavailable** remains its
screen-reader label, not visible text, in both the overview and recipe details.
The overview uses tighter spacing below search. Status and recipe count share
one reserved 28px row rather than separate stacked rows. Feedback remains a
single scrollable line with a full-text tooltip, so long messages never push
the tiles down. Recipe sizes and touch targets are unchanged.
Photos are lazy-loaded in the overview; details load the original image.
Image-version changes are included in the existing 30-second overview refresh.

Configure the [official Mealie integration](https://www.home-assistant.io/integrations/mealie/)
with a dedicated account token, then set `recipes.config_entry_id` on the
touchscreen dashboard card to that integration's entry ID. The generated dashboard
leaves this value blank; the offline preview uses synthetic recipes instead.
Only native `mealie.get_recipes` and `mealie.get_recipe` response actions are used.
The all-recipes request uses `result_limit: -1`, verified on the installed integration
and Mealie version, rather than silently using the action's default ten results.
Recipe text still uses native HA actions. With `recipes.image_origin` configured,
the browser loads public recipe photos directly from that one Mealie origin,
using recipe UUIDs and image-version metadata, never URLs supplied in recipe text.
This is an explicitly approved exception to the local-assets-only convention.
Set the optional origin to the Mealie base address, for example
`http://192.0.2.10:9925`, without a path, query, fragment or credentials.
Leave it blank for placeholders without browser-to-Mealie image requests.
No Mealie passwords or tokens are included in the browser configuration or image URLs.
The browser must reach Mealie; direct LAN images do not work through an HA-only
remote connection. HTTPS dashboards require an HTTPS image origin. Invalid or
mixed-content origins produce a visible warning while recipe text remains usable.
Only the public media endpoint is used for images; no new proxy, integration,
backend service, image cache, recipe modification or automatic write is added.
The token stays in Home Assistant's integration storage and inherits the account's
permissions; the read-only UI does not make the token itself read-only.
Use HTTPS where available. HTTP sends credentials unencrypted across the LAN.
Do not connect the integration's shopping lists or calendars to VH-Inventory.

The earlier `20261021-stable-layout1` release stabilizes changing text across all
eleven views. Feedback and recovery controls retain reserved space when empty or
hidden. Scan metadata, table text, quick-action tiles and configuration values
have bounded dimensions, with scrolling and full-text tooltips rather than
content-driven resizing. Opening an editor, changing filters or adding/removing
records can still intentionally change the displayed content.

The barcode action button is fixed at 200px for all four modes in English and
Dutch. Changing mode no longer resizes the barcode field. Scan titles reserve
two lines; descriptions retain a scrollable line. The Almost-out badge and edit
actions have reserved slots. When scan recovery is needed, its button replaces
the keyboard helper text below Barcode without moving the notice or input.
Full-HD scan spacing is compacted without reducing fonts or touch targets.
On narrow screens, fields still stack and the page remains vertically scrollable.
All scan/device/printing actions and safety guards are unchanged.
This is a frontend/resource-only release; no backend or translation changes.

The earlier `20261021-sonos-status1` release widens the Sonos status column to
200px, capped at half the available heading width on narrow screens. Status text
stays on one line, with horizontal scrolling for longer messages. The reserved
height and all device actions remain unchanged. Frontend/resource only.

The earlier `20261021-kitchen-feedback1` release reserves space for command
feedback, slider values, power-button labels and Sonos status/details/group warnings.
Appearing, disappearing or long text stays in its own slot without moving
neighboring controls. Overflowing text remains scrollable and keyboard accessible.
Confirmed state changes show **Successfully executed. / Succesvol uitgevoerd.**
only after HA readback succeeds. LED presets and previous/next still report a
request sent, since their outcome is not independently verifiable.
The module, resource and one new EN/NL touchscreen translation key were backed up
and deployed with read-only review. No real devices were operated.

The earlier `20261020-kitchen-refinements1` release gives the kitchen sliders
explicit tracks and thumbs, preventing native browser greying during pending
commands while retaining the disabled input lock. Sonos buttons use one row:
Play/Pause, Mute, Previous track, Next track. Play/Pause has the accent background
while playing; Mute has it while muted. The Werkblad automatic-off and Ledstrip
power buttons are removed from this page only. Existing automations, relay
configuration, presets and service targets are unchanged. The frontend/resource
release was backed up and reviewed read-only, without operating real devices.

The earlier `20261020-kitchen-pending1` release removes temporary button fading
while a command is waiting for confirmation. Native slider greying was corrected
in the current release.
Controls remain locked against extra taps, with the existing progress message.
Offline, unsupported and uncertain controls still look disabled. This backed-up
frontend/resource-only release preserves service actions and readback checks.
Live review was read-only; no real device command was sent.

The earlier `20261020-state-media-icons1` release replaces Werkblad/Plafond state
text with temperature/brightness-aware bulb badges and Sonos transport/mute text
with accessible icons. This backed-up frontend release preserves every existing
action, radio favorite and entity target. Live review was read-only.

The earlier `20261020-radio-tiles1` release replaces the Sonos Radio/Bron
dropdown with local-logo favorite tiles. The existing source list determines the
order, and the selected source has an accent border. The five station logos,
frontend and resource were deployed with a verified rollback backup. Live review
was read-only; no favorite was selected and playback was not started.

The earlier `20261020-kitchen-panels1` release gives Werkblad and Ledstrip
separate rounded panels, stacked with a 24px gap. Automatic off remains under
Werkblad. The backed-up frontend/resource-only release preserves all entity
targets, controls and service actions. Read-only live review confirmed full-HD
fit without operating any devices.

The earlier `20261020-shopping-print1` release adds **Boodschappenlijst afdrukken**
to the shopping-page header. It calls the same `script.vh_print_shopping` as the
main dashboard, with no extra data or separate receipt logic. The frontend and
one new touchscreen translation were deployed with a verified rollback backup.
Live review was read-only; no real print job was sent.
Unrelated camera WebRTC SourceBuffer and Google AI high-demand 503 errors were
recorded separately with user approval. Raw logs are retained. Inventory and
scanner-display changes during the later approval wait were confirmed as normal
live use. No camera, AI integration, printer script or inventory data was modified
by the review.

The earlier `20261020-kitchen-ledstrip1` release adds Warm/Cold/Off/Power Ledstrip
controls and a labelled Werkblad automatic-off switch within the Werkblad panel.
They reuse the exact entities/actions from the woonkamer-TS kitchen popup.
The approved frontend/config/translations/resource rollout has a verified rollback
backup and read-only live review. No LED, relay, automation or Sonos command was
sent by the review; no backend/automation/blueprint change or reload was needed.
Inventory/history, shared settings, main and woonkamer dashboards were preserved.
Device activity remains observational. Live relay/automation labels match HA,
all panels fit 1920 x 1080, and recovery-only refresh behavior is retained.

The earlier `20261020-kitchen-recovery1` release hides **Bediening vernieuwen**
during normal real-time operation. It appears only after a failed or uncertain
action/refresh and disappears after successful recovery. The frontend/resource-only
correction was backed up and reviewed read-only; data, settings, configuration and
backend were preserved. Concurrent device activity was recorded as observations
with user approval, not restored. No device command was sent by the review.

The earlier `20261020-kitchen-controls1` release adds the leftmost **Keuken** button,
lighting and native Sonos controls. The approved frontend, `kitchen` mapping,
touchscreen translations and resource rollout has a verified rollback backup.
Live review checked all eleven pages and control availability without operating
lights, audio, sliders or sources. Inventory/history, settings, device control
states, main dashboard, schema, kiosk configuration and backend were preserved.
No backend reload or restart was needed. Two exact pre-existing MQTT URL-sensor
warnings repeated during review; raw snapshots and the explicit exception are
recorded in the local release journal. Their configuration was not changed.
Actual device operation has not been tested.

The earlier `20261020-scanner-keyboard1` release sets the scan-page Barcode input to
`inputmode="none"` to request no onscreen keyboard on focus. It remains editable
for physical keyboards and keyboard-mode scanners, including Enter submission.
Barcode inputs in the product/inventory editors retain numeric keyboard hints.
This is a browser hint; confirm native keyboard behaviour on the target device.
See [HTML inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode).
The frontend/resource-only rollout was backed up and reviewed read-only.

The earlier `20261020-hidden-scrollbars1` release hides the shared page and popup vertical
scrollbar indicators with scoped CSS. Scrolling and stationary navigation remain
enabled, and horizontal table scrollbars are unchanged. No data or action changes.
The approved module/resource-only rollout was backed up and verified read-only.

The earlier `20261020-blank-fields1` release leaves undefined category/store/location fields
and unassigned dropdown choices blank on Keuken TS in both languages.
Zero-stock location fields are blank rather than a dash. The explicit
Niet toegewezen / Unassigned category filter remains labelled; broken-reference
warnings and ad-hoc item labels stay visible. Values, actions and the original
dashboard are unchanged.
The approved frontend/resource-only rollout was backed up and verified read-only;
translations, dashboard configuration, data, history and settings were preserved.

The earlier `20261020-heading-labels1` release centers Aantal over its number on
Boodschappenlijst and Voorraad. Actie is centered over the pencil on Voorraad
and over the pencil/trash pair on Producten, Locaties, Categorieën and Winkels.
The scan-page consumption label is **Verbruikt / Consumed**, including the submit,
status and result labels. Its internal action remains `Use`; the main dashboard,
Snelle Voorraad, service payloads and database values are unchanged.
The approved frontend/translations/resource rollout has a verified rollback
backup and was reviewed read-only, preserving stock, history, settings and backend.

The earlier `20261020-action-icons1` release removes Boodschappenlijst's separate
Delete/Actie column and Voorraad's per-row Toevoegen button. Voorraad retains its
pencil Actie column. Management and Configuration edit/delete buttons now use
bordered, accessible pencil/trash icons with unchanged handlers and confirmations.
This is Keuken TS only; the main dashboard remains unchanged. The frontend/resource
rollout was backed up and checked read-only.

The earlier `20261020-inventory-compact1` release adds matching bordered fields
to zero-stock category/store/location cells, replaces Voorraad Edit text with an
accessible pencil icon, and removes the separate Verwijderen button. Minus still
requires confirmation to remove the last unit. The frontend/resource-only rollout
was backed up and verified read-only, without changing production data.

The earlier `20261020-inventory-alignment1` release aligns quantities and plus
buttons across stocked and zero-stock rows using fixed columns. The missing minus
slot stays empty at zero. This CSS-only frontend/resource release changes no actions
or data and requires no backend reload.

The earlier `20261020-inventory-controls1` release gives zero-stock rows
**+**, **Bewerk** and **Toevoegen**, including Almost-out products at zero.
Stocked Almost-out products retain **-**, **+**, **Bewerk** and **Verwijderen**.
Only the touchscreen module and resource URL changed. The approved deployment
included a verified rollback backup and read-only live review; no backend reload,
stock mutation, product save, removal or print was performed.

The earlier `20261020-inventory-visibility1` release adds two Voorraad switches,
both off by default, for Almost-out and zero-stock products. Either switch includes
a product in both groups. Scan mode order is Opzoeken, Toevoegen, Bijna op, Gebruiken;
Opzoeken remains the default. This release changes only the touchscreen frontend,
translations and module resource.

Read-only rollout checks exposed intermittent omission of `products.almost_out`
from backend publications. An app-only reload did not resolve it. After a fresh
full Home Assistant backup and a separately approved Core restart, all 274 product
flags remained present throughout a 200-second observation and final browser check.
Stock, shopping, history, queue and reference data were unchanged. No backend source
change was needed; a stale runtime publisher is suspected, not proven. The main
dashboard's temporary inventory search text cleared during restart/reconnect;
other checked settings were preserved.

The earlier `20261020-fullscreen1` release hides Home Assistant's header and
sidebar through a separate, persistent **Full screen (Keuken Touchscreen)**
Configuration toggle. It is currently off in production and shared across touchscreen
browsers, independently of the main dashboard. A verified rollback backup preceded
the package/helper, dashboard and frontend deployment. Only input booleans were
reloaded; no inventory backend, automation or database change was needed.

The earlier `20261020-inventory-indicator1` release adds a yellow
`mdi:exclamation-thick` beside marked product names in Voorraad, with translated
tooltips and accessible labels. Only the frontend/resource changed; no backend
reload, database change or live stock mutation was needed.

The earlier `20261020-almost-out1` release adds touchscreen-only Bijna op,
protected Use acknowledgement and marker-preserving restocking, including Snelle
Voorraad. It installs the response service, zero-default product flag and bilingual
TTS branch after a verified full-scope backup. Production review was read-only;
no live stock mutation, announcement test or print was performed.

The earlier `20261020-languages1` release connects all ten pages to the same
English/Nederlands selector as the main dashboard. It updates the frontend,
embedded touchscreen maps/language mapping/schema, and only the main dashboard's
translation-script field, preserving the main layout. A full-scope Home Assistant
backup was downloaded and validated, including successful local inventory-database
recovery, before deployment. No database change, backend reload or new helper is needed.

The earlier `20261020-configuration1` release added Configuration at the bottom of
the ellipsis popup with a cog icon. It adds the source-derived configuration schema
and translations to the existing touchscreen card and updates the frontend resource.
It does not require a backend reload, new helpers or a database migration.

The earlier `20261020-nav-order1` release changed the direct navigation order to
Scannen, Boodschappenlijst, Snelle Boodschappen, Snelle Voorraad, ellipsis.
Only the two shopping-page button positions and module resource version changed;
page actions, popup destinations, data, backend and dashboard settings are unchanged.

The earlier `20261020-ellipsis1` release replaced the cog with a horizontal
three-dot icon. Only the toggle SVG and module resource version changed.
Popup behavior, open-state highlighting, accessibility and 68px button size are
unchanged; no backend or dashboard configuration update was needed.

The earlier `20261019-scan-controls1` release highlights the menu button only while its
popup is open. The barcode submit button follows the selected Toevoegen,
Gebruiken or Opzoeken mode. The empty product title is now
**Wachten op het volgende product**. Only the frontend and embedded translations
changed; no backend reload, scan action or database change was needed.

The earlier `20261019-management2` release added Producten, Locaties, Categorieën
and Winkels to the cog popup, retaining Voorraad and the four direct navigation
buttons. It updates the frontend, embedded translations and an optional backend
delete guard, with only the VH Inventory app reloaded. No schema migration or
Home Assistant restart is required. Production navigation/forms were reviewed
without saving or deleting live records; all eight datasets, history, the main
dashboard and its helpers stayed unchanged.
The `management2` CSS-only follow-up gives editor text fields and dropdowns the
same 21px, regular-weight font and colors, without another backend reload.
The fourth page was originally deployed on 2026-10-19 as
`20261019-quick-shopping1`, updating the frontend and embedded translations;
the backend and database did not change. Read-only production
checks confirmed catalogue grouping, search and fixed navigation without changing
any of the eight datasets, including history.

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

## Kitchen controls

Open the leftmost **Keuken** button, identified by a kitchen icon. The page uses
the scanner's logo, VH-INVENTORY heading and header style. Scannen remains the
default when no deep link is supplied.

| Panel | Entity | Controls |
|---|---|---|
| Werkblad | `light.z_keuken_werkblad` | On/off, brightness and warm-to-cool white temperature. |
| Plafond | `light.z_keuken_plafond` | On/off, brightness and warm-to-cool white temperature. |
| Sonos keuken | `media_player.keuken` | Previous/next, play/pause, volume, mute, now-playing title/artist and favorite radio logo tiles. |

Werkblad and Plafond use circular bulb badges instead of visible On/Off text.
When on, their approximate warm-to-cool tint follows reported Kelvin and their
intensity follows brightness, with a 25% visibility floor. The tooltip and
accessible name include the known percentage and Kelvin values. Off uses
`mdi:lightbulb-group-off-outline`; unavailable uses a neutral question icon, not
an off state. Missing/invalid telemetry is omitted, and stale Kelvin is not used
when the light reports another color mode. Badges are indicators, not extra power
buttons; the existing power buttons and sliders remain unchanged.

The four bordered media buttons use previous, play/pause, next and volume icons.
Play changes to pause while playing; the volume icon reflects mute state and its
tooltip names the mute/unmute action. Translated tooltips and accessible names
remain available in English and Dutch. Existing capabilities, offline guards,
serialization and uncertain-response recovery apply unchanged. SVG paths are
embedded locally from [Material Design Icons](https://github.com/Templarian/MaterialDesign);
the bundled `vh-inventory-touchscreen-icons-LICENSE.txt` contains the upstream
notice and Apache 2.0 terms. No runtime icon service or extra credentials are used.

**Radio / Bron** shows the live Sonos `source_list` as touch-sized tiles, replacing
the dropdown. A tap uses the same `media_player.select_source` action for
`media_player.keuken`; it does not create a second playback path. The current
source has an accent border and `aria-pressed`; station names remain accessible
to keyboard and screen-reader users. Updates retain the buttons when the list is
unchanged, avoiding unnecessary focus loss.

NPO Radio 2, Omroep Brabant, Radio 10, Radio 538 and Radio Veronica use artwork
copied from their existing Sonos/myTuner favorite thumbnails into
`www\vh-radio-favorites`. Browser image requests stay within Home Assistant.
New or renamed favorites remain selectable with their name until their artwork
is added to `VH_TOUCHSCREEN_RADIO_IMAGES`. A missing/broken image logs a warning
and displays the name instead. Offline, unsupported, pending and uncertain
controls retain the existing safeguards. Tiles wrap on narrow screens.

Werkblad and Ledstrip have separate bordered, rounded backgrounds, stacked in
the same left column with a 24px gap. Ledstrip contains only three preset buttons.
The automatic-off and Ledstrip power controls are no longer shown.
Plafond and Sonos retain their own panels.
Ledstrip controls are copied from the `woonkamer-ts` kitchen popup:

| Control | Existing entity/action |
|---|---|
| Warm | Trigger `automation.keuken_werkblad_ledstrip_warm` with `skip_condition: true`. |
| Cold / Koud | Trigger `automation.keuken_werkblad_ledstrip_koud` with `skip_condition: true`. |
| Off / Uit | Trigger `automation.werkblad_ledstrip_uit` with `skip_condition: true`. |

Off sends the existing dim-to-zero preset; it is not the same as switching off
the power relay. The preset automations publish the existing MQTT commands, so
the touchscreen does not duplicate them. Their enabled state does not describe
the strip's current color or output. Preset buttons therefore show no invented
active mode and report only that the request was sent, not physical confirmation.
The existing `switch.tf04_switch` relay and
`automation.keuken_werkblad_auto_off_if_forgotten` remain configured in HA;
removing their touchscreen buttons does not switch, disable or delete them.
The automatic-off blueprint still targets `light.z_keuken_werkblad`, not the LED
strip; its timer and delay settings are unchanged.
The three preset automations can be triggered manually even when disabled, matching
the original popup. Unavailable entities or missing services disable only their controls.

The Sonos panel controls the native Sonos entity, not the Music Assistant duplicate.
It does not change announcement targets or TTS settings. Source choices and
supported actions come from the entity, not a hardcoded station list.
When Sonos is grouped, a warning notes that playback actions can affect the group.
Transport buttons appear in one row, in visual and keyboard order:
Play/Pause, Mute, Previous track, Next track. The existing accent background marks
reported Playing and muted states independently. No optimistic active state is
invented while waiting for a response. Buttons retain 68px touch targets; on
unusually narrow displays only this row scrolls horizontally instead of wrapping.

Turn a light on before adjusting brightness or white temperature. Those sliders
require valid reported values and supported capabilities. Kelvin limits come from
each light. Unavailable devices and unsupported controls are disabled independently.
Slider movement changes only the displayed value; releasing it sends one request.
Device actions use the signed-in HA session and its existing permissions.
No embedded credentials, new integration, external endpoint or inventory write is added.

Writes are serialized, checked against fresh device state and read back for up
to five seconds without retrying. Navigation is guarded while a request is pending.
Otherwise available controls keep their normal appearance during that lock,
with a progress cursor and the existing status message. They remain natively
disabled; extra taps cannot send another command. Offline, unsupported and blocked
controls retain their disabled appearance. Bulb intensity still represents the
reported brightness, independently of pending-command feedback.
Slider tracks and thumbs are styled explicitly rather than by the browser's
disabled appearance. Fill follows the current drag value without sending until
release; otherwise available sliders keep their color while temporarily locked.
An uncertain response blocks further actions until **Bediening vernieuwen** is
used and the real device is checked. Previous/next confirms only that the request
was sent, since a radio stream may retain its title. Other readbacks confirm HA's
reported state, not physical operation. Other clients can still change devices
between the preflight check and the service call.
The feedback paragraph always reserves two lines, even when empty. Range labels
always reserve a value column and stable line height. Power-button widths and
Sonos state/title/artist/group-warning areas are reserved independently of their
text. Hidden recovery/group controls use fixed-size wrappers, so displaying them
does not change the layout. Long text scrolls within its own area without visible
vertical scrollbar indicators; Tab focuses populated text areas and full text is
also available in their tooltips. At a fixed viewport and language, changing these
values or messages does not move the other controls.
Sonos status uses a wider, single-line slot. On narrow screens or for longer
statuses, scroll that slot horizontally to read the full text without wrapping.
**Successfully executed. / Succesvol uitgevoerd.** means the requested HA state
was read back and verified, not that physical operation was independently checked.
Pending, failed or uncertain actions never show this success text. LED presets
and previous/next keep **Control request sent. / Bedieningsverzoek verzonden.**
Controls update automatically from Home Assistant in normal operation.
**Bediening vernieuwen** is hidden until an action or explicit refresh fails or
has an uncertain result. It stays visible while recovery is needed and disappears
after a successful recovery refresh. Routine state updates do not require it.

At 1920 x 1080, the three panels fit side by side. Smaller screens stack panels
and retain scrolling. The hamburger menu keeps readable labels on narrow screens.
The same shared Dutch/English selector translates the new page and navigation.
The preview models all controls in memory; real lighting/audio actions require
separate approval and target-device checks.

Service references: [Light](https://www.home-assistant.io/integrations/light/)
and [Media player](https://www.home-assistant.io/integrations/media_player/).

## Configuration

Open the hamburger menu and choose **Configuratie**, above **Onderhoud**.
It provides the same options as `/vh-inventory/main` > Setup, not a separate
set of touchscreen defaults.

| Section | Options |
|---|---|
| Application | Shared language for both dashboards. Full screen controls both HA bars on all Keuken TS browsers. ID columns and Hide header (kiosk) still apply only to the main dashboard. |
| TTS | Enable announcements, event/message settings, volume and discovered Sonos targets. |
| Mobile notifications | Enable notifications, shopping-add event/message and discovered `notify.mobile_app_*` targets. |
| Handheld | MQTT topic and Add/Use colors. |
| AI matching | Enable/agent/policy, degraded status, read-only daily call/failure counters, daily limit and degraded notification/message. |
| Similarity | Threshold, normal/ad-hoc popup text and announcement settings, including the original template hints. |
| Alternative stock | Enable/threshold, popup text and announcement settings. |
| Scanner configuration | The Barcode-01, Barcode-02 and Scanner-01 matrix, including display, barcode, scanner and device settings. Unsupported cells stay blank; states, scans and counters are read-only. |

Text, numeric and dropdown changes use a local **Bewerk** form. **Opslaan** applies
the change; **Afbreken** discards it. Typing survives HA state updates. Leaving the
page or unloading is guarded while an editor or write is active. Number limits,
steps, text limits and dropdown choices come from the entity metadata.

On/off buttons and speaker/mobile selection buttons apply immediately. Activating
a scanner print switch first requires confirmation because it can start a real
print job. Opening Configuration, opening an editor or cancelling never writes a
setting or prints. Missing/offline entities cannot be edited; unsupported device
capabilities are not invented. Speaker discovery failures are shown explicitly,
and **Instellingen vernieuwen** retries discovery.

The page uses standard Home Assistant entity services and the existing
`vh_inventory_tts_toggle_player` / `vh_inventory_notify_toggle_device` services.
Target selection preserves other entries in the existing CSV helper. Writes are
serialized, checked against fresh values and verified by readback. Device
readback can be polled for up to five seconds, without repeating the write.
An uncertain result blocks further writes until you cancel editing, refresh and
inspect the reported value. Standard entity services do not offer atomic
compare-and-set protection against other clients. Readback confirms HA's reported
state, not that a physical printer or speaker completed an action.

The local builder parses the literal Setup definitions in `mk_dash.py` with AST;
it never imports or runs that networked builder. The generated card contains a
versioned `configuration` schema alongside its translations and `language_names`.
On upgrade, update all three fields in the existing card and install the matching module/resource version,
preserving its other settings and the main dashboard. The frontend uses the
signed-in HA account and its permissions, without embedded credentials or new
external endpoints. Read-only configuration review does not change real settings.
The fullscreen rollout's separately approved toggle check changes only the new
fullscreen helper off/on and leaves it enabled; other live edits and prints still
require approval.

## Local review

The offline preview uses **fictitious sample news**, never live feeds.
Build it with `python build_touchscreen.py --output .copilot\touchscreen\news-preview`.
Its idle scan page shows six explicitly fictitious Dutch headlines, two each from
NOS, NU.nl and Omroep Brabant, with publication times and an updated timestamp.
Product details, registration drafts, processing and uncertain actions take
priority. Cancel or normal result dismissal restores news. The list does not
rotate automatically; no third-party scripts, remote articles or live feeds are
loaded by the preview. The production worker is separate from this mock data.

The frontend is opt-in through `news: {enabled: true}`; the builder enables it
in both generated configurations. Production needs the isolated news worker.
The `sensor.vh_touchscreen_news` contract contains `headlines` rows
(`source`, `title`, `published_at`, optional `url` and `summary`), `updated_at`, `last_attempt_at`,
`source_updated_at`, `failed_sources` and an optional boolean `sample`.
Times use ISO 8601 with timezone. `ready` displays available rows; `stale` clearly
labels cached headlines. Missing/unavailable/malformed data produces a news-only
warning and never disables scanning. Missing or failed sources are named explicitly,
including when their older headlines remain cached. Updates older than 30 minutes
are labelled stale even if the worker stopped with a `ready` state.
Display uses plain text and at most two recent headlines per selected publisher.
The kiosk-safe reader uses only the RSS `description`, stripped of HTML/scripts/styles and
limited to 600 characters, never a separately downloaded article. Old cached rows
without reader metadata remain compatible and show explicit unavailable-preview text.
News never opens an external article, including in synthetic previews.

The worker fetches only fixed publisher-owned HTTPS URLs, with TLS verification,
no redirects, connect/read timeouts, a download deadline and a 512 KiB size limit.
XML DTDs/entities are rejected. Only public RSS titles, sources, timestamps,
validated article URLs and short plain-text descriptions are published.
Cache lives in the news sensor during operation and script reloads; after a full
HA restart, news can remain unavailable until the first successful refresh.
There is no separate news cache file, browser-side request or new dependency.
The standard HA recorder may retain this sensor's public headline/preview attributes.
The inventory database is never accessed.
Official feeds: [NOS](https://feeds.nos.nl/nosnieuwsalgemeen),
[NU.nl](https://www.nu.nl/rss/Algemeen) and
[Omroep Brabant](https://www.omroepbrabant.nl/rss).

From the repository root, run:

```powershell
python build_touchscreen.py
Invoke-Item .copilot\touchscreen\preview.html
```

The preview is one HTML file with synthetic products and an in-memory inventory.
It does not contact Home Assistant, use credentials, or change real inventory.
Reloading the page resets the demo. The buttons in the demo strip simulate scans;
they are not part of the Home Assistant dashboard.
The top-right hamburger menu switches pages in both preview and production.
Open **Voorraad** and the four management pages from **Onderhoud**.
**Configuratie** is a top-level menu entry.
The demo supports product/reference CRUD, inline product fields, guarded reference
deletion and product-delete cascade, using synthetic data only.
Configuration includes synthetic setting values, scanner controls, a Sonos target
and a mobile target. Its print controls increment a demo counter, not a real printer.
Keuken includes two synthetic lights and a synthetic Sonos player. Power, sliders,
playback, mute and source selection affect only those in-memory entities.
The sample shopping list includes two catalogue products and one
ad-hoc item; changes affect only the in-memory demo data.

Use either of these demo barcodes, followed by Enter:

| Barcode | Demo product | Starting stock |
|---|---|---|
| `2000000000015` | Voorbeeld havermelk | 3 |
| `2000000000022` | Voorbeeld volkoren pasta | 2 |

Select **Toevoegen** to add one item per scan, or **Verbruikt** to use one.
Select **Opzoeken** to read a product without making any changes.
An unknown barcode clears the previous product details and shows a warning.
The demo does not reproduce online lookups, AI matching, announcements, or all
production shopping-list rules.

The preview follows the browser's light/dark preference. To select a theme
explicitly, append `?scoutTheme=dark` or `?scoutTheme=light` to its URL.
The generated Home Assistant card defaults to dark with Dutch labels.

## Page layout

All pages share the same responsive horizontal margins, including the scan view
and recipe cook mode. Large desktops (at least 1500px wide and 900px high) use
64px; other desktop sizes use 48px. Widths up to 1000px use 24px and widths up to
550px use 16px. The scan view no longer reserves a left-hand hamburger gutter.

The hamburger and four direct-navigation icons share equal 104px touch buttons
at the top right without covering page content, including recipe cook mode.
The order is **Home**, **Recepten**, **Verlichting**, **Boodschappenlijst**, hamburger.
Home returns to the combined scan view; Shopping opens the separate list.
Selected shortcut glyphs stay black on solid pink in both themes, including hover.
At widths up to 1400px the controls sit above the heading; at widths up to 600px
they wrap into three rows of two columns, keeping all icons at 74.8px.
The hamburger opens a native modal navigation popup, not a permanent sidebar.
The menu lists **Boodschappenlijst en voorraad**, **Recepten**, **Keuken**,
**Boodschappenlijst**, **Snelle Boodschappen**, **Snelle Voorraad**,
**Configuratie**, then **Onderhoud**.
Expand **Onderhoud** to reveal **Voorraad**, **Producten**, **Locaties**, **Categorieën**
and **Winkels**. It opens expanded when one of those pages is active.
Selecting a page closes the popup and uses the existing page-navigation guards.
The close button, an outside tap or Escape also closes it. Opening focuses the
active page; dismissal returns focus to the hamburger. The current page remains
highlighted. Background controls are inert while the popup is open and Tab stays
inside it. Its menu list scrolls on short screens, independently of page content.
Visual-viewport sizing handles keyboard resize/pan, with a window-size fallback.
The popup does not create or reload page cards, discard drafts, or change stock.
Menu grouping is presentation only; it does not change Home Assistant permissions.

The left column has three separate cards sharing the same background and padding.
The logo and their outer left edges align. The first card contains Scanmodus,
its pink tune icon, explanation and the group of
Opzoeken, Toevoegen, Bijna op, and Verbruikt mode buttons, in that order.
The barcode card and product-search card below it have equal widths and aligned edges.
The product-search card is hidden only in Toevoegen. At medium desktop widths,
mode buttons use two rows to stay readable; full HD uses one row.
Opzoeken remains the default without automatic writes; editing
product details requires an explicit **Opslaan**.
Barcode and Product fields have no adjacent mode buttons. The four Scanmodus
buttons select the action; barcode submission uses the scanner or keyboard Enter.
The Dutch scan prompt reads **Richt de scanner op de barcode en scan het product.**
The input hint reads **Gebruik de Barcode scanner of het toetsenbord.**
Before a product is scanned, the last-scanned-product panel is hidden.
The scan-status badge is hidden during normal idle use. It appears only while
processing, editing/saving details, or when an error requires attention.
The supplied Van Hemert Home Automation logo appears beside the page title,
within the existing header height. The high-resolution image in
`www\van-hemert-logo-hi.png` has a transparent background and is embedded in the
local preview. The supplied original image is unchanged.
The barcode card contains the barcode input, scan feedback and recovery control.
The separate search card opens the existing keyboard-aware search popup. The right panel
shows the last product's name, description, barcode, manufacturer, category,
store, unit, automatic-shopping settings, stock locations, total stock, and
shopping-list quantity while that result is open.

The mode belongs to this card instance. Changing it does not change the MQTT
handheld mode, the ESPHome scanner modes, or the existing dashboard. Reloading or
recreating the card resets the mode to **Opzoeken**, so opening the page cannot
accidentally add or use stock. Select **Toevoegen** or **Verbruikt** explicitly
when you want to change stock.
The last result is a snapshot after the scan or lookup, not a continuously updating stock
monitor.

All twelve pages run inside one full-width Lovelace view using
`custom:vh-inventory-touchscreen-dashboard`. The existing scan and shopping cards
are retained while switching pages, preserving the current scan mode and any
result that has not been dismissed. Successful results still expire after
10 seconds. The hidden scan page does not capture scanner input or steal focus.
The wrapper fills the viewport, subtracting the Home Assistant header only when
it is visible. No space is reserved for bottom navigation. Long shopping lists
and other page content scroll through the available height, with the last item reachable.
None of the pages shows the decorative footer text, waiting-scan counter, or
page-switching hint. Scan processing and error/recovery feedback remain unchanged.
Unsaved product/inventory edits, pending scans, and active save/shopping/inventory/quick-page actions block page
switching. Save or discard edits before using the other page. Returning to Scannen
focuses the barcode input when scanning is allowed.

The main layout is designed for 1920 x 1080 at 100% browser zoom. It stacks on
narrower screens and allows scrolling rather than clipping long product data.
Browser fullscreen and hiding Home Assistant's bars are separate choices.

### Full screen

In **Configuration > Application settings**, turn on **Full screen (Keuken
Touchscreen)** / **Volledig scherm (Keuken Touchscreen)** to hide both Home
Assistant's header and left sidebar. Turn it off to restore them. The hamburger
menu remains available, so Configuratie is reachable in either
mode. Switching does not reload the cards or discard filters, drafts or scan state.

The setting is `input_boolean.vh_touchscreen_fullscreen`, shared by all browsers
using Keuken Touchscreen. It is independent of the main dashboard's existing
`input_boolean.vh_kiosk_mode`. The helper omits `initial` so HA restores the last
chosen value after a restart. A new installation starts off; enable it once after
installation. Do not set `initial: true`, which would reset an intentionally
disabled setting on restart.

The dashboard uses the installed [Kiosk Mode](https://github.com/NemesisRE/kiosk-mode)
resource with dashboard-root `hide_header` and `hide_sidebar` templates. The wrapper
uses the plugin's `--kiosk-header-height` value, falling back to HA's
`--header-height`, to fit the page content and hamburger in either mode.
This integration was verified with the installed Kiosk Mode 15.0.0.
This is presentation only, not access control, and does not change HA permissions.
Browser tabs, the address bar and OS taskbar need the browser/device's own
fullscreen or kiosk mode.

For recovery, open `/keuken-touchscreen/scan?disable_km#configuration`.
The documented `disable_km` parameter bypasses the plugin for that page load
without changing the shared helper. Leave this recovery option enabled.

## Scanner setup and behavior

For a read-only lookup, select **Opzoeken**, then type or scan a barcode and press
Enter. The page first searches the
existing product catalogue and shows the product details, total stock, locations,
and shopping-list quantity. Leading zeroes are accepted.

For a missing catalogue barcode, **Opzoeken** and **Toevoegen** call the read-only
`vh_inventory_touchscreen_lookup` response service. Both use the existing online
providers and show any name, description, manufacturer and unit as an editable
**Nog niet opgeslagen** draft. Neither creates a product, stock, shopping entry,
scan-queue row, audit entry or notification. Only the barcode goes to the existing
providers; provider image URLs are not loaded. A true online miss allows manual
entry. Provider failures are reported explicitly and also allow manual entry.
The barcode has a source badge: **Online** for an active online draft, or
**From Database / Uit database** for a saved catalogue product. A missing result
or manual-only draft has no source badge. Saving and reading back a product
changes its badge to **From Database / Uit database**.
Buffered scans stop at a registration draft; remaining unsent scans are discarded
with their count shown, rather than overwriting the form.
A failed lookup can be retried without
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

Scans are processed one at a time. Normal Add/Use scans count each submission;
the Almost-out state machine below prevents a second deduction for a marked
package. Scans are not debounced. Each buffered scan keeps the mode selected when
it was entered, even if the mode changes before it is processed. Up to 20 scans
can wait behind the current scan. An additional scan is rejected with a message.
Leaving the page discards unsent scans; an already submitted scan can still
finish.

In Toevoegen or Verbruikt mode, if a service call or result refresh fails, the
outcome may be uncertain. The page
stops accepting scans and discards unsent buffered scans. Check the real inventory
in the main dashboard, then press **Voorraad gecontroleerd, verder scannen**.
There is no automatic retry because a failed connection can occur after stock
has already changed.

## Almost out / Bijna op

Installed as `20261020-almost-out1`. It applies only to Keuken Touchscreen,
including the Add/Use actions in Snelle Voorraad.
The scanner displays `Use` as **Verbruikt / Consumed**. Snelle Voorraad retains
its existing labels.

Use **Bijna op** when you want a nearly empty package counted as consumed now,
so the normal automatic-shopping threshold can put it on the next grocery list.

| Marker before | Action | Stock change | Marker after |
|---|---|---|---|
| Clear | Bijna op / Almost out | Deduct one if available; normal shopping rules apply. | Set |
| Set | Bijna op / Almost out | None. It was already counted. | Set |
| Set | `Use` (Verbruikt on Scannen) | None. Confirm that this package is now empty. | Clear |
| Clear | `Use` (Verbruikt on Scannen) | Normal consumption. | Clear |
| Either | Toevoegen / Add | Add one and reconcile shopping normally. | Unchanged |
| Either | Opzoeken / Lookup | Read-only. | Unchanged |

**Restocking deliberately keeps the marker.** Clearing it during Add would
reintroduce the duplicate deduction if the old package is emptied after shopping.
An Almost-out badge identifies marked scan results and quick-stock cards. For a
marked product with zero stock, Snelle Voorraad offers both **Verbruik bevestigen**
and a separate Add button. Confirmation does not create stock or re-add an item
that was deliberately removed from the shopping list.

The marker represents **one pending package per product**, across all locations,
not individual packages or multiple opened units. Unknown products must first be
registered using the normal workflow. A barcode deduction with several stocked
locations and no unambiguous default is rejected; choose a specific stock row in
Snelle Voorraad instead. Main-dashboard and ESPHome scanning remain unchanged:
their Use actions can still deduct a marked product, so do not mix those clients
with this early-consumption workflow yet.

The touchscreen-only `pyscript.vh_inventory_touchscreen_scan` service returns
the actual outcome, stock, flag and shopping membership. Quick-stock supplies
fresh expected stock rows/flag, rechecked under `BEGIN IMMEDIATE`. Stock, marker
and history commit together. Shopping reconciliation/publication follow the
commit, as in the existing editor. Failures after submission can therefore be
uncertain: stop and check before doing anything else. Never automatically retry.

The alternative-stock extension adds `confirm_alternatives: true` for the
scan card's Use requests. Its response always includes an `alternatives` array
of `{product_id, product, quantity, method, confidence, elapsed_ms}` for that opt-in.
An empty array preserves normal behavior; a nonempty array defers shopping.
`pyscript.vh_inventory_touchscreen_shopping_decision` then accepts `product_id`,
Boolean `add_to_shopping`, and the fresh `expected_stock`/`expected_almost_out`.
Its `shopping_added` or `shopping_kept` response reports quantity, flag and shopping
membership. This operation writes only shopping/history and never decrements stock.
The existing service default remains opt-out for quick-stock and older callers.

First/repeated Bijna op and the protected Use acknowledgement request a spoken
confirmation with the remaining stock and whether the item was added, is already
listed, or is not on the list. It follows the shared English/Nederlands selection.
Existing global TTS enable, consumed-item announcement toggle, selected Sonos
players and volume still apply. Duplicate shopping-add speech is suppressed,
but the normal shopping-add event remains available to mobile notifications.
Disabled/unavailable audio does not undo stock changes; an event-request failure
is reported explicitly. A successfully queued event does not prove physical playback.

Deployment requires the schema/backend/package/frontend update and a verified
full backup. See [upgrade and rollback](INSTALLATION.md#almost-out-upgrade-and-rollback).

## Searching by product name

The scan icon sits beside the vertically centered **Scan je product** heading
and barcode instructions. Below the barcode hint, a pink **mdi:keyboard-outline** icon, **Zoek je product** and
**Gebruik het toetsenbord om te zoeken** introduce a second **Product** field.
Tap the field to open the search popup; there is no adjacent action button.
**Type minimaal 4 letters** appears below the field.

Product-name search is available in **Opzoeken**, **Bijna op** and **Verbruikt**.
The entire search section is hidden in **Toevoegen**; barcode scanning is unchanged.
Search checks the local product catalogue after four trimmed characters, ignoring
case and accents. Typing and selection never search online or change stock.

Tap the Product field or focus it and press Enter to open the search popup. Both the input and
independently scrollable matching list remain inside the visible viewport as it
shrinks or pans for the onscreen keyboard. Typing does not close the popup when a
match becomes unique. Select a result, or submit a unique match with **Opzoeken**,
to close search and open its details. In **Opzoeken**, fields are editable with
**Opslaan** and **Afbreken**. In **Bijna op** or **Verbruikt**, fields are read-only
and the buttons are **Afbreken** and the selected mode. **Afbreken** closes without
changes. The mode button runs the same action as a barcode scan, but only after
confirmation. Repeated Almost out and already-counted consumption keep their
existing semantics. Stock and marker snapshots are checked before submission
and atomically by the backend, so stale selections require a fresh search.
Pending details do not time out; successful actions dismiss after 10 seconds.
Uncertain results block further actions and are never automatically retried. Submitting
multiple matches moves focus to the list so the keyboard can close. No matches
and unavailable data have distinct messages. Selection and save readback use the
product ID, including for products without a barcode; barcode remains read-only.
Typing retains focus in the search field. Old requests cannot replace a newer
query, barcode scan or cancellation. Unsaved edits block searching until saved or
discarded; successful saves keep the existing 10-second dismissal.
The close button and Escape cancel search without writes. Background controls are
inert while the popup is open. Closing restores dashboard scroll position and the
barcode focus without requesting a keyboard. Visual-viewport handling falls back
to window sizing when that API is unavailable. Resized-browser checks do not
replace verification with the physical Windows touchscreen keyboard.

The large colored scan-feedback box is removed. Normal success messages do not
occupy that space. Errors, uncertain writes and rejected scans remain visible as
compact messages, with the existing editor/recovery protections.

## Editing product details

The **Last scanned product** card is hidden before the first scan. Each scan
replaces the previous result, unless unsaved changes or an uncertain write require
attention first.

| Product source | Scan mode | Details and action |
|---|---|---|
| Database | **Opzoeken** | Edit name, description, manufacturer, unit, category, store, stock location and automatic-shopping settings. **Opslaan** updates the existing product; **Afbreken** discards changes. Barcode stays read-only. |
| Database | **Toevoegen** | Read-only details. Add one stock item and show the outcome. |
| Database | **Verbruikt** | Read-only details. Deduct one stock item, or clear an existing Bijna op marker without another deduction. |
| Database | **Bijna op** | Read-only details. Mark Bijna op and deduct once; repeated marking does not deduct again. |
| Online or manual entry | **Opzoeken** | Edit the new-product draft. **Opslaan** creates metadata only; **Afbreken** discards it. |
| Online or manual entry | **Toevoegen** | Edit the new-product draft. **Opslaan** creates the product and exactly one stock item; **Afbreken** discards it. |

Successful stock actions and successful saves hide the card after 10 seconds or
the next scan. **Afbreken** hides it immediately without writing. Unsaved drafts,
validation errors and failed or unverified saves do not time out. Editing a saved
result cancels its dismissal timer. A new scan cannot inherit an older result's
timer.

An online match in **Toevoegen** is headed **Nieuw product gevonden online**;
**Opzoeken** keeps **Online product gevonden**. An unknown barcode in **Bijna op**
or **Verbruikt** shows **Product niet gevonden in de voorraad** and dismisses
after 10 seconds without writing or looking online. These informational misses
are not registration drafts. Product-field focus outlines are drawn inside the
fields so the independent field scroller does not clip their left edge.

**Categorie**, **Winkel**, and **Locatie** use the existing reference lists,
including a blank option for no assignment. Unknown barcodes in **Opzoeken** or
**Toevoegen** show a new-product form.
The normal large result heading and stock box stay above that form. The heading
distinguishes **Product niet gevonden**, **Online product gevonden**, and
**Online opzoeken mislukt**; an incomplete provider lookup uses the failure heading
rather than claiming a complete online miss. **Nog niet opgeslagen** appears as
a readable subtitle. Only the registration fields scroll, keeping the result
heading visible. Instructions use 20px text; the hamburger remains available.
Short windows can scroll the outer page without collapsing the registration fields.
The scanned barcode is fixed. Enter a product name, description, manufacturer,
unit, category, store and automatic-shopping enabled/threshold/quantity settings.
Category/store choices use existing IDs; blank means unassigned. A name is required,
text is limited to 255 characters, threshold to 0-999 and shopping quantity to 1-999.
There is no automatic category suggestion on this explicit registration path.

**Opslaan** is a separate, explicit database write:

| Mode used for the scan | Registration result |
|---|---|
| **Opzoeken** | Creates the product only. Stock, shopping list and pending scan-queue rows stay unchanged. Location cannot be assigned without stock. |
| **Toevoegen** | Creates the product and adds exactly one stock item, optionally at the selected location. Existing queue rows stay untouched. Normal shopping reconciliation follows. |
| **Bijna op / Verbruikt** | Unknown products remain read-only. No registration form or save button is offered. |

`vh_inventory_touchscreen_create_product` checks name/barcode uniqueness, current
reference IDs under `BEGIN IMMEDIATE`. Product, initial stock and audit entries
commit together. New drafts do not need a scan-queue row. Older callers that explicitly
supply a pending Add-row ID still require an exact match and consume only that row.
No schema change is needed. A concurrent registration or changed/deleted reference is rejected.
Online-prefilled drafts pause scanning and navigation until saved or discarded.
Saving also rejects a product name that already exists under another barcode.
The large heading and top status then show **Product niet opgeslagen**, with
the specific error in red beside the save controls. Duplicate-name errors focus
and highlight **Product** so you can choose a different name and save again.
Other entered details are retained. An uncertain submitted save still blocks
retries until you discard the draft and look up the barcode.
Online text longer than 255 characters is shortened with an explicit review warning.
Ordinary HA updates preserve the draft. Save, discard, or clear edits before another
scan or page change. Discard closes the new-product form without writing; changing
mode while the new form is untouched clears that unknown result, requiring a rescan.
An uncertain creation retains the draft but disables further saves. Discard it and
look up the barcode before doing anything else; do not automatically retry.

The following editing rules apply to **existing** products.

**Opslaan** and **Afbreken** remain available for an existing **Opzoeken** result.
Nothing is saved automatically. Saving unchanged details performs a fresh readback
without a database write and starts the dismissal timer. **Afbreken** discards the
draft and hides the result without a service call. New scans, mode changes, and
in-page navigation are paused until edits
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
and history entry. Barcode, product ID, Bijna op marker and all unedited fields
are untouched. Renaming cannot duplicate another product's name. Deleted
references and concurrent changes to edited
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
name; missing category/store values are blank. Ad-hoc items show
**Ad-hocartikel** in the category column.

**Boodschappenlijst afdrukken** sends the full shopping list to the existing
`script.vh_print_shopping` with an empty payload, exactly like the main dashboard.
The server script keeps the same per-store receipt layout and final **Algemeen**
section. No shopping rows or stock values are changed. An empty, valid list can
be sent; unavailable data, a missing print service or pending removal confirmation
disables printing. Printing and quantity changes cannot run simultaneously, and
navigation/unloading is guarded while the request is pending.

The message confirms only that the request was sent, not that paper was printed.
A failed response is uncertain: check the printer before another request. The
page blocks further actions until a successful explicit refresh; refresh itself
never prints and the request is never retried automatically. No new credentials
or printer endpoint are introduced.

Use the large **- / +** buttons to decrease or increase a row by one. Changes are
saved immediately to the shopping list using the existing
`pyscript.vh_inventory_adjust_shopping` service. There is no separate Verwijderen
button or Actie column. Decreasing a quantity of one opens an inline confirmation
for that exact shopping row, because it would remove the item. **Annuleren** makes no change;
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

## Snelle Boodschappen page

This page mirrors **Snelle boodschappen** in the main dashboard. Catalogue
products appear as large, alphabetically sorted buttons in two sections:

| Section | One-tap action |
|---|---|
| **Toevoegen aan boodschappenlijst** | Add a catalogue product not already on the list, at quantity 1. Products without stock are included. |
| **Verwijderen van boodschappenlijst** | Remove every shopping-list row for that product, regardless of quantity, without a confirmation dialog. |

Products move between sections after the result is verified. A quantity label
shows the total already on the list. Products with the same name stay distinct
by product ID. Ad-hoc items remain visible/manageable on **Boodschappenlijst**;
they are not catalogue-product buttons and are never removed by this page.
Neither action changes stock or product metadata.

Product names use regular weight (400) and a 1.65 line-height for readability,
without shrinking the existing text or changing navigation typography.

The top search field filters both sections by product name or barcode, ignoring
case and accents in names. **Wissen** clears it. The search is local to this page,
survives page switches and live sensor updates, and never changes the main
dashboard's search helper. Empty sections have their own message; missing or
malformed sensor data is an error, not an empty catalogue.

The page reuses `pyscript.vh_inventory_shopping_toggle` with `product_id`.
It reads fresh products/shopping data before a tap is submitted, rejects changed
membership/quantities, serializes requests and verifies the resulting list.
There is no automatic retry. If the result is uncertain, controls stay blocked
until **Boodschappenlijst vernieuwen** succeeds and the user reviews the list.
The refresh button is hidden during normal use. Page switching is blocked while
the request or its fresh-state checks are in flight.

The existing backend toggle does not offer transactional expected-state checks.
Another client can still change membership between the preflight read and the
toggle; preflight/readback reduce this risk but do not eliminate it. Any detected
mismatch blocks further writes rather than silently repeating the action.
Existing shopping-add announcement behavior also applies.

The local demo implements the toggle against synthetic arrays only. It sends no
Home Assistant requests, announcements or print jobs. Review
`.copilot\touchscreen\preview.html#quick-shopping` for synthetic testing.

## Snelle Voorraad page

This page mirrors **Snelle voorraad** in `/vh-inventory/main`, using its shopping
rules while honoring the touchscreen-only Almost-out marker. Product IDs and
stock links are preserved.
Its two grids appear in this order:

- **Artikel uit voorraad halen** shows each stock row with quantity above zero.
  The button shows the product name and a compact rounded quantity block at the
  bottom-left. The block contains only the number, without a label. Location is
  not displayed; each button still targets its original stock row.
  One tap submits Use for that product and stock-row ID. Normally it deducts one.
  With an Almost-out marker, it confirms the earlier deduction instead and clears
  the marker without changing stock. A depleted location disappears; other
  locations for the same product remain available.
- **Artikel aan voorraad toevoegen** shows catalogue products with no positive
  stock, matched by product ID rather than name. One tap calls
  `pyscript.vh_inventory_touchscreen_scan` with the product ID and Add to add one.
  It prefers an unassigned row, otherwise the single existing row, or creates an
  unassigned row. The Almost-out marker remains set. Use Voorraad to edit location.

The local **Producten zoeken** field filters both grids by product name or barcode,
ignoring case and accents. **Wissen** clears the search. Search survives switching
pages and sensor updates without changing the main dashboard's search helpers.
Product names use the same regular-weight typography as Snelle Boodschappen.
Products with identical names remain distinct by ID. Multiple stock locations
remain separate buttons rather than a combined total.

Existing backend rules still apply. Stock changes can automatically update the
shopping list according to each product's configuration. This is not a direct
shopping-list toggle. A protected Use acknowledgement also clears `products.almost_out`.

Only one stock action can run at a time. Fresh-state checks compare the selected
product and its stock rows before submission; readback verifies the requested
stock change. A conflict, missing data or uncertain result disables further stock
actions until an explicit successful **Voorraad vernieuwen**. Do not repeat an
uncertain tap; inspect stock and the shopping list first. Navigation is paused
while a stock action is running, and a browser unload warning is requested.

Both quick-stock actions use the response service with stock/flag expectations
checked inside its transaction. A conflicting readback is reported as uncertain;
no automatic retry or rollback is attempted. Shopping reconciliation still occurs
after that transaction. Use `.copilot\touchscreen\preview.html#quick-stock` for
synthetic stock-action testing.

## Voorraad page

By default, **Voorraad** shows stock rows with quantity **1 or higher**, excluding
products marked **Bijna op**. The columns are Product,
Categorie, Winkel, Locatie, Aantal and actions. Winkel displays the catalogue
product's assigned store, or a blank field when no store is assigned. Its
dropdown updates the product's store everywhere. Like the main dashboard's Inventory tab,
stock is shown per location, not collapsed into a single total per product.
Aantal is centered above the quantity, and Actie above its pencil button.
The editor uses matching dropdown/input colors. Opslaan and Afbreken share one
horizontal action row with equal-height buttons, including on narrow screens.
Two switches control additional visibility, both off when the card is created:

| Switch | When enabled |
|---|---|
| **Bijna op tonen / Show almost-out products** | Includes marked products, including those whose stock is already 0. |
| **Voorraad 0 tonen / Show products with stock 0** | Includes all catalogue products with no positive stock, including marked products. |

Either switch reveals a product that is both marked and at zero stock. Ordinary
positive-stock products remain visible. Search and category filters still apply
to every included row. These switches are local, retained while navigating pages
and receiving sensor/language updates, and reset to off on browser reload. They
do not write helpers or change stock, markers or shopping entries.

Depleted stock rows are normally removed by the backend, so zero-stock entries
are derived from catalogue product IDs, once per product, not from invented
database stock IDs or old locations. They show quantity 0 and no location.
Their quantity controls show **0** and **+**, with no minus button. **+** adds one
unit without a location assignment, using the existing stock-add service.
Quantity controls reserve the same minus, quantity and plus columns on every row,
leaving the minus slot empty at zero so quantities and plus buttons stay aligned.
Fresh-state checks reject a missing, renamed, reflagged or already-restocked product;
an uncertain write blocks further actions until an explicit refresh.
The pencil button, labelled **Bewerk / Edit** for accessibility and its tooltip,
opens the selected catalogue product in the existing Producten
editor without creating stock. Save or cancel there, then return to Voorraad;
its visibility and search filters are retained.
There is no per-row Toevoegen button. Use **+** to add one unassigned unit, or
the page-level **Product aan voorraad toevoegen** form to choose product, location
and quantity before explicit Save. The Actie column remains because it contains
the pencil. Zero-stock rows never show Verwijderen or pass synthetic stock IDs to a service.
Restocking replaces the placeholder with real location rows when the filters allow it.

Category, store and location on zero-stock rows have matching bordered, read-only
fields. Undefined category/store values are blank. The location is blank because
no stock location exists. The explicit Niet toegewezen category filter remains
labelled, and broken reference IDs still show a warning. Use the
pencil for product changes or the page-level Add form to choose a restocking location.

The same controls apply to an Almost-out product at zero stock. Almost-out products
with positive stock show **-**, **+** and the pencil. There is no separate
Verwijderen button in Voorraad. Minus reduces quantity by one; removing the last
unit still requires confirmation. These inventory actions preserve
the product's Almost-out flag; scanner/Quick Stock acknowledgement remains separate.

Visible marked products show a yellow **mdi:exclamation-thick** icon beside their name,
on every stocked location row or their zero-stock product row. Its tooltip and accessible label use **Bijna op**
or **Almost out**, following the shared language selection. The icon appears and
disappears with the product's existing marker; it does not change stock or flags.
The MDI SVG is included locally, so the offline preview renders the same icon.

The search field at the top filters immediately by partial product name or
barcode, ignoring case and accents. **Wissen** clears the text search.
It shares the Snelle Boodschappen search panel's spacing, colors and input style,
with **Producten zoeken** above the field and
**Zoeken op productnaam of barcode** as the placeholder.
The category selector supports all categories and unassigned products. Both
filters are local to this touchscreen card and survive page switches; they do
not write to the main dashboard's search/category helpers. Live sensor updates
refresh the overview without resetting filters or unsaved editor values.

The user-approved full inventory controls use the following backend services:

| Control | Behavior and existing service |
|---|---|
| **- / +** | Adjust this stock row by one using `vh_inventory_adjust_stock`. Removing the last unit needs confirmation. |
| **Categorie** | Immediately updates the linked product via `vh_inventory_set_stock_field`, affecting its category everywhere. |
| **Winkel** | Immediately updates the linked product via `vh_inventory_set_product_field` with `field: store`, affecting every location of that product. The blank option clears the assignment. |
| **Locatie** | Immediately moves this row via `vh_inventory_set_stock_field`. If the destination already contains that product, quantities merge without changing total stock. |
| **Product aan voorraad toevoegen** | Opens an explicit-save form for catalogue product, location and quantity. `vh_inventory_add_stock` creates a row or adds to the existing product/location quantity. |
| **Pencil (Bewerk)** | Opens an explicit-save form for the selected stock row and its linked product. Product is a free-text name, not a product selector. `vh_inventory_save_stock_details` patches only changed fields by the existing product and stock-row IDs in one SQLite transaction. Opslaan saves; Afbreken discards. Unrelated settings, IDs, stock at other locations and existing links remain untouched. At zero stock it opens the existing Producten editor instead. |
| **Remove the stock row** | Use minus at quantity 1 and confirm, or set quantity to zero in the stock editor and confirm. The catalogue product remains. No separate Verwijderen button is shown. |
| **Volledige voorraad afdrukken** | Calls the existing `script.vh_print_inventory`. Prints the full positive-stock overview grouped by category, irrespective of the on-screen search, category or visibility switches. |

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

## Producten, Locaties, Categorieën and Winkels

These pages mirror the management functions on `/vh-inventory/main`, without
using or changing its shared input helpers. Open them from Onderhoud in the hamburger menu or their
direct hash links. Search stays local to each page, and lists follow live sensor
updates. Wide tables scroll horizontally within their panel on narrow screens.

**Producten** includes the whole catalogue, including products without stock.
Search by product name or barcode. The table shows name, barcode, manufacturer,
unit, Auto-Add enabled state, threshold, quantity, category and store, with
bordered pencil/trash buttons for Bewerk/Verwijderen. Their translated tooltips and
accessible names identify the action and record; existing handlers and confirmations
are unchanged. Category/store dropdowns and threshold/quantity inputs
save immediately through `vh_inventory_set_product_field`. Threshold accepts
0 to 999; quantity accepts 1 to 999.

**Product toevoegen** and **Bewerk** open local forms for barcode, a free-text
product name, manufacturer, store, category, unit, description, Auto-Add enabled,
threshold and quantity. Opslaan uses `vh_inventory_add_product` or
`vh_inventory_update_product`; Afbreken discards the draft. New/renamed names must
be nonempty, no more than 255 characters and not duplicate another name.
Barcodes are optional, numeric and at most 15 digits. A changed barcode cannot
belong to another product. Unchanged duplicate names/barcodes do not prevent
editing other fields. Category/store choices retain IDs locally and resolve a
unique current name only at the service boundary. An unassigned category on
creation still permits the backend's normal suggested-category behavior.

Product deletion requires confirmation explicitly warning that **all linked
stock and shopping-list entries will also be deleted**, with counts displayed.
The product and its linked rows are checked again before calling the existing
delete service. This is not the same as deleting one row on Voorraad.

**Locaties**, **Categorieën**, and **Winkels** provide name search, add, rename
and confirmed delete. Renaming uses `vh_inventory_update_simple` on the existing
ID, preserving product and stock links. In-use records show their link count and
have deletion disabled. Even zero-quantity stock rows count as location references.
The backend independently enforces unused-reference deletion:

```yaml
action: pyscript.vh_inventory_delete
data:
  table: categories
  id: 123
  require_unused: true
  expected_value: "Example unused category"
```

This example is a destructive service call, not a read-only verification step.
The optional `require_unused: true` path accepts only locations, categories and
stores. It validates the expected name, checks all references and deletes the row
and writes history in one `BEGIN IMMEDIATE` transaction. A missing, renamed or
used record aborts without deleting or writing history. The normal delete-service
default remains unchanged for existing main-dashboard callers. On older backends
without the registered `require_unused` field, reference deletion stays disabled.

Writes are serialized and checked with fresh states before submission and verified
afterward. Full product forms retain original values and reject stale drafts
before the full-row update. Live updates never rebuild an open form or replace
typed values. Unsaved drafts and active writes block navigation and request an
unload warning. An uncertain result blocks further writes: press Afbreken if a
form is open, then Gegevens vernieuwen, and review the records before retrying.
No action is automatically retried or rolled back.

Delete-confirmation buttons have a 12px gap, including when they wrap onto separate
lines. Routine HA state updates retain the same buttons so an update between
pressing and releasing cannot swallow a click. Confirmation starts the existing
busy status immediately and disables both buttons until the checked write finishes.
Opening the confirmation or cancelling it never deletes anything.

Only guarded reference deletion has the new transactional dependency check.
Existing product create/update/delete, inline fields and reference add/rename
services do not accept atomic expected-state conditions. Another client can
still change data between frontend preflight and those service calls. Product
cascade deletion retains the existing backend behavior, not a new transaction.
The database schema, table IDs and relationships are unchanged.

## Home Assistant installation

These steps install or reproduce the dedicated dashboard. The local builder does
not execute them and does not connect to Home Assistant.
The builder does not deploy anything automatically; obtain approval before
replacing the installed dashboard resource/configuration.

1. Install the current `pyscript\apps\vh_inventory\__init__.py` backend and reload
   the VH Inventory pyscript app. The editing feature requires
   `pyscript.vh_inventory_save_product_details` for scanner details and
   `pyscript.vh_inventory_save_stock_details` for the ID-based inventory editor.
   Management additionally uses the existing product/reference CRUD services and
   requires the new `require_unused` and `expected_value` arguments on
   `pyscript.vh_inventory_delete` for safe reference deletion. Older backends remain
   usable for scanning and lookup, but unsupported editing/deletion controls stay
   disabled. This update does not change the database schema.
2. Copy `www\vh-inventory-touchscreen.js` to the Home Assistant file
   `/config/www/vh-inventory-touchscreen.js`, and `www\van-hemert-logo-hi.png` to
   `/config/www/van-hemert-logo-hi.png`.
   Copy the five images in `www\vh-radio-favorites` into
   `/config/www/vh-radio-favorites/`, preserving their filenames.
   Copy `www\vh-inventory-touchscreen-icons-LICENSE.txt` into `/config/www/`.
3. Register `/local/vh-inventory-touchscreen.js?v=20261021-stable-layout1` as a **JavaScript module**
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
   with all ten pages and integrated navigation. Quick stock opens at
   `/keuken-touchscreen/scan#quick-stock`. A
   test scan in Toevoegen or Verbruikt mode changes real stock; agree on a test
   product first. Opzoeken is read-only.

When updating an existing installation, update the dedicated resource's URL rather
than adding a duplicate. Reload the dashboard page to load the new card code.
When adding Configuration, copy the generated card's `configuration` schema and
`translations` into the existing card before installing the matching module.
For shared languages, also copy `language_names` and use the current schema with
canonical, unformatted hint keys. Preserve theme, logo and other unrelated settings.
Update only the main dashboard's embedded translation layer for an existing
installation, not its layout or other configuration. Back up its current JSON first;
running `mk_dash.py` rebuilds and saves the whole main dashboard, so it is not a
translation-only patch. Reload both browser pages after installing the new layer.
Configuration also needs
the existing Sonos/mobile target-toggle services; its other edits use standard
HA entity services. Optional devices can remain offline without blocking other controls.
When updating the earlier two-view touchscreen dashboard, preserve the scan view
and its card settings, change the card type to
`custom:vh-inventory-touchscreen-dashboard`, and update its translation maps.
Remove only the old dedicated shopping view from Keuken Touchscreen, because the
wrapper now contains the pages. Do not replace the main `/vh-inventory` dashboard.
When adding Voorraad to the single-view installation, preserve card settings and
update the card's translation maps as well as the module resource.
When upgrading a three-page installation to Snelle Boodschappen, update both the
module and translation maps, use the new cache-busting resource version, and
preserve the existing card settings.
When adding Snelle Voorraad, update the module and translation maps while
preserving all other settings. It uses the already-existing
`vh_inventory_adjust_stock` and `vh_inventory_stock_add_by_product` services,
so this addition requires no backend deployment.

The current source uses `pyscript.vh_inventory_touchscreen_scan` for touchscreen
scan and quick-stock writes. It adds the Almost-out schema/service described above;
the older quick-stock release alone needed no backend update. Explicit product saves use
`pyscript.vh_inventory_save_product_details`. Shopping quantities/removal use the
existing adjust/delete services described above. The card reads the existing products,
stock, shopping, scan-queue, categories, stores, and locations sensors. Editing
requires the matching backend update. Almost out also requires its new column and
TTS automation update, but no new helpers, Home Assistant restart, or extra HACS cards.
The generated configuration uses Home Assistant's full-width panel view.

Fullscreen additionally requires the current package's
`input_boolean.vh_touchscreen_fullscreen` and the existing Kiosk Mode resource.
Back up the package, resource/module and touchscreen dashboard before upgrading.
After configuration validation, reload only `input_boolean` to load the new
helper, preserving existing helper states. Update the card's generated schema and
translations, the dashboard-root `kiosk_mode` block, and matching frontend resource.
Enable the new helper once, then reload the browser. No inventory backend reload,
database migration or main-dashboard change is needed. Scope production deployment,
helper reload and toggle verification explicitly before executing them.

### Shared language

Open **Configuration > Application settings > Language**. Choose **English** or
**Nederlands** in the local editor and press **Save / Opslaan**. This writes the
existing `input_select.vh_language`, exactly the helper used by the main
dashboard's **Setup > Language** dropdown. A change from either dashboard updates
both. Cancelling the touchscreen editor does not change the language.

Navigation, all ten pages, messages, form labels, search placeholders and
accessible labels update without rebuilding the cards. Open drafts, focused
inputs, inline numeric typing, filters, scanner mode and the last result are
preserved. Product/reference/device names, entered settings, barcodes, numbers
and HA dropdown values are not translated. ID columns and the original
Hide header (kiosk) control remain main-only; the separate Full screen control
affects Keuken Touchscreen only.
If the helper is absent or its value is unsupported, labels fall back to English,
matching the main dashboard. Older standalone card configurations without
`language_names` retain their previous static `language` setting.

`translations\en.json` and `translations\nl.json` contain the same three sections,
in this order: `generic` for shared wording, `main` for main-only wording and
`touchscreen` for touchscreen-only wording. Reuse an existing shared key before
adding a new one. A source key belongs in exactly one section, with identical
placement in every language. `translation_catalog.py` validates the catalogs;
the main builder embeds `generic + main`, and the local touchscreen builder embeds
`generic + touchscreen` plus the display-name/code mapping. Keep this module next
to both builders. Rebuild and update the relevant embedded maps after editing a
catalog. Do not paste the sectioned source JSON directly into a card.

The main dashboard's global text translator skips the touchscreen wrapper, so
SPA navigation from main cannot translate touchscreen user data a second time.
To select the light theme, set the card's `theme` to `light`.

**Existing-product Add/Use behavior still applies.** Unknown touchscreen products
require explicit registration as described above; the main and physical scanners
retain their automatic online importer. Use mode can add existing products to the
shopping list, and configured announcements can play. The deployed scan card
handles Use alternative-stock choices inside the touchscreen as described above.
Touchscreen Add never routes similarity or Ad-Hoc prompts to the fallback
scanner. Other touchscreen stock operations use normal auto-add rules rather
than opening a physical-scanner question. The physical scanners' own scanning,
similarity and alternative-stock behavior is unchanged.

## Security and isolation

The installed card uses the current Home Assistant session and its permissions.
Do not put access tokens in the card or preview. No extra server, external script,
CDN, or network port is needed for deployment. Product fields are rendered as
text, not HTML. Use an appropriately restricted Home Assistant account for an
unattended screen.
Home Assistant's `/local` static files are not secret storage; only the frontend
code, logo, icon attribution and radio-favorite artwork are installed there.

To remove this dashboard later, delete only the new dashboard and its dedicated
resource/file. Do not remove the shared backend, sensors, or existing dashboard.

## Development checks

The local test Python environment needs Jinja2 for speech-template tests and
requests for the isolated news tests (`python -m pip install Jinja2 requests`).
Install them in the test environment, not by changing the Home Assistant server.

```powershell
node --check www\vh-inventory-touchscreen.js
node --test tests\touchscreen.test.cjs
python -m unittest discover -s tests -p 'test_*.py'
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
Settings-popup checks cover its item placement, expanded state, focus, outside/Escape
dismissal, listener cleanup and inventory deep-link highlighting without bypassing guards.
Quick-shopping checks cover full-catalogue membership, duplicate names, search,
quantity-one addition, complete removal of all linked rows, unchanged stock and
ad-hoc entries, fresh-state conflicts, lost responses, explicit recovery and its
deep link. Quick-stock checks cover location-specific stock IDs, product-ID
addition, duplicate names and colliding product/stock IDs, depleted rows,
unavailable data, stale buttons, fresh-state conflicts, lost responses, explicit
refresh, serialization and navigation/unload guards.
Configuration checks cover Setup-source parity, all writable domains, metadata
limits/options, missing/offline/read-only entities, stale drafts, serialization,
delayed/lost readback, explicit recovery, target-list preservation and confirmed
print switches. Synthetic actual-DOM checks cover saves, local draft/focus
retention, navigation guards, targets, print confirmation and desktop/narrow/short
layouts. Live Configuration checks only open/cancel editors and inspect navigation;
all shared/device values, eight datasets and history remain unchanged.
Synthetic browser checks include all twelve pages in both themes at twelve widths,
including the 600/601px wrapping boundary; equal 104px controls and 74.8px glyphs;
Home and other guarded routes; normal/hover selected contrast; and cook-mode clearance.
Before deployment, review the local page at 1920 x 1080, try both modes, scan the
same product twice, and check unknown-barcode feedback. Physical USB/Bluetooth
scanner testing still needs the target hardware. Production rendering and
connection checks do not replace an end-to-end test with an agreed test product.

References: [Home Assistant custom cards](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/),
[custom resources](https://contributors.home-assistant.io/frontend/custom-ui/resources/),
[panel views](https://www.home-assistant.io/dashboards/panel/), and
[WebSocket API](https://developers.home-assistant.io/docs/api/websocket/).
