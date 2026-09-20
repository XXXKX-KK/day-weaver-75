import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useProfile } from "@/lib/profile";
import { useToday } from "@/lib/day";
import { useRoutines, type RoutineRow } from "@/lib/routines";

/**
 * Local (on-device) daily reminders — no server, no push, no Firebase.
 * Two repeating notifications built from the profile's day hours:
 *  - morning at day_start_time: nudge to start the day,
 *  - evening at day_end_time: nag about unfinished items / the streak.
 *
 * Everything is a safe no-op off-device (web/SSR) via isNative().
 */

const MORNING_ID = 1001;
const EVENING_ID = 1002;
const TASK_ID_BASE = 2000;
const ROUTINE_ID_BASE = 3_000_000;
const CHANNEL_ID = "dl-reminders";
const TASK_CHANNEL_ID = "dl-task-reminders";
const ROUTINE_CHANNEL_ID = "dl-routine-reminders";

/** localStorage flag for the Settings toggle (default on). */
const ENABLED_KEY = "dl-notifications-enabled";

/** True only inside the native app; guards every plugin call (SSR/web-safe). */
function isNative(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function areNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ENABLED_KEY) !== "false";
}

export function setNotificationsEnabledLocal(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
}

/** "HH:MM[:SS]" → { hour, minute }, or null when unset/invalid. */
function parseHm(value: string | null | undefined): { hour: number; minute: number } | null {
  if (!value) return null;
  const [h, m] = value.split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** PL: 1 → "rzecz", otherwise "rzeczy" (good enough for the reminder copy). */
function thingsWord(n: number): string {
  return n === 1 ? "rzecz" : "rzeczy";
}

export type NotificationState = {
  dayStartTime: string | null;
  dayEndTime: string | null;
  /** Not-done day items right now (0 when the day isn't in progress). */
  undoneCount: number;
  /** profiles.streak_count. */
  streak: number;
  /** Whether today's plan is already completed. */
  dayCompleted: boolean;
};

type ScheduledNotification = Parameters<
  typeof LocalNotifications.schedule
>[0]["notifications"][number];

/** Build the (0–2) notifications for the current state. */
function buildNotifications(state: NotificationState): ScheduledNotification[] {
  const notifications: ScheduledNotification[] = [];
  const morning = parseHm(state.dayStartTime);
  const evening = parseHm(state.dayEndTime);

  if (morning) {
    notifications.push({
      id: MORNING_ID,
      channelId: CHANNEL_ID,
      title: "Zacznij swój dzień",
      body: "Zaplanuj dzień i ruszaj — Twój plan już czeka.",
      schedule: { on: { hour: morning.hour, minute: morning.minute } },
    });
  }

  if (evening) {
    const streakActive = state.streak > 0 && !state.dayCompleted;
    const streakLine = `Nie strać swojej passy ${state.streak} dni!`;
    let body: string | null = null;

    if (state.undoneCount > 0) {
      body = `Masz jeszcze ${state.undoneCount} ${thingsWord(state.undoneCount)} do zrobienia.`;
      if (streakActive) body += ` ${streakLine}`;
    } else if (streakActive) {
      body = streakLine;
    }

    // No unfinished work and no streak to protect → nothing worth nagging about.
    if (body) {
      notifications.push({
        id: EVENING_ID,
        channelId: CHANNEL_ID,
        title: "Dzień się kończy",
        body,
        schedule: { on: { hour: evening.hour, minute: evening.minute } },
      });
    }
  }

  return notifications;
}

async function ensurePermission(): Promise<boolean> {
  const status = await LocalNotifications.checkPermissions();
  if (status.display === "granted") return true;
  if (status.display === "denied") return false;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
}

async function ensureChannel(): Promise<void> {
  // Android 8+ needs a channel; importance 4 (HIGH) so One UI shows a heads-up.
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "Przypomnienia dnia",
    description: "Poranne i wieczorne przypomnienia o planie dnia.",
    importance: 4,
  });
}

