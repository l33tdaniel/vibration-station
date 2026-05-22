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
