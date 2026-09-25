import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Natychmiastowe usunięcie konta na żądanie użytkownika.
 *
 * Funkcja kasuje wyłącznie rekord w auth.users — cała reszta znika kaskadą,
 * bo każda tabela z user_id ma `references auth.users(id) on delete cascade`
 * (pilnuje tego migracja 20_account_deletion). Dlatego, inaczej niż w Metriq,
 * nie ma tu listy tabel do ręcznego czyszczenia: lista, o której ktoś zapomni
 * przy dodaniu nowej tabeli, zostawiłaby po użytkowniku śmieci.
 *
 * Tożsamość bierze się z JWT wywołującego, nie z treści żądania, więc nie da
 * się usunąć cudzego konta.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    // Klient w kontekście użytkownika — tylko po to, żeby odczytać, kto pyta.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Klient serwisowy — jedyny, który może skasować konto.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return json({ error: deleteError.message }, 500);
    }

    return json({ success: true }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
