import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, Globe, Lock, Moon, Sun } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { ACCENTS, applyAccent, readAccent, type AccentKey } from "@/lib/accent";
import { applyTheme, readTheme, type ThemeMode } from "@/lib/theme";

export const Route = createFileRoute("/ustawienia/wyglad")({
  head: () => ({
    meta: [
      { title: "Wygląd – kolor akcentu i tryb" },
      { name: "description", content: "Wybierz kolor akcentu i tryb jasny lub ciemny." },
    ],
  }),
  component: AppearanceScreen,
});

const LANGUAGES = [
  { code: "pl", label: "Polski", flag: "\u{1F1F5}\u{1F1F1}", active: true },
  { code: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}", active: false },
  { code: "uk", label: "Українська", flag: "\u{1F1FA}\u{1F1E6}", active: false },
];

function ThemePreview({ mode, active }: { mode: ThemeMode; active: boolean }) {
  const isDark = mode === "dark";
  return (
    <button
      className={cn(
        "flex flex-col overflow-hidden rounded-[20px] border-2 transition-colors",
        active ? "border-primary" : "border-border",
      )}
    >
      {/* Mini UI mockup */}
      <div className={cn("flex flex-col gap-2 px-4 pb-3 pt-4", isDark ? "bg-[#111]" : "bg-[#f0f0f2]")}>
        <div className={cn("h-2 w-3/4 rounded-full", isDark ? "bg-white/20" : "bg-black/15")} />
        <div className={cn("h-2 w-1/2 rounded-full", isDark ? "bg-white/10" : "bg-black/8")} />
        <div className="mt-1 flex gap-2">
          <div className="h-6 flex-1 rounded-lg bg-primary/60" />
          <div className={cn("h-6 flex-1 rounded-lg", isDark ? "bg-white/8" : "bg-black/6")} />
        </div>
      </div>
      {/* Label bar */}
      <div
        className={cn(
          "flex items-center justify-center gap-2 px-3 py-3",
          isDark ? "bg-[#181818]" : "bg-white",
        )}
      >
        {isDark ? (
          <Moon className={cn("h-4 w-4", isDark ? "text-white" : "text-black")} />
        ) : (
          <Sun className={cn("h-4 w-4", isDark ? "text-white" : "text-black")} />
        )}
        <span className={cn("text-sm font-semibold", isDark ? "text-white" : "text-black")}>
          {isDark ? "Ciemny" : "Jasny"}
        </span>
      </div>
    </button>
  );
}

function AppearanceScreen() {
  const [accent, setAccent] = useState<AccentKey>(() => readAccent());
  const [mode, setMode] = useState<ThemeMode>(() => readTheme());

  const chooseAccent = (key: AccentKey) => {
    setAccent(key);
    applyAccent(key);
  };

  const chooseMode = (m: ThemeMode) => {
    setMode(m);
    applyTheme(m);
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

      {/* ── TRYB (dark / light) ── */}
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Tryb
      </h2>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {(["dark", "light"] as const).map((m) => (
          <div key={m} onClick={() => chooseMode(m)}>
            <ThemePreview mode={m} active={m === mode} />
          </div>
        ))}
      </div>

      {/* ── MOTYW (accent colors) ── */}
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Motyw
      </h2>
      <div className="mb-6 flex flex-col gap-2">
        {ACCENTS.map((a) => {
          const active = a.key === accent;
          return (
            <button
              key={a.key}
              onClick={() => chooseAccent(a.key)}
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

      {/* ── JĘZYK ── */}
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Język
      </h2>
      <div className="flex flex-col gap-2">
        {LANGUAGES.map((lang) => (
          <div
            key={lang.code}
            className={cn(
              "card-surface flex items-center gap-4 px-4 py-4",
              lang.active && "border-primary/50",
            )}
          >
            <Globe className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="text-lg leading-none">{lang.flag}</span>
            <span className="flex-1 text-sm font-semibold">{lang.label}</span>
            {lang.active ? (
              <span className="text-sm font-semibold text-primary">Aktywny</span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                wkrótce
              </span>
            )}
          </div>
        ))}
      </div>
    </Screen>
  );
}
