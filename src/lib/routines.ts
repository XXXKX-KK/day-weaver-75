import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { DayBlock, Priority } from "@/lib/store";

/** A routine's subtask template (routine_subtasks). No done-state — routines
 *  are recurring templates; the per-day "done" lives on day items, not here. */
export type RoutineSubtaskRow = {
  id: string;
  title: string;
  position: number;
};

/** A routine row (routines table) with its subtasks (routine_subtasks). */
export type RoutineRow = {
  id: string;
  title: string;
  description: string | null;
  day_block: DayBlock;
  /** ISO weekday numbers, 1=Mon .. 7=Sun. */
  weekdays: number[];
  position: number | null;
  estimated_minutes: number | null;
  priority: Priority;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  routine_subtasks: RoutineSubtaskRow[];
};

/** Payload from the routine form (mirrors the task form + weekdays). */
export type NewRoutineInput = {
  title: string;
  description?: string | undefined;
  block: DayBlock;
  priority: Priority;
  estimatedMinutes: number;
  /** 1=Mon .. 7=Sun; at least one, defaults to all seven in the form. */
  weekdays: number[];
  subtasks: string[];
};

/** Same payload as adding, plus the id of the routine being edited. */
export type UpdateRoutineInput = NewRoutineInput & { id: string };

/** Dedup + clamp weekdays to 1..7, falling back to all seven if emptied. */
function normalizeWeekdays(weekdays: number[]): number[] {
  const cleaned = [...new Set(weekdays)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  return cleaned.length > 0 ? cleaned : [1, 2, 3, 4, 5, 6, 7];
}

const ROUTINES_KEY = ["routines"] as const;

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

function sortRoutines(rows: RoutineRow[]): RoutineRow[] {
  return [...rows]
    .map((r) => ({
      ...r,
      weekdays: [...(r.weekdays ?? [])].sort((a, b) => a - b),
      routine_subtasks: [...(r.routine_subtasks ?? [])].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => {
      // Active before inactive, then priority, then newest first.
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      if (a.priority !== b.priority)
        return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      return b.created_at.localeCompare(a.created_at);
    });
}

export function useRoutines() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...ROUTINES_KEY, user?.id],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<RoutineRow[]> => {
      // RLS limits this to the caller's own rows. Skip archived routines.
      const { data, error } = await supabase
        .from("routines")
        .select(
          "id, title, description, day_block, weekdays, position, estimated_minutes, priority, is_active, archived_at, created_at, routine_subtasks(id, title, position)",
        )
        .is("archived_at", null);
      if (error) throw error;
      return sortRoutines((data ?? []) as RoutineRow[]);
    },
  });
}

export function useAddRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewRoutineInput) => {
      // user_id is filled by the DB (DEFAULT auth.uid()).
      const { data: routine, error } = await supabase
        .from("routines")
        .insert({
          title: input.title,
          description: input.description ?? null,
          day_block: input.block,
          priority: input.priority,
          estimated_minutes: input.estimatedMinutes,
          weekdays: normalizeWeekdays(input.weekdays),
          is_active: true,
        })
        .select("id")
        .single();
      if (error) throw error;

      const subtasks = input.subtasks
        .map((title) => title.trim())
        .filter((title) => title.length > 0);
      if (subtasks.length > 0) {
        const { error: subError } = await supabase.from("routine_subtasks").insert(
          subtasks.map((title, position) => ({
            routine_id: routine.id,
            title,
            position,
          })),
        );
        if (subError) throw subError;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROUTINES_KEY }),
  });
}

export function useUpdateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRoutineInput) => {
      // is_active stays untouched — that's the card toggle's job, not edit's.
      const { error } = await supabase
        .from("routines")
        .update({
          title: input.title,
          description: input.description ?? null,
          day_block: input.block,
          priority: input.priority,
          estimated_minutes: input.estimatedMinutes,
          weekdays: normalizeWeekdays(input.weekdays),
        })
        .eq("id", input.id);
      if (error) throw error;

      // Subtasks are stateless templates, so the simplest reliable sync is to
      // replace the whole set: delete all, then re-insert in the form's order.
      const { error: delError } = await supabase
        .from("routine_subtasks")
        .delete()
        .eq("routine_id", input.id);
      if (delError) throw delError;

      const subtasks = input.subtasks
        .map((title) => title.trim())
        .filter((title) => title.length > 0);
      if (subtasks.length > 0) {
        const { error: insError } = await supabase.from("routine_subtasks").insert(
          subtasks.map((title, position) => ({
            routine_id: input.id,
            title,
            position,
          })),
        );
        if (insError) throw insError;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROUTINES_KEY }),
  });
}

export function useToggleRoutineActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (routine: Pick<RoutineRow, "id" | "is_active">) => {
      const { error } = await supabase
        .from("routines")
        .update({ is_active: !routine.is_active })
        .eq("id", routine.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROUTINES_KEY }),
  });
}

export function useDeleteRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (routineId: string) => {
      // Remove subtasks first in case there's no ON DELETE CASCADE.
      const { error: subError } = await supabase
        .from("routine_subtasks")
        .delete()
        .eq("routine_id", routineId);
      if (subError) throw subError;
      const { error } = await supabase.from("routines").delete().eq("id", routineId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROUTINES_KEY }),
  });
}
