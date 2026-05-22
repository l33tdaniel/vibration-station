import {
  type BleService, type ConnectedDevice,
  SERVICE_UUID, POWER_CHAR_UUID, FREQ_CHAR_UUID,
} from "./types";
import { encodePower, encodeFrequency } from "../encoding";

interface Conn {
  device: BluetoothDevice;
  power: BluetoothRemoteGATTCharacteristic;
  freq: BluetoothRemoteGATTCharacteristic;
  onDrop: () => void;
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
    const id = device.id;
    const onDrop = () => {
      this.conns.delete(id);
      this.disconnectCb?.(id);
    };
    const conn = await this.openConnection(device, onDrop);
    this.conns.set(id, conn);
    device.addEventListener("gattserverdisconnected", onDrop);
    return { id, name: device.name ?? "Vibration device" };
  }

  private async openConnection(device: BluetoothDevice, onDrop: () => void): Promise<Conn> {
    if (!device.gatt) throw new Error("GATT not available on this device");
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const [power, freq] = await Promise.all([
      service.getCharacteristic(POWER_CHAR_UUID),
      service.getCharacteristic(FREQ_CHAR_UUID),
    ]);
    return { device, power, freq, onDrop };
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
  async disconnect(id: string): Promise<void> {
    const conn = this.conns.get(id);
    if (!conn) return;
    // remove the drop listener first so an intentional disconnect doesn't
    // fire the onDisconnect callback (that is reserved for real peripheral drops)
    conn.device.removeEventListener("gattserverdisconnected", conn.onDrop);
    conn.device.gatt?.disconnect();
    this.conns.delete(id);
  }
  onDisconnect(cb: (id: string) => void): void {
    this.disconnectCb = cb;
  }
}
