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
 * same store the foreground service reads — so there is no Supabase and no
 * network in this path.
 */
export interface BlockerPlugin {
  getInstalledApps(options?: { includeIcons?: boolean }): Promise<{ apps: InstalledApp[] }>;
  getBlockedApps(): Promise<{ packages: string[] }>;
  setBlockedApps(options: { packages: string[] }): Promise<void>;
  setBlockingEnabled(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
  isBlockingEnabled(): Promise<{ enabled: boolean }>;
  isUsageAccessGranted(): Promise<{ granted: boolean }>;
  openUsageAccessSettings(): Promise<void>;
  isOverlayGranted(): Promise<{ granted: boolean }>;
  openOverlaySettings(): Promise<void>;
  /** The task the user set manually on the Skupienie screen (shown by the overlay). */
  setCurrentTask(options: { title: string }): Promise<{ title: string }>;
  getCurrentTask(): Promise<{ title: string }>;
  /**
   * The ordered list of not-done day-plan titles (day_block + position). The
   * overlay reads it to let the user skip ("Nie teraz") to the next one. Passing
   * an empty array clears it, so the overlay falls back to current_task.
   */
  setDayTasks(options: { titles: string[] }): Promise<void>;
  /**
   * Today's Rozwój state. While `planned` is true and `done` is false the
   * overlay withholds the break entirely and shows `titles` instead of the full
   * plan — "najpierw jedna rzecz dla siebie". The native side stamps dates, so a
   * value left over from yesterday stops applying on its own.
   */
  setGrowthState(options: {
    planned: boolean;
    done: boolean;
    titles: string[];
  }): Promise<void>;
  /**
   * Mirror the chosen accent (key + sRGB hex) into native prefs so the block
   * overlay can pick it up in a later brief. UI does not read this back.
   */
  setAccentColor(options: { key: string; hex: string }): Promise<void>;

  /** Whether a blocker PIN has been set on this device. */
  hasPin(): Promise<{ hasPin: boolean }>;
  /** Store a new 4-digit PIN (SHA-256 hashed with a static salt). */
  setPin(options: { pin: string }): Promise<void>;
  /** Check a raw PIN against the stored hash. */
  verifyPin(options: { pin: string }): Promise<{ valid: boolean }>;
  /** Remove the stored PIN entirely. */
  clearPin(): Promise<void>;

  /** Push break-config values (from Supabase profile) into native SharedPreferences. */
  setBreakConfig(options: { delaySeconds: number; dailyLimit: number }): Promise<void>;
}

export const Blocker = registerPlugin<BlockerPlugin>("Blocker");

/**
 * True only inside the native Android app. In the web preview the native
 * plugin is unavailable, so screens use this to stay read-only instead of
 * calling methods that would reject.
 */
export const isNativeBlocker = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
