import { describe, it, expect } from "vitest";
import { AppStore, resolveSettings, pushSettings } from "../src/state";
import { FakeBleService } from "../src/ble/fake-ble-service";

describe("AppStore", () => {
  it("starts with no devices and default global", () => {
    const s = new AppStore();
    expect(s.get().devices).toEqual([]);
    expect(s.get().global.power).toBe(false);
  });
  it("adds devices in follow mode and ignores duplicates", () => {
    const s = new AppStore();
    s.addDevice("a", "Dev A");
    s.addDevice("a", "Dev A");
    expect(s.get().devices.length).toBe(1);
    expect(s.get().devices[0].mode).toBe("follow");
  });
  it("notifies subscribers on change", () => {
    const s = new AppStore();
    let n = 0;
    s.subscribe(() => n++);
    s.setGlobal({ frequency: 80 });
    expect(n).toBe(1);
  });
});

describe("resolveSettings", () => {
  it("returns global for follow devices, custom for custom devices", () => {
    const s = new AppStore();
    s.setGlobal({ frequency: 100, power: true });
    s.addDevice("a", "A");
    s.addDevice("b", "B");
    s.setDeviceMode("b", "custom");
    s.setDeviceCustom("b", { frequency: 90 });
    expect(resolveSettings(s.get(), "a").frequency).toBe(100);
    expect(resolveSettings(s.get(), "b").frequency).toBe(90);
  });
});

describe("pushSettings", () => {
  it("writes power and frequency for one device", async () => {
    const ble = new FakeBleService();
    await pushSettings(ble, "a", { power: true, frequency: 100 });
    expect(ble.calls.map((c) => c.m)).toEqual(["setPower", "setFrequency"]);
    expect(ble.calls[1].args).toEqual(["a", 100]);
  });
});
