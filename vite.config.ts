import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Vibration Station",
        short_name: "Vibration",
        start_url: ".",
        display: "standalone",
        background_color: "#101418",
        theme_color: "#101418",
        icons: [],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"] },
    }),
  ],
  test: { environment: "jsdom", globals: true },
});
