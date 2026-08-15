import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { DayBlock, Priority } from "@/lib/store";

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
  day_block: DayBlock;
  priority: Priority;
  estimated_minutes: number;
  status: "open" | "done";
  scheduled_date: string | null;
  completed_at: string | null;
  created_at: string;
  task_subtasks: TaskSubtaskRow[];
};

/** Payload from the task form (same shape the in-memory store used). */
export type NewTaskInput = {
  title: string;
  description?: string | undefined;
  block: DayBlock;
  priority: Priority;
  estimatedMinutes: number;
  subtasks: string[];
};

const TASKS_KEY = ["tasks"] as const;

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

/** Local (Europe/Warsaw on device) YYYY-MM-DD — avoids UTC day shift. */
function todayLocalISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

function sortTasks(rows: TaskRow[]): TaskRow[] {
  return [...rows]
    .map((t) => ({
      ...t,
      task_subtasks: [...(t.task_subtasks ?? [])].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => {
      // Open before done, then by priority, then newest first.
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      if (a.priority !== b.priority)
        return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      return b.created_at.localeCompare(a.created_at);
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
          "id, title, description, day_block, priority, estimated_minutes, status, scheduled_date, completed_at, created_at, task_subtasks(id, title, position, is_done)",
        );
      if (error) throw error;
      return sortTasks((data ?? []) as TaskRow[]);
    },
  });
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
          day_block: input.block,
          priority: input.priority,
          estimated_minutes: input.estimatedMinutes,
          status: "open",
          scheduled_date: todayLocalISO(),
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
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
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
