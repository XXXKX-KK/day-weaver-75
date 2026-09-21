import { useState, useEffect, useRef } from "react";
import { Mail, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Blocker } from "@/lib/blocker";

interface PinResetProps {
  email: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function PinReset({ email, onComplete, onCancel }: PinResetProps) {
  const [phase, setPhase] = useState<"sending" | "input" | "verifying">("sending");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void sendOtp();
  }, []);

  const sendOtp = async () => {
    setPhase("sending");
    setError("");
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (otpError) {
      setError("Nie udało się wysłać kodu. Spróbuj ponownie.");
      setPhase("input");
      return;
    }
    setPhase("input");
  };

  const verify = async (token: string) => {
    setPhase("verifying");
    setError("");
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (otpError) {
      setError("Nieprawidłowy kod");
      setPhase("input");
      setCode("");
      return;
    }
    try {
      await Blocker.clearPin();
    } catch (e) {
      console.error(e);
    }
    onComplete();
  };

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    setError("");
    if (digits.length === 6) {
      setTimeout(() => void verify(digits), 150);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 px-6 backdrop-blur-sm">
      <button
        onClick={onCancel}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground"
        aria-label="Zamknij"
      >
        <X className="h-5 w-5" />
      </button>

      <Mail className="mb-4 h-8 w-8 text-primary" />

      {phase === "sending" ? (
        <p className="text-sm text-muted-foreground">
          Wysyłanie kodu na {email}…
        </p>
      ) : (
        <>
          <p className="mb-1 text-sm font-semibold">Wpisz kod z maila</p>
          <p className="mb-6 text-center text-xs text-muted-foreground">
            Wysłaliśmy 6-cyfrowy kod na {email}
          </p>

          <div className="beam-wrap mb-4 w-48">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              disabled={phase === "verifying"}
              placeholder="000000"
              className="h-14 w-full rounded-2xl border border-input bg-elevated text-center text-2xl font-bold tracking-[0.3em] outline-none focus:border-primary disabled:opacity-50"
            />
          </div>

          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

          {phase === "verifying" ? (
            <p className="text-sm text-muted-foreground">Weryfikacja…</p>
          ) : (
            <button
              onClick={() => void sendOtp()}
              className="text-sm text-muted-foreground underline underline-offset-2"
            >
              Wyślij ponownie
            </button>
          )}
        </>
      )}
    </div>
  );
}
