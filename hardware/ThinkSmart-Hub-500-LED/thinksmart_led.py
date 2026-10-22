import ctypes
import os
import sys
import time


# =========================================================
# ThinkSmart USB identity
# =========================================================

VID = 0x17EF
PID = 0xA017


# =========================================================
# LED presets
#
# Format:
#   command: (FEF7, FEF8, FEEE)
# =========================================================

PRESETS = {
    "off":   (0x4F, 0x00, 0x02),
    "red":   (0x09, 0x00, 0x02),
    "green": (0x17, 0x01, 0x02),
    "white": (0x3D, 0x00, 0x02),
}


# =========================================================
# LED controller registers
# =========================================================

R_FE96 = 0xFE96
R_FEF7 = 0xFEF7
R_FEF8 = 0xFEF8
R_FEF9 = 0xFEF9
R_FEFA = 0xFEFA
R_FEEE = 0xFEEE
R_FEEF = 0xFEEF

MOTOR_BIT = 0x08
DONE_BIT = 0x40


# =========================================================
# libusb constants
# =========================================================

LIBUSB_OPTION_USE_USBDK = 1

LIBUSB_ENDPOINT_IN = 0x80
LIBUSB_ENDPOINT_OUT = 0x00

LIBUSB_REQUEST_TYPE_VENDOR = 0x40
LIBUSB_REQUEST_TYPE_CLASS = 0x20

LIBUSB_RECIPIENT_DEVICE = 0x00
LIBUSB_RECIPIENT_INTERFACE = 0x01

REQUEST_READ = 0x25
REQUEST_WRITE = 0x24

TIMEOUT_MS = 2000


# =========================================================
# HID SET_REPORT values
# =========================================================

HID_SET_REPORT = 0x09
HID_REPORT_TYPE_FEATURE = 0x03
HID_INTERFACE_NUMBER = 5
HID_REPORT_ID = 2
HID_REPORT_LENGTH = 64


class LibUsbError(RuntimeError):
    pass


