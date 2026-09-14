import { useState, useMemo, useEffect, useCallback } from "react";
import { Delete, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type PinPadMode = "set" | "verify" | "change";

interface PinPadProps {
  mode: PinPadMode;
  /** Called with the final PIN when setting (set/confirm). Not used for verify — use onVerify. */
  onComplete: (pin: string) => void;
  /** Async verify callback. Return true = success, false = wrong PIN. Used in verify mode and change mode's current-PIN phase. */
  onVerify?: (pin: string) => Promise<boolean>;
  /** Called after successful verify animation completes. */
  onVerifySuccess?: () => void;
  onCancel: () => void;
  onForgot?: (() => void) | undefined;
  error?: string;
}

const PIN_LENGTH = 4;

type VerifyStage = "idle" | "orbiting" | "collapsing" | "success" | "error";

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

function vibrate(pattern: number | number[] = 50) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

const DIAMOND_POSITIONS = [
  { x: 0, y: -52 },
  { x: 52, y: 0 },
  { x: 0, y: 52 },
  { x: -52, y: 0 },
] as const;

const springTransition = { type: "spring" as const, stiffness: 260, damping: 22 };

export function PinPad({ mode, onComplete, onVerify, onVerifySuccess, onCancel, onForgot, error }: PinPadProps) {
  const [phase, setPhase] = useState<"verify-current" | "enter" | "confirm">(
    mode === "change" ? "verify-current" : "enter",
  );
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [localError, setLocalError] = useState("");
  const [verifyStage, setVerifyStage] = useState<VerifyStage>("idle");
  const [revealedPin, setRevealedPin] = useState("");

  const isVerifyPhase = mode === "verify" || phase === "verify-current";

  const digits = useMemo(
    () =>
      isVerifyPhase
        ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 0])
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
    [isVerifyPhase],
  );

  useEffect(() => {
    if (error) {
      setPin("");
      setVerifyStage("idle");
    }
  }, [error]);

  const runVerifyAnimation = useCallback(
    async (completed: string) => {
      if (!onVerify) return;

      setRevealedPin(completed);
      setVerifyStage("orbiting");
      vibrate(30);

      const resultPromise = onVerify(completed);

      await new Promise((r) => setTimeout(r, 650));
      setVerifyStage("collapsing");
      await new Promise((r) => setTimeout(r, 500));

      const valid = await resultPromise;

      if (valid) {
        setVerifyStage("success");
        vibrate(80);
        await new Promise((r) => setTimeout(r, 1200));

        if (phase === "verify-current") {
          setVerifyStage("idle");
          setPin("");
          setPhase("enter");
        } else {
          onVerifySuccess?.();
        }
      } else {
        setVerifyStage("error");
        vibrate([50, 80, 50]);
        await new Promise((r) => setTimeout(r, 700));
        setVerifyStage("idle");
        setPin("");
        setLocalError("Nieprawidłowy PIN");
      }
    },
    [onVerify, onVerifySuccess, phase],
  );

  const handleFull = useCallback(
    async (completed: string) => {
      if (isVerifyPhase) {
        await runVerifyAnimation(completed);
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
    },
    [isVerifyPhase, phase, firstPin, onComplete, runVerifyAnimation],
  );

  const press = useCallback(
    (digit: number) => {
      if (pin.length >= PIN_LENGTH || verifyStage !== "idle") return;
      setLocalError("");
      vibrate(20);
      const next = pin + String(digit);
      setPin(next);
      if (next.length === PIN_LENGTH) {
        setTimeout(() => handleFull(next), 180);
      }
    },
    [pin, verifyStage, handleFull],
  );

  const backspace = useCallback(() => {
    if (verifyStage !== "idle") return;
    setPin((prev) => prev.slice(0, -1));
    setLocalError("");
  }, [verifyStage]);

  const topDigits = digits.slice(0, 9);
  const bottomDigit = digits[9]!;
  const showKeypad = verifyStage === "idle";

  return (
    <div className="overlay-bg fixed inset-0 z-50 flex flex-col items-center justify-center">
      <button
        onClick={onCancel}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground"
        aria-label="Zamknij"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Title label */}
      <AnimatePresence mode="wait">
        {verifyStage === "idle" && (
          <motion.p
            key={`label-${phase}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-2 text-sm font-semibold text-muted-foreground"
          >
            {mode === "verify"
              ? "Podaj PIN"
              : phase === "verify-current"
                ? "Obecny PIN"
                : phase === "enter"
                  ? mode === "change" ? "Nowy PIN" : "Ustaw PIN"
                  : "Potwierdź PIN"}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Animated PIN area */}
      <div className="relative flex items-center justify-center" style={{ height: 160 }}>
        <div className="relative" style={{ width: 230, height: 160 }}>

          {/* PIN blocks */}
          {Array.from({ length: PIN_LENGTH }, (_, i) => {
            const filled = i < pin.length;
            const dp = DIAMOND_POSITIONS[i]!;

            let target: { x: number; y: number; scale: number; opacity: number };
            if (verifyStage === "idle") {
              target = { x: (i - 1.5) * 54, y: 0, scale: 1, opacity: 1 };
            } else if (verifyStage === "orbiting") {
              target = { x: dp.x, y: dp.y, scale: 1, opacity: 1 };
            } else if (verifyStage === "collapsing") {
              target = { x: 0, y: 0, scale: 0, opacity: 0 };
            } else {
              target = { x: 0, y: 0, scale: 0, opacity: 0 };
            }

            return (
              <motion.div
                key={i}
                className={cn(
                  "absolute flex items-center justify-center rounded-2xl border backdrop-blur-md",
                  verifyStage === "error"
                    ? "border-destructive/50 bg-destructive/15"
                    : filled || verifyStage !== "idle"
                      ? "border-primary/40 bg-primary/10"
                      : "border-foreground/[0.08] bg-foreground/5",
                )}
                style={{
                  width: 44,
                  height: 56,
                  left: "50%",
                  top: "50%",
                  marginLeft: -22,
                  marginTop: -28,
                }}
                animate={target}
                transition={
                  verifyStage === "collapsing"
                    ? { type: "spring", stiffness: 300, damping: 25, delay: i * 0.05 }
                    : springTransition
                }
              >
                {(filled && verifyStage === "idle") || verifyStage === "orbiting" ? (
                  <motion.span
                    key={`dot-${verifyStage}-${i}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="text-xl text-primary"
                  >
                    •
                  </motion.span>
                ) : null}
              </motion.div>
            );
          })}

          {/* Spinner ring */}
          <AnimatePresence>
            {(verifyStage === "orbiting" || verifyStage === "collapsing") && (
              <motion.div
                className="absolute"
                style={{ left: "50%", top: "50%", marginLeft: -30, marginTop: -30 }}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.3 }}
              >
                <svg
                  width="60" height="60" viewBox="0 0 60 60"
                  className="animate-spin"
                  style={{ animationDuration: "1.2s" }}
                >
                  <circle
                    cx="30" cy="30" r="26"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="110 50"
                    strokeLinecap="round"
                    className="text-primary/50"
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success state */}
          <AnimatePresence>
            {verifyStage === "success" && (
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center gap-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Emerald glow ring + check */}
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <motion.div
                    className="absolute inset-[-8px] rounded-full"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      background: "radial-gradient(circle, rgba(52,211,153,0.3) 0%, transparent 70%)",
                      filter: "blur(10px)",
                    }}
                  />
                  <motion.div
                    className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-400/60 bg-emerald-400/15 backdrop-blur-sm"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.05 }}
                    style={{ boxShadow: "0 0 28px -4px rgba(52,211,153,0.5)" }}
                  >
                    <Check className="h-7 w-7 text-emerald-400" />
                  </motion.div>
                </div>

                {/* Revealed digits */}
                <motion.div
                  className="flex gap-2.5"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                >
                  {revealedPin.split("").map((digit, i) => (
                    <motion.span
                      key={i}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-lg font-bold text-emerald-300 backdrop-blur-sm"
                      initial={{ opacity: 0, y: 14, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: 0.3 + i * 0.09,
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      {digit}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error shake overlay */}
          <AnimatePresence>
            {verifyStage === "error" && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center gap-3"
                initial={{ x: 0 }}
                animate={{ x: [0, -16, 16, -12, 12, -6, 6, 0] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {Array.from({ length: PIN_LENGTH }, (_, i) => (
                  <div
                    key={i}
                    className="flex h-14 w-11 items-center justify-center rounded-2xl border border-destructive/50 bg-destructive/15 backdrop-blur-md"
                  >
                    <span className="text-xl text-destructive">•</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Error text */}
      <AnimatePresence>
        {(error || localError) && verifyStage === "idle" && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 text-sm text-destructive"
          >
            {error || localError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Keypad */}
      <AnimatePresence>
        {showKeypad && (
          <motion.div
            key="keypad"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22 }}
            className="grid w-full max-w-[16rem] grid-cols-3 justify-items-center gap-4"
          >
            {topDigits.map((d) => (
              <button
                key={`d${d}`}
                onClick={() => press(d)}
                className="flex h-16 w-16 items-center justify-center rounded-full border border-foreground/[0.08] bg-foreground/5 text-xl font-semibold text-foreground backdrop-blur-md transition-transform active:scale-90 active:bg-foreground/10"
              >
                {d}
              </button>
            ))}
            <div />
            <button
              onClick={() => press(bottomDigit)}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-foreground/[0.08] bg-foreground/5 text-xl font-semibold text-foreground backdrop-blur-md transition-transform active:scale-90 active:bg-foreground/10"
            >
              {bottomDigit}
            </button>
            <button
              onClick={backspace}
              className="flex h-16 w-16 items-center justify-center rounded-full text-muted-foreground transition-transform active:scale-90 active:text-foreground"
              aria-label="Usuń cyfrę"
            >
              <Delete className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isVerifyPhase && verifyStage === "idle" && onForgot && (
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
