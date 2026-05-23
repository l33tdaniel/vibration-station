# Clinical Calm Restyle + Presets + BLE Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the single-file vibration-control PWA to a professional, accessible "Clinical Calm" look, surface saved settings as "Presets," and update the BLE contract to match the reflashed firmware (motor on a custom characteristic, real battery on `2A19`).

**Architecture:** All app changes are in one file, `index.html` (inline vanilla JS, `h()` DOM helper, no `innerHTML`, no build step). Work splits into **Change A** (pieces 1–3: CSS + value readouts + Presets rename — safe to ship anytime) and **Change B** (piece 4: BLE contract — ship together with flashing devices). The firmware `.ino` is already drafted separately.

**Tech Stack:** Vanilla JS ES modules, Web Bluetooth, localStorage. No framework, no test runner — verification is manual in a Chromium browser using the `?fake` query param (loads `FakeBleService`).

**Testing convention:** There is no automated test harness (intentional). Each task is verified by opening `index.html?fake` in Chrome/Edge and checking the described behavior. Use a local server for service-worker-independent work: `python3 -m http.server 8000` then `http://localhost:8000/index.html?fake`. Plain `file://` is fine for pure visual tasks.

---

## File Structure

- **Modify only:** `/Users/danielneugent/Desktop/Coding/vibration-station/index.html`
  - `<style>` block (lines ~7–43): full restyle.
  - Contract constants + comment (lines ~49–58): new UUIDs, VERSION bump.
  - `rangeInput` helper (~482–487): add value readout.
  - `globalBar` (~497–510) and `deviceCard` (~511–536): readouts, battery pill.
  - `AppStore` (~186–209): per-device battery field.
  - `WebBluetoothService` / `FakeBleService` (~211–267): motor char move, battery read/notify.
  - Presets text: `renderProfilesSection` (~407–453), `createProfileForm` (~287–354).
  - Bootstrap (~547–580): wire battery callback, app title.

No new files. Firmware (`Bluetooth_Board_Code.ino`) is out of scope here (already drafted).

---

## CHANGE A — App restyle (safe to ship now)

### Task 1: Clinical Calm CSS + app title

**Files:**
- Modify: `index.html` `<style>` block and bootstrap (app title).

- [ ] **Step 1: Replace the `<style>` block**

Replace the entire contents between `<style>` and `</style>` (currently lines ~8–42) with:

```css
:root {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --ground: #eef4f9; --card: #fff; --border: #dbe6ee;
  --accent: #0f7aa3; --accent-2: #1693c0; --header: #0f5e7a;
  --label: #16384a; --muted: #6b8595;
}
body { margin: 0; padding: 1rem; max-width: 480px; margin-inline: auto; color: var(--label); background: var(--ground); }
.app-title { color: var(--header); font-size: 1.5rem; font-weight: 700; margin: .25rem .25rem 1rem; }
h2 { font-size: .9rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--header); margin: 0 0 .9rem; }
button { font-size: 1rem; font-weight: 600; padding: .7rem 1.1rem; border-radius: .55rem; border: none; background: var(--accent); color: #fff; cursor: pointer; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
button:disabled { opacity: .45; cursor: default; }
label { display: flex; align-items: center; gap: .75rem; font-size: 1rem; font-weight: 600; color: var(--label); margin: .9rem 0; }
input[type="range"] { flex: 1; height: 44px; accent-color: var(--accent); }
input[type="checkbox"] { width: 1.8rem; height: 1.8rem; accent-color: var(--accent); }
.value-readout { font-size: .95rem; font-weight: 700; color: var(--accent); min-width: 62px; text-align: right; }
.global-bar, .cards article { background: var(--card); border: 1px solid var(--border); border-radius: .9rem; padding: 1.25rem; margin: .85rem 0; }
.cards article header { font-weight: 700; font-size: 1.15rem; color: var(--label); margin-bottom: .5rem; }
.hint { color: #b00020; min-height: 1.2em; }
.unsupported { font-size: 1.1rem; line-height: 1.55; }
.version { color: #9fb3c0; font-size: .8rem; margin-top: 2rem; text-align: center; }
.profiles-section { margin: .85rem 0; }
.profile-card { background: var(--card); border: 1px solid var(--border); border-radius: .9rem; padding: 1.25rem; margin: .85rem 0; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.profile-info { flex: 1; }
.profile-name { font-weight: 700; font-size: 1.15rem; color: var(--label); }
.profile-meta { display: inline-block; font-size: .85rem; font-weight: 600; color: var(--header); background: #e3f3f9; padding: .25rem .7rem; border-radius: 1rem; margin-top: .4rem; }
.profile-actions { display: flex; flex-direction: column; gap: .5rem; align-items: flex-end; }
.profile-actions button { padding: .55rem 1rem; font-size: .95rem; min-height: auto; }
.profile-actions .secondary { background: none; color: var(--muted); padding: .25rem; min-height: auto; }
.battery-pill { font-size: .85rem; font-weight: 700; color: #1d7a45; background: #e6f5ec; padding: .25rem .7rem; border-radius: 1rem; }
.timer-display { text-align: center; padding: 2rem 1.5rem; background: var(--card); border: 1px solid var(--border); border-radius: .9rem; }
.timer-countdown { font-size: 2.5rem; font-family: monospace; font-weight: bold; color: var(--accent); margin: 1rem 0; }
.timer-devices { font-size: 1rem; color: var(--muted); margin: 1rem 0; }
.timer-stop { min-height: 50px; font-size: 1.25rem; background: #d64545; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15,40,55,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: var(--card); border-radius: 1rem; padding: 1.75rem; max-width: 90%; max-height: 90vh; overflow-y: auto; }
.modal-header { font-size: 1.25rem; font-weight: 700; color: var(--header); margin-bottom: 1rem; }
.device-picker { display: flex; flex-direction: column; gap: 1rem; }
.device-picker label { margin: .5rem 0; }
.form-field { display: flex; flex-direction: column; gap: .4rem; margin: 1rem 0; }
.form-field label { font-size: 1rem; font-weight: 600; }
.form-field input[type="text"], .form-field input[type="number"] { padding: .7rem; font-size: 1rem; border: 1px solid var(--border); border-radius: .5rem; }
.form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
.form-actions button { flex: 1; }
.form-actions button.cancel { background: #eef4f9; color: var(--header); }
.error-message { color: #b00020; font-size: .95rem; margin-top: .25rem; }
```

