import type { SuggestionRule } from "../types";

export const SHRINK_RULE_ID = "shrink";

/** Below this, the habit is clearly too big for where the user is right now. */
const DONE_RATIO_MAX = 0.5;
/** Fewer than this and the sample says nothing. */
const MIN_OCCURRENCES = 4;

/**
 * ZMNIEJSZENIE — a growth habit that keeps getting skipped is too big, not the
 * user's fault. Offer a five-minute version for today so the chain survives.
 */
export const shrinkRule: SuggestionRule = {
  id: SHRINK_RULE_ID,
  evaluate(ctx) {
    return ctx.stats
      .filter(
        (s) =>
          s.kind === "growth" &&
          s.occurrences21 >= MIN_OCCURRENCES &&
          s.done21 / s.occurrences21 <= DONE_RATIO_MAX,
      )
      .map((s) => ({
        ruleId: SHRINK_RULE_ID,
        subjectKey: s.routineId,
        observation: `${s.title} wpadł ${s.done21} razy na ${s.occurrences21}.`,
        advice:
          "Lepiej zrobić 5 minut niż nic. Krótsza wersja utrzyma nawyk przy " +
          "życiu, a pełna wróci, jak wejdzie w rutynę.",
        action: {
          type: "add_lighter" as const,
          routineId: s.routineId,
          title: `${s.title} — wersja 5 min`,
          kind: s.kind,
          priority: s.priority,
        },
      }));
  },
};
