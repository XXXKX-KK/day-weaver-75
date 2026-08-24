import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Blocker, isNativeBlocker } from "@/lib/blocker";
import { xpValueForItem, shareForSubtask } from "@/lib/gamification";
import type { ProfileRow } from "@/lib/profile";
import { reorderByIds } from "@/lib/reorder";
import type { DayBlock, Priority } from "@/lib/store";

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

/** Local (device-local) YYYY-MM-DD — matches how tasks store scheduled_date,
 *  and avoids the UTC day shift a plain toISOString() would cause. */
export function todayLocalISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

const DAY_ITEM_COLUMNS =
  "id, source_type, task_id, day_block, position, status, title, description, estimated_minutes, priority, xp_value, xp_awarded, day_item_subtasks(id, title, position, is_done)";

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
        .select(`id, date, status, planned_count, completed_count, streak_counted, day_items(${DAY_ITEM_COLUMNS})`)
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

/** Freshest cached total_xp, falling back to a DB read when the cache is cold. */
async function readTotalXp(queryClient: QueryClient): Promise<number> {
  for (const [, data] of queryClient.getQueriesData<ProfileRow | null>({ queryKey: PROFILE_KEY })) {
    if (data) return data.total_xp;
  }
  const { data } = await supabase.from("profiles").select("total_xp").maybeSingle();
  return (data as { total_xp: number } | null)?.total_xp ?? 0;
}

/** Persist total_xp = current + delta (never below 0). Read-modify-write is
 *  fine here — it's one user tapping through their own day. */
async function persistXpDelta(queryClient: QueryClient, userId: string, delta: number) {
  if (delta === 0) return;
  const total = Math.max(0, (await readTotalXp(queryClient)) + delta);
  const { error } = await supabase.from("profiles").update({ total_xp: total }).eq("id", userId);
  if (error) throw error;
}

const STREAK_THRESHOLD = 0.45;

type SetItemStatusInput = {
  item: DayItemRow;
  day: DayRow | null;
  items: DayItemRow[];
};

/**
 * Toggle a day item between done and pending. An item with no subtasks awards
 * its full xp_value; one with subtasks is "topped up" to the full value (the
 * part not covered by checked subtasks). Undo subtracts whatever was credited.
 * xp_awarded tracks the item's running contribution; days.completed_count is
 * maintained by a DB trigger — never set it here.
 *
 * Streak: when done/total >= 45% and the day hasn't been streak-counted yet,
 * advance the profile streak and flag the day. Once counted, never revoked.
 */
export function useSetItemStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ item, day, items }: SetItemStatusInput) => {
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

      if (user) await persistXpDelta(queryClient, user.id, delta);

      if (user && day && !day.streak_counted) {
        const doneCount = items.filter((i) => (i.id === item.id ? next === "done" : i.status === "done")).length;
        if (items.length > 0 && doneCount / items.length >= STREAK_THRESHOLD) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("streak_count, last_completed_date")
            .maybeSingle();
          const streak = nextStreak(prof?.last_completed_date ?? null, prof?.streak_count ?? 0);
          const { error: profError } = await supabase
            .from("profiles")
            .update({ streak_count: streak, last_completed_date: todayLocalISO() })
            .eq("id", user.id);
          if (profError) throw profError;
          const { error: dayError } = await supabase
            .from("days")
            .update({ streak_counted: true })
            .eq("id", day.id);
          if (dayError) throw dayError;
        }
      }
    },
    onMutate: async ({ item, day, items }: SetItemStatusInput) => {
      await queryClient.cancelQueries({ queryKey: TODAY_KEY });
      const snap = snapshotCaches(queryClient);
      const next: DayItemStatus = item.status === "done" ? "pending" : "done";
      const xpValue = xpValueForItem(item);
      const newAwarded = next === "done" ? xpValue : 0;

      const shouldCountStreak =
        day && !day.streak_counted && items.length > 0 &&
        items.filter((i) => (i.id === item.id ? next === "done" : i.status === "done")).length / items.length >= STREAK_THRESHOLD;

      queryClient.setQueriesData<TodayData>({ queryKey: TODAY_KEY }, (old) =>
        old
          ? {
              ...old,
              day: old.day && shouldCountStreak ? { ...old.day, streak_counted: true } : old.day,
              items: old.items.map((i) =>
                i.id === item.id
                  ? { ...i, status: next, xp_value: xpValue, xp_awarded: newAwarded }
                  : i,
              ),
            }
          : old,
      );
      bumpCachedXp(queryClient, newAwarded - item.xp_awarded);
      if (shouldCountStreak) {
        queryClient.setQueriesData<ProfileRow | null>({ queryKey: PROFILE_KEY }, (old) =>
          old
            ? {
                ...old,
                streak_count: nextStreak(old.last_completed_date, old.streak_count),
                last_completed_date: todayLocalISO(),
              }
            : old,
        );
      }
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

      const { error: itemError } = await supabase
        .from("day_items")
        .update({ xp_value: xpValue, xp_awarded: newAwarded })
        .eq("id", item.id);
      if (itemError) throw itemError;

      if (user) await persistXpDelta(queryClient, user.id, delta);
    },
    onMutate: async ({ item, subtask }) => {
      await queryClient.cancelQueries({ queryKey: TODAY_KEY });
      const snap = snapshotCaches(queryClient);
      const xpValue = xpValueForItem(item);
      const share = shareForSubtask(item, item.day_item_subtasks, subtask.id);
      const newAwarded = clamp(item.xp_awarded + (!subtask.is_done ? share : -share), 0, xpValue);
      queryClient.setQueriesData<TodayData>({ queryKey: TODAY_KEY }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      xp_value: xpValue,
                      xp_awarded: newAwarded,
                      day_item_subtasks: i.day_item_subtasks.map((s) =>
                        s.id === subtask.id ? { ...s, is_done: !subtask.is_done } : s,
                      ),
                    }
                  : i,
              ),
            }
          : old,
      );
      bumpCachedXp(queryClient, newAwarded - item.xp_awarded);
      return snap;
    },
    onError: (_err, _vars, ctx) => restoreCaches(queryClient, ctx),
    onSettled: () => invalidateDayAndProfile(queryClient),
  });
}

/** Local YYYY-MM-DD for yesterday (for the streak comparison). */
function yesterdayLocalISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA");
}

/** Streak after completing today: +1 if yesterday, unchanged if already today,
 *  otherwise reset to 1. */
function nextStreak(last: string | null, count: number): number {
  if (last === todayLocalISO()) return count;
  if (last === yesterdayLocalISO()) return count + 1;
  return 1;
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
  const native = isNativeBlocker();

  const undoneTitles = useMemo<string[]>(() => {
    if (!data || data.status !== "in_progress") return [];
    // items are already ordered by day_block + position in useToday.
    return data.items.filter((i) => i.status !== "done").map((i) => i.title);
  }, [data]);

  useEffect(() => {
    if (!native || data === undefined) return; // wait until the day is loaded
    // Always mirror the (possibly empty) list; empty tells the overlay to fall
    // back to current_task and hide the skip button.
    Blocker.setDayTasks({ titles: undoneTitles }).catch((e) =>
      console.error("sync day tasks -> prefs failed", e),
    );
    // Keep current_task in step with the first item; when the list is empty
    // clear it so the overlay doesn't show a stale "ghost" task.
    Blocker.setCurrentTask({ title: undoneTitles[0] ?? "" }).catch((e) =>
      console.error("sync current task -> prefs failed", e),
    );
  }, [native, data, undoneTitles]);
}
