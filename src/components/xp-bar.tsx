import { Link } from "@tanstack/react-router";
import { Castle } from "lucide-react";
import { useGamification } from "@/lib/gamification";

export function XpBar() {
  const { level, intoLevel, toNext, progress, streak } = useGamification();

  return (
    <div className="mb-6 flex items-center justify-between animate-[cascadeIn_.5s_ease-out_both]">
      <Link
        to="/statystyki"
        data-tour="progress"
        className="flex items-center gap-3 rounded-full bg-foreground/[0.06] py-1.5 pl-1.5 pr-3.5"
      >
        <span className="accent-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-primary-foreground">
          {level}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-muted-foreground">Poziom {level}</span>
          <div className="flex items-center gap-2">
            <div className="h-[3px] w-20 overflow-hidden rounded-full bg-foreground/[0.08]">
              <div
                className="h-full rounded-full accent-gradient animate-[fillBar_1s_ease-out_.3s_both]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground/60">
              {intoLevel}/{intoLevel + toNext}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-3.5">
        <Link
          to="/statystyki"
          className="flex items-center gap-1.5 rounded-full bg-foreground/[0.06] px-3 py-1.5"
        >
          <span className="text-sm" aria-hidden>🔥</span>
          <span className="text-[13px] font-bold text-foreground">{streak}</span>
        </Link>

        <Link
          to="/wioska"
          aria-label="Twoja wioska"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground transition-colors active:text-foreground"
        >
          <Castle className="h-[18px] w-[18px]" />
        </Link>
      </div>
    </div>
  );
}
