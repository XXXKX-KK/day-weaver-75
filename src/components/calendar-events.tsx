import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Clock } from "lucide-react";
import { useTodayEvents, formatEventTime, type CalendarEvent } from "@/lib/calendar";
import { todayLocalISO } from "@/lib/day";
import { LOGO_BLUE } from "@/lib/accent";
import { cn } from "@/lib/utils";

/**
 * Today's device-calendar events, as cards in the same language as the plan
 * items right below them — same glass, same radius, same title and caption.
 * They are read-only on purpose: no XP, no progress, no streak. What tells them
 * apart from a task is the slot where a task has its tick-off circle: a
 * calendar icon in the logo blue, so nothing here looks checkable. Purple stays
 * the plan's colour.
 *
 * Renders nothing on web, or when the feature is off, permission was refused,
 * or the day is simply empty.
 */

type EventState = "past" | "now" | "future";

/** Ticks every minute so an event slides from future to now to past on its own,
 *  and catches up immediately when the app comes back to the foreground —
 *  background tabs have their timers throttled, so the tick alone is not
 *  enough. */
function useMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return now;
}

function stateOf(event: CalendarEvent, now: number): EventState {
  // An all-day event has no hours to be over or under way — it is simply today.
  if (event.allDay) return "future";
  if (event.end <= now) return "past";
  if (event.start <= now) return "now";
  return "future";
}

export function CalendarEvents() {
  const { data: events } = useTodayEvents();
  const date = todayLocalISO();
  const now = useMinute();
  const [showPast, setShowPast] = useState(false);

  const { current, past } = useMemo(() => {
    const all = (events ?? []).map((event) => ({ event, state: stateOf(event, now) }));
    // All-day first, then by start time — the order you would read the day in.
    const byStart = (a: { event: CalendarEvent }, b: { event: CalendarEvent }) =>
      Number(b.event.allDay) - Number(a.event.allDay) || a.event.start - b.event.start;
    return {
      current: all.filter((e) => e.state !== "past").sort(byStart),
      past: all.filter((e) => e.state === "past").sort(byStart),
    };
  }, [events, now]);

  if (!events || events.length === 0) return null;

  return (
    <ul className="mb-5 flex flex-col gap-2">
      {current.map(({ event, state }, i) => (
        <EventCard key={event.id} event={event} date={date} state={state} index={i} />
      ))}

      {past.length > 0 && (
        <li>
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="flex w-full items-center gap-1.5 px-4 py-1.5 text-left text-xs font-medium text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                showPast && "rotate-180",
              )}
            />
            Minione: {past.length}
          </button>

          {showPast && (
            <ul className="mt-2 flex flex-col gap-2">
              {past.map(({ event }) => (
                <EventCard key={event.id} event={event} date={date} state="past" index={0} />
              ))}
            </ul>
          )}
        </li>
      )}
    </ul>
  );
}

function EventCard({
  event,
  date,
  state,
  index,
}: {
  event: CalendarEvent;
  date: string;
  state: EventState;
  index: number;
}) {
  const past = state === "past";
  const title = event.title || "(bez tytułu)";
  const when = event.allDay ? "cały dzień" : formatEventTime(event, date);

  return (
    <li
      aria-label={`${title}, ${when}, wydarzenie z kalendarza`}
      className={cn(
        "relative overflow-hidden rounded-3xl glass px-4 py-2.5",
        past ? "opacity-55" : "animate-[cascadeIn_.5s_ease-out_both]",
      )}
      style={{
        ...(past
          ? {}
          : {
              borderColor: `color-mix(in oklab, ${LOGO_BLUE} 26%, transparent)`,
              animationDelay: `${0.15 + index * 0.06}s`,
            }),
      }}
    >
      <div className="flex items-center gap-2.5">
        {/* Where a plan item has its tick-off circle. Not a button, and not
            round-bordered like one — this cannot be checked off. */}
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={
            past
              ? { background: "color-mix(in oklab, var(--foreground) 8%, transparent)" }
              : { background: `color-mix(in oklab, ${LOGO_BLUE} 16%, transparent)` }
          }
        >
          <CalendarDays
            className="h-3.5 w-3.5"
            style={{ color: past ? "var(--muted-foreground)" : LOGO_BLUE }}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-foreground">{title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="font-medium">Kalendarz · {when}</span>
          </span>
        </span>

        {state === "now" && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]"
            style={{
              background: `color-mix(in oklab, ${LOGO_BLUE} 18%, transparent)`,
              color: LOGO_BLUE,
            }}
          >
            Teraz
          </span>
        )}
      </div>
    </li>
  );
}
