# Vibration Station

Free, open-source PWA to control XIAO nRF52840 vibration devices over Bluetooth LE.
No login, no backend, works offline after first load. Built for caregivers/researchers
to connect up to 4 devices and control power and frequency — globally or per device.

## Use it

- **Android / desktop:** open the app URL in **Chrome** or **Edge**.
- **iPhone / iPad:** install the free **Bluefy** browser, then open the app URL inside it.
  (Safari does not support Web Bluetooth.)

## Develop

```bash
npm install
npm run dev        # add ?fake to the URL to run without hardware
npm test
npm run build
```

`http://localhost:5173/?fake` runs the UI against an in-memory fake BLE service,
so you can develop the interface with no devices present.

## Host (free)

Deploy the `dist/` folder to GitHub Pages or Cloudflare Pages (static, no server).

## Firmware contract

Devices advertise a custom GATT service (UUIDs in `src/ble/types.ts`) with two
write characteristics:

| Characteristic | Type        | Value                        |
|----------------|-------------|------------------------------|
| Power          | `uint8`     | `0` (off) / `1` (on)         |
| Frequency      | `uint16` LE | Hz, range **80–160**         |

Intensity/amplitude is not part of v1 (the motor is frequency-only via `tone()`).
`Bluetooth_Board_Code.ino` is the current reference firmware; it will be upgraded
to expose the custom service and these two characteristics. Replace the placeholder
UUIDs in `src/ble/types.ts` with the firmware's real UUIDs.
