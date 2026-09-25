import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Ship client-side crashes to Supabase.
 *
 * The root error boundary retries after 1.5 s, which is too fast to read or
 * screenshot on a phone — and because these errors never reach the server, the
 * Supabase logs show nothing but 200s. This is the only way to find out what
 * actually broke on a real device.
 *
 * Nothing here may throw: an error reporter that crashes while reporting turns
 * one bug into two, and would re-enter whatever boundary called it.
 */

export type ErrorBoundaryName =
  "root_error_component" | "window_error" | "unhandled_rejection" | "mutation";

const APP_VERSION = import.meta.env.MODE ?? "unknown";

/** Postgres text columns are unbounded, but a runaway stack helps nobody. */
const MAX_STACK = 4000;

function describe(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || "Error",
      stack: error.stack ? error.stack.slice(0, MAX_STACK) : null,
    };
  }
  if (typeof error === "string") return { message: error, stack: null };
  try {
    return { message: JSON.stringify(error).slice(0, 500), stack: null };
  } catch {
    return { message: String(error), stack: null };
  }
}

export function logClientError(error: unknown, boundary: ErrorBoundaryName): void {
  try {
    console.error(`[${boundary}]`, error);
    if (!isSupabaseConfigured) return;

    const { message, stack } = describe(error);
    const row = {
      message,
      stack,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      boundary,
      app_version: APP_VERSION,
      device: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    };

    // Fire and forget. Note the two-argument .then rather than .catch —
    // PostgrestBuilder is only PromiseLike, and calling .catch on it throws.
    void supabase
      .from("client_errors")
      .insert(row)
      .then(
        () => {},
        () => {},
      );
  } catch {
    // Reporting must never be the thing that breaks the app.
  }
}

/**
 * Catch what never reaches a React boundary: errors thrown outside render and
 * promise rejections nobody handled. Returns a cleanup function.
 */
export function installGlobalErrorLogging(): () => void {
  if (typeof window === "undefined") return () => {};

  const onError = (event: ErrorEvent) => {
    logClientError(event.error ?? event.message, "window_error");
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    logClientError(event.reason, "unhandled_rejection");
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
