/**
 * The TENAX mark — the same shield as the launcher icon (assets/icon-only.png).
 *
 * Traced from that file rather than eyeballed: pointed crest, straight flanks,
 * and a wide checkmark. It is deliberately NOT lucide's shield-check, which is
 * what the Skupienie tab uses — the logo has to read as the logo, not as one
 * more nav icon.
 */
export function TenaxShield({
  size = 64,
  color = "currentColor",
  className,
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        d="M12 2.2 L20 5.3 L20 12.75 C20 16.6 16.9 19.8 12 21.5 C7.1 19.8 4 16.6 4 12.75 L4 5.3 Z"
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M8.5 12.2 L11 14.8 L16.1 9.3"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
