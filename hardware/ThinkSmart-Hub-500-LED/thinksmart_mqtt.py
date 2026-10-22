import json
import os
import signal
import sys
import threading
import time

import paho.mqtt.client as mqtt

from thinksmart_led import (
    ThinkSmartUsb,
    PRESETS,
)


SCRIPT_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

CONFIG_PATH = os.path.join(
    SCRIPT_DIR,
    "mqtt_config.json"
)

LIBUSB_PATH = os.path.join(
    SCRIPT_DIR,
    "libusb-1.0.dll"
)

VALID_COMMANDS = tuple(
    PRESETS.keys()
)

DEVICE_ID = "lenovo_thinksmart_hub500_led"
ENTITY_ID = "thinksmart_led_ring"

command_lock = threading.Lock()
stop_event = threading.Event()


def load_config():

    if not os.path.exists(CONFIG_PATH):
        raise FileNotFoundError(
            f"Configuration not found: {CONFIG_PATH}"
        )

    with open(
        CONFIG_PATH,
        "r",
        encoding="utf-8"
    ) as file:
        config = json.load(file)

    required = [
        "host",
        "port",
        "base_topic",
        "discovery_prefix",
    ]

    missing = [
        item
        for item in required
        if item not in config
    ]

    if missing:
        raise ValueError(
            "Missing configuration values: "
            + ", ".join(missing)
        )

    return config


CONFIG = load_config()

BASE_TOPIC = CONFIG[
    "base_topic"
].rstrip("/")

COMMAND_TOPIC = (
    f"{BASE_TOPIC}/set"
)

STATE_TOPIC = (
    f"{BASE_TOPIC}/state"
)

AVAILABILITY_TOPIC = (
    f"{BASE_TOPIC}/availability"
)

STATUS_TOPIC = (
    f"{BASE_TOPIC}/status"
)

DISCOVERY_TOPIC = (
    f"{CONFIG['discovery_prefix']}"
    f"/select/{DEVICE_ID}"
    f"/{ENTITY_ID}/config"
)


def discovery_payload():

    return {
        "name": "LED Ring",
        "unique_id": ENTITY_ID,

        "command_topic": COMMAND_TOPIC,
        "state_topic": STATE_TOPIC,

        "availability_topic": AVAILABILITY_TOPIC,
        "payload_available": "online",
        "payload_not_available": "offline",

        "options": [
            "green",
            "red",
            "white",
            "off",
        ],

        "icon": "mdi:led-strip-variant",

        "device": {
            "identifiers": [
                DEVICE_ID
            ],
            "name": "Lenovo ThinkSmart Hub 500",
            "manufacturer": "Lenovo",
            "model": "ThinkSmart Hub 500",
        },
    }


def publish_discovery(client):

    payload = json.dumps(
        discovery_payload(),
        separators=(",", ":")
    )

    result = client.publish(
        DISCOVERY_TOPIC,
        payload,
        qos=1,
        retain=True,
    )

    print(
        "Published Home Assistant discovery:",
        DISCOVERY_TOPIC,
        flush=True
    )

    return result


def publish_status(
    client,
    status,
    message=None
):

    payload = {
        "status": status,
        "timestamp": int(time.time()),
    }

    if message is not None:
        payload["message"] = str(message)

    client.publish(
        STATUS_TOPIC,
        json.dumps(payload),
        qos=1,
        retain=True,
    )


def set_led(command):

    if command not in PRESETS:
        raise ValueError(
            "Unsupported LED command: "
            f"{command}"
        )

    usage, state, mode = (
        PRESETS[command]
    )

    controller = ThinkSmartUsb(
        LIBUSB_PATH
    )

    try:
        controller.open()

        print(
            "Priming LED controller...",
            flush=True
        )

        controller.prime_hid_over_usb()

        print(
            f"Setting LED ring to {command}...",
            flush=True
        )

        controller.set_led(
            usage,
            state,
            mode
        )

    finally:
        controller.close()


