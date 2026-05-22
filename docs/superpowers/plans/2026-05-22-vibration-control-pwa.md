# Vibration Station Control PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A free, open-source, offline-capable PWA that lets a caregiver connect up to 4 XIAO nRF52840 BLE devices and control power, frequency, and intensity — globally or per device.

**Architecture:** Static client-only PWA, no backend. Pure-logic modules (encoding, state, device store) are TDD'd against a fake BLE service; the real Web Bluetooth implementation is verified on hardware. UI is built with safe DOM construction (no `innerHTML`) wired to an observable store. A service worker precaches the shell for offline use.

**Tech Stack:** TypeScript, Vite, vite-plugin-pwa, Vitest (jsdom), Web Bluetooth API.

---

## File Structure

```
vibration-station/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ public/manifest.webmanifest
├─ src/
│  ├─ main.ts                    # bootstrap + wiring
│  ├─ encoding.ts                # clamp + characteristic byte encoders
│  ├─ state.ts                   # Settings, AppState, AppStore, resolveSettings, pushSettings
│  ├─ device-store.ts            # paired-device registry + localStorage
│  ├─ ble/
│  │  ├─ types.ts                # BleService interface, ConnectedDevice, GATT UUIDs
│  │  ├─ fake-ble-service.ts     # in-memory BleService for dev + tests
│  │  └─ web-bluetooth-service.ts# real navigator.bluetooth implementation
│  └─ ui/
│     ├─ dom.ts                  # h() element builder + clear() (no innerHTML)
│     ├─ connect-view.ts         # add/list devices
│     └─ control-view.ts         # global bar + per-device cards
└─ tests/
   ├─ encoding.test.ts
   ├─ state.test.ts
   └─ device-store.test.ts
```

**Override semantics (locked):** a device is either `follow` (uses global settings) or `custom` (uses its own settings) — whole-device, not per-parameter. Simpler than the spec's per-parameter wording and covers the same need.

**Safety note:** device names come from BLE advertisements (externally controlled), so all UI uses `textContent` / DOM nodes, never `innerHTML` string interpolation.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`

- [ ] **Step 1: Init npm and install deps**

Run:
```bash
npm init -y
npm install -D typescript vite vite-plugin-pwa vitest jsdom @types/web-bluetooth
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "types": ["vite/client", "vitest/globals", "web-bluetooth"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Write `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Vibration Station",
        short_name: "Vibration",
        start_url: ".",
        display: "standalone",
        background_color: "#101418",
        theme_color: "#101418",
        icons: [],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"] },
    }),
  ],
  test: { environment: "jsdom", globals: true },
});
```

- [ ] **Step 4: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Vibration Station</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Write placeholder `src/main.ts`**

```ts
const app = document.getElementById("app")!;
app.textContent = "Vibration Station";
```

- [ ] **Step 6: Add scripts to `package.json`**

Set the `"scripts"` field:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run"
}
```

- [ ] **Step 7: Verify build runs**

Run: `npm run build`
Expected: build completes, `dist/` produced with a service worker.

- [ ] **Step 8: Commit**

```bash
printf "node_modules\ndist\n" > .gitignore
git add -A
git commit -m "chore: scaffold Vite + TS + PWA + Vitest project"
```

---

## Task 2: Value encoding (`src/encoding.ts`)

**Files:**
- Create: `src/encoding.ts`
- Test: `tests/encoding.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import {
  clamp, encodePower, encodeFrequency, encodeIntensity,
  FREQ_MIN, FREQ_MAX, INTENSITY_MAX,
} from "../src/encoding";

describe("clamp", () => {
  it("clamps below, above, and rounds", () => {
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(42.6, 0, 100)).toBe(43);
  });
  it("returns min for NaN", () => {
    expect(clamp(NaN, 0, 100)).toBe(0);
  });
});

