import { useProfile } from "@/lib/profile";
import type { Priority } from "@/lib/store";

/**
 * Pure gamification rules — XP values, level thresholds and subtask splitting.
 * Kept side-effect free so they're trivial to reason about and tweak; the DB
 * writes live in the day mutations (src/lib/day.ts).
 */

const BASE_XP = 100;
const INCREMENT_EARLY = 15;
const INCREMENT_LATE = 25;
const LATE_FROM_LEVEL = 21;

/** XP cost to go from level N to level N+1. */
export function xpForLevel(n: number): number {
  if (n < 1) return BASE_XP;
  if (n < LATE_FROM_LEVEL) return BASE_XP + (n - 1) * INCREMENT_EARLY;
  const lastEarly = BASE_XP + (LATE_FROM_LEVEL - 2) * INCREMENT_EARLY;
  return lastEarly + (n - LATE_FROM_LEVEL + 1) * INCREMENT_LATE;
}

export type LevelInfo = {
  /** 1-based level. */
  level: number;
  /** XP accumulated within the current level. */
  intoLevel: number;
  /** XP remaining to reach the next level. */
  toNext: number;
  /** Progress within the current level, in [0, 1]. */
  progress: number;
};

export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let consumed = 0;
  while (true) {
    const cost = xpForLevel(level);
    if (consumed + cost > xp) {
      const intoLevel = xp - consumed;
      return { level, intoLevel, toNext: cost - intoLevel, progress: intoLevel / cost };
    }
    consumed += cost;
    level++;
  }
}

const PRIORITY_XP: Record<Priority, number> = { high: 10, normal: 5, low: 0 };

/**
 * What a day item is worth: base ten plus the priority bonus, the same for a
 * routine, a task and a Rozwój habit. Upkeep briefly paid a flat 2 XP, which
 * made a full day of small things look like nothing — the planner counts what
 * the user actually planned, and everything planned counts.
 */
export function xpValueForItem(item: { priority: Priority }): number {
  return 10 + PRIORITY_XP[item.priority];
}

/**
 * Split an item's XP across N subtasks so the parts sum EXACTLY to xpValue:
 * each is round(xpValue / N), and the last one takes the rounding remainder.
 * Subtasks share the item's pool — they never add on top of it.
 */
export function subtaskXpShares(xpValue: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.round(xpValue / n);
  const shares: number[] = [];
  let sum = 0;
  for (let i = 0; i < n - 1; i++) {
    shares.push(base);
    sum += base;
  }
  shares.push(xpValue - sum); // last subtask absorbs the remainder
  return shares;
}

/** XP a specific subtask is worth, by its position in the item's subtask list. */
export function shareForSubtask(
  item: { priority: Priority },
  subtasks: { id: string }[],
  subtaskId: string,
): number {
  const n = subtasks.length;
  const index = subtasks.findIndex((s) => s.id === subtaskId);
  if (index < 0 || n === 0) return 0;
  return subtaskXpShares(xpValueForItem(item), n)[index] ?? 0;
}

/** Read-side helper: level/XP/streak for the XP bar and village screen. */
export function useGamification() {
  const { data: profile, isLoading } = useProfile();
  const totalXp = profile?.total_xp ?? 0;
  const streak = profile?.streak_count ?? 0;
  return { totalXp, streak, isLoading, ...levelFromXp(totalXp) };
}
