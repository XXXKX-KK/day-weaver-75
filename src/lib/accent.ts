import { Blocker, isNativeBlocker } from "@/lib/blocker";

export type AccentKey = "orange" | "pink" | "blue" | "green";

export type Accent = {
  key: AccentKey;
  label: string;
  /** sRGB approximation of the oklch token — used for the picker dot and native mirror. */
  swatch: string;
};

// Order shown on the Wygląd screen.
export const ACCENTS: Accent[] = [
  { key: "orange", label: "Pomarańczowy", swatch: "#F5933B" },
  { key: "pink", label: "Różowy", swatch: "#EE4261" },
  { key: "blue", label: "Niebieski", swatch: "#3B82F6" },
  { key: "green", label: "Zielony", swatch: "#22C55E" },
];

export const DEFAULT_ACCENT: AccentKey = "blue";

const STORAGE_KEY = "dl-accent";

function isAccentKey(value: string | null): value is AccentKey {
  return value === "orange" || value === "pink" || value === "blue" || value === "green";
}

export function swatchOf(key: AccentKey): string {
  return ACCENTS.find((a) => a.key === key)?.swatch ?? "#3B82F6";
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

/**
 * Apply an accent everywhere: set html[data-accent] (repaints the whole app via
 * CSS tokens), update the theme-color meta, persist to localStorage, and mirror
 * to native prefs so the block overlay can read it in a later brief.
 */
export function applyAccent(key: AccentKey, opts: { persist?: boolean } = {}): void {
  const { persist = true } = opts;

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
