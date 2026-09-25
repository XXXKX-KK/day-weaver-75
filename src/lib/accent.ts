import { Blocker, isNativeBlocker } from "@/lib/blocker";

export type AccentKey = "orange" | "pink" | "blue" | "green" | "custom";

export type Accent = {
  key: AccentKey;
  label: string;
  /** sRGB approximation of the oklch token — used for the picker dot and native mirror. */
  swatch: string;
};

/**
 * Niebieski z logo TENAX. Jedno źródło prawdy dla miejsc, które mają zostać
 * w kolorze marki niezależnie od wybranego akcentu — ekran startowy i karty
 * wydarzeń z kalendarza. Fiolet i reszta akcentów należą do planu dnia.
 */
export const LOGO_BLUE = "#3B82F6";

export const ACCENTS: Accent[] = [
  { key: "orange", label: "Pomarańczowy", swatch: "#F5933B" },
  { key: "pink", label: "Różowy", swatch: "#EE4261" },
  { key: "blue", label: "Niebieski", swatch: LOGO_BLUE },
  { key: "green", label: "Zielony", swatch: "#22C55E" },
];

export const DEFAULT_ACCENT: AccentKey = "blue";

const STORAGE_KEY = "dl-accent";
const CUSTOM_HEX_KEY = "dl-accent-custom-hex";

function isAccentKey(value: string | null): value is AccentKey {
  return (
    value === "orange" ||
    value === "pink" ||
    value === "blue" ||
    value === "green" ||
    value === "custom"
  );
}

export function swatchOf(key: AccentKey): string {
  if (key === "custom") return readCustomHex();
  return ACCENTS.find((a) => a.key === key)?.swatch ?? LOGO_BLUE;
}

/** Read the persisted accent (SSR-safe; falls back to the default). */
export function readAccent(): AccentKey {
  if (typeof localStorage === "undefined") return DEFAULT_ACCENT;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isAccentKey(stored) ? stored : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function readCustomHex(): string {
  if (typeof localStorage === "undefined") return LOGO_BLUE;
  try {
    const hex = localStorage.getItem(CUSTOM_HEX_KEY);
    return hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : LOGO_BLUE;
  } catch {
    return LOGO_BLUE;
  }
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function setCustomCSSProperties(hex: string): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--primary", hex);
  const fg = relativeLuminance(hex) > 0.35 ? "#1a1a1a" : "#fafafa";
  root.style.setProperty("--primary-foreground", fg);
}

function clearCustomCSSProperties(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty("--primary");
  root.style.removeProperty("--primary-foreground");
}

/**
 * Apply an accent everywhere: set html[data-accent] (repaints the whole app via
 * CSS tokens), update the theme-color meta, persist to localStorage, and mirror
 * to native prefs so the block overlay can read it in a later brief.
 */
export function applyAccent(key: AccentKey, opts: { persist?: boolean } = {}): void {
  const { persist = true } = opts;

  if (key === "custom") {
    const hex = readCustomHex();
    applyCustomAccent(hex, { persist });
    return;
  }

  clearCustomCSSProperties();

  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-accent", key);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", swatchOf(key));
  }

  if (persist && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* storage unavailable — DOM state still applied */
    }
  }

  if (persist && isNativeBlocker()) {
    Blocker.setAccentColor({ key, hex: swatchOf(key) }).catch((e) =>
      console.error("setAccentColor failed", e),
    );
  }
}

export function applyCustomAccent(hex: string, opts: { persist?: boolean } = {}): void {
  const { persist = true } = opts;

  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-accent", "custom");
    setCustomCSSProperties(hex);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", hex);
  }

  if (persist && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, "custom");
      localStorage.setItem(CUSTOM_HEX_KEY, hex);
    } catch {}
  }

  if (persist && isNativeBlocker()) {
    Blocker.setAccentColor({ key: "custom", hex }).catch((e) =>
      console.error("setAccentColor failed", e),
    );
  }
}
