import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single Supabase client for the app. Reads config from Vite env
 * (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY) — never hardcoded.
 *
 * Resilient to missing env: instead of throwing at import (which would take the
 * whole app down with a white screen), it exposes `isSupabaseConfigured`. When
 * config is missing, an inert placeholder client keeps the module importable and
 * the type non-null — nothing calls it because auth guards on the flag.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

if (!isSupabaseConfigured) {
  console.error(
    "Supabase nie jest skonfigurowany: brak VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY " +
      "(wzór w .env.example). Funkcje wymagające konta będą niedostępne.",
  );
}

export const supabase: SupabaseClient = createClient(
  url || "https://placeholder.supabase.co",
  publishableKey || "placeholder-key",
  {
    auth: {
      // Only persist/refresh when really configured; the placeholder stays inert.
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      // Email/password flow — no magic-link URL to parse.
      detectSessionInUrl: false,
    },
  },
);
