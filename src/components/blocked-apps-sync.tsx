import { useBlockedAppsNativeSync } from "@/lib/blocked-apps";

/**
 * Headless: mirrors the Supabase blocked-apps selection into native prefs at
 * startup/login and after every change. Mounted inside the authenticated tree.
 */
export function BlockedAppsSync() {
  useBlockedAppsNativeSync();
  return null;
}