- [ ] **Step 2: Add the app title in bootstrap**

In the `else` branch of the support check (around line 562, just after `const store = new AppStore();`), prepend a title node. Change:

```js
        const store = new AppStore();
        const connectRoot = document.createElement("div");
```
to:
```js
        const store = new AppStore();
        app.append(h("div", { class: "app-title" }, ["Vibration Station"]));
        const connectRoot = document.createElement("div");
```

- [ ] **Step 3: Verify in browser**

Open `index.html?fake` in Chrome. Add a device. Expected: light-blue page, white rounded cards, "Vibration Station" title, uppercase clinical-blue section headers, dark bold labels, blue primary buttons. No faint-grey labels.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "style: clinical calm palette and app title"
```

---

### Task 2: Frequency value readouts

**Files:**
- Modify: `index.html` — `rangeInput` helper, `globalBar`, `deviceCard`.

- [ ] **Step 1: Add a readout-aware range helper**

Replace `rangeInput` (lines ~482–487) with:

```js
function rangeInput(control, min, max, value, onInput) {
  return h("input", {
    type: "range", "data-control": control, min, max, value,
    onInput: (e) => onInput(Number(e.target.value)),
  });
}
function rangeWithValue(control, min, max, value, unit, onInput) {
  const out = h("span", { class: "value-readout" }, [`${value} ${unit}`]);
  const input = h("input", {
    type: "range", "data-control": control, min, max, value,
    onInput: (e) => { const v = Number(e.target.value); out.textContent = `${v} ${unit}`; onInput(v); },
  });
  return [input, out];
}
```

- [ ] **Step 2: Use it in the global bar**

In `globalBar` (~505–508), replace the Frequency label line:

```js
          h("label", {}, ["Frequency", rangeInput("frequency", FREQ_MIN, FREQ_MAX, g.frequency, (v) => {
            store.setGlobal({ frequency: v });
            for (const id of followIds(store)) ble.setFrequency(id, v);
          })]),
```
with:
```js
          h("label", {}, ["Frequency", ...rangeWithValue("frequency", FREQ_MIN, FREQ_MAX, g.frequency, "Hz", (v) => {
            store.setGlobal({ frequency: v });
            for (const id of followIds(store)) ble.setFrequency(id, v);
          })]),
```

- [ ] **Step 3: Use it in the device card**

In `deviceCard` (~526–529), replace the Frequency label line:

```js
          h("label", {}, ["Frequency", rangeInput("frequency", FREQ_MIN, FREQ_MAX, s.frequency, (v) => {
            store.setDeviceCustom(id, { frequency: v });
            ble.setFrequency(id, v);
          })]),
```
with:
```js
          h("label", {}, ["Frequency", ...rangeWithValue("frequency", FREQ_MIN, FREQ_MAX, s.frequency, "Hz", (v) => {
            store.setDeviceCustom(id, { frequency: v });
            ble.setFrequency(id, v);
          })]),
