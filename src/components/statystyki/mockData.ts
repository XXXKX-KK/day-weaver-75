import type { DayProgress, StatsSummary } from './types';

// ---------------------------------------------------------------------------
// Dane mock. Podmień `buildMockDays()` na realne dane z API — reszta ekranu
// działa na `summarize(days)`, więc wystarczy dostarczyć tablicę DayProgress.
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Deterministyczne dane demonstracyjne (126 dni do 2026-08-30). */
export function buildMockDays(): DayProgress[] {
  const total = 126;
  const today = new Date(2026, 7, 30);
  const days: DayProgress[] = [];

  let seed = 20260830;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const planned = 5 + Math.floor(rnd() * 4);
    const zeroChance = i > 24 ? 0.16 : 0.06;
    let completed: number;
    if (rnd() < zeroChance) completed = 0;
    else completed = Math.min(planned, Math.max(1, Math.round(planned * (0.5 + rnd() * 0.45))));
    days.push({
      date: iso(d),
      planned,
      completed,
      streak_counted: planned ? completed / planned >= 0.6 : false,
      xp: completed * (8 + Math.floor(rnd() * 6)),
    });
  }

  // Ręcznie ustawione „historie": aktualna passa 11 dni, wcześniejsza seria 14.
  const L = days.length;
  const strong = (d: DayProgress) => {
    d.completed = Math.max(1, Math.ceil(d.planned * 0.82));
    d.xp = d.completed * 11;
    d.streak_counted = true;
  };
  const weak = (d: DayProgress) => {
    d.completed = Math.max(0, Math.floor(d.planned * 0.3));
    d.xp = d.completed * 8;
    d.streak_counted = false;
  };
  weak(days[L - 12]);
  for (let i = L - 11; i < L; i++) strong(days[i]);
  weak(days[L - 41]);
  for (let i = L - 40; i <= L - 27; i++) strong(days[i]);
  weak(days[L - 26]);

  return days;
}

/** Agreguje tablicę dni do podsumowania pokazywanego na kafelkach. */
export function summarize(days: DayProgress[]): StatsSummary {
  const L = days.length;

  let currentStreak = 0;
  for (let i = L - 1; i >= 0; i--) {
    if (days[i].streak_counted) currentStreak++;
    else break;
  }

  let longestStreak = 0;
  let run = 0;
  for (const d of days) {
    if (d.streak_counted) {
      run++;
      longestStreak = Math.max(longestStreak, run);
    } else run = 0;
  }

  const cumXp = days.reduce((s, d) => s + d.xp, 0);
  const level = Math.max(1, Math.floor(cumXp / 720));
  const daysDone = days.filter((d) => d.completed > 0).length;
  const last = days[L - 1];
  const todayPct = last && last.planned ? Math.round((last.completed / last.planned) * 100) : 0;

  return { days, currentStreak, longestStreak, level, daysDone, todayPct };
}

export const MOCK_SUMMARY: StatsSummary = summarize(buildMockDays());
