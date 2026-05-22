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
