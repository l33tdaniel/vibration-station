import { describe, it, expect } from "vitest";
import { renderConnectView } from "../src/ui/connect-view";
import { AppStore } from "../src/state";
import { FakeBleService } from "../src/ble/fake-ble-service";

describe("connect view", () => {
  it("adds a device when Add is clicked", async () => {
    const store = new AppStore();
    const ble = new FakeBleService();
    const root = document.createElement("div");
    renderConnectView(root, { store, ble, onAdded: () => {} });

    const btn = root.querySelector<HTMLButtonElement>("[data-action=add]")!;
    expect(btn).toBeTruthy();
    btn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(store.get().devices.length).toBe(1);
  });

  it("disables Add at 4 devices", () => {
    const store = new AppStore();
    for (let i = 0; i < 4; i++) store.addDevice(`d${i}`, `D${i}`);
    const root = document.createElement("div");
    renderConnectView(root, { store, ble: new FakeBleService(), onAdded: () => {} });
    const btn = root.querySelector<HTMLButtonElement>("[data-action=add]")!;
    expect(btn.disabled).toBe(true);
  });
});
