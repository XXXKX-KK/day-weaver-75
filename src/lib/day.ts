import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Blocker, isNativeBlocker } from "@/lib/blocker";
import { xpValueForItem, shareForSubtask } from "@/lib/gamification";
import { useProfile, type ProfileRow } from "@/lib/profile";
import { useFocusNotes } from "@/lib/focus-notes";
import { reorderByIds } from "@/lib/reorder";
import type { DayBlock, Priority, RoutineKind } from "@/lib/store";

/** day_item_subtasks row (per-day copy of a subtask; has its own done-state). */
export type DayItemSubtaskRow = {
  id: string;
  title: string;
  position: number;
  is_done: boolean;
};

/** item_status enum in the DB. */
export type DayItemStatus = "pending" | "done" | "skipped" | "postponed";

/** day_items row with its subtasks. */
export type DayItemRow = {
  id: string;
  source_type: "routine" | "task";
  task_id: string | null;
  day_block: DayBlock;
  position: number;
  status: DayItemStatus;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  priority: Priority;
  /** Copied from the routine when the day is assembled, so reclassifying a
   *  routine later never rewrites finished history. Tasks are always upkeep. */
  kind: RoutineKind;
  /** XP the item is worth, and how much has already been credited (0..xp_value). */
  xp_value: number;
  xp_awarded: number;
  day_item_subtasks: DayItemSubtaskRow[];
};

/** days row. */
export type DayRow = {
  id: string;
  date: string;
  status: "planned" | "in_progress" | "completed";
  planned_count: number;
  completed_count: number;
  streak_counted: boolean;
};

/** What the Today screen reads: the day (or null before it's started) + items. */
export type TodayData = {
  /** "planned" stands in for "no day row yet / not started". */
  status: DayRow["status"];
  day: DayRow | null;
  items: DayItemRow[];
};

const TODAY_KEY = ["today"] as const;
const YESTERDAY_KEY = ["yesterday"] as const;

export type YesterdayData = {
  day: DayRow | null;
  items: DayItemRow[];
};

export function useYesterday() {
  const { user } = useAuth();
  const today = todayLocalISO();
  return useQuery({
    queryKey: [...YESTERDAY_KEY, user?.id, today],
    enabled: isSupabaseConfigured && !!user,
    staleTime: Infinity,
    queryFn: async (): Promise<YesterdayData> => {
      const { data, error } = await supabase
        .from("days")
        .select(
          `id, date, status, planned_count, completed_count, streak_counted, day_items(${DAY_ITEM_COLUMNS})`,
        )
        .lt("date", today)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { day: null, items: [] };
      const { day_items, ...day } = data as DayRow & { day_items: DayItemRow[] };
      return { day, items: sortItems((day_items ?? []) as DayItemRow[]) };
    },
  });
}

/** Any single day's plan, for the summary opened from the stats heatmap.
 *  `day: null` means that date has no record at all — there was no plan. */
export function useDaySummary(date: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["day-summary", user?.id, date],
    enabled: isSupabaseConfigured && !!user && !!date,
    queryFn: async (): Promise<YesterdayData> => {
      const { data, error } = await supabase
        .from("days")
        .select(
          `id, date, status, planned_count, completed_count, streak_counted, day_items(${DAY_ITEM_COLUMNS})`,
        )
        .eq("date", date)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { day: null, items: [] };
      const { day_items, ...day } = data as DayRow & { day_items: DayItemRow[] };
      return { day, items: sortItems((day_items ?? []) as DayItemRow[]) };
    },
  });
}

