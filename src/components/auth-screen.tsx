import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUTH_BLUE = "oklch(0.62 0.18 255)";

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wipeKey, setWipeKey] = useState(0);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setConfirmPassword("");
    setWipeKey((k) => k + 1);
  };

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
    if (mode === "signup" && password !== confirmPassword) {
      setError("Hasła nie są identyczne.");
      return;
    }

    setLoading(true);
    try {
      const { error: authError } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email: mail, password })
          : await supabase.auth.signUp({ email: mail, password });
      if (authError) setError(polishAuthError(authError.message));
    } catch {
      setError("Brak połączenia. Sprawdź internet i spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="overlay-bg relative min-h-screen"
      style={
        {
          "--primary": AUTH_BLUE,
          "--primary-foreground": "oklch(0.99 0.005 255)",
        } as React.CSSProperties
      }
    >
    <main
      className="relative z-10 mx-auto flex min-h-screen w-full max-w-[26rem] flex-col justify-center px-5 py-10"
    >
      {/* Shield logo with 3D flip on mode switch */}
      <div
        className="mb-8 flex flex-col items-center text-center"
        style={{ perspective: "600px" }}
      >
        <motion.div
          key={mode}
          animate={{ rotateY: [0, 180, 360], scale: [1, 1.15, 1] }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: "preserve-3d" }}
          className="mb-4"
        >
          <div
            className="flex items-center justify-center rounded-[22%]"
            style={{
              width: 64,
              height: 64,
              background: "oklch(0.10 0.015 255 / 70%)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid oklch(0.62 0.18 255 / 25%)",
              boxShadow:
                "0 0 40px -8px oklch(0.62 0.18 255 / 40%), 0 0 16px -4px oklch(0.62 0.18 255 / 25%)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              width={38}
              height={38}
              aria-hidden="true"
            >
              <path
                d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
                stroke={AUTH_BLUE}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d="m9 12 2 2 4-4"
                stroke={AUTH_BLUE}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold leading-tight tracking-wide">
          TENAX
        </h1>
        <AnimatePresence mode="wait">
          <motion.p
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-1 text-sm text-muted-foreground"
          >
            {mode === "signin"
              ? "Zaloguj się, aby kontynuować"
              : "Załóż konto, aby zacząć"}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Glass card */}
      <div
        className="relative overflow-hidden rounded-3xl p-5"
        style={{
          background: "oklch(0.14 0.012 255 / 45%)",
          backdropFilter: "blur(24px) saturate(1.3)",
          WebkitBackdropFilter: "blur(24px) saturate(1.3)",
          border: "1px solid oklch(0.62 0.18 255 / 15%)",
          boxShadow:
            "0 24px 48px -12px oklch(0 0 0 / 60%), inset 0 1px 0 oklch(1 0 0 / 6%)",
        }}
      >
        {/* Diagonal glass wipe on mode switch */}
        <motion.div
          key={wipeKey}
          initial={{ x: "110%", y: "-110%" }}
          animate={{ x: "-110%", y: "110%" }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(135deg, transparent 30%, oklch(0.62 0.18 255 / 10%) 42%, oklch(0.62 0.18 255 / 22%) 50%, oklch(0.62 0.18 255 / 10%) 58%, transparent 70%)",
          }}
        />

        {/* Mode tabs with sliding pill */}
        <div
          className="mb-5 grid grid-cols-2 gap-1 rounded-full p-1"
          style={{ background: "oklch(1 0 0 / 6%)" }}
        >
          <AuthTab
            active={mode === "signin"}
            onClick={() => switchMode("signin")}
          >
            Zaloguj
          </AuthTab>
          <AuthTab
            active={mode === "signup"}
            onClick={() => switchMode("signup")}
          >
            Zarejestruj
          </AuthTab>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Hasło"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.07] pl-4 pr-12 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors active:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {mode === "signup" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Powtórz hasło"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                  {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="accent-gradient accent-glow mt-1 h-12 w-full rounded-full font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {loading
              ? "Chwila…"
              : mode === "signin"
                ? "Zaloguj się"
                : "Utwórz konto"}
          </button>
        </form>
      </div>

      {/* Bottom links */}
      {mode === "signin" && (
        <button
          type="button"
          onClick={() => toast("Reset hasła będzie dostępny wkrótce.")}
          className="mt-5 text-center text-xs font-medium text-muted-foreground transition-colors active:text-foreground"
        >
          Nie pamiętasz hasła?
        </button>
      )}

      <p
        className={cn(
          "text-center text-xs text-muted-foreground",
          mode === "signin" ? "mt-5" : "mt-6",
        )}
      >
        {mode === "signin" ? "Nie masz konta? " : "Masz już konto? "}
        <button
          type="button"
          onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
          className="font-semibold text-primary"
        >
          {mode === "signin" ? "Zarejestruj się" : "Zaloguj się"}
        </button>
      </p>
    </main>
    </div>
  );
}

function AuthTab({
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
        "relative h-11 rounded-full text-sm font-semibold transition-colors",
        active ? "text-white" : "text-muted-foreground",
      )}
    >
      {active && (
        <motion.div
          layoutId="auth-tab-pill"
          className="absolute inset-0 rounded-full"
          style={{ background: AUTH_BLUE }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
