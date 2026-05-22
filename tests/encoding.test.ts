import { describe, it, expect } from "vitest";
import {
  clamp, encodePower, encodeFrequency, encodeIntensity,
  FREQ_MIN, FREQ_MAX, INTENSITY_MAX,
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
    expect(Array.from(encodeFrequency(258))).toEqual([2, 1]); // 258 = 0x0102
    expect(Array.from(encodeFrequency(FREQ_MAX + 1000)).length).toBe(2);
    expect(Array.from(encodeFrequency(FREQ_MIN - 5))).toEqual([0, 0]);
  });
  it("encodes intensity as one clamped byte", () => {
    expect(Array.from(encodeIntensity(50))).toEqual([50]);
    expect(Array.from(encodeIntensity(INTENSITY_MAX + 10))).toEqual([100]);
  });
});