export function useAutoCloseYesterday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (day: { id: string; date: string }) => {
      const { error } = await supabase
        .from("days")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", day.id);
      if (error) throw error;

      // Closing a day settles whether it earned the streak, so the chain has to
      // be recounted from it. Failing here must not fail the close itself —
      // the day is shut either way and the streak is recomputed on the next
      // item the user ticks anyway.
      const { error: streakError } = await supabase.rpc("recompute_streak", {
        target_date: day.date,
      });
      if (streakError) console.error("recompute_streak after autoclose failed", streakError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: YESTERDAY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

const DAY_CUTOFF_HOUR = 3;

/** Local (device-local) YYYY-MM-DD using the "logical day" boundary at 3:00.
 *  Before 3:00 the date is treated as yesterday's. */
export function todayLocalISO(): string {
  const d = new Date();
  if (d.getHours() < DAY_CUTOFF_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns a Date object representing the logical "today" (shifted before 3:00). */
export function logicalToday(): Date {
  const d = new Date();
  if (d.getHours() < DAY_CUTOFF_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

const DAY_ITEM_COLUMNS =
  "id, source_type, task_id, day_block, position, status, title, description, estimated_minutes, priority, kind, xp_value, xp_awarded, day_item_subtasks(id, title, position, is_done)";

function sortItems(items: DayItemRow[]): DayItemRow[] {
  return (
    [...items]
      .map((i) => ({
        ...i,
        day_item_subtasks: [...(i.day_item_subtasks ?? [])].sort((a, b) => a.position - b.position),
      }))
      // Manual order: a single position sequence across the whole day (no blocks).
      .sort((a, b) => a.position - b.position)
  );
}

export function useToday() {
  const { user } = useAuth();
  const date = todayLocalISO();
  return useQuery({
    queryKey: [...TODAY_KEY, user?.id, date],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<TodayData> => {
      // RLS limits this to the caller's own row. maybeSingle → null before start.
      const { data, error } = await supabase
        .from("days")
        .select(
          `id, date, status, planned_count, completed_count, streak_counted, day_items(${DAY_ITEM_COLUMNS})`,
        )
        .eq("date", date)
        .maybeSingle();
      if (error) throw error;

      if (!data) return { status: "planned", day: null, items: [] };

      const { day_items, ...day } = data as DayRow & { day_items: DayItemRow[] };
      return {
        status: day.status,
        day,
        items: sortItems((day_items ?? []) as DayItemRow[]),
      };
    },
  });
}

export function useStartDay() {
  const queryClient = useQueryClient();
  return useMutation({
    // Idempotent server-side: start_day won't duplicate an existing day.
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc("start_day", { target_date: todayLocalISO() });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TODAY_KEY }),
  });
}

/** What happened when we tried to fold a new row into today's plan. */
export type PlanSync = "added" | "day-not-running" | "failed";

/**
 * Slot something just created into the day that's already running.
 *
 * start_day is idempotent, but it also *creates* the day when none exists — so
 * calling it blind would silently start the user's day the moment they added a
 * task. Hence the status check first: no running day means there is nothing to
 * fold into, and the row will be picked up when they start the day themselves.
 *
 * Never throws. The row this is called for is already saved; failing to slot it
 * into today is a smaller problem than a failed save, and the caller says so.
 */
export async function syncIntoRunningDay(): Promise<PlanSync> {
  const today = todayLocalISO();
  const { data: day, error: dayError } = await supabase
    .from("days")
    .select("status")
    .eq("date", today)
    .maybeSingle();
  if (dayError) {
    console.error("plan sync: reading today's day failed", dayError);
    return "failed";
  }
  if (!day || day.status !== "in_progress") return "day-not-running";

  // NOTE: no .catch() here — PostgrestBuilder is only PromiseLike, so calling
  // .catch on it throws a TypeError before the request is ever sent.
  const { error } = await supabase.rpc("start_day", { target_date: today });
  if (error) {
    console.error("plan sync: start_day failed", error);
    return "failed";
  }
  return "added";
}

const PROFILE_KEY = ["profile"] as const;

/** Snapshots of the ['today'] and ['profile'] caches, for optimistic rollback. */
type CacheSnapshot = [readonly unknown[], unknown][];
type Snapshots = { today: CacheSnapshot; profile: CacheSnapshot };

function snapshotCaches(queryClient: QueryClient): Snapshots {
  return {
    today: queryClient.getQueriesData({ queryKey: TODAY_KEY }),
    profile: queryClient.getQueriesData({ queryKey: PROFILE_KEY }),
  };
}

function restoreCaches(queryClient: QueryClient, snap: Snapshots | undefined) {
  snap?.today.forEach(([key, data]) => queryClient.setQueryData(key, data));
  snap?.profile.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

function invalidateDayAndProfile(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: TODAY_KEY });
  queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
}

/** Optimistically move total_xp across every ['profile'] cache entry. */
function bumpCachedXp(queryClient: QueryClient, delta: number) {
  if (delta === 0) return;
  queryClient.setQueriesData<ProfileRow | null>({ queryKey: PROFILE_KEY }, (old) =>
    old ? { ...old, total_xp: Math.max(0, old.total_xp + delta) } : old,
  );
}

async function persistXpDelta(queryClient: QueryClient, delta: number) {
  if (delta === 0) return;
  const { data, error } = await supabase.rpc("add_xp", { delta });
  if (error) throw error;
  if (typeof data === "number") {
    queryClient.setQueriesData<ProfileRow | null>({ queryKey: PROFILE_KEY }, (old) =>
      old ? { ...old, total_xp: data } : old,
    );
  }
}

/**
 * Recompute the streak server-side.
 *
 * The rule spans past days — a day with an empty plan is neutral and must not
 * break the chain, and a day that once passed 45% stays passed — so it can't be
 * derived from today's items alone. The DB walks the history, stops at the
 * frozen baseline and returns the result.
 */
async function syncStreak(queryClient: QueryClient) {
  const { data, error } = await supabase.rpc("recompute_streak", {
    target_date: todayLocalISO(),
  });
  if (error) throw error;
  if (typeof data === "number") {
    queryClient.setQueriesData<ProfileRow | null>({ queryKey: PROFILE_KEY }, (old) =>
      old ? { ...old, streak_count: data } : old,
    );
  }
}

type SetItemStatusInput = {
  item: DayItemRow;
};

/**
 * Toggle a day item between done and pending. An item with no subtasks awards
 * its full xp_value; one with subtasks is "topped up" to the full value (the
 * part not covered by checked subtasks). Undo subtracts whatever was credited.
 * xp_awarded tracks the item's running contribution; days.completed_count is
 * maintained by a DB trigger — never set it here.
 *
 * Streak: every item counts towards the 45% threshold, and the rule spans past
 * days, so it is recomputed server-side rather than nudged from here.
 */
export function useSetItemStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ item }: SetItemStatusInput) => {
      const next: DayItemStatus = item.status === "done" ? "pending" : "done";
      const xpValue = xpValueForItem(item);
      const newAwarded = next === "done" ? xpValue : 0;
      const delta = newAwarded - item.xp_awarded;

      const { error } = await supabase
        .from("day_items")
        .update({
          status: next,
          completed_at: next === "done" ? new Date().toISOString() : null,
          xp_value: xpValue,
          xp_awarded: newAwarded,
        })
        .eq("id", item.id);
      if (error) throw error;

      if (item.source_type === "task" && item.task_id) {
        const { error: taskError } = await supabase
          .from("tasks")
          .update({
            status: next === "done" ? "done" : "open",
            completed_at: next === "done" ? new Date().toISOString() : null,
          })
          .eq("id", item.task_id);
        if (taskError) throw taskError;
      }

      if (user) await persistXpDelta(queryClient, delta);

      // Any item can tip the day over the threshold, so the streak is
      // recomputed after every toggle.
      if (user) await syncStreak(queryClient);
    },
    onMutate: async ({ item }: SetItemStatusInput) => {
      await queryClient.cancelQueries({ queryKey: TODAY_KEY });
      const snap = snapshotCaches(queryClient);
      const next: DayItemStatus = item.status === "done" ? "pending" : "done";
      const xpValue = xpValueForItem(item);
      const newAwarded = next === "done" ? xpValue : 0;

      queryClient.setQueriesData<TodayData>({ queryKey: TODAY_KEY }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((i) =>
                i.id === item.id
                  ? { ...i, status: next, xp_value: xpValue, xp_awarded: newAwarded }
                  : i,
              ),
            }
          : old,
      );
      bumpCachedXp(queryClient, newAwarded - item.xp_awarded);
      return snap;
    },
    onError: (_err, _input, ctx) => restoreCaches(queryClient, ctx),
    onSettled: () => {
      invalidateDayAndProfile(queryClient);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/**
 * Toggle a subtask's done-state and credit its share of the parent item's XP.
 * Subtasks split the item's pool (they don't add on top); xp_awarded is clamped
 * to [0, xp_value] so repeated item/subtask toggling can't drift out of range.
 */
export function useToggleDayItemSubtask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ item, subtask }: { item: DayItemRow; subtask: DayItemSubtaskRow }) => {
      const next = !subtask.is_done;
      const xpValue = xpValueForItem(item);
      const share = shareForSubtask(item, item.day_item_subtasks, subtask.id);
      const newAwarded = clamp(item.xp_awarded + (next ? share : -share), 0, xpValue);
      const delta = newAwarded - item.xp_awarded;

      const { error: subError } = await supabase
        .from("day_item_subtasks")
        .update({ is_done: next, completed_at: next ? new Date().toISOString() : null })
        .eq("id", subtask.id);
      if (subError) throw subError;

      const allSubsDone =
        next && item.day_item_subtasks.every((s) => (s.id === subtask.id ? true : s.is_done));

      const parentStatus: DayItemStatus = allSubsDone
        ? "done"
        : item.status === "done" && !next
          ? "pending"
          : item.status;
      const parentAwarded = allSubsDone ? xpValue : newAwarded;
      const actualDelta = parentAwarded - item.xp_awarded;

      const { error: itemError } = await supabase
        .from("day_items")
        .update({
          xp_value: xpValue,
          xp_awarded: parentAwarded,
          ...(parentStatus !== item.status
            ? {
                status: parentStatus,
                completed_at: parentStatus === "done" ? new Date().toISOString() : null,
              }
            : {}),
        })
        .eq("id", item.id);
      if (itemError) throw itemError;

      if (allSubsDone && item.source_type === "task" && item.task_id) {
        const { error: taskError } = await supabase
          .from("tasks")
          .update({ status: "done", completed_at: new Date().toISOString() })
          .eq("id", item.task_id);
        if (taskError) throw taskError;
      }

      if (user) await persistXpDelta(queryClient, actualDelta);

      // The streak only shifts when the parent item itself flips done/undone.
      if (user && parentStatus !== item.status) {
        await syncStreak(queryClient);
      }
    },
    onMutate: async ({ item, subtask }) => {
      await queryClient.cancelQueries({ queryKey: TODAY_KEY });
      const snap = snapshotCaches(queryClient);
      const next = !subtask.is_done;
      const xpValue = xpValueForItem(item);
      const share = shareForSubtask(item, item.day_item_subtasks, subtask.id);
      const newAwarded = clamp(item.xp_awarded + (next ? share : -share), 0, xpValue);

      const allSubsDone =
        next && item.day_item_subtasks.every((s) => (s.id === subtask.id ? true : s.is_done));
      const parentStatus: DayItemStatus = allSubsDone
        ? "done"
        : item.status === "done" && !next
          ? "pending"
          : item.status;
      const parentAwarded = allSubsDone ? xpValue : newAwarded;

      queryClient.setQueriesData<TodayData>({ queryKey: TODAY_KEY }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      status: parentStatus,
                      xp_value: xpValue,
                      xp_awarded: parentAwarded,
                      day_item_subtasks: i.day_item_subtasks.map((s) =>
                        s.id === subtask.id ? { ...s, is_done: next } : s,
                      ),
                    }
                  : i,
              ),
            }
          : old,
      );
      bumpCachedXp(queryClient, parentAwarded - item.xp_awarded);
      return snap;
    },
    onError: (_err, _vars, ctx) => restoreCaches(queryClient, ctx),
    onSettled: () => {
      invalidateDayAndProfile(queryClient);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/** Mark the day completed (streak is handled by item toggles, not here). */
export function useCompleteDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dayId: string) => {
      const { error: dayError } = await supabase
        .from("days")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", dayId);
      if (dayError) throw dayError;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: TODAY_KEY });
      const snap = snapshotCaches(queryClient);
      queryClient.setQueriesData<TodayData>({ queryKey: TODAY_KEY }, (old) =>
        old && old.day
          ? { ...old, status: "completed", day: { ...old.day, status: "completed" } }
          : old,
      );
      return snap;
    },
    onError: (_err, _dayId, ctx) => restoreCaches(queryClient, ctx),
    onSettled: () => invalidateDayAndProfile(queryClient),
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Persist a new manual order of day items (ids top-to-bottom). Optimistic on
 *  ['today']; this is the order the overlay walks with "Nie teraz". */
