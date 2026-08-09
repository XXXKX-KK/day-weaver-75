import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { ACCENTS, applyAccent, readAccent, type AccentKey } from "@/lib/accent";

export const Route = createFileRoute("/ustawienia/wyglad")({
  head: () => ({
    meta: [
      { title: "Wygląd – kolor akcentu" },
      { name: "description", content: "Wybierz kolor akcentu aplikacji." },
    ],
  }),
  component: AppearanceScreen,
});

function AppearanceScreen() {
  const [accent, setAccent] = useState<AccentKey>(() => readAccent());

  const choose = (key: AccentKey) => {
    setAccent(key);
    applyAccent(key); // repaints the whole app instantly + persists + mirrors to native
  };

  return (
    <Screen>
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/ustawienia"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-elevated"
          aria-label="Wróć"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Konfiguracja
          </p>
          <h1 className="text-2xl font-bold leading-tight">Wygląd</h1>
        </div>
      </div>

      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Kolor akcentu
      </h2>
      <div className="flex flex-col gap-2">
        {ACCENTS.map((a) => {
          const active = a.key === accent;
          return (
            <button
              key={a.key}
              onClick={() => choose(a.key)}
              className={cn(
                "card-surface flex items-center gap-4 px-4 py-4 text-left transition-colors",
                active && "border-primary/50",
              )}
            >
              <span
                className="h-7 w-7 shrink-0 rounded-full"
                style={{ backgroundColor: a.swatch }}
              />
              <span className="flex-1 text-sm font-semibold">{a.label}</span>
              {active ? (
                <span className="accent-gradient flex h-6 w-6 items-center justify-center rounded-full">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </span>
              ) : (
                <span className="h-6 w-6 rounded-full border border-input" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-4 px-1 text-xs text-muted-foreground">
        Kolor zmienia akcenty i poświatę w całej aplikacji. Wybór jest zapamiętywany.
      </p>
    </Screen>
  );
}
