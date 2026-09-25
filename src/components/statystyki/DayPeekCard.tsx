import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDaySummary } from "@/lib/day";
import type { DayProgress } from "./types";
import "./statystyki.css";

/**
 * The summary of one day, opened from the heatmap and anchored to the square
 * that was tapped. Deliberately not a full screen: the grid stays visible
 * behind it, so tapping around compares days instead of entering and leaving a
 * page each time. The full-screen PodsumowanieScreen stays for closing the day.
 *
 * Placement is measured, never assumed — the card goes below the square when
 * there is room and above it otherwise, and is clamped to the viewport so a
 * square at the edge of the grid can never push it half off-screen. The arrow
 * always points at the square it was opened from: the card is pinned to that
 * edge and its height capped to whatever room is left, rather than being moved
 * somewhere the arrow would lie.
 *
 * The arrow is not a separate element stuck to the card — it is cut out of the
 * card itself with `clip-path`, so card and tip are literally one pane of
 * glass: one veil, one blur, no seam and nothing to drift out of step.
 */

/** Breathing room from the viewport edges. */
const SIDE_MARGIN = 12;
const TOP_MARGIN = 16;
/** The floating nav pill lives down there; don't slide under it. */
const BOTTOM_MARGIN = 104;
/** Distance between the square and the card — the arrow lives in this gap. */
const GAP = 15;
/** Wide enough to read as a corner of the pane rather than a speck: the tip is
 *  the same glass as the card, so it can only be seen by its shape. */
const ARROW_H = 13;
const ARROW_W = 26;
/** How far the tip stops short of the square. */
const TIP_GAP = GAP - ARROW_H;
/** Corner radius — baked into the clip path, so it has to match the card. */
const RADIUS = 18;
const WIDTH = 300;
/** The same pane as the old day tooltip, and as the rest of the app: a 5% veil
 *  of the foreground over a heavy backdrop blur. Written as Tailwind utilities
 *  on purpose — the hand-written backdrop-filter in our CSS files survives
 *  minification only in its -webkit form, which Chromium ignores, so a rule in
 *  a stylesheet would frost nothing on the phone. */
const GLASS = "bg-foreground/5 backdrop-blur-xl";
/** Tall enough to stay a summary and not a sliver. */
const MAX_HEIGHT = 420;

interface Placement {
  /** Distance from the top of the viewport to the element's pinned edge. For
   *  `above` this is its BOTTOM edge, so the card grows upwards and its tip
   *  stays glued to the square whatever the content does. */
  offset: number;
  left: number;
  /** Cap for the whole element, tip strips included. */
  maxHeight: number;
  clipPath: string;
  side: "below" | "above";
}

/**
 * The card's outline: a rounded rectangle with a triangle pushed out of one
 * edge. The element reserves a tip-high strip top AND bottom so its measured
 * height does not depend on which side won — only one strip is ever filled.
 */
function outline(w: number, h: number, tipX: number, side: "below" | "above"): string {
  const r = RADIUS;
  const a = ARROW_W / 2;
  const x = clamp(tipX, r + a, w - r - a);
  const top = ARROW_H;
  const bottom = h - ARROW_H;
  const arc = (ex: number, ey: number) => `A ${r} ${r} 0 0 1 ${ex} ${ey}`;

  if (side === "below") {
    return `path("M ${r} ${top} L ${x - a} ${top} L ${x} 0 L ${x + a} ${top} L ${w - r} ${top} ${arc(w, top + r)} L ${w} ${bottom - r} ${arc(w - r, bottom)} L ${r} ${bottom} ${arc(0, bottom - r)} L 0 ${top + r} ${arc(r, top)} Z")`;
  }
  return `path("M ${r} ${top} L ${w - r} ${top} ${arc(w, top + r)} L ${w} ${bottom - r} ${arc(w - r, bottom)} L ${x + a} ${bottom} L ${x} ${h} L ${x - a} ${bottom} L ${r} ${bottom} ${arc(0, bottom - r)} L 0 ${top + r} ${arc(r, top)} Z")`;
}

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "long" }).format(
    new Date(`${iso}T12:00:00`),
  );

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), Math.max(min, max));

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
  const [place, setPlace] = useState<Placement | null>(null);
  const { data, isLoading } = useDaySummary(date);

  const items = data?.items ?? [];
  const done = items.filter((it) => it.status === "done");
  const notDone = items.filter((it) => it.status !== "done");
  const planned = progress?.planned ?? items.length;
  const completed = progress?.completed ?? done.length;
  const pct = planned ? Math.round((completed / planned) * 100) : 0;
  const noPlan = !isLoading && !data?.day;

  // Measured after every content change: the card grows when the items arrive,
  // and a stale height would leave it hanging off the bottom of the screen.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;

    // Room for the visible rectangle, i.e. not counting the two tip strips.
    const strips = ARROW_H * 2;
    const roomBelow = vh - BOTTOM_MARGIN - (anchor.bottom + GAP);
    const roomAbove = anchor.top - GAP - TOP_MARGIN;
    // Below unless it genuinely has less room — and whichever side wins, the
    // card is capped to that room instead of hanging off the screen. The list
    // inside scrolls, so a squeezed card is still a whole card.
    const side: Placement["side"] =
      h - strips <= roomBelow || roomBelow >= roomAbove ? "below" : "above";
    const maxHeight =
      Math.max(120, Math.min(MAX_HEIGHT, side === "below" ? roomBelow : roomAbove)) + strips;
    // Pinned by the tip, which sits TIP_GAP short of the square; the reserved
    // strip on the far side is clipped away, so it costs nothing but layout.
    const offset = side === "below" ? anchor.bottom + TIP_GAP : vh - (anchor.top - TIP_GAP);

    const left = clamp(anchor.left + anchor.width / 2 - w / 2, SIDE_MARGIN, vw - SIDE_MARGIN - w);
    const tipX = anchor.left + anchor.width / 2 - left;

    setPlace({
      offset,
      left,
      maxHeight,
      side,
      clipPath: outline(w, Math.min(h, maxHeight), tipX, side),
    });
  }, [anchor, isLoading, items.length]);

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
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Podsumowanie dnia: ${dateLabel(date)}`}
      className={`${GLASS} fixed z-[70] flex flex-col animate-[popIn_.18s_ease_both]`}
      style={{
        top: place?.side === "above" ? undefined : (place?.offset ?? 0),
        bottom: place?.side === "above" ? place.offset : undefined,
        left: place?.left ?? 0,
        width: `min(${WIDTH}px, calc(100vw - ${SIDE_MARGIN * 2}px))`,
        maxHeight: place?.maxHeight ?? MAX_HEIGHT,
        visibility: place ? "visible" : "hidden",
        // Strips top and bottom hold the tip; only the one on the anchored side
        // is ever filled, the other is clipped away.
        paddingTop: ARROW_H,
        paddingBottom: ARROW_H,
        clipPath: place?.clipPath,
        // A clip path cuts away a box-shadow too, so the depth has to come from
        // a filter, which follows the shape — tip included.
        filter: "drop-shadow(0 10px 22px rgba(0,0,0,.55))",
      }}
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
    </div>
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
