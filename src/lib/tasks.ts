import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { reorderByIds } from "@/lib/reorder";
import type { Priority } from "@/lib/store";
import type { ContactActionType } from "@/lib/contact-action";
import { todayLocalISO } from "@/lib/day";

/** A task row (tasks table) with its subtasks (task_subtasks). */
export type TaskSubtaskRow = {
  id: string;
  title: string;
  position: number;
  is_done: boolean;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  /** Manual order (drag-and-drop). Nulls sort last. */
  position: number | null;
  status: "open" | "done";
  scheduled_date: string | null;
  scheduled_time: string | null;
  completed_at: string | null;
  created_at: string;
  contact_action: ContactActionType | null;
  task_subtasks: TaskSubtaskRow[];
};

/** Payload from the task form. Day block + estimated time were dropped when the
 *  model moved to manual ordering. */
export type NewTaskInput = {
  title: string;
  description?: string | undefined;
  priority: Priority;
  subtasks: string[];
  scheduled_date?: string | undefined;
  scheduled_time?: string | undefined;
};

const TASKS_KEY = ["tasks"] as const;
const TODAY_KEY = ["today"] as const;

function sortTasks(rows: TaskRow[]): TaskRow[] {
  return [...rows]
    .map((t) => ({
      ...t,
      task_subtasks: [...(t.task_subtasks ?? [])].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => {
      // Manual order: by position (nulls last), then oldest first as tie-break.
      const pa = a.position ?? Number.POSITIVE_INFINITY;
      const pb = b.position ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return a.created_at.localeCompare(b.created_at);
    });
}

export function useTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...TASKS_KEY, user?.id],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<TaskRow[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, title, description, priority, position, status, scheduled_date, scheduled_time, completed_at, created_at, contact_action, task_subtasks(id, title, position, is_done)",
        );
      if (error) throw error;
      return sortTasks((data ?? []) as TaskRow[]);
    },
  });
}

/** Next position for a new row = current max + 1 (lands at the end). */
async function nextTaskPosition(): Promise<number> {
  const { data } = await supabase
    .from("tasks")
    .select("position")
    .order("position", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return ((data?.position as number | null) ?? -1) + 1;
}

export function useAddTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTaskInput) => {
      // user_id is filled by the DB (DEFAULT auth.uid()).
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          title: input.title,
          description: input.description ?? null,
          priority: input.priority,
          position: await nextTaskPosition(),
          status: "open",
          scheduled_date: input.scheduled_date ?? todayLocalISO(),
          scheduled_time: input.scheduled_time ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const subtasks = input.subtasks
        .map((title) => title.trim())
        .filter((title) => title.length > 0);
      if (subtasks.length > 0) {
        const { error: subError } = await supabase.from("task_subtasks").insert(
          subtasks.map((title, position) => ({
            task_id: task.id,
            title,
            position,
            is_done: false,
          })),
        );
        if (subError) throw subError;
      }

      const today = todayLocalISO();
      const taskDate = input.scheduled_date ?? today;
      if (taskDate <= today) {
        await supabase.rpc("start_day", { target_date: today }).catch(() => {});
      }

      return task.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      queryClient.invalidateQueries({ queryKey: TODAY_KEY });
    },
  });
}

export function useToggleTaskDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Pick<TaskRow, "id" | "status">) => {
      const nextStatus = task.status === "done" ? "open" : "done";
      const { error } = await supabase
        .from("tasks")
        .update({
          status: nextStatus,
          completed_at: nextStatus === "done" ? new Date().toISOString() : null,
        })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      // Remove subtasks first in case there's no ON DELETE CASCADE.
      const { error: subError } = await supabase
        .from("task_subtasks")
        .delete()
        .eq("task_id", taskId);
      if (subError) throw subError;
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useSetContactAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { taskId: string; action: ContactActionType | null }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ contact_action: args.action })
        .eq("id", args.taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/** Persist a new manual order (task ids top-to-bottom). Optimistic. */
export function useReorderTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map(async (id, position) => {
          const { error } = await supabase.from("tasks").update({ position }).eq("id", id);
          if (error) throw error;
        }),
      );
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      const previous = queryClient.getQueriesData<TaskRow[]>({ queryKey: TASKS_KEY });
      queryClient.setQueriesData<TaskRow[]>({ queryKey: TASKS_KEY }, (old) =>
        old ? reorderByIds(old, orderedIds) : old,
      );
      return { previous };
    },
    onError: (_err, _ids, ctx) =>
      ctx?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}
