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
          "peer relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          on
            ? "bg-primary border border-primary/60"
            : "bg-foreground/10 backdrop-blur-sm border border-foreground/10",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            on ? "translate-x-[22px]" : "translate-x-[3px]",
          )}
        />
      </button>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };
export type { SwitchProps };