class ThinkSmartUsb:

    def __init__(self, dll_path):

        if not os.path.exists(dll_path):
            raise FileNotFoundError(
                f"libusb DLL not found: {dll_path}"
            )

        print(
            "Loading libusb:",
            flush=True
        )

        print(
            f"  {dll_path}",
            flush=True
        )

        self.usb = ctypes.WinDLL(
            dll_path
        )

        self.context = ctypes.c_void_p()
        self.handle = ctypes.c_void_p()

        self.configure_api()


    # =====================================================
    # Configure ctypes function definitions
    # =====================================================

    def configure_api(self):

        self.usb.libusb_init.argtypes = [
            ctypes.POINTER(
                ctypes.c_void_p
            )
        ]

        self.usb.libusb_init.restype = (
            ctypes.c_int
        )

        self.usb.libusb_set_option.restype = (
            ctypes.c_int
        )

        self.usb.libusb_open_device_with_vid_pid.argtypes = [
            ctypes.c_void_p,
            ctypes.c_uint16,
            ctypes.c_uint16,
        ]

        self.usb.libusb_open_device_with_vid_pid.restype = (
            ctypes.c_void_p
        )

        self.usb.libusb_control_transfer.argtypes = [
            ctypes.c_void_p,
            ctypes.c_uint8,
            ctypes.c_uint8,
            ctypes.c_uint16,
            ctypes.c_uint16,
            ctypes.POINTER(
                ctypes.c_ubyte
            ),
            ctypes.c_uint16,
            ctypes.c_uint,
        ]

        self.usb.libusb_control_transfer.restype = (
            ctypes.c_int
        )

        self.usb.libusb_close.argtypes = [
            ctypes.c_void_p
        ]

        self.usb.libusb_close.restype = None

        self.usb.libusb_exit.argtypes = [
            ctypes.c_void_p
        ]

        self.usb.libusb_exit.restype = None

        if hasattr(
            self.usb,
            "libusb_error_name"
        ):
            self.usb.libusb_error_name.argtypes = [
                ctypes.c_int
            ]

            self.usb.libusb_error_name.restype = (
                ctypes.c_char_p
            )


    # =====================================================
    # Error handling
    # =====================================================

    def error_name(self, result):

        if hasattr(
            self.usb,
            "libusb_error_name"
        ):
            value = self.usb.libusb_error_name(
                result
            )

            if value:
                return value.decode(
                    "ascii",
                    errors="replace"
                )

        return f"libusb error {result}"


    # =====================================================
    # Open and close
    # =====================================================

    def open(self):

        if (
            self.handle
            and self.handle.value
        ):
            return

        print(
            "Initializing libusb...",
            flush=True
        )

        result = self.usb.libusb_init(
            ctypes.byref(
                self.context
            )
        )

        print(
            f"libusb_init returned: {result}",
            flush=True
        )

        if result < 0:
            raise LibUsbError(
                "libusb_init failed: "
                + self.error_name(result)
            )

        print(
            "Selecting UsbDk backend...",
            flush=True
        )

        result = self.usb.libusb_set_option(
            self.context,
            LIBUSB_OPTION_USE_USBDK
        )

        print(
            "libusb_set_option returned: "
            f"{result}",
            flush=True
        )

        if result < 0:
            self.usb.libusb_exit(
                self.context
            )

            self.context = (
                ctypes.c_void_p()
            )

            raise LibUsbError(
                "UsbDk selection failed: "
                + self.error_name(result)
            )

        print(
            f"Opening {VID:04X}:{PID:04X}...",
            flush=True
        )

        handle = (
            self.usb.libusb_open_device_with_vid_pid(
                self.context,
                VID,
                PID
            )
        )

        if not handle:
            self.usb.libusb_exit(
                self.context
            )

            self.context = (
                ctypes.c_void_p()
            )

            raise LibUsbError(
                "Could not open ThinkSmart "
                "17EF:A017 through UsbDk"
            )

        self.handle = ctypes.c_void_p(
            handle
        )

        print(
            "USB device opened successfully.",
            flush=True
        )


    def close(self):

        if (
            self.handle
            and self.handle.value
        ):
            print(
                "Closing USB device...",
                flush=True
            )

            self.usb.libusb_close(
                self.handle
            )

            self.handle = (
                ctypes.c_void_p()
            )

        if (
            self.context
            and self.context.value
        ):
            print(
                "Shutting down libusb...",
                flush=True
            )

            self.usb.libusb_exit(
                self.context
            )

            self.context = (
                ctypes.c_void_p()
            )


    # =====================================================
    # HID Feature Report 2 over endpoint 0
    # =====================================================

    def prime_hid_over_usb(self):
        """
        Send HID Feature Report ID 2 as a class-specific
        SET_REPORT control transfer through USB endpoint 0.
        """

        report = (
            ctypes.c_ubyte
            * HID_REPORT_LENGTH
        )()

        # The first byte contains the report ID.
        report[0] = HID_REPORT_ID

        # Host-to-device | Class | Interface
        request_type = (
            LIBUSB_ENDPOINT_OUT
            | LIBUSB_REQUEST_TYPE_CLASS
            | LIBUSB_RECIPIENT_INTERFACE
        )

        # High byte: report type 3, Feature
        # Low byte: report ID 2
        value = (
            HID_REPORT_TYPE_FEATURE << 8
        ) | HID_REPORT_ID

        print(
            "Sending HID Feature Report 2 "
            "over USB endpoint 0...",
            flush=True
        )

        print(
            f"  bmRequestType = 0x{request_type:02X}",
            flush=True
        )

        print(
            f"  bRequest      = 0x{HID_SET_REPORT:02X}",
            flush=True
        )

        print(
            f"  wValue        = 0x{value:04X}",
            flush=True
        )

        print(
            f"  wIndex        = {HID_INTERFACE_NUMBER}",
            flush=True
        )

        print(
            f"  length        = {HID_REPORT_LENGTH}",
            flush=True
        )

        result = self.usb.libusb_control_transfer(
            self.handle,
            request_type,
            HID_SET_REPORT,
            value,
            HID_INTERFACE_NUMBER,
            report,
            HID_REPORT_LENGTH,
            TIMEOUT_MS,
        )

        print(
            "HID USB SET_REPORT returned: "
            f"{result}",
            flush=True
        )

        if result != HID_REPORT_LENGTH:
            raise LibUsbError(
                "USB HID SET_REPORT failed: "
                + self.error_name(result)
            )

        print(
            "USB HID Feature Report 2 succeeded.",
            flush=True
        )


    # =====================================================
    # Vendor register access
    # =====================================================

    def read_register(
        self,
        address
    ):

        data = (
            ctypes.c_ubyte * 1
        )()

        request_type = (
            LIBUSB_ENDPOINT_IN
            | LIBUSB_REQUEST_TYPE_VENDOR
            | LIBUSB_RECIPIENT_DEVICE
        )

        result = self.usb.libusb_control_transfer(
            self.handle,
            request_type,
            REQUEST_READ,
            0,
            address,
            data,
            1,
            TIMEOUT_MS
        )

        if result != 1:
            raise LibUsbError(
                f"Read 0x{address:04X} failed: "
                + self.error_name(result)
            )

        return data[0]


    def write_register(
        self,
        address,
        value
    ):

        data = (
            ctypes.c_ubyte * 1
        )(
            value & 0xFF
        )

        request_type = (
            LIBUSB_ENDPOINT_OUT
            | LIBUSB_REQUEST_TYPE_VENDOR
            | LIBUSB_RECIPIENT_DEVICE
        )

        result = self.usb.libusb_control_transfer(
            self.handle,
            request_type,
            REQUEST_WRITE,
            0,
            address,
            data,
            1,
            TIMEOUT_MS
        )

        if result != 1:
            raise LibUsbError(
                f"Write "
                f"0x{address:04X}="
                f"0x{value:02X} failed: "
                + self.error_name(result)
            )


    # =====================================================
    # LED operation
    # =====================================================

    def set_led(
        self,
        usage,
        state,
        mode
    ):

        print(
            "Reading controller FE96...",
            flush=True
        )

        current = self.read_register(
            R_FE96
        )

        print(
            f"FE96 = 0x{current:02X}",
            flush=True
        )

        print(
            "Enabling LED controller...",
            flush=True
        )

        self.write_register(
            R_FE96,
            current | MOTOR_BIT
        )

        try:
            print(
                "Writing LED parameters...",
                flush=True
            )

            self.write_register(
                R_FEF7,
                usage
            )

            self.write_register(
                R_FEF8,
                state
            )

            self.write_register(
                R_FEF9,
                0x00
            )

            self.write_register(
                R_FEFA,
                0x00
            )

            self.write_register(
                R_FEEE,
                mode
            )

            self.write_register(
                R_FEEF,
                0x80
            )

            print(
                "Waiting for LED controller...",
                flush=True
            )

            completed = False

            for _ in range(200):
                status = self.read_register(
                    R_FEEF
                )

                if status & DONE_BIT:
                    completed = True
                    break

                time.sleep(
                    0.005
                )

            if not completed:
                raise TimeoutError(
                    "LED controller did not "
                    "signal completion"
                )

        finally:
            current = self.read_register(
                R_FE96
            )

            self.write_register(
                R_FE96,
                current & ~MOTOR_BIT
            )


