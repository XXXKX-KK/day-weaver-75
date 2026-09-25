import { useEffect, useRef, useState } from "react";
import { SplashScreen as NativeSplash } from "@capacitor/splash-screen";
/** The logo blue, fixed. A mark shouldn't change colour with the theme accent. */
import { LOGO_BLUE } from "@/lib/accent";

/** Never flash by: even an instant load holds the splash this long. */
const MIN_VISIBLE_MS = 800;
/** Beat at 100% before handing over, so the green actually registers. */
const HOLD_AT_FULL_MS = 260;
const FADE_MS = 280;
/** A splash must never be able to trap the user, whatever goes wrong upstream. */
const FAILSAFE_MS = 10000;

/**
 * What the bar is actually waiting for. Session and theme come off the device
 * and land immediately; the other two are network round-trips to Supabase, and
 * they're the reason there is a bar at all.
 */
export type SplashStage = {
  session: boolean;
  profile: boolean;
  today: boolean;
  /** Also waited on so yesterday's summary can open straight off the splash,
   *  instead of Dziś flashing underneath it for a frame. */
  yesterday: boolean;
};

const STAGE_ORDER: (keyof SplashStage)[] = ["session", "profile", "today", "yesterday"];
const WEIGHTS: Record<keyof SplashStage, number> = {
  session: 20,
  profile: 30,
  today: 30,
  yesterday: 20,
};

/** How much has genuinely finished. */
function settledPct(stage: SplashStage): number {
  return STAGE_ORDER.reduce((sum, key) => sum + (stage[key] ? WEIGHTS[key] : 0), 0);
}

/** The milestone currently being worked towards — the bar creeps at it, never past. */
function ceilingPct(stage: SplashStage): number {
  let done = 0;
  for (const key of STAGE_ORDER) {
    if (stage[key]) {
      done += WEIGHTS[key];
      continue;
    }
    return done + WEIGHTS[key];
  }
  return 100;
}

/**
 * Blue → teal → green as it fills, biased late: a linear mix is already half
 * green at half way, which spends the payoff before the bar gets there.
 *
 * Starts from the logo blue rather than --primary, so the run is the same every
 * time — under the theme accent it would open purple or pink for some users.
 */
function fillColor(pct: number): string {
  const green = Math.round((pct / 100) ** 3 * 100);
  return `color-mix(in oklab, var(--success) ${green}%, ${LOGO_BLUE})`;
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
  const armed = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Held in a ref so the finishing effect never depends on the caller passing a
  // stable function — an unstable one used to cancel the hand-over timer.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const settled = settledPct(stage);
  const ceiling = ceilingPct(stage);
  const complete = settled >= 100;

  // Drop the native splash only once this one has painted, so the handover has
  // no blank frame between them. Harmless no-op on web.
  useEffect(() => {
    void NativeSplash.hide({ fadeOutDuration: 0 }).catch(() => {});
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) clearTimeout(t);
    };
  }, []);

  /**
   * Between milestones the bar creeps towards the next one without reaching it.
   * That isn't invented progress — it's time spent on the stage that really is
   * running — and it keeps a slow network looking like waiting rather than a
   * freeze. Once everything has landed it sprints to 100.
   */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setShown((current) => {
        if (complete) {
          const gap = 100 - current;
          return gap < 0.4 ? 100 : current + gap * 0.1;
        }
        const gap = ceiling - current;
        return gap <= 0 ? current : current + gap * 0.018;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ceiling, complete]);

  const handOver = useRef(() => {
    if (finished.current) return;
    finished.current = true;
    setLeaving(true);
    timers.current.push(setTimeout(() => onDoneRef.current(), FADE_MS));
  });

  // Hand over once everything is in and the floor has elapsed. The timer lives
  // in a ref and is cleared only on unmount, so a re-render can't cancel it —
  // that is exactly what used to leave the splash stuck at 100%.
  useEffect(() => {
    if (error || armed.current || !complete || shown < 99.5) return;
    armed.current = true;
    const waited = Date.now() - startedAt.current;
    const delay = Math.max(0, MIN_VISIBLE_MS - waited) + HOLD_AT_FULL_MS;
    timers.current.push(setTimeout(() => handOver.current(), delay));
  }, [complete, shown, error]);

  // Last resort. Whatever happened upstream, the app is more useful than a
  // stuck splash — its own screens can show their own retry states.
  useEffect(() => {
    const t = setTimeout(() => handOver.current(), FAILSAFE_MS);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, []);

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
            <div
              className="relative h-2.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]"
              style={{
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  // No CSS transition: pct already changes every frame, and a
                  // transition on top would lag a frame behind the width.
                  background: fillColor(pct),
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                }}
              >
                {/* A gleam travelling the length of the fill, over and over —
                    flow rather than the single pulsing chunk a game bar uses. */}
                <div className="splash-flow absolute inset-y-0 w-1/2" />
              </div>
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
