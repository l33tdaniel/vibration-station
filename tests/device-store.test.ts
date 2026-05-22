import { describe, it, expect, beforeEach } from "vitest";
import { DeviceStore, MAX_DEVICES } from "../src/device-store";

function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

describe("DeviceStore", () => {
  let storage: Storage;
  beforeEach(() => { storage = memStorage(); });

  it("adds and persists devices", () => {
    const s = new DeviceStore(storage);
    s.add({ id: "a", name: "A" });
    expect(new DeviceStore(storage).list()).toEqual([{ id: "a", name: "A" }]);
  });
  it("ignores duplicate ids", () => {
    const s = new DeviceStore(storage);
    s.add({ id: "a", name: "A" });
    s.add({ id: "a", name: "A again" });
    expect(s.list().length).toBe(1);
  });
  it("blocks adding beyond MAX_DEVICES", () => {
    const s = new DeviceStore(storage);
    for (let i = 0; i < MAX_DEVICES; i++) s.add({ id: `d${i}`, name: `D${i}` });
    expect(s.canAdd()).toBe(false);
    expect(() => s.add({ id: "x", name: "X" })).toThrow();
  });
  it("removes devices", () => {
    const s = new DeviceStore(storage);
    s.add({ id: "a", name: "A" });
    s.remove("a");
    expect(s.list()).toEqual([]);
  });
});