# =========================================================
# Main program
# =========================================================

def main():

    if len(sys.argv) != 2:
        print(
            "Usage:",
            flush=True
        )

        print(
            "  py -3.13 thinksmart_led.py probe"
        )

        print(
            "  py -3.13 thinksmart_led.py green"
        )

        print(
            "  py -3.13 thinksmart_led.py red"
        )

        print(
            "  py -3.13 thinksmart_led.py white"
        )

        print(
            "  py -3.13 thinksmart_led.py off"
        )

        return 2

    command = (
        sys.argv[1]
        .strip()
        .lower()
    )

    if (
        command != "probe"
        and command not in PRESETS
    ):
        print(
            f"Unknown command: {command}",
            flush=True
        )

        return 2

    script_dir = os.path.dirname(
        os.path.abspath(__file__)
    )

    dll_path = os.path.join(
        script_dir,
        "libusb-1.0.dll"
    )

    print()
    print(
        "ThinkSmart Hub LED controller",
        flush=True
    )

    print(
        "=============================",
        flush=True
    )

    print(
        f"Command: {command}",
        flush=True
    )

    print()

    controller = ThinkSmartUsb(
        dll_path
    )

    try:
        controller.open()

        # -------------------------------------------------
        # Probe mode
        # -------------------------------------------------

        if command == "probe":
            print()
            print(
                "*** PROBE SUCCESS ***",
                flush=True
            )

            print(
                "17EF:A017 opened successfully.",
                flush=True
            )

            print(
                "No LED/register commands sent.",
                flush=True
            )

            return 0

        # -------------------------------------------------
        # Real LED command
        # -------------------------------------------------

        print()
        print(
            "Priming LED controller over USB...",
            flush=True
        )

        controller.prime_hid_over_usb()

        usage, state, mode = PRESETS[
            command
        ]

        print()
        print(
            "LED preset:",
            flush=True
        )

        print(
            f"  FEF7 = 0x{usage:02X}",
            flush=True
        )

        print(
            f"  FEF8 = 0x{state:02X}",
            flush=True
        )

        print(
            f"  FEEE = 0x{mode:02X}",
            flush=True
        )

        print()

        controller.set_led(
            usage,
            state,
            mode
        )

        print()
        print(
            f"SUCCESS: LED set to {command}",
            flush=True
        )

        return 0

    finally:
        controller.close()


# =========================================================
# Entry point
# =========================================================

if __name__ == "__main__":

    try:
        raise SystemExit(
            main()
        )

    except Exception as error:
        print()
        print(
            "ERROR:",
            flush=True
        )

        print(
            f"{type(error).__name__}: "
            f"{error}",
            flush=True
        )

        raise SystemExit(1)