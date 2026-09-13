import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, Globe, Lock } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { ACCENTS, applyAccent, readAccent, swatchOf, type AccentKey } from "@/lib/accent";
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

function MiniPreview({ mode, accent }: { mode: "dark" | "light"; accent: string }) {
  const isDark = mode === "dark";
  const bg = isDark ? "oklch(0.16 0.012 300)" : "oklch(0.965 0.002 280)";
  const textColor = isDark ? "oklch(0.97 0.004 300)" : "oklch(0.16 0.01 280)";
  const sub = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)";
  const lineBg = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.1)";
  const cirBg = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)";
  const navBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const navDot = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const homeBg = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.1)";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 18,
        overflow: "hidden",
        background: bg,
      }}
    >
      <div style={{ padding: "22px 10px 0" }}>
        <div
          style={{
            color: sub,
            fontSize: 5,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            marginBottom: 1,
          }}
        >
          TENAX
        </div>
        <div
          style={{
            color: textColor,
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Plan dnia
        </div>
        <div
          style={{
            background: cardBg,
            borderRadius: 6,
            padding: "5px 6px",
            marginBottom: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 3,
            }}
          >
            <div
              style={{
                width: 30,
                height: 1.5,
                background: lineBg,
                borderRadius: 1,
              }}
            />
            <div
              style={{
                width: 12,
                height: 1.5,
                background: sub,
                borderRadius: 1,
              }}
            />
          </div>
          <div
            style={{
              height: 2.5,
              background: cardBg,
              borderRadius: 1.5,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "55%",
                height: "100%",
                background: accent,
                borderRadius: 1.5,
              }}
            />
          </div>
        </div>
        {[85, 72, 58, 65].map((w, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: cardBg,
              borderRadius: 5,
              padding: "4px 5px",
              marginBottom: 2.5,
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: i === 0 ? accent : "transparent",
                border: i === 0 ? "none" : `0.8px solid ${cirBg}`,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                height: 1.5,
                background: lineBg,
                borderRadius: 1,
                width: `${w}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 8, left: 6, right: 6 }}>
        <div
          style={{
            background: navBg,
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-around",
            padding: "4px 3px",
          }}
        >
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: accent,
            }}
          />
          {[0, 1, 2].map((j) => (
            <div
              key={j}
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: navDot,
              }}
            />
          ))}
        </div>
        <div
          style={{
            width: 28,
            height: 2.5,
            background: homeBg,
            borderRadius: 2,
            margin: "4px auto 0",
          }}
        />
      </div>
    </div>
  );
}

function PhoneMockup({
  mode,
  accent,
  selected,
  onClick,
}: {
  mode: "dark" | "light";
  accent: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center"
      type="button"
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: 140,
          aspectRatio: "9/19.5",
          borderRadius: 28,
          background: "#1a1a1a",
          boxShadow:
            "0 20px 40px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)",
          border: "1.5px solid rgba(255,255,255,0.08)",
          borderTopColor: "rgba(255,255,255,0.18)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 1.5,
            borderRadius: 26,
            background: "#000",
            overflow: "hidden",
            border: "1.5px solid #000",
          }}
        >
          {/* Dynamic Island */}
          <div
            style={{
              position: "absolute",
              top: 5,
              left: "50%",
              transform: "translateX(-50%)",
              width: 36,
              height: 11,
              background: mode === "dark" ? "#000" : "#1a1a2e",
              borderRadius: 9999,
              zIndex: 10,
            }}
          />
          <MiniPreview mode={mode} accent={accent} />
        </div>
      </div>
      {selected && (
        <>
          <div
            className="pointer-events-none absolute inset-[-4px]"
            style={{
              borderRadius: 32,
              border: `2px solid ${accent}`,
              boxShadow: `0 0 14px ${accent}35`,
            }}
          />
          <div
            className="absolute -right-[7px] -top-[7px] z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full"
            style={{
              background: accent,
              border: "2px solid var(--color-background)",
            }}
          >
            <Check className="h-[11px] w-[11px] text-white" strokeWidth={3.5} />
          </div>
        </>
      )}
      <span className="mt-[10px] text-xs font-medium">
        {mode === "dark" ? "Ciemny" : "Jasny"}
      </span>
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

  const currentSwatch = swatchOf(accent);

  return (
    <Screen>
      <div
        className="mb-5 flex items-center gap-3"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        <Link
          to="/ustawienia"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/5"
          aria-label="Wróć"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold leading-tight">Wygląd</h1>
      </div>

      {/* MOTYW */}
      <h2
        className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        Motyw
      </h2>
      <div
        className="mb-7 flex justify-center gap-5"
        style={{ animation: "cascadeIn 0.5s ease-out 0.15s both" }}
      >
        {(["dark", "light"] as const).map((m) => (
          <PhoneMockup
            key={m}
            mode={m}
            accent={currentSwatch}
            selected={m === mode}
            onClick={() => chooseMode(m)}
          />
        ))}
      </div>

      {/* KOLOR AKCENTU */}
      <h2
        className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}
      >
        Kolor akcentu
      </h2>
      <div
        className="mb-7 flex flex-wrap gap-4 px-1"
        style={{ animation: "cascadeIn 0.5s ease-out 0.25s both" }}
      >
        {ACCENTS.map((a) => {
          const active = a.key === accent;
          return (
            <button
              key={a.key}
              onClick={() => chooseAccent(a.key)}
              className="flex flex-col items-center gap-[6px]"
              type="button"
            >
              <span
                className="flex h-[46px] w-[46px] items-center justify-center rounded-full transition-shadow"
                style={{
                  backgroundColor: a.swatch,
                  border: active
                    ? `3px solid ${a.swatch}`
                    : "3px solid transparent",
                  boxShadow: active
                    ? `0 0 12px ${a.swatch}40`
                    : "none",
                }}
              >
                {active && (
                  <Check
                    className="h-5 w-5 text-white"
                    strokeWidth={3}
                  />
                )}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {a.label.length > 10
                  ? a.label.slice(0, 9) + "."
                  : a.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* JĘZYK — UNTOUCHED */}
      <h2
        className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}
      >
        Język
      </h2>
      <div
        className="flex flex-col gap-2"
        style={{ animation: "cascadeIn 0.5s ease-out 0.35s both" }}
      >
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
