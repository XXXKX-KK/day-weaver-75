import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Map Supabase (English) auth errors to friendly Polish messages. */
function polishAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Nieprawidłowy e-mail lub hasło.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Konto z tym e-mailem już istnieje. Zaloguj się.";
  if (m.includes("password should be at least")) return "Hasło musi mieć co najmniej 6 znaków.";
  if (m.includes("unable to validate email") || m.includes("invalid format"))
    return "Nieprawidłowy adres e-mail.";
  if (m.includes("rate limit")) return "Za dużo prób. Spróbuj ponownie za chwilę.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Brak połączenia. Sprawdź internet i spróbuj ponownie.";
  return "Coś poszło nie tak. Spróbuj ponownie.";
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const mail = email.trim();
    if (!EMAIL_RE.test(mail)) {
      setError("Podaj poprawny adres e-mail.");
      return;
    }
    if (password.length < 6) {
      setError("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    setLoading(true);
    try {
      const { error: authError } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email: mail, password })
          : await supabase.auth.signUp({ email: mail, password });
      if (authError) setError(polishAuthError(authError.message));
      // On success onAuthStateChange flips the gate to the app.
    } catch {
      setError("Brak połączenia. Sprawdź internet i spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[26rem] flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="accent-gradient accent-glow mb-4 flex h-14 w-14 items-center justify-center rounded-3xl">
          <ShieldCheck className="h-7 w-7 text-primary-foreground" />
        </span>
        <h1 className="text-2xl font-bold leading-tight">Dzień Lepszy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "Zaloguj się, aby kontynuować" : "Załóż konto, aby zacząć"}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-elevated p-1">
        <ModeButton active={mode === "signin"} onClick={() => setMode("signin")}>
          Zaloguj
        </ModeButton>
        <ModeButton active={mode === "signup"} onClick={() => setMode("signup")}>
          Zarejestruj
        </ModeButton>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="h-12 w-full rounded-2xl border border-input bg-elevated px-4 text-sm outline-none focus:border-primary/40"
        />
        <input
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Hasło"
          className="h-12 w-full rounded-2xl border border-input bg-elevated px-4 text-sm outline-none focus:border-primary/40"
        />

        {error ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="accent-gradient mt-1 h-12 w-full rounded-2xl font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {loading ? "Chwila…" : mode === "signin" ? "Zaloguj się" : "Utwórz konto"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {mode === "signin" ? "Nie masz konta? " : "Masz już konto? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="font-semibold text-primary"
        >
          {mode === "signin" ? "Zarejestruj się" : "Zaloguj się"}
        </button>
      </p>
    </main>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 rounded-xl text-sm font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
