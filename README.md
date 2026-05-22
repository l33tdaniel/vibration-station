# Vibration Station

Free, open-source web app to control XIAO nRF52840 vibration devices over Bluetooth LE.
No login, no backend, no build step — the entire app is one HTML file. Built for
caregivers/researchers to connect up to 4 devices and control power and frequency,
globally or per device. Works offline after first load.

## Files

| File         | Purpose                                                        |
|--------------|----------------------------------------------------------------|
| `index.html` | The whole app — markup, styles, and logic, no dependencies.    |
| `sw.js`      | Tiny service worker for offline caching (browsers forbid inlining it). |
| `Bluetooth_Board_Code.ino` | Reference firmware for the XIAO nRF52840 board.  |

## Use it

Web Bluetooth needs a **secure context (HTTPS)**, so host the two files on any static
host (GitHub Pages, Cloudflare Pages — both free) and open the URL:

- **Android / desktop:** open the URL in **Chrome** or **Edge**.
- **iPhone / iPad:** install the free **Bluefy** browser, then open the URL inside it.
  (Safari does not support Web Bluetooth.)

Add `?fake` to the URL (e.g. `…/index.html?fake`) to run the UI against an in-memory
fake BLE service — no hardware needed.

### Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/` (localhost is the only non-HTTPS context the
browser allows for Web Bluetooth). Opening `index.html` directly via `file://` shows
the UI but disables Bluetooth and offline caching.

## Firmware contract

Devices advertise a custom GATT service (UUIDs near the top of `index.html`) with two
write characteristics:

| Characteristic | Type        | Value                  |
|----------------|-------------|------------------------|
| Power          | `uint8`     | `0` (off) / `1` (on)   |
| Frequency      | `uint16` LE | Hz, range **80–160**   |

Intensity/amplitude is not part of v1 (the motor is frequency-only via `tone()`).
`Bluetooth_Board_Code.ino` is the current reference firmware; it will be upgraded to
expose the custom service and these two characteristics. Replace the placeholder UUIDs
in `index.html` (`SERVICE_UUID`, `POWER_CHAR_UUID`, `FREQ_CHAR_UUID`) with the
firmware's real UUIDs.

## History

The original Vite + TypeScript PWA (with a Vitest suite) lives in this repo's git
history before the single-file collapse — `git log` to recover it.
