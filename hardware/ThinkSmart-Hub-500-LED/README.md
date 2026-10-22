# ThinkSmart Hub 500 LED ring

Workstreams: general

Control the Lenovo ThinkSmart Hub 500 LED ring from Windows, locally or through
Home Assistant MQTT discovery. The supplied controller supports **green**, **red**,
**white** and **off**.

**Audience:** the administrator of the Windows ThinkSmart used for Keuken TS.
The original [Word installation guide](ThinkSmart_Hub_500_LED_Installation_Guide.docx)
is included alongside the scripts.

## Scope and assumptions

The supplied guide describes a Windows x64 setup using Python 3.13, libusb 1.0.30
and UsbDk 1.0.22, with Lenovo USB identity `17EF:A017`. Run the bridge on the
physical ThinkSmart, not on Home Assistant, WSL or a Docker container.
The hardware installation is optional and separate from the
[Keuken Touchscreen dashboard](../../docs/TOUCHSCREEN.md).

This package does not change inventory, install Home Assistant automations or add
LED-ring buttons to the dashboard. Once MQTT discovery succeeds, Home Assistant
provides a select entity that can be used independently or in your own automations.
The supplied scripts are preserved without behavior changes.

## Files

| File | Purpose |
|---|---|
| `thinksmart_led.py` | Working local controller, including `probe` and the four LED presets. |
| `thinksmart_mqtt.py` | MQTT bridge, discovery, availability and command/status publishing. |
| `libusb-1.0.dll` | Verified upstream x64 libusb DLL loaded by the controller. |
| `mqtt_config.example.json` | Public configuration template. Copy to `mqtt_config.json` and edit locally. |
| `requirements.txt` | MQTT dependency and the HID package used by the diagnostics. |
| `thinksmart_probe.py` | Standalone USB-access diagnostic. |
| `thinksmart_diag.py` | HID enumeration/read diagnostic; its output can contain device identifiers. |
| `thinksmart_led_test.py` | Earlier raw-HID experiments, not the supported controller or preset list. |
| `ThinkSmart_Hub_500_LED_Installation_Guide.docx` | Original public-safe Word installation guide. |
| `THIRD-PARTY-NOTICES.md`, `third_party\` | libusb provenance, license and corresponding source. |

`mqtt_config.json`, logs and Python caches are not published. A Git clone receives
the example configuration, not the installation's live broker settings.

## 1. Install prerequisites

1. Install **64-bit Python 3.13** from the
   [official Python Windows downloads](https://www.python.org/downloads/windows/).
   Confirm the interpreter and architecture:

   ```powershell
   py -0p
   py -3.13 --version
   py -3.13 -c "import struct; print(struct.calcsize('P') * 8)"
   ```

   The last command must print `64`, matching the bundled DLL. Python 3.13 is the
   version used in the supplied guide; other versions have not been established here.
2. Copy this directory to `C:\ThinkSmart LED` on the ThinkSmart, keeping the scripts
   and `libusb-1.0.dll` together. Install the Python dependencies:

   ```powershell
   Set-Location -LiteralPath 'C:\ThinkSmart LED'
   py -3.13 -m pip install -r requirements.txt
   ```

   The bridge uses paho-mqtt's version-2 callback API. `hidapi` is for the diagnostic
   scripts; the working LED controller uses libusb through Python's built-in ctypes.
3. Download `UsbDk_1.0.22_x64.msi` from the
   [official UsbDk release](https://github.com/daynix/UsbDk/releases/tag/v1.00-22).
   Install it from an elevated PowerShell window:

   ```powershell
   msiexec.exe /i "$env:USERPROFILE\Downloads\UsbDk_1.0.22_x64.msi"
   ```

   Restart Windows, then confirm that the ThinkSmart speakers and microphone
   still work. UsbDk is a kernel-level component; install it only on the intended host.

**Do not replace the ThinkSmart composite USB driver with Zadig or WinUSB.**
The supplied solution selects UsbDk through libusb while keeping the normal Windows
device-driver configuration.

## 2. Verify local access

Stop any running MQTT bridge or scheduled task before running manual commands.
Do not run multiple controller processes against the same device.

In an elevated PowerShell window on the ThinkSmart:

```powershell
Set-Location -LiteralPath 'C:\ThinkSmart LED'
py -3.13 -u thinksmart_led.py probe
```

Probe mode opens the device through UsbDk and sends no LED/register commands.
If access succeeds and you intend to change the physical ring, test the presets:

```powershell
py -3.13 -u thinksmart_led.py green
py -3.13 -u thinksmart_led.py red
py -3.13 -u thinksmart_led.py white
py -3.13 -u thinksmart_led.py off
```

Use `thinksmart_led.py`, not the earlier `thinksmart_led_test.py`, for normal control.
Diagnostic scripts can access USB at import time; do not import them in an
unrestricted recursive test run. Packaging/syntax checks do not prove physical
LED behavior.

## 3. Configure MQTT and Home Assistant

1. Provide an MQTT broker and configure Home Assistant's
   [MQTT integration](https://www.home-assistant.io/integrations/mqtt/).
   Create a dedicated broker account for the bridge.
2. If no live config exists, copy the public template:

   ```powershell
   Set-Location -LiteralPath 'C:\ThinkSmart LED'
   if (-not (Test-Path -LiteralPath '.\mqtt_config.json')) {
       Copy-Item -LiteralPath '.\mqtt_config.example.json' -Destination '.\mqtt_config.json'
   }
   notepad.exe '.\mqtt_config.json'
   ```

   Replace the documentation-only broker address, example username and password.
   Set the broker port, base topic and Home Assistant discovery prefix for your
   installation. Do not overwrite a working config with the example.
3. Start one bridge process:

   ```powershell
   py -3.13 -u thinksmart_mqtt.py
   ```

   It publishes retained discovery information, then accepts LED commands.
   In Home Assistant, find **Lenovo ThinkSmart Hub 500**, with its **LED Ring**
   select entity. Choose green, red, white or off. Use the actual discovered entity
   ID rather than assuming a particular name.

With the example's base topic, the bridge uses:

| Topic | Direction and payload |
|---|---|
| `thinksmart/keuken/led/set` | Subscribe; `green`, `red`, `white` or `off`. |
| `thinksmart/keuken/led/state` | Publish retained; last command completed successfully. |
| `thinksmart/keuken/led/availability` | Publish retained; `online` or `offline`, including an offline last will. |
| `thinksmart/keuken/led/status` | Publish retained JSON; ready, working, busy or error information. |
| `homeassistant/select/lenovo_thinksmart_hub500_led/thinksmart_led_ring/config` | Retained Home Assistant discovery configuration. |

Availability describes the MQTT bridge connection, not continuous USB-health or
physical-color monitoring. A command failure is reported on the status topic.
The client ID and discovery identifiers are fixed in the supplied code: do not run
a second bridge instance or assume changing only the base topic supports another Hub.

## 4. Start with Windows

After the manual MQTT test succeeds, stop that process and create a Task Scheduler
task on the ThinkSmart:

| Setting | Value |
|---|---|
| Trigger | At startup, optionally delayed by 30 seconds. |
| Account | An account authorized to access the device and local config. |
| Security options | Run whether the user is logged on or not; run with highest privileges, as in the supplied guide. |
| Program/script | The absolute Python 3.13 executable path. Obtain it with `py -3.13 -c "import sys; print(sys.executable)"`. |
| Arguments | `-u "C:\ThinkSmart LED\thinksmart_mqtt.py"` |
| Start in | `C:\ThinkSmart LED` |
| Failure recovery | Restart after one minute. |
| Already running | Do not start a new instance. |

Test the task, then restart Windows and verify MQTT availability and normal
audio operation. Failure recovery is important when the broker is unavailable
during initial startup. Stopping the bridge does not itself turn the ring off.

## Security and troubleshooting

Keep the real `mqtt_config.json` outside Git and restrict access to the scheduled
account and administrators. The supplied bridge uses plain MQTT TCP and has no
TLS configuration; changing the port alone does not enable encryption. Use a
trusted, isolated LAN and never expose this broker connection to the internet.
Restrict broker permissions to the command subscription, state/availability/status
publishes and the specific discovery topic.

If USB access fails, check Python/DLL architecture, elevation, UsbDk installation,
device identity and competing controller processes. If discovery fails, check the
broker credentials, topic ACLs and discovery prefix. Invalid commands and USB
failures are reported by the bridge rather than treated as successful LED changes.

See [third-party notices](THIRD-PARTY-NOTICES.md) before redistributing libusb.
The full source archive and license accompany the DLL in this directory.