/** Remove any previously scheduled reminders (idempotent, safe if none exist). */
export async function cancelReminders(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: MORNING_ID }, { id: EVENING_ID }],
    });
  } catch (e) {
    console.error("cancelReminders failed", e);
  }
}

/**
 * Reschedule both reminders from the current state. Cancels first so we never
 * stack duplicates. No-op off-device or when the toggle is off (then it also
 * clears anything already scheduled).
 */
export async function refreshNotifications(state: NotificationState): Promise<void> {
  if (!isNative()) return;
  try {
    if (!areNotificationsEnabled()) {
      await cancelReminders();
      return;
    }
    const granted = await ensurePermission();
    if (!granted) return;
    await ensureChannel();
    // Always clear before setting — avoids duplicate daily alarms.
    await cancelReminders();
    const notifications = buildNotifications(state);
    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (e) {
    console.error("refreshNotifications failed", e);
  }
}

/** Stable numeric ID for a task UUID (offset to avoid collision with daily IDs). */
function taskNotificationId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = ((hash << 5) - hash + taskId.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 1_000_000) + TASK_ID_BASE;
}

/**
 * Schedule a one-shot notification 10 minutes before a task's scheduled time.
 * No-op on web, when time is missing, or when the moment has already passed.
 */
export async function scheduleTaskReminder(task: {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
}): Promise<void> {
  if (!isNative() || !areNotificationsEnabled()) return;
  try {
    const granted = await ensurePermission();
    if (!granted) return;

    await LocalNotifications.createChannel({
      id: TASK_CHANNEL_ID,
      name: "Przypomnienia o zadaniach",
      description: "Powiadomienia 10 min przed zaplanowanym zadaniem.",
      importance: 4,
    });

    const [h, m] = task.scheduled_time.split(":").map(Number);
    if (h === undefined || m === undefined) return;
    const parts = task.scheduled_date.split("-").map(Number);
    const fireAt = new Date(parts[0]!, parts[1]! - 1, parts[2]!, h, m, 0);
    fireAt.setMinutes(fireAt.getMinutes() - 10);

    if (fireAt.getTime() <= Date.now()) return;

    const id = taskNotificationId(task.id);
    await LocalNotifications.cancel({ notifications: [{ id }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          channelId: TASK_CHANNEL_ID,
          title: "Za 10 minut",
          body: task.title,
          schedule: { at: fireAt },
        },
      ],
    });
  } catch (e) {
    console.error("scheduleTaskReminder failed", e);
  }
}

/** Cancel a previously scheduled task reminder. */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: taskNotificationId(taskId) }],
    });
  } catch (e) {
    console.error("cancelTaskReminder failed", e);
  }
}

/**
 * Stable numeric notification ID for a routine + weekday combo.
 * dayOffset 0..6 maps to the 7 possible per-weekday notifications.
 * If the routine runs all 7 days, dayOffset 0 is the single daily one.
 */
