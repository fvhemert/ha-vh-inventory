import hid
import time

VID = 0x17EF
PID = 0xA017

print("ThinkSmart Hub HID diagnostic")
print(f"Looking for VID={VID:04X} PID={PID:04X}")
print()

# ------------------------------------------------------------
# Locate vendor-specific Col03
# ------------------------------------------------------------

devices = hid.enumerate(VID, PID)

print(f"Found {len(devices)} HID collections")
print()

target = None

for i, dev in enumerate(devices):
    print(f"Collection {i}")
    print(f"  Path:             {dev['path']}")
    print(f"  Interface:        {dev.get('interface_number')}")
    print(f"  Usage page:       0x{dev.get('usage_page', 0):04X}")
    print(f"  Usage:            0x{dev.get('usage', 0):04X}")
    print(f"  Manufacturer:     {dev.get('manufacturer_string')}")
    print(f"  Product:          {dev.get('product_string')}")
    print(f"  Serial:           {dev.get('serial_number')}")
    print()

    # Vendor-defined usage page and interface 5
    if (
        dev.get("usage_page") == 0xFF00
        and dev.get("interface_number") == 5
    ):
        target = dev


if target is None:
    print("ERROR: Col03 / vendor-defined HID collection not found.")
    raise SystemExit(1)


print("=" * 65)
print("TARGET")
print("=" * 65)
print(f"Path:       {target['path']}")
print(f"Usage page: 0x{target['usage_page']:04X}")
print(f"Usage:      0x{target['usage']:04X}")
print(f"Interface:  {target['interface_number']}")
print()

# ------------------------------------------------------------
# Open target
# ------------------------------------------------------------

device = hid.device()

try:
    print("Opening Col03...")
    device.open_path(target["path"])

    print("SUCCESS: Col03 opened")
    print()

    try:
        print("Manufacturer:", device.get_manufacturer_string())
    except Exception as e:
        print("Manufacturer read failed:", e)

    try:
        print("Product:", device.get_product_string())
    except Exception as e:
        print("Product read failed:", e)

    try:
        print("Serial:", device.get_serial_number_string())
    except Exception as e:
        print("Serial read failed:", e)

    print()

    # --------------------------------------------------------
    # Passive HID input read
    # --------------------------------------------------------

    print("=" * 65)
    print("PASSIVE INPUT TEST")
    print("=" * 65)

    device.set_nonblocking(True)

    print("Listening for HID input for 5 seconds...")
    print("Try pressing buttons on the ThinkSmart during this period.")
    print()

    end_time = time.time() + 5

    received = False

    while time.time() < end_time:

        try:
            data = device.read(64, timeout_ms=100)

            if data:
                received = True

                print("Input report:")
                print("  Decimal :", data)
                print(
                    "  Hex     :",
                    " ".join(f"{x:02X}" for x in data)
                )

        except Exception as e:
            print("Input read error:", e)
            break

        time.sleep(0.05)

    if not received:
        print("No input reports received.")

    print()

    # --------------------------------------------------------
    # FEATURE REPORT PROBE
    #
    # This only ATTEMPTS reads.
    # We deliberately do NOT call:
    #
    #     write()
    #     send_feature_report()
    #
    # --------------------------------------------------------

    print("=" * 65)
    print("FEATURE REPORT READ TEST")
    print("=" * 65)
    print()

    for report_id in range(0, 16):

        try:
            data = device.get_feature_report(report_id, 64)

            if data:
                print(
                    f"Feature report 0x{report_id:02X}:",
                    " ".join(f"{x:02X}" for x in data)
                )

            else:
                print(
                    f"Feature report 0x{report_id:02X}: empty"
                )

        except Exception as e:
            print(
                f"Feature report 0x{report_id:02X}: "
                f"not available ({e})"
            )

    print()
    print("=" * 65)
    print("Diagnostic complete")
    print("=" * 65)

finally:

    try:
        device.close()
        print("HID device closed.")
    except Exception:
        pass