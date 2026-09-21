import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { createPortal } from "react-dom";

const COACHMARK_KEY = "tenax:coachmark-done";

export function isCoachmarkDone(): boolean {
  try {
    return localStorage.getItem(COACHMARK_KEY) === "1";
  } catch {
    return false;
  }
}

function markCoachmarkDone() {
  try {
    localStorage.setItem(COACHMARK_KEY, "1");
  } catch {}
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
const TOOLTIP_WIDTH = 280;
const MARGIN = 12;
const TOOLTIP_HEIGHT_EST = 190;

interface StepDef {
  id: number;
  route: string;
  targetIds: string[];
  content: string;
}

const STEPS: StepDef[] = [
  {
    id: 1,
    route: "/",
    targetIds: ["start-day"],
    content:
      "Tu zaczynasz dzień — jednym przyciskiem odhaczasz rutyny i zadania po kolei.",
  },
  {
    id: 2,
    route: "/",
    targetIds: ["progress", "streak"],
    content:
      "Tu widzisz swój poziom i passę — dotknij, żeby zobaczyć statystyki i siatkę nawyków.",
  },
  {
    id: 3,
    route: "/",
    targetIds: ["nav-skupienie"],
    content:
      "A tutaj włączasz blokadę rozpraszaczy, żeby nic nie przerwało Ci planu.",
  },
];

function getElRect(targetId: string): { rect: Rect; borderRadius: string } | null {
  const el = document.querySelector(`[data-tour="${targetId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    rect: { top: r.top, left: r.left, width: r.width, height: r.height },
    borderRadius: cs.borderRadius || "16px",
  };
}

function unionRects(rects: Rect[]): Rect {
  if (rects.length === 1) return rects[0]!;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.left);
    minY = Math.min(minY, r.top);
    maxX = Math.max(maxX, r.left + r.width);
    maxY = Math.max(maxY, r.top + r.height);
  }
  return { top: minY, left: minX, width: maxX - minX, height: maxY - minY };
}

interface TargetInfo {
  rects: { rect: Rect; borderRadius: string }[];
  union: Rect;
  borderRadius: string;
}

const GLASS_BG = "rgba(255,255,255,0.08)";
const GLASS_BORDER = "1.5px solid var(--primary)";
const GLASS_BACKDROP = "blur(20px) saturate(1.4)";
const GLASS_SHADOW = "0 18px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)";

export function Coachmarks({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [searchDone, setSearchDone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const step = STEPS[stepIndex];
  const isLast = stepIndex + 1 >= STEPS.length;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!step?.route) return;
    if (pathname !== step.route) {
      navigate({ to: step.route });
    }
  }, [step, pathname, navigate]);

  useEffect(() => {
    if (!step) {
      setTarget(null);
      setSearchDone(true);
      return;
    }
    const ids = step.targetIds;
    const route = step.route;
    if (!ids.length) {
      setTarget(null);
      setSearchDone(true);
      return;
    }
    if (pathname !== route) return;

    let cancelled = false;
    let attempts = 0;
    setTarget(null);
    setSearchDone(false);

    function tryLocate() {
      if (cancelled) return;
      const results: { rect: Rect; borderRadius: string }[] = [];
      for (const id of ids) {
        const info = getElRect(id);
        if (info) results.push(info);
      }
      if (results.length > 0) {
        const firstEl = document.querySelector(`[data-tour="${ids[0]}"]`);
        if (firstEl) firstEl.scrollIntoView({ block: "center", behavior: "auto" });
        setTimeout(() => {
          if (cancelled) return;
          const fresh: { rect: Rect; borderRadius: string }[] = [];
          for (const id of ids) {
            const info = getElRect(id);
            if (info) fresh.push(info);
          }
          if (fresh.length > 0) {
            const u = unionRects(fresh.map((f) => f.rect));
            const br = fresh.length === 1 ? fresh[0]!.borderRadius : "16px";
            setTarget({ rects: fresh, union: u, borderRadius: br });
          }
          setSearchDone(true);
        }, 80);
        return;
      }
      attempts += 1;
      if (attempts < 80) {
        requestAnimationFrame(tryLocate);
      } else if (!cancelled) {
        if (!isLast) {
          setStepIndex((i) => i + 1);
        } else {
          finish();
        }
      }
    }

    const startTimer = setTimeout(tryLocate, 200);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
    };
  }, [step, pathname]);

  useEffect(() => {
    if (!step) return;
    const ids = step.targetIds;
    if (!ids.length) return;
    function update() {
      const results: { rect: Rect; borderRadius: string }[] = [];
      for (const id of ids) {
        const info = getElRect(id);
        if (info) results.push(info);
      }
      if (results.length > 0) {
        const u = unionRects(results.map((r) => r.rect));
        const br = results.length === 1 ? results[0]!.borderRadius : "16px";
        setTarget({ rects: results, union: u, borderRadius: br });
      }
    }
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);

  function finish() {
    markCoachmarkDone();
    onDone();
  }

  function next() {
    if (isLast) {
      finish();
    } else {
      setTarget(null);
      setSearchDone(false);
      setStepIndex((i) => i + 1);
    }
  }

  if (!mounted || !step) return null;

  const showSpotlight = !!target && searchDone && pathname === step.route;
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const rect = target?.union;

  let tooltipTop: number;
  let arrowAbove: boolean;
  if (showSpotlight && rect) {
    const belowTop = rect.top + rect.height + PAD * 2 + 10;
    if (belowTop + TOOLTIP_HEIGHT_EST <= vh - MARGIN) {
      tooltipTop = belowTop;
      arrowAbove = false;
    } else {
      tooltipTop = rect.top - PAD - 10 - TOOLTIP_HEIGHT_EST;
      arrowAbove = true;
    }
    tooltipTop = Math.max(
      MARGIN,
      Math.min(tooltipTop, vh - TOOLTIP_HEIGHT_EST - MARGIN),
    );
  } else {
    tooltipTop = vh / 2 - TOOLTIP_HEIGHT_EST / 2;
    arrowAbove = false;
  }

  const tooltipLeft = showSpotlight && rect
    ? Math.min(
        Math.max(MARGIN, rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2),
        vw - TOOLTIP_WIDTH - MARGIN,
      )
    : vw / 2 - TOOLTIP_WIDTH / 2;

  const arrowTargets = showSpotlight && target
    ? target.rects.map((t) => {
        const cx = t.rect.left + t.rect.width / 2;
        return Math.min(Math.max(16, cx - tooltipLeft), TOOLTIP_WIDTH - 16);
      })
    : [TOOLTIP_WIDTH / 2];

  const overlay = (
    <>
      <div className="fixed inset-0 z-[94]" />

      {showSpotlight && rect ? (
        <div
          className="fixed z-[95] transition-all duration-200 ease-out"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: target.borderRadius,
            border: "2px solid var(--primary)",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[95] bg-black/65" />
      )}

      <div
        className="fixed z-[96] rounded-2xl p-4 text-card-foreground transition-all duration-200 ease-out"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: TOOLTIP_WIDTH,
          background: GLASS_BG,
          border: GLASS_BORDER,
          backdropFilter: GLASS_BACKDROP,
          WebkitBackdropFilter: GLASS_BACKDROP,
          boxShadow: GLASS_SHADOW,
        }}
      >
        {showSpotlight &&
          arrowTargets.map((arrowLeft, i) => (
            <div
              key={i}
              className="absolute h-3 w-3 rotate-45"
              style={{
                background: GLASS_BG,
                backdropFilter: GLASS_BACKDROP,
                WebkitBackdropFilter: GLASS_BACKDROP,
                ...(arrowAbove
                  ? {
                      left: arrowLeft - 6,
                      bottom: -7,
                      borderRight: GLASS_BORDER,
                      borderBottom: GLASS_BORDER,
                    }
                  : {
                      left: arrowLeft - 6,
                      top: -7,
                      borderLeft: GLASS_BORDER,
                      borderTop: GLASS_BORDER,
                    }),
              }}
            />
          ))}

        <p className="relative text-[14px] leading-snug">{step.content}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={finish}
            className="min-h-[40px] px-2 text-[13px] text-muted-foreground"
          >
            Pomiń
          </button>
          <button
            type="button"
            onClick={next}
            className="accent-gradient min-h-[40px] rounded-full px-4 text-[13.5px] font-bold text-primary-foreground transition-transform active:scale-[0.97]"
          >
            {isLast ? "Gotowe" : "Dalej"}
          </button>
        </div>

        <div className="mt-2.5 text-center text-[11px] text-muted-foreground">
          {step.id} z {STEPS.length}
        </div>
      </div>
    </>
  );

  return createPortal(overlay, document.body);
}
