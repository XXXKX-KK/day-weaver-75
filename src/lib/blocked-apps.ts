import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Blocker, isNativeBlocker } from "@/lib/blocker";

/** A blocked_apps row (source of truth for which apps are blocked). */
export type BlockedAppRow = {
  package_name: string;
  app_label: string;
  is_enabled: boolean;
};

const BLOCKED_KEY = ["blocked_apps"] as const;

/** Packages that are actually blocked (is_enabled === true). */
export function enabledPackagesOf(rows: BlockedAppRow[] | undefined): string[] {
  return (rows ?? []).filter((r) => r.is_enabled).map((r) => r.package_name);
}

export function useBlockedApps() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...BLOCKED_KEY, user?.id],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<BlockedAppRow[]> => {
      const { data, error } = await supabase
        .from("blocked_apps")
        .select("package_name, app_label, is_enabled");
      if (error) throw error;
      return (data ?? []) as BlockedAppRow[];
    },
  });
}

/**
 * Toggle a single app on/off. Supabase is the source of truth: upsert by
 * package_name (user_id comes from the DB default auth.uid()). Optimistic so
 * the UI — and the native-prefs sync — react instantly; the cache is
 * reconciled with the server afterwards.
 */
export function useSetAppBlocked() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const key = [...BLOCKED_KEY, user?.id];

  return useMutation({
    mutationFn: async (input: { packageName: string; appLabel: string; blocked: boolean }) => {
      const { error } = await supabase.from("blocked_apps").upsert(
        {
          package_name: input.packageName,
          app_label: input.appLabel,
          is_enabled: input.blocked,
        },
        { onConflict: "user_id,package_name" },
      );
      if (error) throw error;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BlockedAppRow[]>(key);
      queryClient.setQueryData<BlockedAppRow[]>(key, (old) => {
        const rows = (old ?? []).map((r) =>
          r.package_name === input.packageName
            ? { ...r, app_label: input.appLabel, is_enabled: input.blocked }
            : r,
        );
        if (!rows.some((r) => r.package_name === input.packageName)) {
          rows.push({
            package_name: input.packageName,
            app_label: input.appLabel,
            is_enabled: input.blocked,
          });
        }
        return rows;
      });
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: BLOCKED_KEY }),
  });
}

/**
 * Keeps native prefs in sync with Supabase (Supabase -> prefs). Runs at
 * startup/login (component mount) and after every change (cache updates), so
 * the AccessibilityService always sees the current blocked set. No-op on web.
 */
export function useBlockedAppsNativeSync() {
  const { data } = useBlockedApps();
  const native = isNativeBlocker();
  const packages = useMemo(() => enabledPackagesOf(data), [data]);

  useEffect(() => {
    if (!native || data === undefined) return; // wait until Supabase data is loaded
    Blocker.setBlockedApps({ packages }).catch((e) =>
      console.error("sync blocked_apps -> prefs failed", e),
    );
  }, [native, data, packages]);
}
