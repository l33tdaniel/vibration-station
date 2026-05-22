# Vibration Station — Device Control PWA

**Date:** 2026-05-22
**Status:** Approved design

## Purpose

A free, open-source web app for a PhD research team to control wearable vibration
devices used by low-functioning individuals with autism. Operated by a
caregiver/researcher. Lets them connect up to 4 devices, turn them on/off, and
change frequency and intensity — globally across all devices or per device. No
login. Must work on iPad, iPhone, and Android, and must keep working when
internet is poor.

## Constraints

- Free and open source. No App Store fee, no native published app, no backend.
- Devices: Seeed Studio XIAO nRF52840, BLE only, firmware written by the team.
- Must run on iPad, iPhone, Android (phone/tablet); desktop is a bonus.
- Up to 4 devices controlled from one phone/tablet at once.
- Sync = same settings, loose timing (a few hundred ms spread is acceptable).
- Must function offline after first load.

## Platform decision

Web Bluetooth is the access path to BLE. It works natively in Chrome/Edge on
Android and desktop. **Safari on iOS/iPadOS does not support Web Bluetooth** and
Apple forces all iOS browsers onto the Safari engine, so plain Safari/Chrome/
Firefox on iPhone/iPad cannot do BLE.

Free path that covers all required platforms:

- **Android + desktop:** open the PWA URL in Chrome/Edge — Web Bluetooth native.
- **iPad + iPhone:** open the PWA URL inside **Bluefy**, a free third-party
  browser that adds Web Bluetooth to iOS. User installs Bluefy once.

This keeps a single open-source PWA codebase, hosted free as static files, with
no App Store fee. Capacitor hybrid (wrap the same web code + native BLE plugin,
sideload) is held as a fallback only if Bluefy's offline caching or device
reconnection proves too weak in real-device testing.

**Stack:** Vanilla TypeScript + Vite + Web Bluetooth, with a PWA/service-worker
plugin. No UI framework — the app is small (connect screen + control screen) and
this maximizes longevity and ease of handoff for a multi-year research tool.

## Architecture

Static PWA. No backend, no login, no server logic. All logic client-side.
Hosted as static files (GitHub Pages or Cloudflare Pages). A service worker
precaches the app shell for full offline operation; BLE itself needs no network.

```
[Caregiver's phone/tablet browser]
  ├─ UI (connect screen + control screen)
  ├─ State (global settings + per-device overrides, localStorage)
  ├─ BLE service ──BLE──► XIAO #1
  │                ──BLE──► XIAO #2  (up to 4)
  │                ──BLE──► XIAO #3
  │                ──BLE──► XIAO #4
  └─ Service worker (offline cache)
```

## GATT contract (shared firmware ↔ app spec)

One custom 128-bit **service UUID**, advertised by the firmware so the browser
device chooser filters for these devices only. Three write characteristics, kept
separate for clarity:

| Characteristic | Type  | Value                                  |
|----------------|-------|----------------------------------------|
| Power          | write | uint8 — 0 / 1                          |
| Frequency      | write | uint16 — Hz (range TBD by firmware)    |
| Intensity      | write | uint8 — 0–100                          |

Optional later (out of scope for v1): battery/status notify characteristic.

**To confirm with firmware team:** frequency range (Hz) and intensity scale.
Treated as parameters; does not block the design.

## Modules

Each module has one purpose, a defined interface, and is testable in isolation.

- `ble-service.ts` — owns the GATT UUIDs. Methods: `connect()`,
  `setPower(id, bool)`, `setFrequency(id, hz)`, `setIntensity(id, pct)`,
  `disconnect(id)`. Defined behind an interface so tests substitute a fake.
- `device-store.ts` — registry of paired devices; persists device IDs to
  localStorage; attempts silent reconnect on launch (Chrome `getDevices()`),
  with a re-pair fallback for Bluefy.
- `state.ts` — holds global settings and per-device overrides; resolves the
  effective value for each device.
- `ui/` — connect screen and control screen, plain DOM.
- `sw.ts` — service worker, versioned precache of the app shell.

## UX flows

**Connect:** empty start → large "Add device" button → browser device chooser →
device appears as a card. Repeat up to 4 devices.

**Control:** a **global bar** at top (master on/off, frequency slider, intensity
slider) writes to all connected devices in turn. Each **device card** below
shows the device name and connection status, with a "Follow global / Custom"
toggle. In Custom mode, that card's controls override global for that device.

**Sync semantics:** a global command iterates over connected devices and writes
sequentially. Loose timing is acceptable. A device in Custom mode is excluded
from global writes for the parameter it overrides.

**Reconnect:** on launch, auto-reconnect saved devices where the browser permits;
otherwise show a one-tap "Reconnect" per device. Optimized for caregiver speed.

## Error handling

- Web Bluetooth unavailable (e.g. plain Safari): detect missing
  `navigator.bluetooth` and show guidance — "Open in Chrome (Android/desktop) or
  Bluefy (iPad/iPhone)" with a short how-to.
- Write failure or dropped device: mark that card disconnected, offer reconnect,
  and never crash the other devices' controls.

## Testing

- Vitest unit tests on pure logic: per-device override resolution, Hz→bytes
  encoding, value clamping.
- `FakeBleService` plus a no-hardware dev mode so the UI builds and runs without
  physical devices.
- Manual hardware matrix — Android Chrome, desktop Chrome, iPad Bluefy, iPhone
  Bluefy — each running connect / control / offline / reconnect.

## Risks to verify early on real devices

1. Bluefy: confirm service-worker offline caching holds and whether device
   persistence works or forces re-pair each session.
2. iOS: confirm 4 simultaneous BLE connections hold.
3. Obtain frequency and intensity ranges from the firmware team.

## Out of scope (v1)

- User login / accounts (explicitly not needed).
- Backend / cloud sync.
- Battery/status reporting.
- Tight time-synchronized pulsing (loose timing only).
- Published native app store distribution.
- Intensity / amplitude control (motor is frequency-only via `tone()` in v1).

## Revision — firmware-aligned contract (2026-05-22)

After reviewing the actual firmware (`Bluetooth_Board_Code.ino`), the GATT
contract is revised. This section supersedes the GATT and control details above.

**Current firmware (reference, to be upgraded):** ArduinoBLE, standard service
`180F` with one `BLEIntCharacteristic` `2A19` (signed 32-bit int); writing `0`
stops the motor, `80–160` runs `tone()` at that Hz. Name `"Vibration Device 2"`.

**Decisions:**
1. The firmware team will upgrade the sketch to expose the custom 128-bit service
   with **separate power and frequency characteristics** (matching the app's design).
2. **Intensity is dropped for v1.** The motor is frequency-only; revisit when
   firmware adds PWM duty-cycle amplitude control.
3. **Frequency range is 80–160 Hz** (the motor's working band).
4. On/off is a dedicated power characteristic (uint8 0/1); off no longer means
   "write 0 to frequency".

**Revised GATT contract (firmware target):**

| Characteristic | Type  | Value                          |
|----------------|-------|--------------------------------|
| Power          | write | uint8 — 0 / 1                  |
| Frequency      | write | uint16 LE — Hz, range 80–160   |

App `Settings` therefore carry `{ power, frequency }` only — no `intensity`.
