export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "dl-theme";
const DEFAULT_THEME: ThemeMode = "dark";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function readTheme(): ThemeMode {
  if (typeof localStorage === "undefined") return DEFAULT_THEME;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
    if (mode === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
    }
  }

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }
}
