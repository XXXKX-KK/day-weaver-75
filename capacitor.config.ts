import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "pl.dzienlepszy.app",
  appName: "Dzień Lepszy",
  webDir: "dist/client",
  plugins: {
    LocalNotifications: {
      // Tint for the reminder icon (accent). Uses the app icon by default.
      iconColor: "#EE4261",
    },
  },
};

export default config;
