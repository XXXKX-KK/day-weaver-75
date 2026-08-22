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
          d="M32 4L8 16v16c0 14.4 10.24 27.84 24 32 13.76-4.16 24-17.6 24-32V16L32 4Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M20 33l8.5 8.5L44 24"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
