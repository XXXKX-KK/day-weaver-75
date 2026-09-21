import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, ListChecks, Settings, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useAnimationControls } from "framer-motion";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Dziś", icon: CalendarDays },
  { to: "/zadania", label: "Zadania", icon: ListChecks },
  { to: "/skupienie", label: "Skupienie", icon: ShieldCheck },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings },
] as const;

const NAV_INTRO_KEY = "tenax:nav-intro-done";

function isIntroPlayed(): boolean {
  try {
    return sessionStorage.getItem(NAV_INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroPlayed() {
  try {
    sessionStorage.setItem(NAV_INTRO_KEY, "1");
  } catch {}
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/**
 * Collapses the pill on scroll-down, expands on scroll-up / near the top.
 * SSR-safe: window is only touched inside the effect. `expand()` forces the
 * expanded state (used on tab tap). Honours prefers-reduced-motion.
 *
 * Our app scrolls the window (no inner scroll container), so this listens to
 * window rather than a scrollRef.
 */
function useNavCollapse(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lastY.current = window.scrollY;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (reduced.current || y < 12) {
          setCollapsed(false);
        } else if (y - lastY.current > 6 && y > 24) {
          setCollapsed(true);
        } else if (lastY.current - y > 6) {
          setCollapsed(false);
        }
        lastY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return [collapsed, () => setCollapsed(false)];
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, expand] = useNavCollapse();
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useReducedMotion();

  const shouldAnimate = useRef(false);
  const [introPhase, setIntroPhase] = useState<
    "idle" | "dropping" | "impact" | "drawing" | "revealing" | "done"
  >("idle");

  useEffect(() => {
    setMounted(true);
    if (!isIntroPlayed() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shouldAnimate.current = true;
      setIntroPhase("dropping");
      markIntroPlayed();
    } else {
      setIntroPhase("done");
    }
  }, []);

  const activeIndex = Math.max(
    0,
    tabs.findIndex(({ to }) =>
      to === "/" ? pathname === "/" || pathname.startsWith("/dzien") : pathname.startsWith(to),
    ),
  );

  if (!mounted) return null;

  const introDone = introPhase === "done";
  const showDot =
    introPhase === "dropping" || introPhase === "impact";
  const showPill =
    introPhase === "drawing" || introPhase === "revealing" || introPhase === "done";

  const bottomOffset = "calc(env(safe-area-inset-bottom, 0px) + 12px)";

  return createPortal(
    <>
      {/* ─── Phase 1 & 2: Falling accent dot ─── */}
      {showDot && (
        <motion.div
          className="fixed left-1/2 z-50"
          style={{ bottom: bottomOffset }}
          initial={{ y: "-100vh", x: "-50%", scale: 1 }}
          animate={
            introPhase === "dropping"
              ? {
                  y: 0,
                  x: "-50%",
                  scale: 1,
                  transition: {
                    y: { duration: 0.5, ease: [0.5, 0, 0.75, 0] },
                  },
                }
              : introPhase === "impact"
                ? {
                    y: 0,
                    x: "-50%",
                    scaleY: [0.6, 1.15, 1],
                    scaleX: [1.4, 0.9, 1],
                    transition: {
                      duration: 0.35,
                      ease: "easeOut",
                    },
                  }
                : undefined
          }
          onAnimationComplete={() => {
            if (introPhase === "dropping") {
              setIntroPhase("impact");
            } else if (introPhase === "impact") {
              setIntroPhase("drawing");
            }
          }}
        >
          <div
            className="h-4 w-4 rounded-full"
            style={{
              background: "var(--primary)",
              boxShadow: "0 0 16px 4px color-mix(in oklab, var(--primary) 60%, transparent)",
            }}
          />
        </motion.div>
      )}

      {/* ─── Phase 3 & 4: Nav pill drawing + icon reveal ─── */}
      {showPill && (
        <NavPill
          collapsed={collapsed}
          expand={expand}
          activeIndex={activeIndex}
          introPhase={introPhase}
          onDrawComplete={() => setIntroPhase("revealing")}
          onRevealComplete={() => setIntroPhase("done")}
          introDone={introDone}
        />
      )}
    </>,
    document.body,
  );
}

function NavPill({
  collapsed,
  expand,
  activeIndex,
  introPhase,
  onDrawComplete,
  onRevealComplete,
  introDone,
}: {
  collapsed: boolean;
  expand: () => void;
  activeIndex: number;
  introPhase: string;
  onDrawComplete: () => void;
  onRevealComplete: () => void;
  introDone: boolean;
}) {
  const pillControls = useAnimationControls();
  const isDrawing = introPhase === "drawing";
  const isRevealing = introPhase === "revealing";

  useEffect(() => {
    if (!isDrawing) return;
    const run = async () => {
      await pillControls.start({
        scaleX: 1,
        opacity: 1,
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      });
      onDrawComplete();
    };
    void run();
  }, [isDrawing, pillControls, onDrawComplete]);

  const bottomOffset = "calc(env(safe-area-inset-bottom, 0px) + 12px)";

  return (
    <motion.nav
      aria-label="Nawigacja główna"
      className="fixed z-40 flex items-stretch rounded-full"
      initial={
        introDone
          ? false
          : { scaleX: 0, opacity: 0 }
      }
      animate={pillControls}
      style={{
        bottom: bottomOffset,
        left: collapsed ? "12%" : "12px",
        right: collapsed ? "12%" : "12px",
        background: "var(--navpill)",
        border: "1px solid var(--navpill-border)",
        boxShadow: "inset 0 1px 0 var(--navpill-top), 0 8px 32px rgba(0,0,0,0.35)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        transformOrigin: "center center",
        transition: introDone
          ? "left 220ms ease-out, right 220ms ease-out"
          : undefined,
      }}
    >
      {/* Sliding highlight behind the active tab */}
      <div
        className="pointer-events-none absolute inset-y-[6px] left-0 rounded-full transition-transform duration-300 ease-out"
        style={{
          width: `${100 / tabs.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
          background: "color-mix(in oklab, var(--primary) 28%, transparent)",
          border: "1px solid color-mix(in oklab, var(--primary) 50%, transparent)",
          opacity: introDone || isRevealing ? 1 : 0,
          transition: "transform 300ms ease-out, opacity 200ms ease-out",
        }}
      />
      {tabs.map(({ to, label, icon: Icon }, i) => {
        const active = i === activeIndex;
        return (
          <Link
            key={to}
            to={to}
            aria-label={label}
            onClick={expand}
            {...(to === "/skupienie" ? { "data-tour": "nav-skupienie" } : {})}
            className={cn(
              "relative z-10 flex flex-1 flex-col items-center justify-center gap-1 rounded-full",
              "transition-[height] duration-[220ms] ease-out",
              collapsed ? "h-10" : "h-[54px]",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <motion.div
              className="flex flex-col items-center gap-1"
              initial={introDone ? false : { opacity: 0, y: 8 }}
              animate={
                isRevealing || introDone
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 8 }
              }
              transition={{
                duration: 0.3,
                delay: isRevealing ? i * 0.07 : 0,
                ease: "easeOut",
              }}
              onAnimationComplete={() => {
                if (isRevealing && i === tabs.length - 1) {
                  onRevealComplete();
                }
              }}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 1.9} />
              <span
                className={cn(
                  "overflow-hidden text-[10px] font-medium leading-none transition-all duration-[220ms] ease-out",
                  collapsed ? "max-h-0 opacity-0" : "max-h-4 opacity-100",
                )}
              >
                {label}
              </span>
            </motion.div>
          </Link>
        );
      })}
    </motion.nav>
  );
}