def on_connect(
    client,
    userdata,
    flags,
    reason_code,
    properties
):

    if reason_code != 0:
        print(
            "MQTT connection failed:",
            reason_code,
            flush=True
        )

        return

    print(
        "Connected to MQTT broker.",
        flush=True
    )

    client.subscribe(
        COMMAND_TOPIC,
        qos=1
    )

    client.publish(
        AVAILABILITY_TOPIC,
        "online",
        qos=1,
        retain=True,
    )

    publish_discovery(
        client
    )

    publish_status(
        client,
        "ready"
    )

    print(
        "Subscribed to:",
        COMMAND_TOPIC,
        flush=True
    )


def on_disconnect(
    client,
    userdata,
    disconnect_flags,
    reason_code,
    properties
):

    print(
        "Disconnected from MQTT:",
        reason_code,
        flush=True
    )


def on_message(
    client,
    userdata,
    message
):

    try:
        command = (
            message.payload
            .decode("utf-8")
            .strip()
            .lower()
        )

    except UnicodeDecodeError:
        print(
            "Ignored non-UTF-8 MQTT payload.",
            flush=True
        )

        return

    print(
        f"Received LED command: {command}",
        flush=True
    )

    if command not in VALID_COMMANDS:
        error = (
            f"Invalid command: {command}. "
            f"Valid commands: "
            f"{', '.join(VALID_COMMANDS)}"
        )

        print(
            error,
            flush=True
        )

        publish_status(
            client,
            "error",
            error
        )

        return

    if not command_lock.acquire(
        blocking=False
    ):
        error = (
            "LED controller is already processing "
            "another command."
        )

        print(
            error,
            flush=True
        )

        publish_status(
            client,
            "busy",
            error
        )

        return

    try:
        publish_status(
            client,
            "working",
            command
        )

        set_led(
            command
        )

        client.publish(
            STATE_TOPIC,
            command,
            qos=1,
            retain=True,
        )

        publish_status(
            client,
            "ready",
            f"LED set to {command}"
        )

        print(
            f"LED successfully set to {command}.",
            flush=True
        )

    except Exception as error:
        print(
            f"LED command failed: "
            f"{type(error).__name__}: {error}",
            flush=True
        )

        publish_status(
            client,
            "error",
            f"{type(error).__name__}: {error}"
        )

    finally:
        command_lock.release()


def shutdown(
    client,
    signal_number=None,
    frame=None
):

    if stop_event.is_set():
        return

    stop_event.set()

    print(
        "Stopping ThinkSmart MQTT service...",
        flush=True
    )

    try:
        client.publish(
            AVAILABILITY_TOPIC,
            "offline",
            qos=1,
            retain=True,
        )

        time.sleep(0.25)

        client.disconnect()

    except Exception:
        pass


def main():

    print(
        "ThinkSmart LED MQTT service",
        flush=True
    )

    print(
        "===========================",
        flush=True
    )

    print(
        f"Broker: {CONFIG['host']}:{CONFIG['port']}",
        flush=True
    )

    print(
        f"Command topic: {COMMAND_TOPIC}",
        flush=True
    )

    client = mqtt.Client(
        callback_api_version=(
            mqtt.CallbackAPIVersion.VERSION2
        ),
        client_id=DEVICE_ID,
        protocol=mqtt.MQTTv311,
    )

    username = CONFIG.get(
        "username",
        ""
    )

    password = CONFIG.get(
        "password",
        ""
    )

    if username:
        client.username_pw_set(
            username,
            password
        )

    client.will_set(
        AVAILABILITY_TOPIC,
        payload="offline",
        qos=1,
        retain=True,
    )

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message

    signal.signal(
        signal.SIGINT,
        lambda sig, frame: shutdown(
            client,
            sig,
            frame
        )
    )

    signal.signal(
        signal.SIGTERM,
        lambda sig, frame: shutdown(
            client,
            sig,
            frame
        )
    )

    print(
        "Connecting to MQTT...",
        flush=True
    )

    client.connect(
        CONFIG["host"],
        int(CONFIG["port"]),
        keepalive=60,
    )

    try:
        client.loop_forever(
            retry_first_connection=True
        )

    except KeyboardInterrupt:
        shutdown(
            client
        )

    return 0


if __name__ == "__main__":

    try:
        raise SystemExit(
            main()
        )

    except Exception as error:
        print()
        print(
            "FATAL ERROR:",
            flush=True
        )

        print(
            f"{type(error).__name__}: {error}",
            flush=True
        )

        raise SystemExit(1)