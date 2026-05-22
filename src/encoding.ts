export const FREQ_MIN = 80;
export const FREQ_MAX = 160;

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
