import type { BleService } from "./ble/types";

export interface Settings {
  power: boolean;
  frequency: number;
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

const DEFAULT_GLOBAL: Settings = { power: false, frequency: 120 };

export function resolveSettings(state: AppState, id: string): Settings {
  const d = state.devices.find((x) => x.id === id);
  if (!d) throw new Error(`unknown device ${id}`);
  return d.mode === "custom" ? d.custom : state.global;
}

export async function pushSettings(ble: BleService, id: string, s: Settings): Promise<void> {
  await ble.setPower(id, s.power);
  await ble.setFrequency(id, s.frequency);
}

export class AppStore {
  private state: AppState = { global: { ...DEFAULT_GLOBAL }, devices: [] };
  private listeners: Array<() => void> = [];

  get(): AppState {
    // shallow copy so consumers (e.g. UI) can't mutate state behind the store
    return { global: { ...this.state.global }, devices: [...this.state.devices] };
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
    if (!d) return;
    d.mode = mode;
    this.emit();
  }
  setDeviceCustom(id: string, p: Partial<Settings>): void {
    const d = this.find(id);
    if (!d) return;
    d.custom = { ...d.custom, ...p };
    this.emit();
  }
}
