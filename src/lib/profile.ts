import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

/** profiles row (one per user, created by a trigger on sign-up). */
export type ProfileRow = {
  id: string;
  display_name: string | null;
  timezone: string | null;
  day_start_time: string | null; // "HH:MM:SS"
  day_end_time: string | null; // "HH:MM:SS"
  autostart_day: boolean;
  break_daily_limit: number;
  break_delay_seconds: number;
  // Gamification (updated live from day interactions).
  total_xp: number;
  streak_count: number;
  last_completed_date: string | null; // "YYYY-MM-DD"
  focus_notes_enabled: boolean;
};

/** Fields the settings screen may write (room left for break_* etc.). */
export type ProfileUpdate = Partial<
  Pick<
    ProfileRow,
    | "day_start_time"
    | "day_end_time"
    | "autostart_day"
    | "break_daily_limit"
    | "break_delay_seconds"
    | "display_name"
    | "focus_notes_enabled"
  >
>;

const PROFILE_KEY = ["profile"] as const;

const PROFILE_COLUMNS =
  "id, display_name, timezone, day_start_time, day_end_time, autostart_day, break_daily_limit, break_delay_seconds, total_xp, streak_count, last_completed_date, focus_notes_enabled";

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...PROFILE_KEY, user?.id],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<ProfileRow | null> => {
      // RLS limits this to the caller's own row; may be null if the trigger
      // hasn't created it yet (handled gracefully upstream).
      const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).maybeSingle();
      if (error) throw error;
      return (data as ProfileRow | null) ?? null;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const key = [...PROFILE_KEY, user?.id];

  return useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      if (!user) throw new Error("Brak zalogowanego użytkownika");
      // Upsert on id so it also works if the profile row is somehow missing.
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...patch }, { onConflict: "id" });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProfileRow | null>(key);
      queryClient.setQueryData<ProfileRow | null>(key, (old) => (old ? { ...old, ...patch } : old));
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
}
