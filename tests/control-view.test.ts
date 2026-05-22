import { describe, it, expect } from "vitest";
import { renderControlView } from "../src/ui/control-view";
import { AppStore } from "../src/state";
import { FakeBleService } from "../src/ble/fake-ble-service";

describe("control view", () => {
  it("renders the global bar plus one card per device", () => {
    const store = new AppStore();
    store.addDevice("a", "A");
    store.addDevice("b", "B");
    const root = document.createElement("div");
    renderControlView(root, { store, ble: new FakeBleService() });
    expect(root.querySelector("[data-role=global]")).toBeTruthy();
    expect(root.querySelectorAll("[data-role=device-card]").length).toBe(2);
  });

  it("global frequency change writes to follow devices only", async () => {
    const store = new AppStore();
    store.addDevice("a", "A");
    store.addDevice("b", "B");
    store.setDeviceMode("b", "custom");
    const ble = new FakeBleService();
    const root = document.createElement("div");
    renderControlView(root, { store, ble });

    const slider = root.querySelector<HTMLInputElement>(
      "[data-role=global] [data-control=frequency]",
    )!;
    slider.value = "150";
    slider.dispatchEvent(new Event("input"));
    await Promise.resolve();

    const freqCalls = ble.calls.filter((c) => c.m === "setFrequency");
    expect(freqCalls).toEqual([{ m: "setFrequency", args: ["a", 150] }]);
  });

  it("uses textContent for device names (no HTML injection)", () => {
    const store = new AppStore();
    store.addDevice("a", "<img src=x onerror=alert(1)>");
    const root = document.createElement("div");
    renderControlView(root, { store, ble: new FakeBleService() });
    const card = root.querySelector("[data-role=device-card]")!;
    expect(card.querySelector("img")).toBeNull();
    expect(card.textContent).toContain("<img src=x onerror=alert(1)>");
  });
});
