import { cn } from "@/lib/utils";

/**
 * TENAX shield-checkmark logo. The symbol color inherits the app's accent
 * via `currentColor` + the `text-primary` utility — when the user changes
 * the accent in Settings the logo updates automatically.
 */
export function TenaxLogo({ className, size = 56 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[22%] bg-[#161618]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size * 0.6, height: size * 0.6 }}
        aria-hidden="true"
      >
        <path
          d="M32 12L18 21v10c0 9.6 6.7 18.5 14 21.3 7.3-2.8 14-11.7 14-21.3V21L32 12Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M24.5 33l5 5L38 27"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
