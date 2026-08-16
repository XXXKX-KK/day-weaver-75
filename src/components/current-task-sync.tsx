import { useCurrentTaskNativeSync } from "@/lib/day";

/**
 * Headless: mirrors the day's first not-done plan item into native prefs
 * (current_task) so the block overlay shows it. Mounted in the authenticated
 * tree next to BlockedAppsSync. No-op on web.
 */
export function CurrentTaskSync() {
  useCurrentTaskNativeSync();
  return null;
}
