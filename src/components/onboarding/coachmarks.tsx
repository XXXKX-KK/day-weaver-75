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

const STEPS = [
  {
    id: 1,
    route: "/",
    targetId: "start-day",
    content:
      "Tu zaczynasz dzień — jednym przyciskiem odhaczasz rutyny i zadania po kolei.",
  },
  {
    id: 2,
    route: "/",
    targetId: "progress",
    content:
      "Tu widzisz swój poziom i passę — dotknij, żeby zobaczyć statystyki i siatkę nawyków.",
  },
  {
    id: 3,
    route: "/",
    targetId: "nav-skupienie",
    content:
      "A tutaj włączasz blokadę rozpraszaczy, żeby nic nie przerwało Ci planu.",
  },
];

function getTargetRect(targetId: string): Rect | null {
  const el = document.querySelector(`[data-tour="${targetId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function Coachmarks({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
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
    if (!step?.targetId) {
      setRect(null);
      setSearchDone(true);
      return;
    }
    if (pathname !== step.route) return;

    let cancelled = false;
    let attempts = 0;
    setRect(null);
    setSearchDone(false);

    function tryLocate() {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${step.targetId}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "auto" });
        setTimeout(() => {
          if (!cancelled) {
            setRect(getTargetRect(step.targetId));
            setSearchDone(true);
          }
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
    if (!step?.targetId) return;
    function update() {
      setRect(getTargetRect(step.targetId));
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
      setRect(null);
      setSearchDone(false);
      setStepIndex((i) => i + 1);
    }
  }

  if (!mounted || !step) return null;

  const showSpotlight = !!rect && searchDone && pathname === step.route;
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  let tooltipTop: number;
  let arrowAbove: boolean;
  if (showSpotlight) {
    const belowTop = rect!.top + rect!.height + PAD * 2 + 10;
    if (belowTop + TOOLTIP_HEIGHT_EST <= vh - MARGIN) {
      tooltipTop = belowTop;
      arrowAbove = false;
    } else {
      tooltipTop = rect!.top - PAD - 10 - TOOLTIP_HEIGHT_EST;
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

  const tooltipLeft = showSpotlight
    ? Math.min(
        Math.max(MARGIN, rect!.left + rect!.width / 2 - TOOLTIP_WIDTH / 2),
        vw - TOOLTIP_WIDTH - MARGIN,
      )
    : vw / 2 - TOOLTIP_WIDTH / 2;

  const arrowLeft = showSpotlight
    ? Math.min(
        Math.max(16, rect!.left + rect!.width / 2 - tooltipLeft),
        TOOLTIP_WIDTH - 16,
      )
    : TOOLTIP_WIDTH / 2;

  const overlay = (
    <>
      {/* Blocks interaction with the rest of the app */}
      <div className="fixed inset-0 z-[94]" />

      {showSpotlight ? (
        <div
          className="fixed z-[95] rounded-2xl transition-all duration-200 ease-out"
          style={{
            top: rect!.top - PAD,
            left: rect!.left - PAD,
            width: rect!.width + PAD * 2,
            height: rect!.height + PAD * 2,
            border: "2px solid var(--primary)",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[95] bg-black/65" />
      )}

      <div
        className="fixed z-[96] rounded-2xl bg-card/80 p-4 text-card-foreground shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-200 ease-out"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: TOOLTIP_WIDTH,
          border: "1.5px solid var(--primary)",
        }}
      >
        {showSpotlight && (
          <div
            className="absolute h-3 w-3 rotate-45 bg-card/80 backdrop-blur-xl"
            style={
              arrowAbove
                ? {
                    left: arrowLeft - 6,
                    bottom: -7,
                    borderRight: "1.5px solid var(--primary)",
                    borderBottom: "1.5px solid var(--primary)",
                  }
                : {
                    left: arrowLeft - 6,
                    top: -7,
                    borderLeft: "1.5px solid var(--primary)",
                    borderTop: "1.5px solid var(--primary)",
                  }
            }
          />
        )}

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
