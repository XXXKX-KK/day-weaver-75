import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { todayLocalISO } from "@/lib/day";
import type { DayBlock } from "@/lib/store";

/**
 * Read-only view of the device calendar (Android CalendarContract). No Google
 * Calendar API, no Google sign-in, and nothing written back — events are read
 * on-device for display and never reach Supabase.
 */

export type DeviceCalendar = {
  id: string;
  name: string;
  accountName: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  /** Epoch millis. For all-day events the clock part is meaningless. */
  start: number;
  end: number;
  allDay: boolean;
  calendarName: string;
};

export interface DeviceCalendarPlugin {
  isEnabled(): Promise<{ enabled: boolean }>;
  setEnabled(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
  getSelectedCalendars(): Promise<{ ids: string[] }>;
  setSelectedCalendars(options: { ids: string[] }): Promise<void>;
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  getCalendars(): Promise<{ calendars: DeviceCalendar[] }>;
  getEventsForDay(options: { date: string }): Promise<{ events: CalendarEvent[] }>;
}

export const DeviceCalendarApi = registerPlugin<DeviceCalendarPlugin>("DeviceCalendar");

/** Android only — the web build has no calendar to read. */
export function isCalendarSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/** Which part of the day an event belongs to, by its start time. */
export function blockForEvent(event: CalendarEvent): DayBlock {
  if (event.allDay) return "morning";
  const hour = new Date(event.start).getHours();
  if (hour < 9) return "morning";
  if (hour < 12) return "forenoon";
  if (hour < 17) return "afternoon";
  return "evening";
}

export const BLOCK_LABELS: Record<DayBlock, string> = {
  morning: "Rano",
  forenoon: "Przedpołudnie",
  afternoon: "Popołudnie",
  evening: "Wieczór",
};

function hhmm(millis: number): string {
  const d = new Date(millis);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "9:00–10:30", "Cały dzień", or an open-ended range for events crossing midnight. */
export function formatEventTime(event: CalendarEvent, date: string): string {
  if (event.allDay) return "Cały dzień";
  const dayStart = new Date(`${date}T00:00:00`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const from = event.start < dayStart ? "…" : hhmm(event.start);
  const to = event.end > dayEnd ? "…" : hhmm(event.end);
  return `${from}–${to}`;
}

/** The toggle + permission state, read from native prefs. */
export function useCalendarSettings() {
  const supported = isCalendarSupported();
  const [enabled, setEnabledState] = useState(false);
  const [granted, setGranted] = useState(false);
  const [loading, setLoading] = useState(supported);

  useEffect(() => {
    if (!supported) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([DeviceCalendarApi.isEnabled(), DeviceCalendarApi.checkPermission()])
      .then(([e, p]) => {
        if (cancelled) return;
        setEnabledState(e.enabled);
        setGranted(p.granted);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  /** Turning it on asks for READ_CALENDAR; refusing leaves it off. */
  const setEnabled = useCallback(async (next: boolean): Promise<boolean> => {
    if (!next) {
      await DeviceCalendarApi.setEnabled({ enabled: false });
      setEnabledState(false);
      return false;
    }
    const { granted: ok } = await DeviceCalendarApi.requestPermission();
    setGranted(ok);
    if (!ok) return false;
    await DeviceCalendarApi.setEnabled({ enabled: true });
    setEnabledState(true);
    return true;
  }, []);

  return { supported, enabled, granted, loading, setEnabled };
}

export function useDeviceCalendars(active: boolean) {
  return useQuery({
    queryKey: ["device-calendars"],
    enabled: active && isCalendarSupported(),
    queryFn: async (): Promise<DeviceCalendar[]> => {
      const { calendars } = await DeviceCalendarApi.getCalendars();
      return calendars;
    },
  });
}

export function useSelectedCalendars(active: boolean) {
  return useQuery({
    queryKey: ["device-calendars-selected"],
    enabled: active && isCalendarSupported(),
    queryFn: async (): Promise<string[]> => {
      const { ids } = await DeviceCalendarApi.getSelectedCalendars();
      return ids;
    },
  });
}

/** Today's events, or an empty list whenever the feature is off or unsupported. */
export function useTodayEvents() {
  const date = todayLocalISO();
  const supported = isCalendarSupported();
  return useQuery({
    queryKey: ["device-calendar-events", date],
    enabled: supported,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CalendarEvent[]> => {
      const [{ enabled }, { granted }] = await Promise.all([
        DeviceCalendarApi.isEnabled(),
        DeviceCalendarApi.checkPermission(),
      ]);
      if (!enabled || !granted) return [];
      const { events } = await DeviceCalendarApi.getEventsForDay({ date });
      return events;
    },
  });
}
