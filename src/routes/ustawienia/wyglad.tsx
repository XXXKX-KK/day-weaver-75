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

const MODES: { key: ThemeMode; label: string; icon: typeof Moon }[] = [
  { key: "dark", label: "Ciemny", icon: Moon },
  { key: "light", label: "Jasny", icon: Sun },
];

const LANGUAGES = [
  { code: "pl", label: "Polski", flag: "\u{1F1F5}\u{1F1F1}", active: true },
  { code: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}", active: false },
  { code: "uk", label: "Українська", flag: "\u{1F1FA}\u{1F1E6}", active: false },
];

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

      {/* ── TRYB (dark / light) ── */}
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Tryb
      </h2>
      <div className="mb-6 flex flex-col gap-2">
        {MODES.map((m) => {
          const active = m.key === mode;
          return (
            <button
              key={m.key}
              onClick={() => chooseMode(m.key)}
              className={cn(
                "card-surface flex items-center gap-4 px-4 py-4 text-left transition-colors",
                active && "border-primary/50",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated">
                <m.icon className="h-4 w-4 text-muted-foreground" />
              </span>
              <span className="flex-1 text-sm font-semibold">{m.label}</span>
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
