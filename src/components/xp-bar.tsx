import { Link } from "@tanstack/react-router";
import { Castle } from "lucide-react";
import { useGamification } from "@/lib/gamification";

/**
 * Compact XP widget for the top of the Today screen: level, a within-level
 * progress bar, the streak, and a shortcut into the (placeholder) village.
 * Grows live as items are checked off (reads the ['profile'] cache).
 */
export function XpBar() {
  const { level, intoLevel, toNext, progress, streak } = useGamification();

  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl bg-elevated px-3 py-2.5">
      <span className="accent-gradient flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl leading-none text-primary-foreground">
        <span className="text-[8px] font-semibold uppercase tracking-wide opacity-80">Lv</span>
        <span className="text-sm font-bold">{level}</span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline justify-between text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">Poziom {level}</span>
          <span>
            {intoLevel}/{intoLevel + toNext} XP
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="accent-gradient h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <span className="flex shrink-0 items-center gap-1 text-sm font-bold" title="Passa">
        <span aria-hidden>🔥</span>
        {streak}
      </span>

      <Link
        to="/wioska"
        aria-label="Twoja wioska"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors active:text-foreground"
      >
        <Castle className="h-4 w-4" />
      </Link>
    </div>
  );
}
