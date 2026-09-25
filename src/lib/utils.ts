import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Klasy zaokrąglenia wyjęte z listy klas pola. Opakowanie `.beam-wrap` musi
 * dostać dokładnie te same, bo pierścień dziedziczy z niego border-radius —
 * inaczej odkleja się od krawędzi pola.
 */
export function roundedClassesOf(className?: string): string {
  if (!className) return "";
  return className
    .split(/\s+/)
    .filter((c) => c.startsWith("rounded"))
    .join(" ");
}
