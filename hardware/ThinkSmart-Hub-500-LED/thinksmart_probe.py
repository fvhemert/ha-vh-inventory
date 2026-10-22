import ctypes
import os
import sys

VID = 0x17EF
PID = 0xA017

LIBUSB_OPTION_USE_USBDK = 1

dll = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "libusb-1.0.dll"
)

print("ThinkSmart USB probe v2", flush=True)
print("-----------------------", flush=True)
print("DLL:", dll, flush=True)

if not os.path.exists(dll):
    print("ERROR: DLL not found", flush=True)
    sys.exit(1)

usb = ctypes.WinDLL(dll)
print("libusb loaded.", flush=True)

usb.libusb_init.argtypes = [
    ctypes.POINTER(ctypes.c_void_p)
]
usb.libusb_init.restype = ctypes.c_int

usb.libusb_set_option.restype = ctypes.c_int

usb.libusb_open_device_with_vid_pid.argtypes = [
    ctypes.c_void_p,
    ctypes.c_uint16,
    ctypes.c_uint16
]
usb.libusb_open_device_with_vid_pid.restype = ctypes.c_void_p

usb.libusb_close.argtypes = [ctypes.c_void_p]
usb.libusb_exit.argtypes = [ctypes.c_void_p]

context = ctypes.c_void_p()

#
# STEP 1: initialize normally
#
print("Initializing libusb...", flush=True)

result = usb.libusb_init(
    ctypes.byref(context)
)

print("libusb_init returned:", result, flush=True)

if result < 0:
    print("ERROR: normal libusb initialization failed")
    sys.exit(1)

#
# STEP 2: switch this context to UsbDk
#
print("Selecting UsbDk backend...", flush=True)

result = usb.libusb_set_option(
    context,
    LIBUSB_OPTION_USE_USBDK
)

print(
    "libusb_set_option returned:",
    result,
    flush=True
)

if result < 0:
    print("ERROR: UsbDk backend selection failed")
    usb.libusb_exit(context)
    sys.exit(1)

#
# STEP 3: attempt to open Lenovo device
#
print("Opening 17EF:A017...", flush=True)

handle = usb.libusb_open_device_with_vid_pid(
    context,
    VID,
    PID
)

if not handle:
    print("ERROR: Device could not be opened")
    usb.libusb_exit(context)
    sys.exit(1)

print()
print("*** PROBE SUCCESS ***", flush=True)
print(
    "ThinkSmart 17EF:A017 opened successfully.",
    flush=True
)
print(
    "No LED/register commands were sent.",
    flush=True
)

usb.libusb_close(handle)
usb.libusb_exit(context)

print("Device closed.", flush=True)
