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