export function useReorderDayItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map(async (id, position) => {
          const { error } = await supabase.from("day_items").update({ position }).eq("id", id);
          if (error) throw error;
        }),
      );
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: TODAY_KEY });
      const previous = queryClient.getQueriesData<TodayData>({ queryKey: TODAY_KEY });
      queryClient.setQueriesData<TodayData>({ queryKey: TODAY_KEY }, (old) =>
        old ? { ...old, items: reorderByIds(old.items, orderedIds) } : old,
      );
      return { previous };
    },
    onError: (_err, _ids, ctx) =>
      ctx?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TODAY_KEY }),
  });
}

/**
 * Mirrors the day plan into native prefs so the block overlay can show the
 * first not-done item and let the user skip through the rest — same pattern as
 * useBlockedAppsNativeSync. It reacts to start_day, item toggles and app entry
 * because it reads useToday (invalidated on each of those).
 *
 * Writes two keys:
 *  - day_tasks: the ordered list of not-done titles (day_block + position),
 *    which the overlay scrolls through with "Nie teraz". Empty when the day
 *    isn't in progress or everything is done.
 *  - current_task: kept for compatibility, always the first of that list.
 *
 * Source of truth: the day plan wins while the day is IN PROGRESS and still has
 * an unfinished item. When the day is not started, is completed, or every item
 * is done, day_tasks is cleared and current_task is left untouched — so the
 * overlay falls back to the manual "Na czym się teraz skupiasz?" field (or the
 * generic fallback string).
 *
 * Web (isNativeBlocker() === false) is a no-op.
 */
export function useCurrentTaskNativeSync() {
  const { data } = useToday();
  const { data: profile } = useProfile();
  const { data: focusNotes } = useFocusNotes();
  const native = isNativeBlocker();

  const undoneTitles = useMemo<string[]>(() => {
    if (!data || data.status !== "in_progress") return [];
    return data.items.filter((i) => i.status !== "done").map((i) => i.title);
  }, [data]);

  const titlesToSync = useMemo<string[]>(() => {
    if (undoneTitles.length > 0) return undoneTitles;
    if (profile?.focus_notes_enabled && focusNotes && focusNotes.length > 0) {
      return focusNotes.map((n) => n.title);
    }
    return [];
  }, [undoneTitles, profile?.focus_notes_enabled, focusNotes]);

  useEffect(() => {
    if (!native || data === undefined) return;
    Blocker.setDayTasks({ titles: titlesToSync }).catch((e) =>
      console.error("sync day tasks -> prefs failed", e),
    );
    Blocker.setCurrentTask({ title: titlesToSync[0] ?? "" }).catch((e) =>
      console.error("sync current task -> prefs failed", e),
    );
  }, [native, data, titlesToSync]);
}
