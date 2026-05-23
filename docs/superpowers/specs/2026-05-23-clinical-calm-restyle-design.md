# Clinical Calm restyle + Presets + BLE contract update

**Date:** 2026-05-23
**Status:** Approved (design)
**Scope:** `index.html` (app), coordinated with reflashed `Bluetooth_Board_Code.ino`

## Goal

Make the app look professional and accessible (caregivers of low-functioning autistic individuals), surface the existing saved-settings feature as "Presets," and update the BLE contract to match the reflashed firmware (real PWM motor + battery exposed on a separate characteristic).

## Constraints

- Single dependency-free `index.html`, inline vanilla JS, no build step. Keep the `h()` DOM helper and no-`innerHTML` rule (names are untrusted).
- Touch targets stay ≥44px. Frequency range stays 80–160; duration 1–60 min.
- `?fake` BLE path must keep working for desktop visual testing.

## Deployment split

- **Change A (pieces 1–3):** pure app/CSS, safe to ship anytime.
- **Change B (piece 4):** BLE contract; ship together with flashing devices. The updated app expects the new motor UUID, so a device on old firmware will not take motor commands.

---

## 1. Visual restyle — "Clinical Calm"

CSS-only; no logic change. Applies to every view: global bar, device cards, presets list, new/edit preset form, device picker modal, running-timer countdown.

Palette / tokens:
- Page ground `#eef4f9`; cards `#fff` with `1px solid #dbe6ee`, radius 14px.
- Primary accent `#0f7aa3`; secondary fill `#1693c0`; section headers `#0f5e7a` (uppercase, letter-spaced).
- App title "Vibration Station" at top.
- Battery pill green `#1d7a45` on `#e6f5ec`; info pill `#0f5e7a` on `#e3f3f9`.

Reference mockup: `.superpowers/brainstorm/.../style-a-v2.html`.

## 2. Accessibility + readability

- Control labels: `#16384a`, 16px, **bold** (WCAG AA contrast on white). Fixes faint-grey labels.
- Add a live value readout next to every frequency slider (global bar and each device card), e.g. "120 Hz", updating on input.
- Keep ≥44px touch targets and large checkboxes/sliders.

## 3. Presets (rename of existing Profiles)

- Rename UI text "Profiles" → "Presets" everywhere ("+ New profile" → "+ New preset", headings, confirm dialogs).
- **Keep localStorage key `vibration-profiles`** so existing saved entries survive. Internal class/variable names may stay (`ProfileStore`) — UI text only.
- No behavior change: name + frequency (80–160 Hz) + duration (1–60 min); Start picks devices, shows countdown + Stop, auto-off at 0; Edit/Delete. Restyle only.

## 4. BLE contract update (matches reflashed firmware)

New firmware contract:
- **Battery Service `180F`** → char **`2A19`**, `uint8` 0–100 %, Read | Notify (real battery).
- **Motor Service `6e500001-b5a3-f393-e0a9-e50e24dcca9e`** → char **`6e500002-b5a3-f393-e0a9-e50e24dcca9e`**, `int`, Read | Write. Value semantics unchanged: `0` = off, `80–160` = intensity.

App changes in `WebBluetoothService`:
- Motor writes (`setPower`/`setFrequency` → `encodeMotor`) target the motor char, not `2A19`.
- `requestDevice`: keep scan filter on `180F` + name prefix; add the motor service UUID to `optionalServices`. On connect, get both the motor char (motor service) and battery char (`180F`/`2A19`).
- Battery: `startNotifications()` on `2A19`, read `value.getUint8(0)`; expose via a `getBattery(id)` / `onBattery(cb)` path the device card can render. Hide the pill when unavailable (old firmware, or `FakeBleService` returns no battery).
- Update the contract comment block at top of `index.html`; bump `VERSION`.

`FakeBleService`: add a stub battery value (e.g. fixed 82% or a slow drift) so the pill renders during `?fake` visual testing.

## Out of scope

- Hardware verification (Task 11), reconnect-on-launch flow, intensity/PWM-duty characteristic beyond the 80–160 mapping. Firmware `.ino` itself is already drafted (separate review/flash).

## Testing

No automated tests in the single-file version (consistent with current repo). Manual:
- `?fake` desktop: restyle renders, value readouts track sliders, presets CRUD + timer countdown/auto-off work, battery pill shows stub.
- Real device (after reflash): connect, motor responds across 80–160 with perceptible change, battery pill shows live %, disconnect safety-stop, up to 4 devices.
