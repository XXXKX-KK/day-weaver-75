import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tenax.app",
  appName: "TENAX",
  webDir: "dist/client",
  plugins: {
    SplashScreen: {
      // The native splash holds until the web splash has painted and calls
      // hide(); otherwise the WebView shows a blank frame in between.
      launchAutoHide: false,
      backgroundColor: "#0B0D12",
      showSpinner: false,
    },
    LocalNotifications: {
      // Tint for the reminder icon (accent). Uses the app icon by default.
      iconColor: "#3B82F6",
    },
  },
};

export default config;
