import type { SuggestionRule } from "../types";

export const PROGRESS_RULE_ID = "progress";

/** A clean run this long means the habit has stopped costing anything. */
const STREAK_REQUIRED = 7;

/**
 * Next target for a habit whose title carries a number. Small counts double
 * (5 stron → 10), bigger ones go up by half and land on a round five
 * (10 pompek → 15). A title with no number can't be raised meaningfully, so
 * those are left alone.
 */
function raiseTitle(title: string): string | null {
  const match = title.match(/\d+/);
  if (!match) return null;
  const current = Number(match[0]);
  if (!Number.isFinite(current) || current <= 0) return null;
  const next = current < 10 ? current * 2 : Math.round((current * 1.5) / 5) * 5;
  if (next <= current) return null;
  return (
    title.slice(0, match.index) + String(next) + title.slice(match.index! + match[0].length)
  );
}

/**
 * PROGRESJA — seven for seven means the habit is holding on its own. Raising
 * the bar now is the difference between building and just repeating.
 */
export const progressRule: SuggestionRule = {
  id: PROGRESS_RULE_ID,
  evaluate(ctx) {
    return ctx.stats.flatMap((s) => {
      if (s.kind !== "growth") return [];
      if (s.recentPlanned < STREAK_REQUIRED || s.recentDone < STREAK_REQUIRED) return [];
      const raised = raiseTitle(s.title);
      if (!raised) return [];
      return [
        {
          ruleId: PROGRESS_RULE_ID,
          subjectKey: s.routineId,
          observation: `${s.title} — siedem na siedem ostatnich razy.`,
          advice:
            `Podnieś poprzeczkę do „${raised}". Nawyk już się trzyma, więc ` +
            `teraz ma sens go rozbudować, a nie tylko powtarzać.`,
          action: { type: "raise_bar" as const, routineId: s.routineId, title: raised },
        },
      ];
    });
  },
};
