import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, ShieldCheck, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Dziś", icon: Home },
  { to: "/zadania", label: "Zadania", icon: ListChecks },
  { to: "/skupienie", label: "Skupienie", icon: ShieldCheck },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/85 backdrop-blur-xl">
      <div className="safe-bottom mx-auto flex w-full max-w-[30rem] items-stretch justify-between px-3 pt-2">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" || pathname.startsWith("/dzien") : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-full max-w-[4.5rem] items-center justify-center rounded-full transition-colors",
                  active && "bg-primary-soft",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
