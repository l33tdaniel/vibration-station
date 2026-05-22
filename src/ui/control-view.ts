import type { AppStore, DeviceState, Settings } from "../state";
import { resolveSettings, pushSettings } from "../state";
import type { BleService } from "../ble/types";
import { FREQ_MIN, FREQ_MAX } from "../encoding";
import { h, clear } from "./dom";

interface Opts {
  store: AppStore;
  ble: BleService;
}

export function renderControlView(root: HTMLElement, opts: Opts): void {
  const { store, ble } = opts;
  const rerender = () => renderControlView(root, opts);

  clear(root);
  root.append(globalBar(store, ble));
  const cards = h("section", { class: "cards" });
  for (const d of store.get().devices) cards.append(deviceCard(d, store, ble, rerender));
  root.append(cards);
}

function followIds(store: AppStore): string[] {
  return store.get().devices.filter((d) => d.mode === "follow").map((d) => d.id);
}

function rangeInput(
  control: string, min: number, max: number, value: number, onInput: (v: number) => void,
): HTMLElement {
  return h("input", {
    type: "range",
    "data-control": control,
    min, max, value,
    onInput: (e: Event) => onInput(Number((e.target as HTMLInputElement).value)),
  });
}

function checkbox(
  control: string, checked: boolean, disabled: boolean, onChange: (v: boolean) => void,
): HTMLElement {
  return h("input", {
    type: "checkbox",
    "data-control": control,
    checked, disabled,
    onChange: (e: Event) => onChange((e.target as HTMLInputElement).checked),
  });
}

function globalBar(store: AppStore, ble: BleService): HTMLElement {
  const g = store.get().global;
  return h("section", { "data-role": "global", class: "global-bar" }, [
    h("h2", {}, ["All devices"]),
    h("label", {}, ["Power", checkbox("power", g.power, false, (v) => {
      store.setGlobal({ power: v });
      for (const id of followIds(store)) void ble.setPower(id, v);
    })]),
    h("label", {}, ["Frequency", rangeInput("frequency", FREQ_MIN, FREQ_MAX, g.frequency, (v) => {
      store.setGlobal({ frequency: v });
      for (const id of followIds(store)) void ble.setFrequency(id, v);
    })]),
  ]);
}

function deviceCard(d: DeviceState, store: AppStore, ble: BleService, rerender: () => void): HTMLElement {
  const id = d.id;
  // show resolved settings: global for follow devices, own values for custom
  const s: Settings = resolveSettings(store.get(), id);
  const disabled = d.mode === "follow";

  return h("article", { "data-role": "device-card", "data-id": id }, [
    h("header", {}, [d.name]), // textContent — safe against malicious advertised names
    h("label", {}, ["Custom", checkbox("mode", d.mode === "custom", false, (v) => {
      store.setDeviceMode(id, v ? "custom" : "follow");
      if (!v) void pushSettings(ble, id, resolveSettings(store.get(), id));
      rerender();
    })]),
    h("label", {}, ["Power", checkbox("power", s.power, disabled, (v) => {
      store.setDeviceCustom(id, { power: v });
      void ble.setPower(id, v);
    })]),
    h("label", {}, ["Frequency", rangeInput("frequency", FREQ_MIN, FREQ_MAX, s.frequency, (v) => {
      store.setDeviceCustom(id, { frequency: v });
      void ble.setFrequency(id, v);
    })]),
    h("button", { "data-control": "remove", onClick: () => {
      void ble.disconnect(id);
      store.removeDevice(id);
      rerender();
    } }, ["Remove"]),
  ]);
}
