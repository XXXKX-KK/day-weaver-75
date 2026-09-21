import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, ListChecks, Settings, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Dziś", icon: CalendarDays },
  { to: "/zadania", label: "Zadania", icon: ListChecks },
  { to: "/skupienie", label: "Skupienie", icon: ShieldCheck },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings },
] as const;

function useNavCollapse(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
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

type IntroPhase =
  | "waiting"
  | "dropping"
  | "impact"
  | "border-draw"
  | "radial-fill"
  | "icons-pop"
  | "labels-slide"
  | "done";

function getPillPerimeter(w: number, h: number): number {
  const r = h / 2;
  return 2 * (w - 2 * r) + 2 * Math.PI * r;
}

function getPillPath(w: number, h: number): string {
  const r = h / 2;
  const cx = w / 2;
  return [
    `M ${cx} ${h}`,
    `L ${r} ${h}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    `L ${cx} 0`,
    `M ${cx} ${h}`,
    `L ${w - r} ${h}`,
    `A ${r} ${r} 0 0 0 ${w - r} 0`,
    `L ${cx} 0`,
  ].join(" ");
}

export function BottomNav({ ready }: { ready: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, expand] = useNavCollapse();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<IntroPhase>("waiting");
  const reducedMotion = useRef(false);
  const pillRef = useRef<HTMLElement | null>(null);
  const [pillSize, setPillSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    setMounted(true);
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion.current) {
      setPhase("done");
    }
  }, []);

  useEffect(() => {
    if (!ready || reducedMotion.current) return;
    if (phase !== "waiting") return;
    setPhase("dropping");
  }, [ready, phase]);

  const measurePill = useCallback(() => {
    if (pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      setPillSize({ w: rect.width, h: rect.height });
    }
  }, []);

  useEffect(() => {
    if (phase === "radial-fill" && pillRef.current) {
      const el = pillRef.current;
      el.style.setProperty("--hole", "78%");
      requestAnimationFrame(() => {
        el.style.transition = "--hole 0.32s ease-in-out";
        el.style.setProperty("--hole", "0%");
      });

      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== "--hole") return;
        el.style.removeProperty("--hole");
        el.style.transition = "";
        el.style.mask = "";
        el.style.webkitMask = "";
        setPhase("icons-pop");
      };
      el.addEventListener("transitionend", onEnd);
      return () => el.removeEventListener("transitionend", onEnd);
    }
  }, [phase]);

  const activeIndex = Math.max(
    0,
    tabs.findIndex(({ to }) =>
      to === "/"
        ? pathname === "/" || pathname.startsWith("/dzien")
        : pathname.startsWith(to),
    ),
  );

  if (!mounted) return null;

  const bottom = "calc(env(safe-area-inset-bottom, 0px) + 12px)";
  const introDone = phase === "done";
  const showPill =
    phase !== "waiting" && phase !== "dropping" && phase !== "impact";
  const perimeter =
    pillSize.w > 0 ? getPillPerimeter(pillSize.w, pillSize.h) : 600;
  const pillPath =
    pillSize.w > 0 ? getPillPath(pillSize.w, pillSize.h) : "";

  return createPortal(
    <>
      {/* ── Step 1: Falling dot + bounce ── */}
      <AnimatePresence>
        {(phase === "dropping" || phase === "impact") && (
          <motion.div
            className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2"
            style={{ bottom }}
            initial={{ y: "-100vh" }}
            animate={
              phase === "dropping"
                ? {
                    y: 0,
                    transition: {
                      duration: 0.28,
                      ease: [0.55, 0, 1, 0],
                    },
                  }
                : { y: 0 }
            }
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            onAnimationComplete={() => {
              if (phase === "dropping") setPhase("impact");
            }}
          >
            <motion.div
              className="h-3 w-3 rounded-full"
              style={{
                background: "var(--primary)",
                boxShadow: "0 0 12px var(--primary)",
              }}
              animate={
                phase === "impact"
                  ? {
                      scaleX: [1, 1.8, 1],
                      scaleY: [1, 0.4, 1],
                      transition: { duration: 0.08, ease: "easeOut" },
                    }
                  : {}
              }
              onAnimationComplete={() => {
                if (phase === "impact") setPhase("border-draw");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Steps 2–6: Pill with border draw, fill, icons, labels ── */}
      {showPill && (
        <nav
          ref={(el) => {
            pillRef.current = el;
          }}
          aria-label="Nawigacja główna"
          className={cn(
            "fixed z-40 flex items-stretch rounded-full",
            introDone && "transition-[left,right] duration-[220ms] ease-out",
          )}
          style={{
            bottom,
            left: collapsed ? "12%" : "12px",
            right: collapsed ? "12%" : "12px",
            background:
              phase === "border-draw" ? "transparent" : "var(--navpill)",
            border:
              phase === "border-draw"
                ? "1px solid transparent"
                : "1px solid var(--navpill-border)",
            boxShadow:
              phase === "border-draw"
                ? "none"
                : "inset 0 1px 0 var(--navpill-top), 0 8px 32px rgba(0,0,0,0.35)",
            backdropFilter:
              phase === "border-draw" ? "none" : "blur(28px) saturate(180%)",
            WebkitBackdropFilter:
              phase === "border-draw" ? "none" : "blur(28px) saturate(180%)",
            ...(phase === "radial-fill"
              ? {
                  mask: "radial-gradient(circle at center, transparent var(--hole), #000 calc(var(--hole) + 3%))",
                  WebkitMask:
                    "radial-gradient(circle at center, transparent var(--hole), #000 calc(var(--hole) + 3%))",
                }
              : {}),
          }}
        >
          <PillMeasurer onMeasure={measurePill} phase={phase} />

          {/* Step 2: SVG border draw from bottom-center outward */}
          {phase === "border-draw" && pillSize.w > 0 && (
            <svg
              className="pointer-events-none absolute inset-0 z-50"
              width={pillSize.w}
              height={pillSize.h}
              viewBox={`0 0 ${pillSize.w} ${pillSize.h}`}
              style={{ overflow: "visible" }}
            >
              <motion.path
                d={pillPath}
                fill="none"
                stroke="var(--navpill-border)"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeDasharray={perimeter / 2}
                initial={{ strokeDashoffset: perimeter / 2 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{
                  duration: 0.26,
                  ease: [0.4, 0, 0.2, 1],
                }}
                onAnimationComplete={() => {
                  if (phase === "border-draw") setPhase("radial-fill");
                }}
              />
            </svg>
          )}

          {/* Sliding highlight behind active tab */}
          <div
            className="pointer-events-none absolute inset-y-[6px] left-0 rounded-full transition-transform duration-300 ease-out"
            style={{
              width: `${100 / tabs.length}%`,
              transform: `translateX(${activeIndex * 100}%)`,
              background:
                "color-mix(in oklab, var(--primary) 28%, transparent)",
              border:
                "1px solid color-mix(in oklab, var(--primary) 50%, transparent)",
              opacity:
                phase === "icons-pop" ||
                phase === "labels-slide" ||
                introDone
                  ? 1
                  : 0,
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
                {...(to === "/skupienie"
                  ? { "data-tour": "nav-skupienie" }
                  : {})}
                className={cn(
                  "relative z-10 flex flex-1 flex-col items-center justify-center gap-1 rounded-full",
                  "transition-[height] duration-[220ms] ease-out",
                  collapsed ? "h-10" : "h-[54px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <TabContent
                  icon={Icon}
                  label={label}
                  active={active}
                  collapsed={collapsed}
                  phase={phase}
                  index={i}
                  onLastIconPopped={() => setPhase("labels-slide")}
                  onLastLabelSlid={() => setPhase("done")}
                />
              </Link>
            );
          })}
        </nav>
      )}
    </>,
    document.body,
  );
}

function PillMeasurer({
  onMeasure,
  phase,
}: {
  onMeasure: () => void;
  phase: IntroPhase;
}) {
  const measured = useRef(false);
  useEffect(() => {
    if (phase === "border-draw" && !measured.current) {
      measured.current = true;
      requestAnimationFrame(onMeasure);
    }
  }, [phase, onMeasure]);
  return null;
}

function TabContent({
  icon: Icon,
  label,
  active,
  collapsed,
  phase,
  index,
  onLastIconPopped,
  onLastLabelSlid,
}: {
  icon: (typeof tabs)[number]["icon"];
  label: string;
  active: boolean;
  collapsed: boolean;
  phase: IntroPhase;
  index: number;
  onLastIconPopped: () => void;
  onLastLabelSlid: () => void;
}) {
  const introDone = phase === "done";
  const showIcon =
    phase === "icons-pop" || phase === "labels-slide" || introDone;
  const showLabel = phase === "labels-slide" || introDone;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Step 4: Icons pop L→R */}
      <motion.div
        initial={introDone ? false : { scale: 0 }}
        animate={showIcon ? { scale: 1 } : introDone ? { scale: 1 } : { scale: 0 }}
        transition={{
          duration: 0.15,
          delay: phase === "icons-pop" ? index * 0.055 : 0,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        onAnimationComplete={() => {
          if (phase === "icons-pop" && index === tabs.length - 1) {
            onLastIconPopped();
          }
        }}
      >
        <Icon className="size-5" strokeWidth={active ? 2.4 : 1.9} />
      </motion.div>

      {/* Step 5: Labels slide up */}
      <motion.span
        className={cn(
          "overflow-hidden text-[10px] font-medium leading-none transition-all duration-[220ms] ease-out",
          collapsed ? "max-h-0 opacity-0" : "max-h-4 opacity-100",
        )}
        initial={introDone ? false : { y: 8, opacity: 0 }}
        animate={
          showLabel
            ? { y: 0, opacity: 1 }
            : introDone
              ? { y: 0, opacity: 1 }
              : { y: 8, opacity: 0 }
        }
        transition={{
          duration: 0.12,
          delay: phase === "labels-slide" ? index * 0.04 : 0,
          ease: "easeOut",
        }}
        onAnimationComplete={() => {
          if (phase === "labels-slide" && index === tabs.length - 1) {
            onLastLabelSlid();
          }
        }}
      >
        {label}
      </motion.span>
    </div>
  );
}
