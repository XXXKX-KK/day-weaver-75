import { useState, useMemo, useEffect } from "react";
import { Delete, X } from "lucide-react";
import { cn } from "@/lib/utils";

type PinPadMode = "set" | "verify" | "change";

interface PinPadProps {
  mode: PinPadMode;
  onComplete: (pin: string) => void;
  onVerifyCurrent?: (pin: string) => Promise<boolean>;
  onCancel: () => void;
  onForgot?: (() => void) | undefined;
  error?: string;
}

const PIN_LENGTH = 4;

function shuffle(arr: number[]): number[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

export function PinPad({ mode, onComplete, onVerifyCurrent, onCancel, onForgot, error }: PinPadProps) {
  const [phase, setPhase] = useState<"verify-current" | "enter" | "confirm">(
    mode === "change" ? "verify-current" : "enter",
  );
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [localError, setLocalError] = useState("");

  const digits = useMemo(
    () =>
      mode === "verify" || phase === "verify-current"
        ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 0])
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
    [mode, phase],
  );

  useEffect(() => {
    if (error) setPin("");
  }, [error]);

  const handleFull = async (completed: string) => {
    if (mode === "verify") {
      onComplete(completed);
      return;
    }
    if (phase === "verify-current") {
      if (onVerifyCurrent) {
        const valid = await onVerifyCurrent(completed);
        if (!valid) {
          setLocalError("Nieprawidłowy PIN");
          setPin("");
          return;
        }
      }
      setPin("");
      setPhase("enter");
      return;
    }
    if (phase === "enter") {
      setFirstPin(completed);
      setPin("");
      setPhase("confirm");
    } else {
      if (completed === firstPin) {
        onComplete(completed);
      } else {
        setLocalError("PIN-y się nie zgadzają");
        setPin("");
      }
    }
  };

  const press = (digit: number) => {
    if (pin.length >= PIN_LENGTH) return;
    setLocalError("");
    const next = pin + String(digit);
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setTimeout(() => handleFull(next), 150);
    }
  };

  const backspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setLocalError("");
  };

  const topDigits = digits.slice(0, 9);
  const bottomDigit = digits[9]!;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <button
        onClick={onCancel}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground"
        aria-label="Zamknij"
      >
        <X className="h-5 w-5" />
      </button>

      <p className="mb-2 text-sm font-semibold text-muted-foreground">
        {mode === "verify"
          ? "Podaj PIN"
          : phase === "verify-current"
            ? "Obecny PIN"
            : phase === "enter"
              ? mode === "change" ? "Nowy PIN" : "Ustaw PIN"
              : "Potwierdź PIN"}
      </p>

      <div className="mb-6 flex gap-3">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-4 w-4 rounded-full border-2 transition-colors",
              i < pin.length ? "border-primary bg-primary" : "border-muted-foreground/30",
            )}
          />
        ))}
      </div>

      {(error || localError) && (
        <p className="mb-4 text-sm text-destructive">{error || localError}</p>
      )}

      <div className="grid w-full max-w-[17rem] grid-cols-3 gap-3">
        {topDigits.map((d) => (
          <button
            key={`d${d}`}
            onClick={() => press(d)}
            className="flex h-16 items-center justify-center rounded-2xl bg-elevated text-xl font-semibold transition-colors active:bg-primary/20"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => press(bottomDigit)}
          className="flex h-16 items-center justify-center rounded-2xl bg-elevated text-xl font-semibold transition-colors active:bg-primary/20"
        >
          {bottomDigit}
        </button>
        <button
          onClick={backspace}
          className="flex h-16 items-center justify-center rounded-2xl text-muted-foreground transition-colors active:text-foreground"
          aria-label="Usuń cyfrę"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>

      {(mode === "verify" || (mode === "change" && phase === "verify-current")) && onForgot && (
        <button
          onClick={onForgot}
          className="mt-6 text-sm text-muted-foreground underline underline-offset-2"
        >
          Nie pamiętam PIN-u
        </button>
      )}
    </div>
  );
}
