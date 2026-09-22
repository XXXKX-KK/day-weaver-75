import { shrinkRule } from "./rules/shrink";
import { mergeRule } from "./rules/merge";
import type { Suggestion, SuggestionContext, SuggestionRule } from "./types";

export type {
  RoutineStat,
  ShownEvent,
  Suggestion,
  SuggestionAction,
  SuggestionContext,
  SuggestionRule,
} from "./types";
export { SHRINK_RULE_ID } from "./rules/shrink";
export { MERGE_RULE_ID } from "./rules/merge";

/** Two a day, maximum. Advice stops being advice when it becomes a feed. */
export const MAX_PER_DAY = 2;

/** The second slot waits until the day is half done. */
const SECOND_SLOT_PROGRESS = 0.5;

/**
 * Order is priority. Shrinking a habit the user is already failing comes before
 * anything that adds to their plate.
 */
const RULES: SuggestionRule[] = [shrinkRule, mergeRule];

/**
 * The one suggestion to show right now, or null when there is nothing worth
 * saying — in which case the card doesn't render at all.
 *
 * A suggestion already shown today is skipped, but there is no cooldown across
 * days: something dismissed today may well be the right call tomorrow.
 */
export function pickSuggestion(ctx: SuggestionContext): Suggestion | null {
  if (ctx.shownToday.length >= MAX_PER_DAY) return null;
  if (ctx.shownToday.length >= 1 && ctx.dayProgress < SECOND_SLOT_PROGRESS) return null;

  const seen = new Set(ctx.shownToday.map((e) => `${e.ruleId}:${e.subjectKey}`));
  for (const rule of RULES) {
    for (const suggestion of rule.evaluate(ctx)) {
      if (seen.has(`${suggestion.ruleId}:${suggestion.subjectKey}`)) continue;
      return suggestion;
    }
  }
  return null;
}
