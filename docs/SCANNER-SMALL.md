# Small screen barcode scanner with printer (ESPHome)

> **Status: work in progress.** This document is a starting point for the
> **Small screen barcode scanner with printer** (**scanner-01**). The device firmware has
> been imported from the production Home Assistant server; the full write-up (user flow,
> printing, wiring diagrams, screenshots) is still to be completed.

This is a second, distinct scanner family for VH-Inventory, separate from the touchscreen
[Large screen barcode scanners](SCANNER.md) (Barcode-01 / Barcode-02). It pairs a small
OLED display with an integrated **thermal printer**, so it can both scan products and print
lists directly.

## Overview

An **ESP8266**-based barcode scanner with an integrated thermal printer, built with
**ESPHome**. It connects a **GM67 barcode scanner module** and a **UART thermal printer** to
**Home Assistant**, with a small **SSD1306 OLED** for on-device status/feedback and two
buttons + two LEDs for control.

Firmware project: `vanhemert.scanner01`, version **1.05**.

## Firmware

| File | Device |
|------|--------|
| [`esphome/scanner-01.yaml`](../esphome/scanner-01.yaml) | scanner-01 |

The config references its WiFi credentials and API encryption key via ESPHome `!secret`
(`wifi_ssid2`, `wifi_password2`, `scanner_01_api_encryption_key`) — provide these in your
ESPHome `secrets.yaml` before flashing.

> ✅ **API key:** both the repository and the production copies of `scanner-01.yaml` use
> `key: !secret scanner_01_api_encryption_key`, with the value stored in the ESPHome
> `secrets.yaml`. When flashing on a fresh setup, make sure that secret is defined. The
> effective key is unchanged, so the `!secret` form only takes effect on the next
> ESPHome build/flash of the device.

## Hardware (from the firmware config)

| Component | Details |
|-----------|---------|
| MCU | ESP8266 (`esp01_1m` board) |
| Display | SSD1306 OLED via I²C (address `0x3C`, SDA `GPIO04`, SCL `GPIO05`) |
| Scanner | GM67 barcode/QR module via UART (RX `GPIO03`, TX `GPIO01`) |
| Printer | UART thermal printer (RX `GPIO14`, TX `GPIO12`) |
| Inputs | Two buttons (`GPIO00`, `GPIO02`) |
| Indicators | Two LEDs (`GPIO13` left, `GPIO15` right) |

Minimum ESPHome version: `2024.11.0`.

## Home Assistant integration

- **API** with encryption key for HA connectivity.
- Exposes a `write` action/service to support **printing** from Home Assistant.
- Uses the same VH-Inventory backend (this repository) to look up scanned products and drive
  the inventory — see the [Installation Guide](INSTALLATION.md).

## TODO (future work)

- [ ] Document the on-device user flow (scan → add/use, printing, button roles).
- [ ] Document the thermal-printer wiring and the specific printer model used.
- [ ] Add device photos to `docs/images/scanner/`.
- [ ] Add hardware reference material (ESP8266 pinout, SSD1306, printer) under `hardware/`.
