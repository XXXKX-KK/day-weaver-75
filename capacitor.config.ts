import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tenax.app",
  appName: "TENAX",
  webDir: "dist/client",
  plugins: {
    LocalNotifications: {
      // Tint for the reminder icon (accent). Uses the app icon by default.
      iconColor: "#3B82F6",
    },
  },
};

export default config;
