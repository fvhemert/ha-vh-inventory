# Large screen barcode scanners (ESPHome)

> This document describes the **Large screen barcode scanners** — the two ESP32-based
> touchscreen barcode readers (**Barcode-01** and **Barcode-02**) that feed the
> VH-Inventory system. Their firmware lives in [`esphome/`](../esphome) and their
> hardware reference material in [`hardware/`](../hardware). This is one of several
> scanner types VH-Inventory supports (see the
> [Product Manual](PRODUCT-MANUAL.md) for the handheld MQTT scanner and manual entry,
> and the [Small screen barcode scanner with printer](SCANNER-SMALL.md) for scanner-01).

## Overview

An ESP32-based grocery/household inventory barcode scanner built with **ESPHome** and
**LVGL**. It connects a **GM67 barcode scanner module** to **Home Assistant** via a
**2.8" ILI9341 TFT touchscreen** (MSP7402), allowing users to scan product barcodes to
add/consume items from a household inventory, trigger shopping or inventory list printing,
and configure device settings — all from a touch-driven graphical UI.

Firmware version: **0.5.5**

## Device Photos

| Barcode-02 (splash) | Barcode-01 | Barcode-02 (product details) |
|:---:|:---:|:---:|
| ![Barcode-02 splash](images/scanner/Scanner%201.jpeg) | <img src="images/scanner/Scanner%203.jpeg" alt="Barcode-01" width="50%"> | ![Barcode-02 product details](images/scanner/Scanner%202.jpeg) |

## Hardware

| Component | Details |
|-----------|---------|
| MCU | ESP32-WROOM-32D (esp-idf framework) |
| Display | 2.8" ILI9341 320×240 TFT via MIPI-SPI |
| Touch | XPT2046 resistive touchscreen (separate SPI bus) |
| Scanner | GM67 barcode/QR module via UART (9600 baud) |
| Backlight | LEDC PWM-controlled monochromatic light |

## Build Environment

| Component | Version |
|-----------|---------|
| ESPHome Device Builder | 2026.5.0 |
| Minimum ESPHome version | 2026.5.0 |
| Framework | ESP-IDF |
| UI library | LVGL 9.x |
| Firmware version | 0.5.5 |

## Firmware

The ESPHome device configurations are in [`esphome/`](../esphome):

| File | Device |
|------|--------|
| [`esphome/barcode-01.yaml`](../esphome/barcode-01.yaml) | Barcode-01 |
| [`esphome/barcode-02.yaml`](../esphome/barcode-02.yaml) | Barcode-02 |

Both configs reference secrets (WiFi, API encryption key, OTA and fallback-hotspot
passwords) via ESPHome `!secret` — provide these in your ESPHome `secrets.yaml` before
flashing. Superseded firmware snapshots are kept locally under `esphome/backups/`
(not published).

## User Flow

1. **Boot** → Splash screen shows company logo + version. Idle timer starts.
2. **Touch splash** → Mode selection page with 4 buttons: **Toevoegen** (Add),
   **Gebruiken** (Use), **Afdrukken** (Print), **Config**.
3. **Add / Use mode** → Enables GM67 scanner, shows product details page (barcode, stock,
   name, description). Scanned barcode fires a Home Assistant event
   (`esphome.scanner_product` or `esphome.scanner_generic`) with the barcode data. HA
   automations look up the product and push back name/description/stock to the display.
4. **Print mode** → Two toggle buttons to trigger shopping list or inventory list printing
   via HA switches.
5. **Config mode** → Three sliders to adjust idle brightness, on brightness, and idle timer
   duration.
6. **Idle timeout** → After configurable seconds of inactivity, returns to splash screen; a
   second timeout dims the backlight.

## Barcode Processing

- **Product barcodes** (EAN-13, UPC-A, EAN-8, ITF-14): Fires `esphome.scanner_product`
  event with the numeric barcode.
- **Generic QR codes** (prefixed `GENERIC:`): Fires `esphome.scanner_generic` event with
  the text payload (prefix stripped).
- HA automations handle product lookup and update the ESPHome `text` entities (product
  name, description, stock) which auto-update on the display.

## Key Components

### Display & UI (LVGL)

- **Top bar** — Gold header showing page title, HA connection icon, scanner status icon,
  and idle countdown.
