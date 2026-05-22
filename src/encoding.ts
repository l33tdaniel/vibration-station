export const FREQ_MIN = 80;
export const FREQ_MAX = 160;

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

// Return type is pinned to an ArrayBuffer-backed view so it satisfies the
// Web Bluetooth writeValue() BufferSource parameter under strict TS.
export function encodePower(on: boolean): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(1);
  buf[0] = on ? 1 : 0;
  return buf;
}

export function encodeFrequency(hz: number): Uint8Array<ArrayBuffer> {
  const v = clamp(hz, FREQ_MIN, FREQ_MAX);
  const buf = new Uint8Array(2);
  new DataView(buf.buffer).setUint16(0, v, true);
  return buf;
}
