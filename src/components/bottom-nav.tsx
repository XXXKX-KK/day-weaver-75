import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, ShieldCheck, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Dziś", icon: Home },
  { to: "/zadania", label: "Zadania", icon: ListChecks },
  { to: "/skupienie", label: "Skupienie", icon: ShieldCheck },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings },
] as const;

/**
 * Collapses the nav on scroll-down and expands on scroll-up / near the top.
 * SSR-safe: window is only touched inside the effect. A small threshold keeps
 * it from flickering on micro-scrolls.
 */
function useCollapsedOnScroll() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const THRESHOLD = 6;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 24) {
          setCollapsed(false); // always expanded near the top
        } else if (y - lastY > THRESHOLD) {
          setCollapsed(true); // scrolling down
        } else if (lastY - y > THRESHOLD) {
          setCollapsed(false); // scrolling up
        }
        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return collapsed;
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const collapsed = useCollapsedOnScroll();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
      <nav
        className={cn(
          "pointer-events-auto flex items-center gap-1 rounded-full border border-white/10",
          "bg-background/70 shadow-[0_12px_34px_-12px_rgba(0,0,0,0.85)] backdrop-blur-xl",
          "transition-[padding] duration-300 ease-out",
          collapsed ? "px-2 py-1" : "px-3 py-2",
        )}
      >
        {tabs.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/"
              ? pathname === "/" || pathname.startsWith("/dzien")
              : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl py-1.5",
                "transition-[width] duration-300 ease-out",
                collapsed ? "w-[3.25rem]" : "w-[4.75rem]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-11 items-center justify-center rounded-full transition-colors",
                  active && "bg-primary-soft",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
              </span>
              <span
                className={cn(
                  "overflow-hidden text-[11px] font-medium leading-none transition-all duration-300 ease-out",
                  collapsed ? "mt-0 max-h-0 opacity-0" : "mt-1 max-h-4 opacity-100",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
