import { useEffect, useRef, useState } from "react";
import { SplashScreen as NativeSplash } from "@capacitor/splash-screen";

/** The logo blue, fixed. A mark shouldn't change colour with the theme accent. */
const LOGO_BLUE = "#3B82F6";

/** Never flash by: even an instant load holds the splash this long. */
const MIN_VISIBLE_MS = 800;
/** Beat at 100% before handing over, so the green actually registers. */
const HOLD_AT_FULL_MS = 260;
const FADE_MS = 280;

/**
 * What the bar is actually waiting for. Session and theme come off the device
 * and land immediately; the other two are network round-trips to Supabase, and
 * they're the reason there is a bar at all.
 */
export type SplashStage = {
  session: boolean;
  profile: boolean;
  today: boolean;
};

const WEIGHTS: Record<keyof SplashStage, number> = {
  session: 25,
  profile: 40,
  today: 35,
};

function targetFor(stage: SplashStage): number {
  return (Object.keys(WEIGHTS) as (keyof SplashStage)[]).reduce(
    (sum, key) => sum + (stage[key] ? WEIGHTS[key] : 0),
    0,
  );
}

/**
 * Blue → teal → green as it fills. Interpolating in oklab takes the short way
 * round the wheel, which passes through teal; the long way would run through
 * magenta and look broken.
 */
function fillColor(pct: number): string {
  return `color-mix(in oklab, var(--success) ${pct}%, var(--primary))`;
}

export function SplashScreen({
  stage,
  error,
  onRetry,
  onDone,
}: {
  stage: SplashStage;
  /** Human-readable cause, already worked out by the caller. */
  error: string | null;
  onRetry: () => void;
  onDone: () => void;
}) {
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const startedAt = useRef(Date.now());
  const finished = useRef(false);

  const target = targetFor(stage);

  // Drop the native splash only once this one has painted, so the handover has
  // no blank frame between them. Harmless no-op on web.
  useEffect(() => {
    void NativeSplash.hide({ fadeOutDuration: 0 }).catch(() => {});
  }, []);

  // Ease the displayed number toward the real one so it glides instead of
  // snapping between stages — the progress stays honest, the motion doesn't.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setShown((current) => {
        const gap = target - current;
        if (Math.abs(gap) < 0.4) return target;
        return current + gap * 0.08;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // Hand over once everything is in and the floor has elapsed.
  useEffect(() => {
    if (error || finished.current) return undefined;
    if (target < 100 || shown < 99.5) return undefined;

    finished.current = true;
    const waited = Date.now() - startedAt.current;
    const delay = Math.max(0, MIN_VISIBLE_MS - waited) + HOLD_AT_FULL_MS;
    const t = setTimeout(() => {
      setLeaving(true);
      setTimeout(onDone, FADE_MS);
    }, delay);
    return () => clearTimeout(t);
  }, [target, shown, error, onDone]);

  const pct = Math.round(shown);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-8"
      style={{
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      {/* Shield and bar are one centred block, not two stacked elements. */}
      <div className="flex w-full max-w-[260px] flex-col items-center">
        <SplashShield />

        {error ? (
          <div className="mt-8 w-full text-center">
            <p className="text-[15px] font-semibold text-foreground">{error}</p>
            <button
              onClick={onRetry}
              className="accent-gradient mt-5 h-12 w-full rounded-full text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              Spróbuj ponownie
            </button>
          </div>
        ) : (
          <div className="mt-8 w-full">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-foreground/[0.08]">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  // No CSS transition: pct already changes every frame, and a
                  // transition on top would lag a frame behind the width.
                  background: fillColor(pct),
                }}
              />
              {/* The leading edge, pushed along like water under pressure. */}
              <div
                className="splash-crest absolute inset-y-0"
                style={{
                  left: `calc(${Math.max(pct, 2)}% - 10px)`,
                  width: "20px",
                  background: `linear-gradient(90deg, transparent, ${"color-mix(in oklab, white 55%, transparent)"})`,
                }}
              />
            </div>
            <p className="mt-3 text-center text-[13px] font-semibold tabular-nums text-muted-foreground">
              {pct}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The logo's outline, split at the bottom tip so both halves draw outwards at
 * once and meet at the apex — the "two fingers" motion. Same geometry as
 * TenaxShield; only the seam is different, because a single closed path can
 * only be drawn one way round.
 */
const SHIELD_RIGHT = "M12 21.5 C16.9 19.8 20 16.6 20 12.75 L20 5.3 L12 2.2";
const SHIELD_LEFT = "M12 21.5 C7.1 19.8 4 16.6 4 12.75 L4 5.3 L12 2.2";
const SHIELD_CHECK = "M8.5 12.2 L11 14.8 L16.1 9.3";

function SplashShield() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={96}
      height={96}
      aria-hidden="true"
      style={{ animation: "splashFadeIn 0.4s ease-out both" }}
    >
      {[SHIELD_RIGHT, SHIELD_LEFT].map((d) => (
        <path
          key={d}
          className="splash-draw"
          d={d}
          pathLength={1}
          stroke={LOGO_BLUE}
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      <path
        className="splash-check"
        d={SHIELD_CHECK}
        pathLength={1}
        stroke={LOGO_BLUE}
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
