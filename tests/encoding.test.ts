import { describe, it, expect } from "vitest";
import {
  clamp, encodePower, encodeFrequency,
  FREQ_MIN, FREQ_MAX,
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
    expect(Array.from(encodeFrequency(130))).toEqual([130, 0]); // 130 = 0x0082 LE
    expect(Array.from(encodeFrequency(FREQ_MAX + 1000))).toEqual(
      Array.from(encodeFrequency(FREQ_MAX)),
    ); // over-max clamps to FREQ_MAX (160)
    expect(Array.from(encodeFrequency(FREQ_MIN - 50))).toEqual([FREQ_MIN, 0]); // under-min clamps to FREQ_MIN (80)
  });
});
