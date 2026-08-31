import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { DayProgress } from "@/components/statystyki/types";

export function useDailyProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["daily-progress", user?.id],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<DayProgress[]> => {
      const { data, error } = await supabase.rpc("daily_progress");
      if (error) throw error;
      return (data ?? []) as DayProgress[];
    },
  });
}
