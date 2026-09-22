import type { GrowthArea, Priority, RoutineKind } from "@/lib/store";

/**
 * Everything the rules are allowed to look at. Pure data — no Supabase, no
 * React — so each rule stays a function you can call from a test with numbers
 * taken straight off a real account.
 */

/** One routine plus how it actually went, over the two windows rules use. */
export type RoutineStat = {
  routineId: string;
  title: string;
  kind: RoutineKind;
  area: GrowthArea | null;
  priority: Priority;
  /** ISO weekday numbers, 1=Mon .. 7=Sun. */
  weekdays: number[];
  /** "HH:MM" or null when the routine has no fixed time. */
  scheduledTime: string | null;
  /** Times it appeared in a plan, and how many of those were done. The windows
   *  end yesterday — today is still in progress and would skew every ratio. */
  occurrences30: number;
  done30: number;
  occurrences21: number;
  done21: number;
};

/** A suggestion the user already saw today, so it isn't offered twice. */
export type ShownEvent = { ruleId: string; subjectKey: string };

export type SuggestionContext = {
  stats: RoutineStat[];
  shownToday: ShownEvent[];
  /** Completion of today's plan, 0..1. Gates the second daily slot. */
  dayProgress: number;
};

/** What "Dodaj do planu" does when accepted. */
export type SuggestionAction =
  /** Fold `sourceRoutineId` into `targetRoutineId` as a subtask, archive it. */
  | { type: "merge"; sourceRoutineId: string; targetRoutineId: string }
  /** Drop a smaller one-off version of a routine into today's plan. */
  | {
      type: "add_lighter";
      routineId: string;
      title: string;
      kind: RoutineKind;
      priority: Priority;
    }
  /** Add a brand-new habit as a routine, optionally anchored. */
  | {
      type: "add_habit";
      title: string;
      area: GrowthArea;
      weekdays: number[];
      anchorRoutineId: string | null;
    }
  /** Rewrite a routine's title when the user has outgrown it. */
  | { type: "raise_bar"; routineId: string; title: string };

export type Suggestion = {
  ruleId: string;
  /** Identifies what the suggestion is about (a routine id, or a pair), so the
   *  same advice isn't repeated on the same day. */
  subjectKey: string;
  /** One sentence of fact, straight from the data. */
  observation: string;
  /** The advice plus why it works. Never a question, never a reproach. */
  advice: string;
  action: SuggestionAction;
};

export type SuggestionRule = {
  id: string;
  evaluate(ctx: SuggestionContext): Suggestion[];
};