describe("encoders", () => {
  it("encodes power as one byte", () => {
    expect(Array.from(encodePower(true))).toEqual([1]);
    expect(Array.from(encodePower(false))).toEqual([0]);
  });
  it("encodes frequency as little-endian uint16, clamped", () => {
    expect(Array.from(encodeFrequency(258))).toEqual([2, 1]); // 258 = 0x0102
    expect(Array.from(encodeFrequency(FREQ_MAX + 1000)).length).toBe(2);
    expect(Array.from(encodeFrequency(FREQ_MIN - 5))).toEqual([0, 0]);
  });
  it("encodes intensity as one clamped byte", () => {
    expect(Array.from(encodeIntensity(50))).toEqual([50]);
    expect(Array.from(encodeIntensity(INTENSITY_MAX + 10))).toEqual([100]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- encoding`
Expected: FAIL — cannot find module `../src/encoding`.

- [ ] **Step 3: Write `src/encoding.ts`**

```ts
// NOTE: confirm real ranges with the firmware team; these are placeholders.
export const FREQ_MIN = 0;
export const FREQ_MAX = 250;
export const INTENSITY_MIN = 0;
export const INTENSITY_MAX = 100;

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function encodePower(on: boolean): Uint8Array {
  return new Uint8Array([on ? 1 : 0]);
}

export function encodeFrequency(hz: number): Uint8Array {
  const v = clamp(hz, FREQ_MIN, FREQ_MAX);
  const buf = new Uint8Array(2);
  new DataView(buf.buffer).setUint16(0, v, true);
  return buf;
}

export function encodeIntensity(pct: number): Uint8Array {
  return new Uint8Array([clamp(pct, INTENSITY_MIN, INTENSITY_MAX)]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- encoding`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/encoding.ts tests/encoding.test.ts
git commit -m "feat: add characteristic value encoders with clamping"
```

---

## Task 3: App state + override resolution (`src/state.ts`)

**Files:**
- Create: `src/state.ts`
- Test: `tests/state.test.ts`

> Depends on `src/ble/fake-ble-service.ts` (Task 5) for one test. If running strictly in order, do Task 5 Steps 1–2 first, then return here.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { AppStore, resolveSettings, pushSettings } from "../src/state";
import { FakeBleService } from "../src/ble/fake-ble-service";

describe("AppStore", () => {
  it("starts with no devices and default global", () => {
    const s = new AppStore();
    expect(s.get().devices).toEqual([]);
    expect(s.get().global.power).toBe(false);
  });
  it("adds devices in follow mode and ignores duplicates", () => {
    const s = new AppStore();
    s.addDevice("a", "Dev A");
    s.addDevice("a", "Dev A");
    expect(s.get().devices.length).toBe(1);
    expect(s.get().devices[0].mode).toBe("follow");
  });
  it("notifies subscribers on change", () => {
    const s = new AppStore();
    let n = 0;
    s.subscribe(() => n++);
    s.setGlobal({ frequency: 80 });
    expect(n).toBe(1);
  });
});

describe("resolveSettings", () => {
  it("returns global for follow devices, custom for custom devices", () => {
    const s = new AppStore();
    s.setGlobal({ frequency: 60, intensity: 70, power: true });
    s.addDevice("a", "A");
    s.addDevice("b", "B");
    s.setDeviceMode("b", "custom");
    s.setDeviceCustom("b", { frequency: 10 });
    expect(resolveSettings(s.get(), "a").frequency).toBe(60);
    expect(resolveSettings(s.get(), "b").frequency).toBe(10);
  });
});

describe("pushSettings", () => {
  it("writes power, frequency, intensity for one device", async () => {
    const ble = new FakeBleService();
    await pushSettings(ble, "a", { power: true, frequency: 55, intensity: 40 });
    expect(ble.calls.map((c) => c.m)).toEqual(["setPower", "setFrequency", "setIntensity"]);
    expect(ble.calls[1].args).toEqual(["a", 55]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- state`
Expected: FAIL — cannot find module `../src/state`.

- [ ] **Step 3: Write `src/state.ts`**

```ts
import type { BleService } from "./ble/types";

export interface Settings {
  power: boolean;
  frequency: number;
  intensity: number;
}

export type DeviceMode = "follow" | "custom";

export interface DeviceState {
  id: string;
  name: string;
  mode: DeviceMode;
  custom: Settings;
}

export interface AppState {
  global: Settings;
  devices: DeviceState[];
}

const DEFAULT_GLOBAL: Settings = { power: false, frequency: 50, intensity: 50 };

export function resolveSettings(state: AppState, id: string): Settings {
  const d = state.devices.find((x) => x.id === id);
  if (!d) throw new Error(`unknown device ${id}`);
  return d.mode === "custom" ? d.custom : state.global;
}

export async function pushSettings(ble: BleService, id: string, s: Settings): Promise<void> {
  await ble.setPower(id, s.power);
  await ble.setFrequency(id, s.frequency);
  await ble.setIntensity(id, s.intensity);
}

export class AppStore {
  private state: AppState = { global: { ...DEFAULT_GLOBAL }, devices: [] };
  private listeners: Array<() => void> = [];

  get(): AppState {
    return this.state;
  }
  subscribe(fn: () => void): void {
    this.listeners.push(fn);
  }
  private emit(): void {
    for (const l of this.listeners) l();
  }
  private find(id: string): DeviceState | undefined {
    return this.state.devices.find((d) => d.id === id);
  }

  setGlobal(p: Partial<Settings>): void {
    this.state.global = { ...this.state.global, ...p };
    this.emit();
  }
  addDevice(id: string, name: string): void {
    if (this.find(id)) return;
    this.state.devices.push({ id, name, mode: "follow", custom: { ...this.state.global } });
    this.emit();
  }
  removeDevice(id: string): void {
    this.state.devices = this.state.devices.filter((d) => d.id !== id);
    this.emit();
  }
  setDeviceMode(id: string, mode: DeviceMode): void {
    const d = this.find(id);
    if (d) d.mode = mode;
    this.emit();
  }
  setDeviceCustom(id: string, p: Partial<Settings>): void {
    const d = this.find(id);
    if (d) d.custom = { ...d.custom, ...p };
    this.emit();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- state`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state.ts tests/state.test.ts
git commit -m "feat: add app store, override resolution, and settings push"
```

---

## Task 4: Paired-device registry (`src/device-store.ts`)

**Files:**
- Create: `src/device-store.ts`
- Test: `tests/device-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { DeviceStore, MAX_DEVICES } from "../src/device-store";

function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

describe("DeviceStore", () => {
  let storage: Storage;
  beforeEach(() => { storage = memStorage(); });

  it("adds and persists devices", () => {
    const s = new DeviceStore(storage);
    s.add({ id: "a", name: "A" });
    expect(new DeviceStore(storage).list()).toEqual([{ id: "a", name: "A" }]);
  });
  it("ignores duplicate ids", () => {
    const s = new DeviceStore(storage);
    s.add({ id: "a", name: "A" });
    s.add({ id: "a", name: "A again" });
    expect(s.list().length).toBe(1);
  });
  it("blocks adding beyond MAX_DEVICES", () => {
    const s = new DeviceStore(storage);
    for (let i = 0; i < MAX_DEVICES; i++) s.add({ id: `d${i}`, name: `D${i}` });
    expect(s.canAdd()).toBe(false);
    expect(() => s.add({ id: "x", name: "X" })).toThrow();
  });
  it("removes devices", () => {
    const s = new DeviceStore(storage);
    s.add({ id: "a", name: "A" });
    s.remove("a");
    expect(s.list()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- device-store`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `src/device-store.ts`**

```ts
export const MAX_DEVICES = 4;
const KEY = "vibration.devices";

export interface StoredDevice {
  id: string;
  name: string;
}

export class DeviceStore {
  private devices: StoredDevice[] = [];

  constructor(private storage: Storage = localStorage) {
    const raw = this.storage.getItem(KEY);
    this.devices = raw ? (JSON.parse(raw) as StoredDevice[]) : [];
  }

  list(): StoredDevice[] {
    return [...this.devices];
  }
  canAdd(): boolean {
    return this.devices.length < MAX_DEVICES;
  }
  add(d: StoredDevice): void {
    if (this.devices.some((x) => x.id === d.id)) return;
    if (!this.canAdd()) throw new Error("device limit reached");
    this.devices.push(d);
    this.save();
  }
  remove(id: string): void {
    this.devices = this.devices.filter((x) => x.id !== id);
    this.save();
  }
  private save(): void {
    this.storage.setItem(KEY, JSON.stringify(this.devices));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- device-store`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/device-store.ts tests/device-store.test.ts
git commit -m "feat: add paired-device registry with persistence and 4-device cap"
```

---

## Task 5: BLE interface + fake (`src/ble/types.ts`, `src/ble/fake-ble-service.ts`)

**Files:**
- Create: `src/ble/types.ts`, `src/ble/fake-ble-service.ts`

- [ ] **Step 1: Write `src/ble/types.ts`**

```ts
// PLACEHOLDER UUIDs — replace with the firmware team's actual custom UUIDs.
export const SERVICE_UUID = "f0000001-0451-4000-b000-000000000000";
export const POWER_CHAR_UUID = "f0000002-0451-4000-b000-000000000000";
export const FREQ_CHAR_UUID = "f0000003-0451-4000-b000-000000000000";
export const INTENSITY_CHAR_UUID = "f0000004-0451-4000-b000-000000000000";

export interface ConnectedDevice {
  id: string;
  name: string;
}

export interface BleService {
  isSupported(): boolean;
  requestDevice(): Promise<ConnectedDevice>;
  setPower(id: string, on: boolean): Promise<void>;
  setFrequency(id: string, hz: number): Promise<void>;
  setIntensity(id: string, pct: number): Promise<void>;
  disconnect(id: string): Promise<void>;
  onDisconnect(cb: (id: string) => void): void;
}
```

- [ ] **Step 2: Write `src/ble/fake-ble-service.ts`**

```ts
import type { BleService, ConnectedDevice } from "./types";

export class FakeBleService implements BleService {
  calls: Array<{ m: string; args: unknown[] }> = [];
  private counter = 0;
  private disconnectCb: ((id: string) => void) | null = null;

  isSupported(): boolean {
    return true;
  }
  async requestDevice(): Promise<ConnectedDevice> {
    const n = ++this.counter;
    this.calls.push({ m: "requestDevice", args: [] });
    return { id: `fake-${n}`, name: `Fake Device ${n}` };
  }
  async setPower(id: string, on: boolean): Promise<void> {
    this.calls.push({ m: "setPower", args: [id, on] });
  }
  async setFrequency(id: string, hz: number): Promise<void> {
    this.calls.push({ m: "setFrequency", args: [id, hz] });
  }
  async setIntensity(id: string, pct: number): Promise<void> {
    this.calls.push({ m: "setIntensity", args: [id, pct] });
  }
  async disconnect(id: string): Promise<void> {
    this.calls.push({ m: "disconnect", args: [id] });
  }
  onDisconnect(cb: (id: string) => void): void {
    this.disconnectCb = cb;
  }
  /** test helper to simulate a drop */
  simulateDisconnect(id: string): void {
    this.disconnectCb?.(id);
  }
}
```

- [ ] **Step 3: Verify type-check + existing tests pass**

Run: `npm test`
Expected: PASS (state.test.ts now resolves `FakeBleService`).

- [ ] **Step 4: Commit**

```bash
git add src/ble/types.ts src/ble/fake-ble-service.ts
git commit -m "feat: add BLE service interface and in-memory fake"
```

---

## Task 6: Real Web Bluetooth implementation (`src/ble/web-bluetooth-service.ts`)

No unit test — Web Bluetooth needs real hardware. Verified manually in Task 11.

**Files:**
- Create: `src/ble/web-bluetooth-service.ts`

- [ ] **Step 1: Write `src/ble/web-bluetooth-service.ts`**

```ts
import {
  type BleService, type ConnectedDevice,
  SERVICE_UUID, POWER_CHAR_UUID, FREQ_CHAR_UUID, INTENSITY_CHAR_UUID,
} from "./types";
import { encodePower, encodeFrequency, encodeIntensity } from "../encoding";

interface Conn {
  device: BluetoothDevice;
  power: BluetoothRemoteGATTCharacteristic;
  freq: BluetoothRemoteGATTCharacteristic;
  intensity: BluetoothRemoteGATTCharacteristic;
}

export class WebBluetoothService implements BleService {
  private conns = new Map<string, Conn>();
  private disconnectCb: ((id: string) => void) | null = null;

  isSupported(): boolean {
    return typeof navigator !== "undefined" && !!navigator.bluetooth;
  }

  async requestDevice(): Promise<ConnectedDevice> {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
    });
    const conn = await this.openConnection(device);
    const id = device.id;
    this.conns.set(id, conn);
    device.addEventListener("gattserverdisconnected", () => {
      this.conns.delete(id);
      this.disconnectCb?.(id);
    });
    return { id, name: device.name ?? "Vibration device" };
  }

  private async openConnection(device: BluetoothDevice): Promise<Conn> {
    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const [power, freq, intensity] = await Promise.all([
      service.getCharacteristic(POWER_CHAR_UUID),
      service.getCharacteristic(FREQ_CHAR_UUID),
      service.getCharacteristic(INTENSITY_CHAR_UUID),
    ]);
    return { device, power, freq, intensity };
  }

  private get(id: string): Conn {
    const c = this.conns.get(id);
    if (!c) throw new Error(`device ${id} not connected`);
    return c;
  }

  async setPower(id: string, on: boolean): Promise<void> {
    await this.get(id).power.writeValue(encodePower(on));
  }
  async setFrequency(id: string, hz: number): Promise<void> {
    await this.get(id).freq.writeValue(encodeFrequency(hz));
  }
  async setIntensity(id: string, pct: number): Promise<void> {
    await this.get(id).intensity.writeValue(encodeIntensity(pct));
  }
  async disconnect(id: string): Promise<void> {
    this.conns.get(id)?.device.gatt?.disconnect();
    this.conns.delete(id);
  }
  onDisconnect(cb: (id: string) => void): void {
    this.disconnectCb = cb;
  }
}
```

- [ ] **Step 2: Verify type-check + build**

Run: `npm run build`
Expected: builds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/ble/web-bluetooth-service.ts
git commit -m "feat: add real Web Bluetooth GATT implementation"
```

---

## Task 7: Safe DOM helper + connect view (`src/ui/dom.ts`, `src/ui/connect-view.ts`)

**Files:**
- Create: `src/ui/dom.ts`, `src/ui/connect-view.ts`
- Test: `tests/connect-view.test.ts`

- [ ] **Step 1: Write `src/ui/dom.ts`**

```ts
type Child = Node | string;
type Props = Record<string, string | number | boolean | EventListener>;

export function h(tag: string, props: Props = {}, children: Child[] = []): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("on") && typeof v === "function") {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else {
      el.setAttribute(k, String(v));
    }
  }
  for (const c of children) el.append(typeof c === "string" ? document.createTextNode(c) : c);
  return el;
}

export function clear(root: HTMLElement): void {
  root.replaceChildren();
}
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { renderConnectView } from "../src/ui/connect-view";
import { AppStore } from "../src/state";
import { FakeBleService } from "../src/ble/fake-ble-service";

describe("connect view", () => {
  it("adds a device when Add is clicked", async () => {
    const store = new AppStore();
    const ble = new FakeBleService();
    const root = document.createElement("div");
    renderConnectView(root, { store, ble, onAdded: () => {} });

    const btn = root.querySelector<HTMLButtonElement>("[data-action=add]")!;
    expect(btn).toBeTruthy();
    btn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(store.get().devices.length).toBe(1);
  });

  it("disables Add at 4 devices", () => {
    const store = new AppStore();
    for (let i = 0; i < 4; i++) store.addDevice(`d${i}`, `D${i}`);
    const root = document.createElement("div");
    renderConnectView(root, { store, ble: new FakeBleService(), onAdded: () => {} });
    const btn = root.querySelector<HTMLButtonElement>("[data-action=add]")!;
    expect(btn.disabled).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- connect-view`
Expected: FAIL — cannot find module.

- [ ] **Step 4: Write `src/ui/connect-view.ts`**

```ts
import type { AppStore } from "../state";
import type { BleService } from "../ble/types";
import { MAX_DEVICES } from "../device-store";
import { h, clear } from "./dom";

interface Opts {
  store: AppStore;
  ble: BleService;
  onAdded: (id: string) => void;
}

export function renderConnectView(root: HTMLElement, opts: Opts): void {
  const { store, ble, onAdded } = opts;
  const atLimit = store.get().devices.length >= MAX_DEVICES;

  const error = h("p", { class: "hint", "data-role": "error" });

  const btn = h(
    "button",
    {
      "data-action": "add",
      disabled: atLimit,
      onClick: async () => {
        error.textContent = "";
        try {
          const dev = await ble.requestDevice();
          store.addDevice(dev.id, dev.name);
          onAdded(dev.id);
        } catch (e) {
          error.textContent = (e as Error).message || "Could not connect";
        }
      },
    },
    [atLimit ? "4 devices connected" : "+ Add device"],
  );

  clear(root);
  root.append(h("section", { class: "connect" }, [btn, error]));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- connect-view`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/dom.ts src/ui/connect-view.ts tests/connect-view.test.ts
git commit -m "feat: add safe DOM helper and connect view with add-device flow"
```

---

## Task 8: Control view (`src/ui/control-view.ts`)

**Files:**
- Create: `src/ui/control-view.ts`
- Test: `tests/control-view.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { renderControlView } from "../src/ui/control-view";
import { AppStore } from "../src/state";
import { FakeBleService } from "../src/ble/fake-ble-service";

describe("control view", () => {
  it("renders the global bar plus one card per device", () => {
    const store = new AppStore();
    store.addDevice("a", "A");
    store.addDevice("b", "B");
    const root = document.createElement("div");
    renderControlView(root, { store, ble: new FakeBleService() });
    expect(root.querySelector("[data-role=global]")).toBeTruthy();
    expect(root.querySelectorAll("[data-role=device-card]").length).toBe(2);
  });

  it("global frequency change writes to follow devices only", async () => {
    const store = new AppStore();
    store.addDevice("a", "A");
    store.addDevice("b", "B");
    store.setDeviceMode("b", "custom");
    const ble = new FakeBleService();
    const root = document.createElement("div");
    renderControlView(root, { store, ble });

    const slider = root.querySelector<HTMLInputElement>(
      "[data-role=global] [data-control=frequency]",
    )!;
    slider.value = "90";
    slider.dispatchEvent(new Event("input"));
    await Promise.resolve();

    const freqCalls = ble.calls.filter((c) => c.m === "setFrequency");
    expect(freqCalls).toEqual([{ m: "setFrequency", args: ["a", 90] }]);
  });

  it("uses textContent for device names (no HTML injection)", () => {
    const store = new AppStore();
    store.addDevice("a", "<img src=x onerror=alert(1)>");
    const root = document.createElement("div");
    renderControlView(root, { store, ble: new FakeBleService() });
    const card = root.querySelector("[data-role=device-card]")!;
    expect(card.querySelector("img")).toBeNull();
    expect(card.textContent).toContain("<img src=x onerror=alert(1)>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- control-view`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `src/ui/control-view.ts`**

```ts
import type { AppStore, DeviceState, Settings } from "../state";
import { resolveSettings } from "../state";
import type { BleService } from "../ble/types";
import { FREQ_MIN, FREQ_MAX, INTENSITY_MIN, INTENSITY_MAX } from "../encoding";
import { h, clear } from "./dom";

interface Opts {
  store: AppStore;
  ble: BleService;
}

export function renderControlView(root: HTMLElement, opts: Opts): void {
  const { store, ble } = opts;
  const rerender = () => renderControlView(root, opts);

  clear(root);
  root.append(globalBar(store, ble));
  const cards = h("section", { class: "cards" });
  for (const d of store.get().devices) cards.append(deviceCard(d, store, ble, rerender));
  root.append(cards);
}

function followIds(store: AppStore): string[] {
  return store.get().devices.filter((d) => d.mode === "follow").map((d) => d.id);
}

function rangeInput(control: string, min: number, max: number, value: number, onInput: (v: number) => void): HTMLElement {
  return h("input", {
    type: "range",
    "data-control": control,
    min,
    max,
    value,
    onInput: (e: Event) => onInput(Number((e.target as HTMLInputElement).value)),
  });
}

function checkbox(control: string, checked: boolean, disabled: boolean, onChange: (v: boolean) => void): HTMLElement {
  return h("input", {
    type: "checkbox",
    "data-control": control,
    checked,
    disabled,
    onChange: (e: Event) => onChange((e.target as HTMLInputElement).checked),
  });
}

function globalBar(store: AppStore, ble: BleService): HTMLElement {
  const g = store.get().global;
  return h("section", { "data-role": "global", class: "global-bar" }, [
    h("h2", {}, ["All devices"]),
    h("label", {}, ["Power", checkbox("power", g.power, false, (v) => {
      store.setGlobal({ power: v });
      for (const id of followIds(store)) void ble.setPower(id, v);
    })]),
    h("label", {}, ["Frequency", rangeInput("frequency", FREQ_MIN, FREQ_MAX, g.frequency, (v) => {
      store.setGlobal({ frequency: v });
      for (const id of followIds(store)) void ble.setFrequency(id, v);
    })]),
    h("label", {}, ["Intensity", rangeInput("intensity", INTENSITY_MIN, INTENSITY_MAX, g.intensity, (v) => {
      store.setGlobal({ intensity: v });
      for (const id of followIds(store)) void ble.setIntensity(id, v);
    })]),
  ]);
}

function deviceCard(d: DeviceState, store: AppStore, ble: BleService, rerender: () => void): HTMLElement {
  const id = d.id;
  const s: Settings = d.custom;
  const disabled = d.mode === "follow";

  return h("article", { "data-role": "device-card", "data-id": id }, [
    h("header", {}, [d.name]), // textContent — safe against malicious advertised names
    h("label", {}, ["Custom", checkbox("mode", d.mode === "custom", false, (v) => {
      store.setDeviceMode(id, v ? "custom" : "follow");
      if (!v) void pushResolved(ble, store, id);
      rerender();
    })]),
    h("label", {}, ["Power", checkbox("power", s.power, disabled, (v) => {
      store.setDeviceCustom(id, { power: v });
      void ble.setPower(id, v);
    })]),
    h("label", {}, ["Frequency", rangeInput("frequency", FREQ_MIN, FREQ_MAX, s.frequency, (v) => {
      store.setDeviceCustom(id, { frequency: v });
      void ble.setFrequency(id, v);
    })]),
    h("label", {}, ["Intensity", rangeInput("intensity", INTENSITY_MIN, INTENSITY_MAX, s.intensity, (v) => {
      store.setDeviceCustom(id, { intensity: v });
      void ble.setIntensity(id, v);
    })]),
    h("button", { "data-control": "remove", onClick: () => {
      void ble.disconnect(id);
      store.removeDevice(id);
      rerender();
    } }, ["Remove"]),
  ]);
}

async function pushResolved(ble: BleService, store: AppStore, id: string): Promise<void> {
  const s = resolveSettings(store.get(), id);
  await ble.setPower(id, s.power);
  await ble.setFrequency(id, s.frequency);
  await ble.setIntensity(id, s.intensity);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- control-view`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/control-view.ts tests/control-view.test.ts
git commit -m "feat: add control view with global bar and per-device override cards"
```

---

## Task 9: Bootstrap wiring + unsupported-browser guidance (`src/main.ts`)

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Replace `src/main.ts`**

```ts
import { AppStore } from "./state";
import { WebBluetoothService } from "./ble/web-bluetooth-service";
import { FakeBleService } from "./ble/fake-ble-service";
import type { BleService } from "./ble/types";
import { renderConnectView } from "./ui/connect-view";
import { renderControlView } from "./ui/control-view";
import { h, clear } from "./ui/dom";

const app = document.getElementById("app")!;

// dev mode (no hardware) via ?fake
const useFake = new URLSearchParams(location.search).has("fake");
const ble: BleService = useFake ? new FakeBleService() : new WebBluetoothService();

if (!ble.isSupported()) {
  clear(app);
  app.append(
    h("div", { class: "unsupported" }, [
      h("h1", {}, ["Bluetooth not available in this browser"]),
      h("p", {}, ["On Android or desktop, open this page in Chrome or Edge."]),
      h("p", {}, ["On iPhone or iPad, install the free Bluefy browser, then open this page inside it."]),
    ]),
  );
} else {
  const store = new AppStore();
  const connectRoot = document.createElement("div");
  const controlRoot = document.createElement("div");
  app.append(connectRoot, controlRoot);

  const renderAll = () => {
    renderConnectView(connectRoot, { store, ble, onAdded: () => renderAll() });
    renderControlView(controlRoot, { store, ble });
  };

  ble.onDisconnect(() => renderAll());
  renderAll();
}
```

- [ ] **Step 2: Manual smoke test in fake mode**

Run: `npm run dev`
Open: `http://localhost:5173/?fake`
Expected: "+ Add device" adds Fake Device cards; sliders/toggles respond; Custom toggle enables a card's own controls; Remove works; Add disables at 4 devices.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire app bootstrap with fake-mode and unsupported-browser guidance"
```

---

## Task 10: README + open-source hosting docs

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Vibration Station

Free, open-source PWA to control XIAO nRF52840 vibration devices over Bluetooth LE.
No login, no backend, works offline after first load.

## Use it
- **Android / desktop:** open the app URL in Chrome or Edge.
- **iPhone / iPad:** install the free **Bluefy** browser, then open the app URL inside it.
  (Safari does not support Web Bluetooth.)

## Develop
```bash
npm install
npm run dev        # add ?fake to the URL to run without hardware
npm test
npm run build
```

## Host (free)
Deploy the `dist/` folder to GitHub Pages or Cloudflare Pages (static, no server).

## Firmware contract
Devices must advertise the custom GATT service in `src/ble/types.ts` with three
write characteristics: power (uint8 0/1), frequency (uint16 LE Hz), intensity (uint8 0–100).
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage, dev, hosting, and firmware contract"
```

---

## Task 11: Hardware verification + PWA offline check

No code unless a bug surfaces. Confirms the spec's real-device risks.

- [ ] **Step 1: Replace placeholder UUIDs**

In `src/ble/types.ts`, replace the four placeholder UUIDs with the firmware team's actual `SERVICE`/`POWER`/`FREQ`/`INTENSITY` UUIDs. Confirm frequency range and update `FREQ_MAX` in `src/encoding.ts` if different from 250.

- [ ] **Step 2: Build and host for testing**

Run: `npm run build && npm run preview`
Note the LAN URL; the test devices must reach it (or deploy to GitHub Pages / Cloudflare Pages).

- [ ] **Step 3: Run the hardware matrix**

For each of Android Chrome, desktop Chrome, iPad Bluefy, iPhone Bluefy:
- Connect up to 4 devices.
- Toggle global power/frequency/intensity; confirm devices respond.
- Set one device to Custom; confirm it ignores global and follows its own controls.
- Reload offline (airplane mode after first load); confirm app still loads and controls still work.
- Confirm whether devices auto-reconnect or require re-pair; note results.

- [ ] **Step 4: Record findings**

Append a short results section to the design spec (`docs/superpowers/specs/2026-05-22-vibration-control-pwa-design.md`) noting Bluefy offline + reconnect behavior and max simultaneous connections observed.

- [ ] **Step 5: Commit**

```bash
git add src/ble/types.ts src/encoding.ts docs/
git commit -m "chore: set firmware UUIDs and record hardware verification results"
```

---

## Self-Review Notes

- **Spec coverage:** offline (Task 1 PWA + Task 11 check), platform guidance (Task 9), GATT contract (Tasks 5/6), up-to-4 cap (Task 4), global + per-device control (Task 8), error/disconnect handling (Tasks 7–9), name-injection safety (Task 7 dom helper + Task 8 test), testing (Tasks 2–8 + Task 11 matrix), hosting/open-source (Task 10). All covered.
- **Type consistency:** `BleService` methods, `Settings`/`DeviceState`/`AppState`, `AppStore` method names, `resolveSettings`/`pushSettings`, and the `h()`/`clear()` helpers are used identically across Tasks 3–9.
- **Known limitation carried forward:** frequency/intensity ranges are placeholders until Task 11 Step 1 sets them from firmware.
- **Note:** `DeviceStore` (Task 4) persists pairings to localStorage; full silent-reconnect on launch depends on browser support and is validated in Task 11 — wiring `DeviceStore` into `main.ts` reconnect flow is deferred until that behavior is confirmed, to avoid building re-pair UX against unverified assumptions.

## Revision — firmware-aligned contract (2026-05-22)

After reviewing `Bluetooth_Board_Code.ino`, the contract changed (see the spec's
revision section). Net effect on this plan:

- **No intensity.** Remove `INTENSITY_*`, `encodeIntensity`, `INTENSITY_CHAR_UUID`,
  `setIntensity`, and all intensity UI. `Settings = { power, frequency }`.
- **Frequency range 80–160 Hz.** `FREQ_MIN = 80`, `FREQ_MAX = 160`. Default
  global `{ power: false, frequency: 120 }`.
- **Two write characteristics** (power, frequency) on the custom service; firmware
  will be upgraded to expose them.

Tasks 2/3/5/6 (already built) are amended by a refactor commit to match. Tasks
7–9 (UI) build power-toggle + frequency-slider controls only — no intensity slider.
```