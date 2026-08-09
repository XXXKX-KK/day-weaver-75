import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Focus, ListChecks, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Dziś", icon: CalendarDays },
  { to: "/zadania", label: "Zadania", icon: ListChecks },
  { to: "/skupienie", label: "Skupienie", icon: Focus },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings },
] as const;

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
  useEffect(() => setMounted(true), []);

  const activeIndex = Math.max(
    0,
    tabs.findIndex(({ to }) =>
      to === "/" ? pathname === "/" || pathname.startsWith("/dzien") : pathname.startsWith(to),
    ),
  );

  const pill = (
    <nav
      aria-label="Nawigacja główna"
      className="fixed z-40 flex items-stretch rounded-full transition-[left,right] duration-[220ms] ease-out"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        left: collapsed ? "12%" : "12px",
        right: collapsed ? "12%" : "12px",
        background: "var(--navpill)",
        border: "1px solid var(--navpill-border)",
        boxShadow: "inset 0 1px 0 var(--navpill-top), 0 8px 32px rgba(0,0,0,0.35)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
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
            className={cn(
              "relative z-10 flex flex-1 flex-col items-center justify-center gap-1 rounded-full",
              "transition-[height] duration-[220ms] ease-out",
              collapsed ? "h-10" : "h-[54px]",
              active ? "text-primary" : "text-muted-foreground",
            )}
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
          </Link>
        );
      })}
    </nav>
  );

  // Portal to <body>; only after mount so SSR never touches document.
  if (!mounted) return null;
  return createPortal(pill, document.body);
}
