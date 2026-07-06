# VH-Inventory — Uninstall Guide

This guide removes **VH-Inventory** from a Home Assistant server. It is the reverse of
[`INSTALLATION.md`](INSTALLATION.md) and undoes every change that guide makes: the pyscript
backend, the configuration package, the SQLite database, the theme, the dashboard, and the
`configuration.yaml` edits.

> **Audience:** a Home Assistant administrator with file-system access to `/config`.
> **Time required:** ~10–15 minutes.

> ⚠️ **Read section 8 before removing anything.** Pyscript and the custom Lovelace cards are
> **shared dependencies** — other dashboards or integrations may rely on them. Removing them is
> optional and should only be done if nothing else uses them.

---

## 1. What gets removed

| Item | Location | Removed in |
|---|---|---|
| Dashboard | URL path `/vh-inventory` (Lovelace API, not a file) | §3 |
| `configuration.yaml` blocks | pyscript, package link, `recorder:` exclude, theme loader | §4 |
| Backend app | `/config/pyscript/apps/vh_inventory/__init__.py` | §5 |
| Configuration package | `/config/packages/vh_inventory.yaml` | §5 |
| SQLite database | `/config/vh_inventory.db` | §5 |
| Theme | `/config/themes/vh_inventory.yaml` | §5 |
| Entities | `sensor.vh_inventory_*`, `input_*.vh_*`, `script.vh_*` | §6 |
| Recorder history | any history recorded for `sensor.vh_inventory_*` | §6 |
| Optional secret | `upcdb_api` in `/config/secrets.yaml` | §7 |
| Shared deps *(optional)* | pyscript integration + 5 HACS cards | §8 |

---

## 2. Back up first (recommended)

Deletion is irreversible. If you might want the data later, copy these off the server first:

- `/config/vh_inventory.db` — all your products, stock, shopping list, and history.
- `/config/packages/vh_inventory.yaml` — the helper/script definitions.
- `/config/pyscript/apps/vh_inventory/__init__.py` — the backend app.

A full **Settings → System → Backups → Create backup** also captures everything and lets you
roll back the entire uninstall if needed.

---

## 3. Remove the dashboard

The dashboard is **not a file** — it was pushed through the Lovelace API under URL path
`/vh-inventory`. Remove it from the UI:

1. **Settings → Dashboards**.
2. Select the **vh-inventory** dashboard row → **(⋮) → Delete**.

*(Alternatively, via WebSocket: send `{"type": "lovelace/config/delete", "url_path": "vh-inventory"}`.)*

After deletion, `http://<your-ha>/vh-inventory/main` should return **404 / not found**.

---

## 4. Revert `configuration.yaml`

Open `/config/configuration.yaml` and remove the blocks you added from
[`configuration.example.yaml`](../configuration.example.yaml). Remove **only** the
VH-Inventory parts — if you share a key (e.g. an existing `recorder:` or `frontend:` block),
delete just the VH-Inventory lines, not the whole key.

1. **pyscript** — if pyscript is used *only* by VH-Inventory, remove the whole block:

   ```yaml
   pyscript:
     allow_all_imports: true
     apps:
       vh_inventory:
         upcdb_url_base: https://api.upcdatabase.org/product/
         upcdb_api_key: !secret upcdb_api
   ```

   If other pyscript apps exist, keep `pyscript:` and remove only the `vh_inventory:` app entry.

2. **Package link** — remove the include line (and the `homeassistant:`/`packages:` keys if they
   now hold nothing else):

   ```yaml
   homeassistant:
     packages:
       vh_inventory: !include packages/vh_inventory.yaml
   ```

3. **Recorder exclude** — remove the glob (keep any other `exclude`/`recorder` settings):

   ```yaml
   recorder:
     exclude:
       entity_globs:
         - sensor.vh_inventory_*
   ```

4. **Theme loader** *(only if you added it for this solution)* — remove if no other themes use it:

   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
   ```

Then **Developer Tools → YAML → Check Configuration** to confirm the file is still valid.

---

## 5. Delete the files

Delete these from `/config`:

```
/config/pyscript/apps/vh_inventory/      (whole folder)
/config/packages/vh_inventory.yaml
/config/themes/vh_inventory.yaml
/config/vh_inventory.db
```

> If `/config/packages/` or `/config/pyscript/apps/` is now empty and you added it only for this
> solution, you can remove those folders too — but leave them if other packages/apps live there.

---

## 6. Purge leftover entities & recorder history

1. **Restart Home Assistant** (Settings → System → Restart). This removes the pyscript sensors
   and all package-defined helpers/scripts (`input_*.vh_*`, `script.vh_*`), because their
   definitions are now gone.

2. **Check for lingering entities** — **Developer Tools → States**, filter `vh_inventory` (and
   `vh_`). Anything left is usually a **template sensor** that keeps a registry entry because it
   has a `unique_id`. A plain reload does **not** clear these — you must remove them explicitly:
   **Settings → Devices & Services → Entities**, search `vh`, select the leftover rows →
   **Remove**. *(Or via WebSocket `config/entity_registry/remove`.)*

3. **Purge recorded history** — clears any state history captured before the recorder exclude
   was active. **Developer Tools → Actions**:

   ```yaml
   action: recorder.purge_entities
   data:
     entity_globs:
       - sensor.vh_inventory_*
     keep_days: 0
   ```

---

## 7. Remove the optional secret

If you enabled the upcdatabase.org provider, remove its key from `/config/secrets.yaml`:

```yaml
# delete this line
upcdb_api: "your-key-here"
```

No other secrets are created by this solution.

---

## 8. Optional: shared dependencies

These are **not** VH-Inventory files — they are general Home Assistant add-ons that other
dashboards or integrations may also use. Remove them **only** if nothing else depends on them.

| Dependency | Where | Safe to remove? |
|---|---|---|
| **Pyscript** integration | HACS → Integrations | Only if no other pyscript app remains (you already checked in §4.1). |
| **button-card** | HACS → Frontend | Only if no other dashboard uses `custom:button-card`. |
| **card-mod** | HACS → Frontend | Only if no other dashboard uses card-mod styling. |
| **flex-table-card** | HACS → Frontend | Only if unused elsewhere. |
| **bubble-card** | HACS → Frontend | Only if unused elsewhere. |
| **tabbed-card (programmable)** | HACS → Frontend | Only if unused elsewhere. |
| **Mushroom / VH-Inventory theme** | already deleted in §5 | — |

After removing any HACS frontend card, also delete its resource under
**Settings → Dashboards → (⋮) → Resources** if it is not auto-managed, and restart HA.

The **ESC/POS Printer** integration (optional, used only for printing) can likewise be removed
from HACS/Integrations if you installed it solely for VH-Inventory.

---

## 9. Verify the uninstall

| Check | Expected result |
|---|---|
| `http://<your-ha>/vh-inventory/main` | 404 / dashboard not found |
| **Developer Tools → States**, filter `vh_inventory` | No entities returned |
| **Developer Tools → States**, filter `vh_` | No leftover helpers/scripts |
| `/config/vh_inventory.db` | File no longer exists |
| **Developer Tools → YAML → Check Configuration** | Valid |
| Home Assistant log after restart | No `vh_inventory` / pyscript errors |

Once all checks pass, VH-Inventory is fully removed.

---

## 10. Reinstalling later

To reinstall, follow [`INSTALLATION.md`](INSTALLATION.md) again. If you kept a backup of
`vh_inventory.db`, drop it back into `/config` before the first pyscript load to restore your
data — the schema is self-creating, so a fresh install without the DB simply starts empty.
