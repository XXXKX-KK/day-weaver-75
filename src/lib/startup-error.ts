/**
 * Turn a failed startup query into something the user can act on.
 *
 * "Spróbuj ponownie" with no reason just makes people tap until they give up.
 * Naming the cause tells them whether to check their signal, wait, or log in
 * again.
 */
export function describeStartupError(error: unknown): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Brak połączenia z internetem. Włącz dane lub Wi-Fi i spróbuj ponownie.";
  }

  const status = (error as { status?: number } | null)?.status;
  if (status === 401 || status === 403) {
    return "Twoja sesja wygasła. Zaloguj się ponownie.";
  }
  if (typeof status === "number" && status >= 500) {
    return "Serwer nie odpowiada. To po naszej stronie — spróbuj za chwilę.";
  }

  const message = error instanceof Error ? error.message : String(error ?? "");
  // supabase-js wraps a dead connection in a plain fetch failure.
  if (/fetch|network|Failed to fetch|NetworkError/i.test(message)) {
    return "Nie udało się połączyć z serwerem. Sprawdź zasięg i spróbuj ponownie.";
  }
  if (/timeout|timed out/i.test(message)) {
    return "Serwer odpowiada zbyt wolno. Spróbuj ponownie.";
  }

  return message
    ? `Nie udało się wczytać danych: ${message}`
    : "Nie udało się wczytać danych.";
}
