import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export type FocusNoteRow = {
  id: string;
  title: string;
  position: number;
  last_done_at: string | null;
  created_at: string;
};

const FOCUS_NOTES_KEY = ["focus_notes"] as const;

function sortForRotation(rows: FocusNoteRow[]): FocusNoteRow[] {
  return [...rows].sort((a, b) => {
    if (a.last_done_at === null && b.last_done_at !== null) return -1;
    if (a.last_done_at !== null && b.last_done_at === null) return 1;
    if (a.last_done_at && b.last_done_at) {
      const cmp = a.last_done_at.localeCompare(b.last_done_at);
      if (cmp !== 0) return cmp;
    }
    return a.position - b.position;
  });
}

export function useFocusNotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...FOCUS_NOTES_KEY, user?.id],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<FocusNoteRow[]> => {
      const { data, error } = await supabase
        .from("focus_notes")
        .select("id, title, position, last_done_at, created_at")
        .order("position");
      if (error) throw error;
      return sortForRotation((data ?? []) as FocusNoteRow[]);
    },
  });
}

async function nextNotePosition(): Promise<number> {
  const { data } = await supabase
    .from("focus_notes")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.position as number | null) ?? -1) + 1;
}

export function useAddFocusNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from("focus_notes")
        .insert({ title: title.trim(), position: await nextNotePosition() });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOCUS_NOTES_KEY }),
  });
}

export function useDeleteFocusNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("focus_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOCUS_NOTES_KEY }),
  });
}

export function useToggleFocusNoteDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (note: Pick<FocusNoteRow, "id" | "last_done_at">) => {
      const nextValue = note.last_done_at ? null : new Date().toISOString();
      const { error } = await supabase
        .from("focus_notes")
        .update({ last_done_at: nextValue })
        .eq("id", note.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOCUS_NOTES_KEY }),
  });
}
