import { useEffect, useRef } from "react";
import { useProfile } from "@/lib/profile";
import { Blocker, isNativeBlocker } from "@/lib/blocker";

/**
 * Headless: mirrors Supabase profile break settings (daily limit + delay)
 * into native SharedPreferences so BlockOverlayActivity can read them.
 */
export function BreakConfigSync() {
  const { data: profile } = useProfile();
  const prevRef = useRef<string>("");

  useEffect(() => {
    if (!profile || !isNativeBlocker()) return;

    const key = `${profile.break_delay_seconds}:${profile.break_daily_limit}`;
    if (key === prevRef.current) return;
    prevRef.current = key;

    Blocker.setBreakConfig({
      delaySeconds: profile.break_delay_seconds,
      dailyLimit: profile.break_daily_limit,
    }).catch(() => {});
  }, [profile]);

  return null;
}
