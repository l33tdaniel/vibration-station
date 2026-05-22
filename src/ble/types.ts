// PLACEHOLDER UUIDs — replace with the firmware team's actual custom UUIDs.
export const SERVICE_UUID = "f0000001-0451-4000-b000-000000000000";
export const POWER_CHAR_UUID = "f0000002-0451-4000-b000-000000000000";
export const FREQ_CHAR_UUID = "f0000003-0451-4000-b000-000000000000";
export interface ConnectedDevice {
  id: string;
  name: string;
}

export interface BleService {
  isSupported(): boolean;
  requestDevice(): Promise<ConnectedDevice>;
  setPower(id: string, on: boolean): Promise<void>;
  setFrequency(id: string, hz: number): Promise<void>;
  disconnect(id: string): Promise<void>;
  onDisconnect(cb: (id: string) => void): void;
}
