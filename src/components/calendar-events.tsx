import { CalendarClock } from "lucide-react";
import {
  useTodayEvents,
  blockForEvent,
  formatEventTime,
  BLOCK_LABELS,
  type CalendarEvent,
} from "@/lib/calendar";
import { todayLocalISO } from "@/lib/day";
import type { DayBlock } from "@/lib/store";

const ORDER: DayBlock[] = ["morning", "forenoon", "afternoon", "evening"];

/**
 * Today's device-calendar events, grouped by part of day. Read-only on purpose:
 * these are not plan items, so they earn no XP and count toward neither the
 * day's progress nor the streak. Renders nothing on web, or when the feature is
 * off, permission was refused, or the day is simply empty.
 */
export function CalendarEvents() {
  const { data: events } = useTodayEvents();
  const date = todayLocalISO();

  if (!events || events.length === 0) return null;

  const grouped = new Map<DayBlock, CalendarEvent[]>();
  for (const event of events) {
    const block = blockForEvent(event);
    grouped.set(block, [...(grouped.get(block) ?? []), event]);
  }

  return (
    <div
      className="mb-5 rounded-3xl border border-dashed border-foreground/[0.14] px-[18px] py-3.5"
      style={{ animation: "cascadeIn 0.5s ease-out 0.15s both" }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <span className="text-[13px] font-medium text-muted-foreground">
          Z kalendarza
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {ORDER.filter((block) => grouped.has(block)).map((block) => (
          <div key={block}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-muted-foreground">
              {BLOCK_LABELS[block]}
            </p>
            <ul className="flex flex-col gap-1">
              {(grouped.get(block) ?? []).map((event) => (
                <li key={event.id} className="flex items-baseline gap-2.5">
                  <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                    {formatEventTime(event, date)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-foreground/80">
                    {event.title || "(bez tytułu)"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
