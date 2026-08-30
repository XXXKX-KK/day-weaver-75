import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export type DayProgress = {
  date: string;
  planned: number;
  completed: number;
  streak_counted: boolean;
  xp: number;
};

const DAILY_PROGRESS_KEY = ["daily_progress"] as const;

export function useDailyProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...DAILY_PROGRESS_KEY, user?.id],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<DayProgress[]> => {
      const { data, error } = await supabase.rpc("daily_progress");
      if (error) throw error;
      return (data as DayProgress[]) ?? [];
    },
  });
}

export function longestStreak(rows: DayProgress[]): number {
  let max = 0;
  let cur = 0;
  for (const r of rows) {
    if (r.streak_counted) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

export function totalDaysDone(rows: DayProgress[]): number {
  return rows.filter((r) => r.streak_counted).length;
}

export function xpCumulative(rows: DayProgress[]): { date: string; xp: number }[] {
  let sum = 0;
  return rows.map((r) => {
    sum += r.xp;
    return { date: r.date, xp: sum };
  });
}

export function weeklyCompletion(rows: DayProgress[]): { week: string; pct: number }[] {
  const weeks = new Map<string, { planned: number; completed: number }>();
  for (const r of rows) {
    const d = new Date(r.date + "T00:00:00");
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const w = weeks.get(key) ?? { planned: 0, completed: 0 };
    w.planned += r.planned;
    w.completed += r.completed;
    weeks.set(key, w);
  }
  return Array.from(weeks.entries()).map(([week, w]) => ({
    week,
    pct: w.planned > 0 ? Math.round((w.completed / w.planned) * 100) : 0,
  }));
}

export function completionBucket(row: DayProgress): 0 | 1 | 2 | 3 | 4 {
  if (row.planned === 0) return 0;
  const pct = row.completed / row.planned;
  if (pct <= 0) return 0;
  if (pct < 0.25) return 1;
  if (pct < 0.5) return 2;
  if (pct < 1) return 3;
  return 4;
}
