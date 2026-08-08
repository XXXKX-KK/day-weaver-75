import { Capacitor, registerPlugin } from "@capacitor/core";

/** A launchable app installed on the device. */
export type InstalledApp = {
  packageName: string;
  appLabel: string;
  icon?: string;
};

/**
 * Native app-blocking bridge (Android). Implemented by BlockerPlugin.java.
 * The blocked list and enabled flag live in native SharedPreferences — the
 * same store the AccessibilityService reads — so there is no Supabase and no
 * network in this path.
 */
export interface BlockerPlugin {
  getInstalledApps(options?: { includeIcons?: boolean }): Promise<{ apps: InstalledApp[] }>;
  getBlockedApps(): Promise<{ packages: string[] }>;
  setBlockedApps(options: { packages: string[] }): Promise<void>;
  setBlockingEnabled(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
  isBlockingEnabled(): Promise<{ enabled: boolean }>;
  isAccessibilityEnabled(): Promise<{ enabled: boolean }>;
  openAccessibilitySettings(): Promise<void>;
}

export const Blocker = registerPlugin<BlockerPlugin>("Blocker");

/**
 * True only inside the native Android app. In the web preview the native
 * plugin is unavailable, so screens use this to stay read-only instead of
 * calling methods that would reject.
 */
export const isNativeBlocker = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
