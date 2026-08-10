import { createClient } from "@supabase/supabase-js";

/**
 * Single Supabase client for the app. Reads config from Vite env
 * (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY) — never hardcoded.
 * Not yet wired to any screen or store; that comes in later briefs.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Brak konfiguracji Supabase. Ustaw VITE_SUPABASE_URL i VITE_SUPABASE_PUBLISHABLE_KEY " +
      "w pliku .env (wzór w .env.example).",
  );
}

export const supabase = createClient(url, publishableKey);
