import hid
import sys

VID = 0x17EF
PID = 0xA017
USAGE_PAGE = 0xFF00

COMMANDS = {
    "white":           [0x02, 0x00, 0x00],
    "green":           [0x02, 0x01, 0x00],
    "red":             [0x02, 0x04, 0x00],
    "breathing_green": [0x02, 0x02, 0x00],
    "breathing_white": [0x02, 0x08, 0x00],
    "rotating_green":  [0x02, 0x40, 0x00],
}


def find_col03():
    for device in hid.enumerate(VID, PID):

        if (
            device.get("interface_number") == 5
            and device.get("usage_page") == USAGE_PAGE
        ):
            return device

    return None


if len(sys.argv) != 2 or sys.argv[1].lower() not in COMMANDS:
    print("Usage:")
    print("  py -3.13 thinksmart_led_test.py COLOR")
    print()
    print("Colors:")
    for color in COMMANDS:
        print(" ", color)
    sys.exit(1)


color = sys.argv[1].lower()

target = find_col03()

if not target:
    print("ERROR: ThinkSmart vendor HID collection not found")
    sys.exit(1)

print("ThinkSmart LED test")
print("-------------------")
print("Path :", target["path"])
print("Color:", color)
print(
    "Data :",
    " ".join(f"{b:02X}" for b in COMMANDS[color])
)
print()

dev = hid.device()

try:
    print("Opening Col03...")
    dev.open_path(target["path"])
    print("Opened successfully.")

    print()
    print(f"Sending {color} command...")

    result = dev.write(COMMANDS[color])

    print(f"HID write returned: {result}")
    print()
    print("Look at the LED ring.")

except Exception as e:
    print()
    print("ERROR:", repr(e))

finally:
    try:
        dev.close()
    except Exception:
        pass