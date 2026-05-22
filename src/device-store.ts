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
