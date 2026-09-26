import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useUpdateProfile } from "@/lib/profile";
import { GlassPopover } from "@/components/ui/glass-popover";

/**
 * Samouczek: przyciemniony ekran, podświetlony cel i jedna tafla z tekstem.
 *
 * Tafla to ten sam `GlassPopover`, co karta dnia w Statystykach — jeden dziobek
 * wycięty z tafli, pozycja z pomiaru, obwódka w kolorze akcentu. Tu dochodzi
 * tylko podświetlenie celu: pierścień o zaokrągleniu wziętym z samego elementu,
 * ze szczeliną, żeby było widać, co jest pokazywane.
 */

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TOOLTIP_WIDTH = 280;
/** Szczelina między elementem a pierścieniem i grubość samego pierścienia. */
const RING_GAP = 3;
const RING_WIDTH = 1.5;
/** Odstęp między pierścieniem a taflą — ten sam co w karcie dnia. */
const GAP = 15;
const MARGIN = 12;

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
      "Tu włączasz blokadę rozpraszaczy. Wybierasz aplikacje, które mają poczekać, aż skończysz pracę.",
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
  union: Rect;
  borderRadius: string;
}

export function Coachmarks({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [searchDone, setSearchDone] = useState(false);
  const [mounted, setMounted] = useState(false);
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

    function collect(): { rect: Rect; borderRadius: string }[] {
      const out: { rect: Rect; borderRadius: string }[] = [];
      for (const id of ids) {
        const info = getElRect(id);
        if (info) out.push(info);
      }
      return out;
    }

    function tryLocate() {
      if (cancelled) return;
      if (collect().length > 0) {
        const firstEl = document.querySelector(`[data-tour="${ids[0]}"]`);
        if (firstEl) firstEl.scrollIntoView({ block: "center", behavior: "auto" });
        setTimeout(() => {
          if (cancelled) return;
          const fresh = collect();
          if (fresh.length > 0) {
            setTarget({
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

  const rect = target?.union;
  // Tafla trzyma się zewnętrznej krawędzi pierścienia, nie samego elementu,
  // więc dziobek nigdy nie wchodzi w podświetlenie.
  const ringOut = RING_GAP + RING_WIDTH;
  const popoverAnchor = rect
    ? {
        top: rect.top - ringOut,
        left: rect.left - ringOut,
        width: rect.width + ringOut * 2,
        height: rect.height + ringOut * 2,
      }
    : null;

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

      {showSpotlight && popoverAnchor && (
        <GlassPopover
          anchor={popoverAnchor}
          width={TOOLTIP_WIDTH}
          maxHeight={320}
          minHeight={80}
          gap={GAP}
          margins={{ side: MARGIN, top: MARGIN, bottom: MARGIN }}
          zIndex={96}
          role="dialog"
          aria-live="polite"
        >
          <div className="px-4 pb-3 pt-3">
            <p className="text-[14px] leading-snug text-foreground">{step.content}</p>

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
        </GlassPopover>
      )}
    </>
  );

  return createPortal(overlay, document.body);
}