function routineNotificationId(routineId: string, dayOffset: number): number {
  let hash = 0;
  for (let i = 0; i < routineId.length; i++) {
    hash = ((hash << 5) - hash + routineId.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 1_000_000) * 8 + dayOffset + ROUTINE_ID_BASE;
}

/** DB weekday (1=Mon..7=Sun) → Capacitor weekday (1=Sun..7=Sat). */
function dbWeekdayToCapacitor(dbDay: number): number {
  return (dbDay % 7) + 1;
}

async function ensureRoutineChannel(): Promise<void> {
  await LocalNotifications.createChannel({
    id: ROUTINE_CHANNEL_ID,
    name: "Przypomnienia rutyn",
    description: "Powiadomienia o zaplanowanych rutynach.",
    importance: 4,
  });
}

/**
 * Schedule repeating notifications for a routine that has a scheduled_time.
 * All 7 weekdays → single daily repeating; subset → one notification per weekday.
 */
export async function scheduleRoutineReminder(routine: {
  id: string;
  title: string;
  scheduled_time: string | null;
  weekdays: number[];
  is_active: boolean;
}): Promise<void> {
  if (!isNative() || !areNotificationsEnabled()) return;
  if (!routine.scheduled_time || !routine.is_active) return;
  try {
    const granted = await ensurePermission();
    if (!granted) return;
    await ensureRoutineChannel();

    const [h, m] = routine.scheduled_time.split(":").map(Number);
    if (h === undefined || m === undefined) return;

    const notifications: ScheduledNotification[] = [];

    if (routine.weekdays.length >= 7) {
      notifications.push({
        id: routineNotificationId(routine.id, 0),
        channelId: ROUTINE_CHANNEL_ID,
        title: routine.title,
        body: "Czas na rutynę!",
        schedule: { on: { hour: h, minute: m } },
      });
    } else {
      for (let i = 0; i < routine.weekdays.length; i++) {
        const capDay = dbWeekdayToCapacitor(routine.weekdays[i]!);
        notifications.push({
          id: routineNotificationId(routine.id, i),
          channelId: ROUTINE_CHANNEL_ID,
          title: routine.title,
          body: "Czas na rutynę!",
          schedule: { on: { hour: h, minute: m, weekday: capDay } },
        });
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (e) {
    console.error("scheduleRoutineReminder failed", e);
  }
}

/** Cancel all notification IDs that could belong to a routine (up to 8 slots). */
export async function cancelRoutineReminder(routineId: string): Promise<void> {
  if (!isNative()) return;
  try {
    const ids: { id: number }[] = [];
    for (let i = 0; i < 8; i++) {
      ids.push({ id: routineNotificationId(routineId, i) });
    }
    await LocalNotifications.cancel({ notifications: ids });
  } catch (e) {
    console.error("cancelRoutineReminder failed", e);
  }
}

/**
 * Bulk-refresh routine notifications: cancel all, then reschedule active ones
 * that have a scheduled_time. Called at app start and when routines change.
 */
export async function refreshRoutineReminders(
  routines: Array<{
    id: string;
    title: string;
    scheduled_time: string | null;
    weekdays: number[];
    is_active: boolean;
  }>,
): Promise<void> {
  if (!isNative() || !areNotificationsEnabled()) return;
  try {
    for (const r of routines) {
      await cancelRoutineReminder(r.id);
    }
    for (const r of routines) {
      if (r.is_active && r.scheduled_time) {
        await scheduleRoutineReminder(r);
      }
    }
  } catch (e) {
    console.error("refreshRoutineReminders failed", e);
  }
}

/**
 * Headless hook: keeps routine notifications in sync with the routines list.
 * Reschedules whenever routines change. No-op on web.
 */
export function useRoutineNotificationsSync(): void {
  const { data: routines } = useRoutines();
  const prevRef = useRef<string>("");

  useEffect(() => {
    if (!isNative()) return;
    if (!routines) return;
    const key = routines
      .map((r) => `${r.id}:${r.is_active}:${r.scheduled_time}:${r.weekdays.join(",")}`)
      .join("|");
    if (key === prevRef.current) return;
    prevRef.current = key;
    void refreshRoutineReminders(routines);
  }, [routines]);
}

/**
 * Headless hook: keeps the on-device reminders in step with the profile hours
 * and the live day state. Reschedules on login, when the hours change, and when
 * the day's progress changes. No-op on web.
 */
export function useNotificationsSync(): void {
  const { data: profile } = useProfile();
  const { data: today } = useToday();

  const dayStartTime = profile?.day_start_time ?? null;
  const dayEndTime = profile?.day_end_time ?? null;
  const streak = profile?.streak_count ?? 0;
  const dayCompleted = today?.status === "completed";
  const undoneCount =
    today?.status === "in_progress" ? today.items.filter((i) => i.status !== "done").length : 0;

  useEffect(() => {
    if (!isNative()) return;
    // Wait until the profile has loaded so we don't schedule with null hours.
    if (!profile) return;
    void refreshNotifications({ dayStartTime, dayEndTime, undoneCount, streak, dayCompleted });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayStartTime, dayEndTime, undoneCount, streak, dayCompleted, !!profile]);
}
