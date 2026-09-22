import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  DeviceCalendarApi,
  useCalendarSettings,
  useDeviceCalendars,
  useSelectedCalendars,
} from "@/lib/calendar";

/**
 * The calendar toggle and, once it's on, which calendars to read. READ_CALENDAR
 * is requested here and only here — the first time the user asks for it, with
 * the reason on screen rather than as a cold system prompt.
 */
export function CalendarSettings() {
  const { supported, enabled, loading, setEnabled } = useCalendarSettings();
  const { data: calendars } = useDeviceCalendars(enabled);
  const { data: storedSelection } = useSelectedCalendars(enabled);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (storedSelection) setSelected(new Set(storedSelection));
  }, [storedSelection]);

  if (!supported || loading) return null;

  const toggleFeature = async (next: boolean) => {
    try {
      const ok = await setEnabled(next);
      if (next && !ok) {
        toast.error("Bez dostępu do kalendarza nie pokażemy wydarzeń.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["device-calendar-events"] });
    } catch {
      toast.error("Nie udało się zmienić ustawienia.");
    }
  };

  const toggleCalendar = async (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    try {
      await DeviceCalendarApi.setSelectedCalendars({ ids: [...next] });
      queryClient.invalidateQueries({ queryKey: ["device-calendar-events"] });
    } catch {
      toast.error("Nie udało się zapisać wyboru.");
    }
  };

  return (
    <div
      className="flex flex-col gap-3"
      style={{ animation: "cascadeIn 0.5s ease-out 0.35s both" }}
    >
      <div className="flex items-center justify-between rounded-3xl glass px-4 py-4">
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-[15px] font-medium">Pokazuj wydarzenia z kalendarza</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Czytamy kalendarz z telefonu, żeby plan dnia uwzględniał to, co i tak
            masz umówione. Dane zostają na urządzeniu.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={(v) => void toggleFeature(v)} />
      </div>

      {enabled && calendars && calendars.length > 0 && (
        <div className="rounded-3xl glass px-4 py-4">
          <p className="mb-1 text-[15px] font-medium">Które kalendarze</p>
          <p className="mb-3 text-[13px] text-muted-foreground">
            Nic nie zaznaczone = wszystkie.
          </p>
          <div className="flex flex-col gap-2">
            {calendars.map((cal) => (
              <label
                key={cal.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/[0.04] px-3 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">
                    {cal.name || cal.accountName || "Kalendarz"}
                  </span>
                  {cal.accountName && cal.accountName !== cal.name && (
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {cal.accountName}
                    </span>
                  )}
                </span>
                <Switch
                  checked={selected.has(cal.id)}
                  onCheckedChange={() => void toggleCalendar(cal.id)}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
