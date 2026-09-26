import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useUpdateProfile } from "@/lib/profile";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TOOLTIP_WIDTH = 280;
/** Margines od krawędzi ekranu (poza bezpiecznym obszarem, ten dokłada CSS). */
const MARGIN = 12;
/** Odstęp między pierścieniem podświetlenia a dymkiem. */
const GAP = 14;
/** Szczelina między elementem a pierścieniem i grubość samego pierścienia. */
const RING_GAP = 3;
const RING_WIDTH = 1.5;
const ARROW = 13;

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
      "Tu zaczynasz dzień. Jeden przycisk układa plan z rutyn i zadań, a potem prowadzi Cię po kolei.",
  },
  {
    id: 2,
    route: "/",
    targetIds: ["progress", "streak"],
    content: "Tu widzisz poziom i passę. Dotknij, żeby zobaczyć statystyki i siatkę dni.",
  },
  {
    id: 3,
    route: "/",
    targetIds: ["nav-skupienie"],
    content:
      "Tu włączasz blokadę rozpraszaczy. Wybierasz aplikacje, które mają poczekać, aż skończysz.",
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
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.left);
    minY = Math.min(minY, r.top);
    maxX = Math.max(maxX, r.left + r.width);
    maxY = Math.max(maxY, r.top + r.height);
  }
  return { top: minY, left: minX, width: maxX - minX, height: maxY - minY };
}

/**
 * Zaokrąglenie pierścienia. Przy jednym celu bierzemy je wprost z elementu
 * (pigułka zostaje pigułką, karta kartą). Przy kilku celach — wspólne, jeśli
 * wszystkie mają to samo; inaczej łagodny kompromis, bo prostokąt obejmujący
 * dwie różne rzeczy i tak nie jest kształtem żadnej z nich.
 */
function ringRadius(items: { borderRadius: string }[]): string {
  if (items.length === 0) return "16px";
  const first = items[0]!.borderRadius;
  return items.every((i) => i.borderRadius === first) ? first : "16px";
}

interface TargetInfo {
  rects: { rect: Rect; borderRadius: string }[];
  union: Rect;
  borderRadius: string;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), Math.max(min, max));

export function Coachmarks({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [searchDone, setSearchDone] = useState(false);
  const [mounted, setMounted] = useState(false);
  /** Prawdziwa wysokość dymka. Liczona z pomiaru, nie z szacunku — przy
   *  szacunku dymek potrafił wjechać na podświetlenie albo za ekran. */
  const [cardHeight, setCardHeight] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const updateProfile = useUpdateProfile();

  const step = STEPS[stepIndex];
  const isLast = stepIndex + 1 >= STEPS.length;
  const showSpotlight = !!target && searchDone && !!step && pathname === step.route;

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
            setTarget({
              rects: fresh,
              union: unionRects(fresh.map((f) => f.rect)),
              borderRadius: ringRadius(fresh),
            });
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
        setTarget({
          rects: results,
          union: unionRects(results.map((r) => r.rect)),
          borderRadius: ringRadius(results),
        });
      }
    }
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);

  // Pomiar dymka. ResizeObserver, bo tekst kroku zmienia wysokość, a przy
  // wąskim ekranie zawija się na inną liczbę linii.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCardHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted, stepIndex, showSpotlight]);

  function finish() {
    updateProfile.mutate({ coachmark_done: true });
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

  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const rect = target?.union;

  // Zewnętrzna krawędź pierścienia — od niej liczy się odstęp dymka, więc
  // dymek nie ma jak wejść na podświetlenie.
  const ringOut = RING_GAP + RING_WIDTH;
  const spotTop = rect ? rect.top - ringOut : 0;
  const spotBottom = rect ? rect.top + rect.height + ringOut : 0;

  const roomBelow = vh - spotBottom - GAP - MARGIN;
  const roomAbove = spotTop - GAP - MARGIN;
  const below = !rect || cardHeight <= roomBelow || roomBelow >= roomAbove;

  const tooltipTop =
    showSpotlight && rect
      ? below
        ? spotBottom + GAP
        : spotTop - GAP - cardHeight
      : vh / 2 - cardHeight / 2;

  const tooltipLeft =
    showSpotlight && rect
      ? clamp(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, MARGIN, vw - TOOLTIP_WIDTH - MARGIN)
      : vw / 2 - TOOLTIP_WIDTH / 2;

  // Jeden dziobek na krok, wycelowany w środek całego podświetlenia — także
  // wtedy, gdy krok obejmuje dwa elementy naraz.
  const arrowLeft =
    showSpotlight && rect
      ? clamp(rect.left + rect.width / 2 - tooltipLeft, 18, TOOLTIP_WIDTH - 18)
      : TOOLTIP_WIDTH / 2;

  const surface = "var(--popover)";
  const edge = `${RING_WIDTH}px solid var(--primary)`;

  const overlay = (
    <>
      <div className="fixed inset-0 z-[94]" />

      {showSpotlight && rect ? (
        <div
          className="fixed z-[95] transition-all duration-200 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            // Pierścień idzie po kształcie elementu, ze szczeliną w kolorze tła:
            // najpierw przerwa, potem akcent, na końcu przyciemnienie reszty.
            borderRadius: target.borderRadius,
            boxShadow: `0 0 0 ${RING_GAP}px var(--background), 0 0 0 ${ringOut}px var(--primary), 0 0 0 9999px rgba(0,0,0,0.65)`,
            pointerEvents: "none",
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[95] bg-black/65" />
      )}

      <div
        ref={cardRef}
        className="fixed z-[96] rounded-2xl p-4 text-card-foreground transition-all duration-200 ease-out"
        style={{
          // JS liczy miejsce, a CSS pilnuje bezpiecznego obszaru: clamp z env()
          // rozstrzyga się dopiero przy malowaniu, więc zna prawdziwy notch.
          top: `clamp(calc(env(safe-area-inset-top, 0px) + ${MARGIN}px), ${Math.round(tooltipTop)}px, calc(100dvh - env(safe-area-inset-bottom, 0px) - ${MARGIN}px - ${cardHeight}px))`,
          left: tooltipLeft,
          width: TOOLTIP_WIDTH,
          background: surface,
          border: edge,
          boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
        }}
      >
        {showSpotlight && (
          <span
            aria-hidden
            className="absolute h-[13px] w-[13px] rotate-45"
            style={{
              left: arrowLeft - ARROW / 2,
              // Wchodzi pod krawędź dymka i zamalowuje jej odcinek swoim tłem,
              // więc dziobek i ramka czytają się jako jeden kształt.
              ...(below
                ? { top: -ARROW / 2 - 1, borderLeft: edge, borderTop: edge }
                : { bottom: -ARROW / 2 - 1, borderRight: edge, borderBottom: edge }),
              background: surface,
            }}
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
            className="min-h-[40px] rounded-full px-4 text-[13.5px] font-bold text-primary-foreground transition-transform active:scale-[0.97]"
            style={{ background: "var(--primary)" }}
          >
            {isLast ? "Gotowe" : "Dalej"}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: i === stepIndex ? 18 : 6,
                background:
                  i === stepIndex
                    ? "var(--primary)"
                    : "color-mix(in oklab, var(--foreground) 22%, transparent)",
              }}
            />
          ))}
        </div>
      </div>
    </>
  );

  return createPortal(overlay, document.body);
}
