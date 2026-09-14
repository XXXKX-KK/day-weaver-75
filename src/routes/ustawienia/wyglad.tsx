import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Check, ChevronLeft, Globe, Lock, Plus } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import {
  ACCENTS,
  applyAccent,
  applyCustomAccent,
  readAccent,
  readCustomHex,
  swatchOf,
  type AccentKey,
} from "@/lib/accent";
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

/* ── HSV ↔ Hex ── */

function hsvToHex(h: number, s: number, v: number): string {
  const s1 = s / 100;
  const v1 = v / 100;
  const c = v1 * s1;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v1 - c;
  let r: number, g: number, b: number;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return {
    h: Math.round(h),
    s: Math.round(mx ? (d / mx) * 100 : 0),
    v: Math.round(mx * 100),
  };
}

/* ── Mini preview (Dziś) ── */

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
  const statusColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";

  return (
    <div style={{ position: "absolute", inset: 0, borderRadius: 18, overflow: "hidden", background: bg }}>
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px 0", position: "relative", zIndex: 11 }}>
        <span style={{ fontSize: 5.5, fontWeight: 600, color: textColor }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Signal bars */}
          <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
            <rect x="0" y="3.5" width="1.2" height="1.5" rx="0.3" fill={statusColor} />
            <rect x="1.8" y="2.5" width="1.2" height="2.5" rx="0.3" fill={statusColor} />
            <rect x="3.6" y="1.5" width="1.2" height="3.5" rx="0.3" fill={statusColor} />
            <rect x="5.4" y="0" width="1.2" height="5" rx="0.3" fill={statusColor} />
          </svg>
          {/* WiFi */}
          <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
            <path d="M3.5 4.2a0.5 0.5 0 1 1 0 0.8 0.5 0.5 0 0 1 0-0.8z" fill={statusColor} />
            <path d="M2 3c0.8-0.7 2.2-0.7 3 0" stroke={statusColor} strokeWidth="0.6" strokeLinecap="round" fill="none" />
            <path d="M0.8 1.8c1.4-1.2 3.9-1.2 5.4 0" stroke={statusColor} strokeWidth="0.6" strokeLinecap="round" fill="none" />
          </svg>
          {/* Battery */}
          <svg width="10" height="5" viewBox="0 0 10 5" fill="none">
            <rect x="0.3" y="0.3" width="8" height="4.4" rx="1" stroke={statusColor} strokeWidth="0.5" />
            <rect x="1" y="1" width="5.5" height="3" rx="0.5" fill={statusColor} />
            <rect x="8.5" y="1.5" width="0.8" height="2" rx="0.4" fill={statusColor} />
          </svg>
        </div>
      </div>
      <div style={{ padding: "2px 10px 0" }}>
        <div style={{ color: sub, fontSize: 5, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 1 }}>
          TENAX
        </div>
        <div style={{ color: textColor, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Plan dnia</div>
        {/* Progress card */}
        <div style={{ background: cardBg, borderRadius: 8, padding: "5px 6px", marginBottom: 4, border: `0.5px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <div style={{ width: 30, height: 1.5, background: lineBg, borderRadius: 1 }} />
            <div style={{ width: 12, height: 1.5, background: sub, borderRadius: 1 }} />
          </div>
          <div style={{ height: 2.5, background: cardBg, borderRadius: 1.5, overflow: "hidden" }}>
            <div style={{ width: "55%", height: "100%", background: accent, borderRadius: 1.5 }} />
          </div>
        </div>
        {/* Task items — separate rounded glass cards */}
        {[85, 72, 58, 65].map((w, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: cardBg,
              borderRadius: 8,
              padding: "5px 6px",
              marginBottom: 3,
              border: `0.5px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
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
            <div style={{ height: 1.5, background: lineBg, borderRadius: 1, width: `${w}%` }} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 8, left: 6, right: 6 }}>
        <div style={{ background: navBg, borderRadius: 8, display: "flex", justifyContent: "space-around", padding: "4px 3px" }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: accent }} />
          {[0, 1, 2].map((j) => (
            <div key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: navDot }} />
          ))}
        </div>
        <div style={{ width: 28, height: 2.5, background: homeBg, borderRadius: 2, margin: "4px auto 0" }} />
      </div>
    </div>
  );
}

