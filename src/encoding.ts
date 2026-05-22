// NOTE: confirm real ranges with the firmware team; these are placeholders.
export const FREQ_MIN = 0;
export const FREQ_MAX = 20000;
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