- **Splash screen** — Full-screen overlay with logo, shown at boot and on idle return.
- **Pages** — Mode selection, product details, printing, and config — each managed via
  ESPHome scripts.
- **Styling** — Steel blue + gold theme with custom Arial fonts (14/20/24pt) and Material
  Design Icons.

### Scanner Module (GM67)

All configuration via raw UART hex commands:

- Trigger mode (button hold, trigger, continuous, automatic induction, host)
- Buzzer volume (off/low/medium/high)
- Scanning light & collimation behavior
- Same-code repeat delay (0.5s–7s or no repeat)
- Collimation flashing toggle
- Enable/disable scanning

### Idle & Timer System

- A 1-second `interval` counts down `timer_remaining`.
- On first expiry: returns to splash screen (if on a functional page) or dims backlight (if
  already on splash).
- Timer resets on scan events, page navigation, and slider interaction.

### Home Assistant Integration

- **API** with encryption key for HA connectivity.
- **Events** sent on scan: `esphome.scanner_product` / `esphome.scanner_generic`.
- **Text entities** receive product info back from HA (name, description, stock).
- **Switches** for print triggers and idle mode.
- **Info popup** (Barcode-01 & Barcode-02) exposes a `Popup` switch, `Popup Message` /
  `Popup Header` text fields, a `Color Info Popup` select, and `Popup Yes` / `Popup No`
  switches (see [Info Popup](#info-popup-barcode-01--barcode-02)).
- **Number entities** for brightness and timer settings (persisted, exposed in HA).
- **Select entities** expose scanner hardware configuration to HA.
- **OTA** and **captive portal** for maintenance.

> 📦 The Home Assistant automations, scripts, and dashboards that process the scanned
> barcodes and manage inventory are part of **this** repository (VH-Inventory). See the
> [Installation Guide](INSTALLATION.md) and [Product Manual](PRODUCT-MANUAL.md).

### Info Popup (Barcode-01 & Barcode-02)

An HA-controlled full-screen overlay for interactive prompts (e.g. confirmations from
VH-Inventory automations). Added in firmware **v0.7.0** on both large-screen scanners.

- **Overlay** — Covers the full screen below the top bar (or the whole screen when shown
  from the splash screen). Displayed on top of whatever page is currently active.
- **Show/hide** — Toggled by the **Popup** switch. Turning it off restores the exact
  screen (and top-bar title/color) that was showing before the popup appeared.
- **Message & header** — The body text is set via the **Popup Message** text entity; while
  shown, the top-bar title is temporarily replaced with the **Popup Header** text entity.
- **Top-bar color** — While shown, the top bar temporarily uses the color from the
  **Color Info Popup** select (same option list as *Color Add Mode* / *Color Use Mode*),
  restored on hide.
- **Buttons** — Two buttons, **Ja** (Yes) and **Nee** (No). Pressing one turns on the
  matching **Popup Yes** / **Popup No** switch so HA automations can read the response;
  HA turns them back off to reset the highlight.

| Entity | Type | Purpose |
|--------|------|---------|
| `switch.barcode_0X_popup` | switch | Show / hide the popup |
| `text.barcode_0X_popup_message` | text | Body message shown in the popup |
| `text.barcode_0X_popup_header` | text | Temporary top-bar title while shown |
| `select.barcode_0X_color_info_popup` | select | Temporary top-bar color while shown |
| `switch.barcode_0X_popup_yes` | switch | Set on when **Ja** is pressed (HA resets) |
| `switch.barcode_0X_popup_no` | switch | Set on when **Nee** is pressed (HA resets) |

> Replace `0X` with `01` (Barcode-01) or `02` (Barcode-02).

## Hardware Reference

Reference material for the components is in [`hardware/`](../hardware):

| Component | Folder | Contents |
|-----------|--------|----------|
| ESP32-WROOM-32D | [hardware/ESP-32-WROOM-32D](../hardware/ESP-32-WROOM-32D) | Board pinout diagrams, wiring connections |
| GM67 Barcode Scanner | [hardware/GM67](../hardware/GM67) | User manual (V1.3) |
| MSP2401 Display | [hardware/MSP2401](../hardware/MSP2401) | Display dimensions/size reference |
| EPSON TM-T20III Printer | [hardware/EPSON TM-T20III](../hardware/EPSON%20TM-T20III) | User guide, firmware updater, ePOS SDK, IP filtering guide |
