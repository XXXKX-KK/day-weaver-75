import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * „Liquid glass" — szklana pigułka, a w niej świecąca kula zamiast białej
 * kropki. Kula jest jednocześnie gałką i źródłem światła: poświata wylewa się
 * poza szkło i rozświetla tę stronę pigułki, po której kula stoi.
 *
 * Świeci kolorem akcentu (`--primary`), a nie fioletem na sztywno: akcent jest
 * w TENAX wymienny, więc przełącznik ma się zmieniać razem z resztą apki.
 *
 * Poprzednia wersja (płaska pigułka: `bg-primary` po włączeniu, `bg-foreground/12`
 * po wyłączeniu, białe kółko bez sprężystości) siedzi w historii gita — wraca
 * jednym `git checkout main -- src/components/ui/switch.tsx`.
 */

function vibrate() {
  try {
    navigator.vibrate?.(50);
  } catch {}
}

/** Wymiary pigułki. Te same co wcześniej, żeby nic w ustawieniach nie skakało. */
const TRACK_W = 44;
const TRACK_H = 26;
const KNOB = 22;
const PAD = 2;
const TRAVEL = TRACK_W - KNOB - PAD * 2;
/** Poświata jest sporo większa od kuli — ma się rozlewać poza pigułkę. */
const HALO = 40;
/** Lekkie przestrzelenie na końcu ruchu: kula „dobija" do krawędzi. */
const SPRING = "cubic-bezier(.34,1.56,.64,1)";
/** Jak długo kula jest rozciągnięta w kierunku ruchu. */
const SQUISH_MS = 220;

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    const [internal, setInternal] = React.useState(defaultChecked);
    const [squish, setSquish] = React.useState(false);
    const squishTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const isControlled = controlledChecked !== undefined;
    const on = isControlled ? controlledChecked : internal;

    React.useEffect(
      () => () => {
        if (squishTimer.current) clearTimeout(squishTimer.current);
      },
      [],
    );

    const toggle = React.useCallback(() => {
      if (disabled) return;
      const next = !on;
      if (!isControlled) setInternal(next);
      // Rozciągnięcie trwa tylko tyle, co ruch — potem kula wraca do koła.
      setSquish(true);
      if (squishTimer.current) clearTimeout(squishTimer.current);
      squishTimer.current = setTimeout(() => setSquish(false), SQUISH_MS);
      vibrate();
      onCheckedChange?.(next);
    }, [disabled, on, isControlled, onCheckedChange]);

    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        ref={ref}
        onClick={toggle}
        className={cn(
          "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full border backdrop-blur-md transition-[border-color,background-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        style={{
          width: TRACK_W,
          height: TRACK_H,
          background: on
            ? "color-mix(in oklab, var(--primary) 8%, color-mix(in oklab, var(--foreground) 5%, transparent))"
            : "color-mix(in oklab, var(--foreground) 8%, transparent)",
          borderColor: on
            ? "color-mix(in oklab, var(--primary) 40%, transparent)"
            : "color-mix(in oklab, var(--foreground) 12%, transparent)",
        }}
        {...props}
      >
        {/* Przesuwanie siedzi na zewnętrznym elemencie, a rozciąganie na
            wewnętrznym — inaczej jedno nadpisywałoby drugie w `transform`. */}
        <span
          className="pointer-events-none absolute transition-transform duration-[380ms] motion-reduce:transition-none"
          style={{
            left: PAD,
            transform: `translateX(${on ? TRAVEL : 0}px)`,
            transitionTimingFunction: SPRING,
          }}
        >
          {/* Poświata pod kulą. Pigułka nie ma `overflow-hidden`, więc światło
              wylewa się poza szkło — tak jak na wzorze. */}
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full transition-opacity duration-[380ms] motion-reduce:transition-none"
            style={{
              width: HALO,
              height: HALO,
              left: (KNOB - HALO) / 2,
              top: (KNOB - HALO) / 2,
              opacity: on ? 1 : 0,
              background:
                "radial-gradient(circle, var(--primary) 0%, color-mix(in oklab, var(--primary) 60%, transparent) 38%, transparent 68%)",
              filter: "blur(5px)",
            }}
          />

          <span
            className="relative block rounded-full transition-[transform,background] duration-200 ease-out motion-reduce:transition-none"
            style={{
              width: KNOB,
              height: KNOB,
              transform: squish ? "scaleX(1.18) scaleY(0.9)" : "scaleX(1)",
              background: on
                ? "radial-gradient(circle at 34% 28%, color-mix(in oklab, var(--primary) 45%, white) 0%, var(--primary) 52%, color-mix(in oklab, var(--primary) 78%, black) 100%)"
                : "radial-gradient(circle at 34% 28%, color-mix(in oklab, var(--foreground) 62%, transparent) 0%, color-mix(in oklab, var(--foreground) 38%, transparent) 100%)",
              boxShadow: on
                ? "0 0 10px 1px color-mix(in oklab, var(--primary) 75%, transparent), inset 0 1px 1px color-mix(in oklab, white 45%, transparent)"
                : "0 1px 3px rgba(0,0,0,0.35), inset 0 1px 1px color-mix(in oklab, white 20%, transparent)",
            }}
          />
        </span>
      </button>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };
export type { SwitchProps };