```

- [ ] **Step 4: Verify in browser**

Open `index.html?fake`, add a device. Expected: each Frequency slider shows a "120 Hz" readout that updates live as you drag, in both the All-devices bar and the device card.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: show live Hz value next to frequency sliders"
```

---

### Task 3: Rename Profiles → Presets (UI text only)

**Files:**
- Modify: `index.html` — `renderProfilesSection`, `createProfileForm`, profile delete confirm.

Keep the localStorage key `vibration-profiles` and the `ProfileStore` class name untouched — change only user-facing text.

- [ ] **Step 1: Section heading and empty state**

In `renderProfilesSection` (~409–415), change `h("h2", {}, ["Profiles"])` to `h("h2", {}, ["Presets"])`, and the empty-state text `"No profiles yet. Create one to get started."` to `"No presets yet. Create one to get started."`.

- [ ] **Step 2: New-preset button**

In `renderProfilesSection` (~446–449), change the button label `["+ New Profile"]` to `["+ New preset"]`.

- [ ] **Step 3: Delete confirm**

In the delete button handler (~435), change `` confirm(`Delete profile "${p.name}"?`) `` to `` confirm(`Delete preset "${p.name}"?`) ``.

- [ ] **Step 4: Form field label**

In `createProfileForm` (~291), change the label `["Profile Name"]` to `["Preset name"]`.

- [ ] **Step 5: Verify in browser**

Open `index.html?fake`. Expected: section reads "PRESETS", button reads "+ New preset", create form labels the name field "Preset name", delete confirm says "preset". Create one, reload — it persists (key unchanged).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: rename Profiles to Presets in UI"
```

---

## CHANGE B — BLE contract update (ship with device reflash)

> Ship these tasks together with flashing the devices. The updated app writes the motor to the new UUID, so a device on old firmware will not respond to motor commands.

### Task 4: New contract constants + comment + VERSION

**Files:**
- Modify: `index.html` contract block (~49–58).

- [ ] **Step 1: Replace the contract constants and comment**

Replace lines ~49–58 (the `// ===== Device contract =====` block through `const VERSION = ...`) with:

```js
      // ===== Device contract (matches Bluetooth_Board_Code.ino) =====
      // Battery service 180F / char 2A19: uint8 0-100 % (read+notify) — real battery.
      // Motor service 6e500001.. / char 6e500002..: int (read+write).
      //   Value is a 4-byte little-endian int: 0 = motor off, 80-160 = intensity.
      const BATTERY_SERVICE_UUID = "0000180f-0000-1000-8000-00805f9b34fb";
      const BATTERY_LEVEL_CHAR_UUID = "00002a19-0000-1000-8000-00805f9b34fb";
      const MOTOR_SERVICE_UUID = "6e500001-b5a3-f393-e0a9-e50e24dcca9e";
      const MOTOR_CHAR_UUID = "6e500002-b5a3-f393-e0a9-e50e24dcca9e";
      const DEVICE_NAME_PREFIX = "Vibration Device";
      const FREQ_MIN = 80;
      const FREQ_MAX = 160;
      const MAX_DEVICES = 4;
      const VERSION = "2026-05-23.1"; // bump on each deploy; shown at page bottom
```

Note: the old `SERVICE_UUID` constant is removed; `MOTOR_CHAR_UUID` now holds the custom UUID. The `encodeMotor` function is unchanged.

- [ ] **Step 2: Verify nothing references the removed `SERVICE_UUID` yet**

Run: `grep -n "SERVICE_UUID" index.html`
Expected: only `BATTERY_SERVICE_UUID` and `MOTOR_SERVICE_UUID` matches. Any bare `SERVICE_UUID` is fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: define split battery/motor BLE contract"
```

---

### Task 5: Per-device battery state + WebBluetooth motor/battery wiring

**Files:**
- Modify: `index.html` — `AppStore`, `WebBluetoothService`, bootstrap.

- [ ] **Step 1: Add battery field to AppStore**

In `AppStore.addDevice` (~198–202), add a `battery` field:

```js
        addDevice(id, name) {
          if (this.find(id)) return;
          this.state.devices.push({ id, name, mode: "follow", custom: { ...this.state.global }, battery: null });
          this.emit();
        }
```

Add a setter after `setDeviceCustom` (~208):

```js
        setDeviceBattery(id, pct) { const d = this.find(id); if (!d) return; d.battery = pct; this.emit(); }
