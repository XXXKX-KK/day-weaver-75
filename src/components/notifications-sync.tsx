import { useNotificationsSync } from "@/lib/notifications";

/**
 * Headless: keeps the on-device daily reminders in step with the profile hours
 * and the live day state. Mounted in the authenticated tree next to
 * BlockedAppsSync. No-op on web.
 */
export function NotificationsSync() {
  useNotificationsSync();
  return null;
}
