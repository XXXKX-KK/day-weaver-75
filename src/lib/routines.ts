import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { reorderByIds } from "@/lib/reorder";
import { syncIntoRunningDay, type PlanSync } from "@/lib/day";
import type { AnchorLabel, GrowthArea, Priority, RoutineKind } from "@/lib/store";

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
  /** ISO weekday numbers, 1=Mon .. 7=Sun. */
  weekdays: number[];
  /** Manual order shared across all routines (drag-and-drop). Nulls sort last. */
  position: number | null;
  priority: Priority;
  scheduled_time: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  /** Upkeep vs. the habits that actually move the user forward. */
  kind: RoutineKind;
  /** Only meaningful for growth rows. */
  area: GrowthArea | null;
  /** A growth habit rides directly behind an existing routine… */
  anchor_routine_id: string | null;
  /** …or behind a moment of the day when no routine fits. */
  anchor_label: AnchorLabel | null;
  routine_subtasks: RoutineSubtaskRow[];
};

/** Payload from the routine form. Day block + estimated time were dropped when
 *  the model moved to manual ordering. */
export type NewRoutineInput = {
  title: string;
  description?: string | undefined;
  priority: Priority;
  /** 1=Mon .. 7=Sun; at least one, defaults to all seven in the form. */
  weekdays: number[];
  subtasks: string[];
  scheduled_time?: string | undefined;
  kind?: RoutineKind | undefined;
  area?: GrowthArea | null | undefined;
  anchor_routine_id?: string | null | undefined;
  anchor_label?: AnchorLabel | null | undefined;
};

/** Same payload as adding, plus the id of the routine being edited. */
export type UpdateRoutineInput = NewRoutineInput & { id: string };

/** Dedup + clamp weekdays to 1..7, falling back to all seven if emptied. */
function normalizeWeekdays(weekdays: number[]): number[] {
  const cleaned = [...new Set(weekdays)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  return cleaned.length > 0 ? cleaned : [1, 2, 3, 4, 5, 6, 7];
}

const ROUTINES_KEY = ["routines"] as const;

function sortRoutines(rows: RoutineRow[]): RoutineRow[] {
  return [...rows]
    .map((r) => ({
      ...r,
      weekdays: [...(r.weekdays ?? [])].sort((a, b) => a - b),
      routine_subtasks: [...(r.routine_subtasks ?? [])].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => {
      // One shared manual order: by position (nulls last), then oldest first.
      const pa = a.position ?? Number.POSITIVE_INFINITY;
      const pb = b.position ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return a.created_at.localeCompare(b.created_at);
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
          "id, title, description, weekdays, position, priority, scheduled_time, is_active, archived_at, created_at, kind, area, anchor_routine_id, anchor_label, routine_subtasks(id, title, position)",
        )
        .is("archived_at", null);
      if (error) throw error;
      return sortRoutines((data ?? []) as RoutineRow[]);
    },
  });
}

/** Next position for a new routine = current max + 1 (lands at the end). */
async function nextRoutinePosition(): Promise<number> {
  const { data } = await supabase
    .from("routines")
    .select("position")
    .is("archived_at", null)
    .order("position", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return ((data?.position as number | null) ?? -1) + 1;
}

/** Insert one routine plus its subtask templates; returns the new row's id.
 *  user_id is filled by the DB (DEFAULT auth.uid()). */
async function insertRoutine(input: NewRoutineInput, position: number): Promise<string> {
  const { data: routine, error } = await supabase
    .from("routines")
    .insert({
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      weekdays: normalizeWeekdays(input.weekdays),
      scheduled_time: input.scheduled_time ?? null,
      position,
      is_active: true,
      kind: input.kind ?? "maintenance",
      area: input.area ?? null,
      anchor_routine_id: input.anchor_routine_id ?? null,
      anchor_label: input.anchor_label ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const subtasks = input.subtasks
    .map((title) => title.trim())
    .filter((title) => title.length > 0);
  if (subtasks.length > 0) {
    const { error: subError } = await supabase.from("routine_subtasks").insert(
      subtasks.map((title, pos) => ({ routine_id: routine.id, title, position: pos })),
    );
    if (subError) throw subError;
  }
  return routine.id as string;
}

export function useAddRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewRoutineInput): Promise<PlanSync> => {
      await insertRoutine(input, await nextRoutinePosition());
      // A routine created mid-day should show up today, same as a task does.
      // start_day only picks up routines whose weekdays match, so there's no
      // need to check the calendar here.
      return syncIntoRunningDay();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROUTINES_KEY });
      queryClient.invalidateQueries({ queryKey: ["today"] });
    },
  });
}

/**
 * What onboarding produces. Upkeep tiles carry a local `key` so a growth habit
 * can name one as its anchor before either row exists in the DB; the keys are
 * resolved to real ids during the insert.
 */
export type StarterPlan = {
  maintenance: (NewRoutineInput & { key: string })[];
  growth: (NewRoutineInput & { anchorKey?: string | null | undefined })[];
};

export function useCreateStarterPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: StarterPlan) => {
      let position = await nextRoutinePosition();
      const idByKey = new Map<string, string>();

      // Upkeep first — a growth habit may anchor to one of these.
      for (const { key, ...routine } of plan.maintenance) {
        idByKey.set(key, await insertRoutine(routine, position++));
      }
      for (const { anchorKey, ...routine } of plan.growth) {
        const anchorId = anchorKey ? (idByKey.get(anchorKey) ?? null) : null;
        await insertRoutine(
          { ...routine, kind: "growth", anchor_routine_id: anchorId },
          position++,
        );
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROUTINES_KEY }),
  });
}

export function useUpdateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateRoutineInput) => {
      // is_active and position stay untouched — those are the toggle's / drag's job.
      const { error } = await supabase
        .from("routines")
        .update({
          title: input.title,
          description: input.description ?? null,
          priority: input.priority,
          weekdays: normalizeWeekdays(input.weekdays),
          scheduled_time: input.scheduled_time ?? null,
          ...(input.kind !== undefined ? { kind: input.kind } : {}),
          ...(input.area !== undefined ? { area: input.area } : {}),
          ...(input.anchor_routine_id !== undefined
            ? { anchor_routine_id: input.anchor_routine_id }
            : {}),
          ...(input.anchor_label !== undefined ? { anchor_label: input.anchor_label } : {}),
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

/** Persist a new shared order (routine ids top-to-bottom). Optimistic. */
export function useReorderRoutines() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map(async (id, position) => {
          const { error } = await supabase.from("routines").update({ position }).eq("id", id);
          if (error) throw error;
        }),
      );
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ROUTINES_KEY });
      const previous = queryClient.getQueriesData<RoutineRow[]>({ queryKey: ROUTINES_KEY });
      queryClient.setQueriesData<RoutineRow[]>({ queryKey: ROUTINES_KEY }, (old) =>
        old ? reorderByIds(old, orderedIds) : old,
      );
      return { previous };
    },
    onError: (_err, _ids, ctx) =>
      ctx?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ROUTINES_KEY }),
  });
}
