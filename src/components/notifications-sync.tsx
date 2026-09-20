import { useNotificationsSync, useRoutineNotificationsSync } from "@/lib/notifications";

/**
 * Headless: keeps the on-device daily reminders and routine notifications
 * in step with the profile hours, the live day state, and routine schedules.
 * Mounted in the authenticated tree next to BlockedAppsSync. No-op on web.
 */
export function NotificationsSync() {
  useNotificationsSync();
  useRoutineNotificationsSync();
  return null;
}
