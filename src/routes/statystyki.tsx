import { createFileRoute } from "@tanstack/react-router";
import StatystykiScreen from "@/components/statystyki/StatystykiScreen";
import type { StatsSummary, DayProgress } from "@/components/statystyki/types";
import { useDailyProgress } from "@/lib/stats";
import { useProfile } from "@/lib/profile";
import { levelFromXp } from "@/lib/gamification";

export const Route = createFileRoute("/statystyki")({
  head: () => ({
    meta: [
      { title: "Statystyki – postęp i passa" },
      { name: "description", content: "Wykresy XP, realizacji tygodniowej i siatka nawyków." },
    ],
  }),
  component: StatsRoute,
});

function buildSummary(days: DayProgress[], profile: { total_xp: number; streak_count: number } | null | undefined): StatsSummary {
  let longest = 0;
  let run = 0;
  for (const d of days) {
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
    currentStreak: profile?.streak_count ?? 0,
    longestStreak: longest,
    level: profile ? levelFromXp(profile.total_xp).level : 1,
    daysDone: days.filter((d) => d.completed > 0).length,
    todayPct: last && last.planned ? Math.round((last.completed / last.planned) * 100) : 0,
  };
}

function StatsRoute() {
  const daysQ = useDailyProgress();
  const { data: profile } = useProfile();

  const viewState = daysQ.isLoading
    ? "loading"
    : !daysQ.data || daysQ.data.length === 0
      ? "empty"
      : "loaded";

  const summary = buildSummary(daysQ.data ?? [], profile);

  return <StatystykiScreen summary={summary} viewState={viewState} />;
}