/* ── Phone mockup ── */

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
    <button onClick={onClick} className="relative flex flex-col items-center" type="button">
      {selected && (
        <span className="mb-2 text-[11px] font-semibold text-green-500">Aktywny</span>
      )}
      <div
        className="relative overflow-hidden"
        style={{
          width: 140,
          aspectRatio: "9/19.5",
          borderRadius: 22,
          background: "#5A1726",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderTopColor: "rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: 20,
            background: "#000",
            overflow: "hidden",
          }}
        >
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
        <div
          className="absolute -right-[7px] z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full"
          style={{ top: 18, background: accent, border: "2px solid var(--color-background)" }}
        >
          <Check className="h-[11px] w-[11px] text-white" strokeWidth={3.5} />
        </div>
      )}
      <span className="mt-[10px] text-xs font-medium">{mode === "dark" ? "Ciemny" : "Jasny"}</span>
    </button>
  );
}

/* ── Custom accent picker (HSV) ── */

function CustomAccentPicker({
  initialHex,
  onApply,
  onClose,
}: {
  initialHex: string;
  onApply: (hex: string) => void;
  onClose: () => void;
}) {
  const initial = hexToHsv(initialHex);
  const [hue, setHue] = useState(initial.h);
  const [sat, setSat] = useState(initial.s);
  const [val, setVal] = useState(initial.v);
  const [hexInput, setHexInput] = useState(initialHex);

  const preview = hsvToHex(hue, sat, val);
  const hueColor = hsvToHex(hue, 100, 100);

  const makeDrag = useCallback(
    (onUpdate: (ev: PointerEvent, rect: DOMRect) => void) => {
      return (e: React.PointerEvent) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const update = (ev: PointerEvent) => onUpdate(ev, rect);
        update(e.nativeEvent);
        const move = (ev: PointerEvent) => {
          ev.preventDefault();
          update(ev);
        };
        const up = () => {
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", up);
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
      };
    },
    [],
  );

  const handleField = makeDrag((ev, rect) => {
    const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
    const s = Math.round(x * 100);
    const v = Math.round((1 - y) * 100);
    setSat(s);
    setVal(v);
    setHexInput(hsvToHex(hue, s, v));
  });

  const handleHue = makeDrag((ev, rect) => {
    const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
    const h = Math.round(x * 360);
    setHue(h);
    setHexInput(hsvToHex(h, sat, val));
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md rounded-t-3xl border border-border bg-background px-5 pb-8 pt-4"
        style={{ animation: "cascadeIn 0.3s ease-out both" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/20" />
        <h2 className="mb-4 text-lg font-bold">Własny akcent</h2>

        <div className="rounded-3xl bg-foreground/5 p-4">
          {/* Color field */}
          <div
            onPointerDown={handleField}
            className="relative w-full overflow-hidden rounded-xl"
            style={{
              height: 200,
              cursor: "crosshair",
              touchAction: "none",
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
            }}
          >
            <div
              className="pointer-events-none absolute h-[22px] w-[22px] rounded-full"
              style={{
                left: `${sat}%`,
                top: `${100 - val}%`,
                border: "3px solid white",
                transform: "translate(-50%, -50%)",
                boxShadow: "0 0 6px rgba(0,0,0,0.5), inset 0 0 4px rgba(0,0,0,0.2)",
              }}
            />
          </div>

          {/* Hue slider */}
          <div
            onPointerDown={handleHue}
            className="relative mt-[14px] w-full rounded-full"
            style={{
              height: 28,
              cursor: "pointer",
              touchAction: "none",
              background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
            }}
          >
            <div
              className="pointer-events-none absolute top-1/2 h-6 w-6 rounded-full bg-white"
              style={{
                left: `${(hue / 360) * 100}%`,
                transform: "translate(-50%, -50%)",
                boxShadow: "0 1px 6px rgba(0,0,0,0.4)",
                border: "2px solid white",
              }}
            />
          </div>

          {/* Hex input + preview */}
          <div className="mt-4 flex items-center gap-3">
            <div
              className="h-11 w-11 shrink-0 rounded-xl border border-foreground/[0.08]"
              style={{ backgroundColor: preview }}
            />
            <input
              value={hexInput}
              onChange={(e) => {
                const v = e.target.value;
                setHexInput(v);
                if (/^#[0-9a-f]{6}$/i.test(v)) {
                  const hsv = hexToHsv(v);
                  setHue(hsv.h);
                  setSat(hsv.s);
                  setVal(hsv.v);
                }
              }}
              className="h-11 min-w-0 flex-1 rounded-xl border border-foreground/[0.08] bg-foreground/[0.06] px-[14px] font-mono text-[15px] uppercase outline-none focus:border-primary/40"
              maxLength={7}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="h-12 flex-1 rounded-2xl border border-foreground/[0.08] bg-foreground/[0.06] text-[15px] font-medium"
            type="button"
          >
            Anuluj
          </button>
          <button
            onClick={() => onApply(preview)}
            className="accent-gradient h-12 flex-1 rounded-2xl text-[15px] font-semibold text-primary-foreground"
            type="button"
          >
            Gotowe
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main screen ── */

function AppearanceScreen() {
  const [accent, setAccent] = useState<AccentKey>(() => readAccent());
  const [customHex, setCustomHex] = useState(() => readCustomHex());
  const [mode, setMode] = useState<ThemeMode>(() => readTheme());
  const [pickerOpen, setPickerOpen] = useState(false);

  const chooseAccent = (key: AccentKey) => {
    setAccent(key);
    applyAccent(key);
  };

  const chooseMode = (m: ThemeMode) => {
    setMode(m);
    applyTheme(m);
  };

  const handleCustomApply = (hex: string) => {
    setCustomHex(hex);
    setAccent("custom");
    applyCustomAccent(hex);
    setPickerOpen(false);
  };

  const currentSwatch = accent === "custom" ? customHex : swatchOf(accent);

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
                  border: active ? `3px solid ${a.swatch}` : "3px solid transparent",
                  boxShadow: active ? `0 0 12px ${a.swatch}40` : "none",
                }}
              >
                {active && <Check className="h-5 w-5 text-white" strokeWidth={3} />}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {a.label.length > 10 ? a.label.slice(0, 9) + "." : a.label}
              </span>
            </button>
          );
        })}

        {/* Własny */}
        <button
          onClick={() => setPickerOpen(true)}
          className="flex flex-col items-center gap-[6px]"
          type="button"
        >
          {accent === "custom" ? (
            <span
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full transition-shadow"
              style={{
                backgroundColor: customHex,
                border: `3px solid ${customHex}`,
                boxShadow: `0 0 12px ${customHex}40`,
              }}
            >
              <Check className="h-5 w-5 text-white" strokeWidth={3} />
            </span>
          ) : (
            <span
              className="relative flex h-[46px] w-[46px] items-center justify-center rounded-full"
              style={{
                background: "conic-gradient(#f00, #ff8800, #ffe000, #0f0, #0ff, #00f, #f0f, #f00)",
              }}
            >
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-background">
                <Plus className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={2.5} />
              </span>
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">Własny</span>
        </button>
      </div>

      {/* JĘZYK — UNTOUCHED */}
      <h2
        className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}
      >
        Język
      </h2>
      <div className="flex flex-col gap-3">
        {LANGUAGES.map((lang, i) => (
          <div
            key={lang.code}
            className="flex items-center gap-4 rounded-3xl bg-foreground/5 px-4 py-4"
            style={{ animation: `cascadeIn 0.5s ease-out ${0.35 + i * 0.06}s both` }}
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

      {pickerOpen && (
        <CustomAccentPicker
          initialHex={accent === "custom" ? customHex : currentSwatch}
          onApply={handleCustomApply}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Screen>
  );
}
