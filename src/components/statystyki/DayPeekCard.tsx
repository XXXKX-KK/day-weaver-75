import { useEffect, useRef } from "react";
import { useDaySummary } from "@/lib/day";
import { GlassPopover } from "@/components/ui/glass-popover";
import type { DayProgress } from "./types";
import "./statystyki.css";

/**
 * The summary of one day, opened from the heatmap and anchored to the square
 * that was tapped. Deliberately not a full screen: the grid stays visible
 * behind it, so tapping around compares days instead of entering and leaving a
 * page each time. The full-screen PodsumowanieScreen stays for closing the day.
 *
 * The pane, its placement and its tip all live in GlassPopover — this file is
 * only the content and the rules for when the card goes away.
 */

const SIDE_MARGIN = 12;
const TOP_MARGIN = 16;
/** The floating nav pill lives down there; don't slide under it. */
const BOTTOM_MARGIN = 104;
/** Distance between the square and the card — the tip lives in this gap. */
const GAP = 15;
const WIDTH = 300;
/** Tall enough to stay a summary and not a sliver. */
const MAX_HEIGHT = 420;

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "long" }).format(
    new Date(`${iso}T12:00:00`),
  );

export function DayPeekCard({
  date,
  anchor,
  progress,
  onClose,
}: {
  date: string;
  /** Screen rect of the tapped square, in viewport coordinates. */
  anchor: DOMRect;
  /** Counts already loaded by the stats query — shown before the items land. */
  progress?: DayProgress | undefined;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { data, isLoading } = useDaySummary(date);

  const items = data?.items ?? [];
  const done = items.filter((it) => it.status === "done");
  const notDone = items.filter((it) => it.status !== "done");
  const planned = progress?.planned ?? items.length;
  const completed = progress?.completed ?? done.length;
  const pct = planned ? Math.round((completed / planned) * 100) : 0;
  const noPlan = !isLoading && !data?.day;

  // Anything that moves the anchor — scrolling the grid or the page, rotating
  // the phone — invalidates the placement, so the card goes away with it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = (e: Event) => {
      const el = cardRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      onClose();
    };
    // No backdrop: a tap on another square closes this card and opens that one
    // in the same gesture, instead of costing a dismissing tap first.
    const onPointerDown = (e: PointerEvent) => {
      const el = cardRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [onClose]);

  return (
    <GlassPopover
      ref={cardRef}
      anchor={anchor}
      width={WIDTH}
      maxHeight={MAX_HEIGHT}
      gap={GAP}
      margins={{ side: SIDE_MARGIN, top: TOP_MARGIN, bottom: BOTTOM_MARGIN }}
      zIndex={70}
      className="animate-[popIn_.18s_ease_both]"
      role="dialog"
      aria-label={`Podsumowanie dnia: ${dateLabel(date)}`}
    >
      <div className="shrink-0 px-[15px] pt-[13px] text-[13px] font-bold text-foreground first-letter:uppercase">
        {dateLabel(date)}
      </div>

      <div className="flex shrink-0 items-start justify-between gap-3 px-[15px] pb-[12px] pt-[9px]">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
            Zrobione
          </div>
          <div
            className="mt-[3px] text-[24px] font-extrabold leading-none tabular-nums"
            style={{ color: "var(--success)" }}
          >
            {pct}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
            XP
          </div>
          <div className="mt-[3px] text-[24px] font-extrabold leading-none tabular-nums text-primary">
            +{progress?.xp ?? 0}
          </div>
        </div>
      </div>

      <div className="mx-[15px] shrink-0 border-t border-foreground/10" />

      {/* The only part that gives: a capped card squeezes the list, not the
            header, so the date and the score never get cut off. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-[15px] pb-[13px] pt-[11px]">
        {isLoading && <p className="py-1 text-[12px] text-muted-foreground">Wczytywanie…</p>}

        {noPlan && (
          <p className="py-1 text-[12px] leading-relaxed text-muted-foreground">
            Tego dnia nie było planu — nie ma czego podsumować.
          </p>
        )}

        {!isLoading && !noPlan && items.length === 0 && (
          <p className="py-1 text-[12px] text-muted-foreground">
            Ten dzień nie miał żadnych pozycji.
          </p>
        )}

        {done.length > 0 && (
          <>
            <SectionLabel dot="var(--success)">Zrobione ({done.length})</SectionLabel>
            {done.map((it) => (
              <div key={it.id} className="mb-[5px] flex items-center gap-[7px]">
                <span
                  className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--success)" }}
                >
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="truncate text-[12px] font-medium text-muted-foreground line-through">
                  {it.title}
                </span>
              </div>
            ))}
          </>
        )}

        {notDone.length > 0 && (
          <>
            <SectionLabel dot="var(--muted-foreground)" spaced={done.length > 0}>
              Niezrobione ({notDone.length})
            </SectionLabel>
            {notDone.map((it) => (
              <div key={it.id} className="mb-[5px] flex items-center gap-[7px]">
                <span
                  className="h-[5px] w-[5px] shrink-0 rounded-full"
                  style={{ background: "var(--muted-foreground)" }}
                />
                <span className="truncate text-[12px] font-medium text-muted-foreground">
                  {it.title}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </GlassPopover>
  );
}

function SectionLabel({
  children,
  dot,
  spaced = false,
}: {
  children: React.ReactNode;
  dot: string;
  spaced?: boolean;
}) {
  return (
    <div className={`flex items-center gap-[6px] ${spaced ? "mt-[11px]" : ""} mb-[7px]`}>
      <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: dot }} />
      <span className="text-[10px] font-bold uppercase tracking-[.05em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

export default DayPeekCard;
