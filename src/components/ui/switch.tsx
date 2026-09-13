import * as React from "react";
import { cn } from "@/lib/utils";

function vibrate() {
  try {
    navigator.vibrate?.(50);
  } catch {}
}

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
  ({ checked: controlledChecked, defaultChecked = false, onCheckedChange, disabled, className, ...props }, ref) => {
    const [internal, setInternal] = React.useState(defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const on = isControlled ? controlledChecked : internal;

    const toggle = React.useCallback(() => {
      if (disabled) return;
      const next = !on;
      if (!isControlled) setInternal(next);
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
          "peer relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-2xl transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          on
            ? "bg-primary border border-primary"
            : "bg-foreground/[0.12] border border-foreground/[0.08]",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-transform duration-300",
            on ? "translate-x-[21px]" : "translate-x-[1px]",
          )}
        />
      </button>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };
export type { SwitchProps };
