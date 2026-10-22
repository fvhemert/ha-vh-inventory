# Third-party component: libusb

The bundled `libusb-1.0.dll` is libusb 1.0.30, the x64 DLL from
`VS2022/MS64/dll/libusb-1.0.dll` in the
[official Windows release](https://github.com/libusb/libusb/releases/tag/v1.0.30).
It is unmodified and licensed under the **GNU Lesser General Public License,
version 2.1 or later**, not the repository's MIT license.

The full license is included in [third_party/libusb-LGPL-2.1.txt](third_party/libusb-LGPL-2.1.txt).
The complete upstream release source, including build files and copyright notices,
is included in [third_party/libusb-1.0.30.tar.bz2](third_party/libusb-1.0.30.tar.bz2).
Keep the license and corresponding source available when redistributing this DLL.
The Python controller loads the DLL dynamically; it can be replaced with a
compatible build. No library modification is required by this package.

## Provenance

The supplied DLL was compared byte-for-byte with the official archive member.
Archive digests were checked against GitHub's release-asset SHA-256 metadata.
This is a content-integrity check, not a verification of a digital signature.
The DLL has no Authenticode signature.

| File | SHA-256 |
|---|---|
| `libusb-1.0.dll` | `7cbf37e76dae9c840c7e8dbf7348ee8897dcc86c8ba45e46ada60b89411569f7` |
| Official `libusb-1.0.30.7z` | `7fb1dfec805b97983763d7d0ae244320da12add1003d4249c96cc4d586398c79` |
| `third_party/libusb-1.0.30.tar.bz2` | `fea36f34f9156400209595e300840767ab1a385ede1dc7ee893015aea9c6dbaf` |

Upstream: <https://libusb.info/> and
<https://github.com/libusb/libusb/tree/v1.0.30>.
UsbDk, Python, hidapi and paho-mqtt are separate dependencies installed by the
operator; their installers/packages are not bundled here.
