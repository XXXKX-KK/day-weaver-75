import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, ListChecks, Settings, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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

type IntroPhase = "waiting" | "dropping" | "impact" | "expanding" | "revealing" | "done";

export function BottomNav({ ready }: { ready: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, expand] = useNavCollapse();
  const [mounted, setMounted] = useState(false);

  const wantsIntro = useRef<boolean | null>(null);
  const [phase, setPhase] = useState<IntroPhase>("waiting");

  useEffect(() => {
    setMounted(true);
    if (!isIntroPlayed() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wantsIntro.current = true;
    } else {
      wantsIntro.current = false;
      setPhase("done");
    }
  }, []);

  useEffect(() => {
    if (!ready || wantsIntro.current !== true) return;
    if (phase !== "waiting") return;
    markIntroPlayed();
    setPhase("dropping");
  }, [ready, phase]);

  const activeIndex = Math.max(
    0,
    tabs.findIndex(({ to }) =>
      to === "/" ? pathname === "/" || pathname.startsWith("/dzien") : pathname.startsWith(to),
    ),
  );

  if (!mounted) return null;

  const bottom = "calc(env(safe-area-inset-bottom, 0px) + 12px)";
  const introDone = phase === "done";

  return createPortal(
    <>
      {/* ── Step 1: Falling dot ── */}
      <AnimatePresence>
        {(phase === "dropping" || phase === "impact") && (
          <motion.div
            className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2"
            style={{ bottom }}
            initial={{ y: "-100vh" }}
            animate={
              phase === "dropping"
                ? { y: 0, transition: { duration: 0.35, ease: [0.55, 0, 1, 0] } }
                : { y: 0 }
            }
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            onAnimationComplete={() => {
              if (phase === "dropping") setPhase("impact");
            }}
          >
            {/* ── Step 2: Squish on impact ── */}
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
                      transition: { duration: 0.12, ease: "easeOut" },
                    }
                  : {}
              }
              onAnimationComplete={() => {
                if (phase === "impact") setPhase("expanding");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step 3 & 4: Expanding pill + icon fade-in ── */}
      {(phase === "expanding" || phase === "revealing" || introDone) && (
        <nav
          aria-label="Nawigacja główna"
          className={cn(
            "fixed z-40 flex items-stretch rounded-full",
            introDone && "transition-[left,right] duration-[220ms] ease-out",
          )}
          style={{
            bottom,
            left: collapsed ? "12%" : "12px",
            right: collapsed ? "12%" : "12px",
            background: "var(--navpill)",
            border: "1px solid var(--navpill-border)",
            boxShadow: "inset 0 1px 0 var(--navpill-top), 0 8px 32px rgba(0,0,0,0.35)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
          }}
        >
          {/* Clip container for the expanding width animation */}
          <ExpandingShell
            phase={phase}
            onExpandDone={() => setPhase("revealing")}
          >
            {/* Sliding highlight behind the active tab */}
            <div
              className="pointer-events-none absolute inset-y-[6px] left-0 rounded-full transition-transform duration-300 ease-out"
              style={{
                width: `${100 / tabs.length}%`,
                transform: `translateX(${activeIndex * 100}%)`,
                background: "color-mix(in oklab, var(--primary) 28%, transparent)",
                border: "1px solid color-mix(in oklab, var(--primary) 50%, transparent)",
                opacity: phase === "revealing" || introDone ? 1 : 0,
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
                  {/* ── Step 4: Staggered icon/label fade-in ── */}
                  <TabContent
                    icon={Icon}
                    label={label}
                    active={active}
                    collapsed={collapsed}
                    phase={phase}
                    index={i}
                    onLastRevealed={() => setPhase("done")}
                  />
                </Link>
              );
            })}
          </ExpandingShell>
        </nav>
      )}
    </>,
    document.body,
  );
}

function ExpandingShell({
  phase,
  onExpandDone,
  children,
}: {
  phase: IntroPhase;
  onExpandDone: () => void;
  children: React.ReactNode;
}) {
  const isExpanding = phase === "expanding";
  const introDone = phase === "done";

  return (
    <motion.div
      className="flex w-full items-stretch overflow-hidden rounded-full"
      initial={introDone ? false : { clipPath: "inset(0 50% 0 50% round 9999px)" }}
      animate={
        isExpanding
          ? {
              clipPath: "inset(0 0% 0 0% round 9999px)",
              transition: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
            }
          : introDone
            ? { clipPath: "inset(0 0% 0 0% round 9999px)" }
            : undefined
      }
      onAnimationComplete={() => {
        if (isExpanding) onExpandDone();
      }}
      style={{ position: "relative" }}
    >
      {children}
    </motion.div>
  );
}

function TabContent({
  icon: Icon,
  label,
  active,
  collapsed,
  phase,
  index,
  onLastRevealed,
}: {
  icon: (typeof tabs)[number]["icon"];
  label: string;
  active: boolean;
  collapsed: boolean;
  phase: IntroPhase;
  index: number;
  onLastRevealed: () => void;
}) {
  const isRevealing = phase === "revealing";
  const introDone = phase === "done";

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      initial={introDone ? false : { opacity: 0, scale: 0.95 }}
      animate={
        isRevealing || introDone
          ? { opacity: 1, scale: 1 }
          : { opacity: 0, scale: 0.95 }
      }
      transition={{
        duration: 0.25,
        delay: isRevealing ? index * 0.06 : 0,
        ease: "easeOut",
      }}
      onAnimationComplete={() => {
        if (isRevealing && index === tabs.length - 1) onLastRevealed();
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
  );
}
