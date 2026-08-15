import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { BLOCK_ORDER, type DayBlock, type Priority } from "@/lib/store";

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
  day_block: DayBlock;
  position: number;
  status: DayItemStatus;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  priority: Priority;
  day_item_subtasks: DayItemSubtaskRow[];
};

/** days row. */
export type DayRow = {
  id: string;
  date: string;
  status: "planned" | "in_progress" | "completed";
  planned_count: number;
  completed_count: number;
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
  "id, source_type, day_block, position, status, title, description, estimated_minutes, priority, day_item_subtasks(id, title, position, is_done)";

function sortItems(items: DayItemRow[]): DayItemRow[] {
  return [...items]
    .map((i) => ({
      ...i,
      day_item_subtasks: [...(i.day_item_subtasks ?? [])].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => {
      const blockDiff = BLOCK_ORDER.indexOf(a.day_block) - BLOCK_ORDER.indexOf(b.day_block);
      if (blockDiff !== 0) return blockDiff;
      return a.position - b.position;
    });
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
        .select(`id, date, status, planned_count, completed_count, day_items(${DAY_ITEM_COLUMNS})`)
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

/** Snapshot of every ['today', ...] cache entry, for optimistic rollback. */
type TodaySnapshot = [readonly unknown[], TodayData | undefined][];

/** Toggle a day item between done and pending, writing completed_at to match.
 *  days.completed_count is maintained by a DB trigger — never set it here. */
export function useSetItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Pick<DayItemRow, "id" | "status">) => {
      const next: DayItemStatus = item.status === "done" ? "pending" : "done";
      const { error } = await supabase
        .from("day_items")
        .update({
          status: next,
          completed_at: next === "done" ? new Date().toISOString() : null,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: TODAY_KEY });
      const previous = queryClient.getQueriesData<TodayData>({ queryKey: TODAY_KEY });
      const next: DayItemStatus = item.status === "done" ? "pending" : "done";
      queryClient.setQueriesData<TodayData>({ queryKey: TODAY_KEY }, (old) =>
        old
          ? { ...old, items: old.items.map((i) => (i.id === item.id ? { ...i, status: next } : i)) }
          : old,
      );
      return { previous };
    },
    onError: (_err, _item, ctx) => rollback(queryClient, ctx?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TODAY_KEY }),
  });
}

/** Toggle a day item's subtask done-state, writing completed_at to match. */
export function useToggleDayItemSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subtask: Pick<DayItemSubtaskRow, "id" | "is_done">) => {
      const next = !subtask.is_done;
      const { error } = await supabase
        .from("day_item_subtasks")
        .update({
          is_done: next,
          completed_at: next ? new Date().toISOString() : null,
        })
        .eq("id", subtask.id);
      if (error) throw error;
    },
    onMutate: async (subtask) => {
      await queryClient.cancelQueries({ queryKey: TODAY_KEY });
      const previous = queryClient.getQueriesData<TodayData>({ queryKey: TODAY_KEY });
      queryClient.setQueriesData<TodayData>({ queryKey: TODAY_KEY }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((i) => ({
                ...i,
                day_item_subtasks: i.day_item_subtasks.map((s) =>
                  s.id === subtask.id ? { ...s, is_done: !subtask.is_done } : s,
                ),
              })),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _subtask, ctx) => rollback(queryClient, ctx?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TODAY_KEY }),
  });
}

/** Mark the day completed (status + completed_at). */
export function useCompleteDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dayId: string) => {
      const { error } = await supabase
        .from("days")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", dayId);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: TODAY_KEY });
      const previous = queryClient.getQueriesData<TodayData>({ queryKey: TODAY_KEY });
      queryClient.setQueriesData<TodayData>({ queryKey: TODAY_KEY }, (old) =>
        old && old.day
          ? { ...old, status: "completed", day: { ...old.day, status: "completed" } }
          : old,
      );
      return { previous };
    },
    onError: (_err, _dayId, ctx) => rollback(queryClient, ctx?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TODAY_KEY }),
  });
}

function rollback(
  queryClient: ReturnType<typeof useQueryClient>,
  previous: TodaySnapshot | undefined,
) {
  previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
}
