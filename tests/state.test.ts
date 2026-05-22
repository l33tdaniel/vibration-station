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
    s.setGlobal({ frequency: 60, intensity: 70, power: true });
    s.addDevice("a", "A");
    s.addDevice("b", "B");
    s.setDeviceMode("b", "custom");
    s.setDeviceCustom("b", { frequency: 10 });
    expect(resolveSettings(s.get(), "a").frequency).toBe(60);
    expect(resolveSettings(s.get(), "b").frequency).toBe(10);
  });
});

describe("pushSettings", () => {
  it("writes power, frequency, intensity for one device", async () => {
    const ble = new FakeBleService();
    await pushSettings(ble, "a", { power: true, frequency: 55, intensity: 40 });
    expect(ble.calls.map((c) => c.m)).toEqual(["setPower", "setFrequency", "setIntensity"]);
    expect(ble.calls[1].args).toEqual(["a", 55]);
  });
});
