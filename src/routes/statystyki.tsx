import { createFileRoute } from "@tanstack/react-router";
import StatystykiScreen from "@/components/statystyki/StatystykiScreen";
import type { StatsSummary, DayProgress } from "@/components/statystyki/types";
import { useDailyProgress } from "@/lib/stats";
import { useGamification } from "@/lib/gamification";
import { useState } from "react";
import { DayPeekCard } from "@/components/statystyki/DayPeekCard";

export const Route = createFileRoute("/statystyki")({
  head: () => ({
    meta: [
      { title: "Statystyki – postęp i passa" },
      { name: "description", content: "Wykresy XP, realizacji tygodniowej i siatka nawyków." },
    ],
  }),
  component: StatsRoute,
});

function buildSummary(
  days: DayProgress[],
  level: number,
  streak: number,
  totalXp: number,
  toNext: number,
): StatsSummary {
  let longest = 0;
  let run = 0;
  for (const d of days) {
    // A day with an empty plan is neutral — it neither extends the run nor
    // breaks it. Everything else is judged by the 45% threshold.
    if (d.planned === 0) continue;
    if (d.streak_counted) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  const last = days[days.length - 1];
  return {
    days,
    currentStreak: streak,
    longestStreak: Math.max(longest, streak),
    level,
    daysDone: days.filter((d) => d.completed > 0).length,
    todayPct: last && last.planned ? Math.round((last.completed / last.planned) * 100) : 0,
    totalXp,
    toNext,
  };
}

function StatsRoute() {
  const daysQ = useDailyProgress();
  const { level, streak, totalXp, toNext } = useGamification();
  const [openDay, setOpenDay] = useState<{ iso: string; anchor: DOMRect } | null>(null);

  if (daysQ.isLoading) {
    return (
      <div className="screen-shell flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Ładowanie…</p>
      </div>
    );
  }

  if (daysQ.isError) {
    return (
      <div className="screen-shell flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">Nie udało się wczytać statystyk.</p>
        <button
          onClick={() => daysQ.refetch()}
          className="rounded-2xl bg-secondary px-4 py-2 text-foreground"
        >
          Ponów
        </button>
      </div>
    );
  }

  const days = daysQ.data ?? [];

  if (days.length === 0) {
    return (
      <div className="screen-shell flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Zacznij dzień, żeby zobaczyć swój postęp.</p>
      </div>
    );
  }

  const summary = buildSummary(days, level, streak, totalXp, toNext);

  return (
    <>
      <StatystykiScreen
        summary={summary}
        viewState="loaded"
        onOpenDay={(iso, anchor) => setOpenDay({ iso, anchor })}
        selectedDay={openDay?.iso ?? null}
      />
      {/* The day picked off the heatmap opens as a card pinned to its square —
          keyed by date so switching squares re-measures and re-animates. */}
      {openDay && (
        <DayPeekCard
          key={openDay.iso}
          date={openDay.iso}
          anchor={openDay.anchor}
          progress={days.find((d) => d.date === openDay.iso)}
          onClose={() => setOpenDay(null)}
        />
      )}
    </>
  );
}
