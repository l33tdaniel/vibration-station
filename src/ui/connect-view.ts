import type { AppStore } from "../state";
import type { BleService } from "../ble/types";
import { MAX_DEVICES } from "../device-store";
import { h, clear } from "./dom";

interface Opts {
  store: AppStore;
  ble: BleService;
  onAdded: (id: string) => void;
}

export function renderConnectView(root: HTMLElement, opts: Opts): void {
  const { store, ble, onAdded } = opts;
  const atLimit = store.get().devices.length >= MAX_DEVICES;

  const error = h("p", { class: "hint", "data-role": "error" });

  const btn = h(
    "button",
    {
      "data-action": "add",
      disabled: atLimit,
      onClick: async () => {
        error.textContent = "";
        try {
          const dev = await ble.requestDevice();
          store.addDevice(dev.id, dev.name);
          onAdded(dev.id);
        } catch (e) {
          error.textContent = (e as Error).message || "Could not connect";
        }
      },
    },
    [atLimit ? "4 devices connected" : "+ Add device"],
  );

  clear(root);
  root.append(h("section", { class: "connect" }, [btn, error]));
}
