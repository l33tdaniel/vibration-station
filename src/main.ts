import { AppStore } from "./state";
import { WebBluetoothService } from "./ble/web-bluetooth-service";
import { FakeBleService } from "./ble/fake-ble-service";
import type { BleService } from "./ble/types";
import { renderConnectView } from "./ui/connect-view";
import { renderControlView } from "./ui/control-view";
import { h, clear } from "./ui/dom";

const app = document.getElementById("app")!;

// dev mode (no hardware) via ?fake
const useFake = new URLSearchParams(location.search).has("fake");
const ble: BleService = useFake ? new FakeBleService() : new WebBluetoothService();

if (!ble.isSupported()) {
  clear(app);
  app.append(
    h("div", { class: "unsupported" }, [
      h("h1", {}, ["Bluetooth not available in this browser"]),
      h("p", {}, ["On Android or desktop, open this page in Chrome or Edge."]),
      h("p", {}, ["On iPhone or iPad, install the free Bluefy browser, then open this page inside it."]),
    ]),
  );
} else {
  const store = new AppStore();
  const connectRoot = document.createElement("div");
  const controlRoot = document.createElement("div");
  app.append(connectRoot, controlRoot);

  const renderAll = () => {
    renderConnectView(connectRoot, { store, ble, onAdded: () => renderAll() });
    renderControlView(controlRoot, { store, ble });
  };

  ble.onDisconnect(() => renderAll());
  renderAll();
}