```

- [ ] **Step 2: Update WebBluetoothService for the new contract**

Replace `requestDevice` and `openConnection` (~231–249) with:

```js
        async requestDevice() {
          const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [BATTERY_SERVICE_UUID] }, { namePrefix: DEVICE_NAME_PREFIX }],
            optionalServices: [BATTERY_SERVICE_UUID, MOTOR_SERVICE_UUID],
          });
          const id = device.id;
          const onDrop = () => { this.conns.delete(id); if (this.disconnectCb) this.disconnectCb(id); };
          const conn = await this.openConnection(device, onDrop);
          this.conns.set(id, conn);
          device.addEventListener("gattserverdisconnected", onDrop);
          this.startBattery(conn, id);
          return { id, name: device.name ?? "Vibration device" };
        }
        async openConnection(device, onDrop) {
          if (!device.gatt) throw new Error("GATT not available on this device");
          const server = await device.gatt.connect();
          const motorService = await server.getPrimaryService(MOTOR_SERVICE_UUID);
          const motor = await motorService.getCharacteristic(MOTOR_CHAR_UUID);
          let battery = null;
          try {
            const battService = await server.getPrimaryService(BATTERY_SERVICE_UUID);
            battery = await battService.getCharacteristic(BATTERY_LEVEL_CHAR_UUID);
          } catch (e) { battery = null; } // older firmware without battery char
          return { device, motor, battery, onDrop, power: false, freq: 120 };
        }
        async startBattery(conn, id) {
          if (!conn.battery) return;
          try {
            const v = await conn.battery.readValue();
            if (this.batteryCb) this.batteryCb(id, v.getUint8(0));
            await conn.battery.startNotifications();
            conn.battery.addEventListener("characteristicvaluechanged", (e) => {
              if (this.batteryCb) this.batteryCb(id, e.target.value.getUint8(0));
            });
          } catch (e) { /* battery optional */ }
        }
        onBattery(cb) { this.batteryCb = cb; }
```

(The `write`, `setPower`, `setFrequency`, `disconnect`, `onDisconnect` methods are unchanged — they already use `c.motor`, which now points at the custom characteristic.)

- [ ] **Step 3: Wire the battery callback in bootstrap**

In the bootstrap `else` branch, after `ble.onDisconnect(...)` (~570), add:

```js
        ble.onBattery((id, pct) => { store.setDeviceBattery(id, pct); renderAll(); });
```

- [ ] **Step 4: Verify (fake path still loads)**

Open `index.html?fake`, add a device. Expected: no errors; app behaves as before. (Real battery is verified on hardware after reflash. Fake battery is added in Task 6.)

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: write motor to custom char and read battery over BLE"
```

---

### Task 6: Battery pill in device card + fake battery stub

**Files:**
- Modify: `index.html` — `FakeBleService`, `deviceCard`.

- [ ] **Step 1: Add battery emission to FakeBleService**

In `FakeBleService` (~212–225), add an `onBattery` method and emit a value on connect. Replace `requestDevice` and add `onBattery`:

```js
        async requestDevice() {
          const n = ++this.counter;
          this.calls.push({ m: "requestDevice", args: [] });
          const id = `fake-${n}`;
          setTimeout(() => { if (this.batteryCb) this.batteryCb(id, 82); }, 50);
          return { id, name: `Fake Device ${n}` };
        }
        onBattery(cb) { this.batteryCb = cb; }
```

- [ ] **Step 2: Render the battery pill in the device card header**

In `deviceCard` (~515), replace the header line `h("header", {}, [d.name])` with a header row that shows the pill only when battery is known:

```js
          h("header", {}, [
            d.name,
            d.battery != null ? h("span", { class: "battery-pill", style: "float:right" }, [`\u{1F50B} ${d.battery}%`]) : "",
          ]),
```

- [ ] **Step 3: Verify in browser**

Open `index.html?fake`, add a device. Expected: within a moment the device card header shows a green "🔋 82%" pill. Devices added before firmware support (battery null) show no pill.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: show battery pill on device card with fake stub"
```

---

## Self-Review

- **Spec coverage:** §1 restyle → Task 1; §2 contrast+readouts → Tasks 1+2; §3 Presets rename (key kept) → Task 3; §4 contract constants → Task 4, motor move + battery read/notify + optionalServices → Task 5, fake stub + pill + hide-when-unavailable → Task 6. Deployment split (A vs B) reflected in section structure. All covered.
- **VERSION:** bumped to `2026-05-23.1` in Task 4.
- **Type/name consistency:** `MOTOR_CHAR_UUID` reused (now custom value); `rangeWithValue` spread into `h()` children arrays; `setDeviceBattery`/`battery` field consistent across AppStore (Task 5) and deviceCard (Task 6); `onBattery`/`batteryCb` consistent across both BLE services and bootstrap.
- **No placeholders:** every code step shows full replacement code and a concrete browser/grep verification.
