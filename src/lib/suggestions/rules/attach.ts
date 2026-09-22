import { STARTER_HABITS } from "@/lib/day-survey";
import type { GrowthArea } from "@/lib/store";
import type { SuggestionContext, SuggestionRule } from "../types";

export const ATTACH_RULE_ID = "attach";

/** Rock-solid means rock-solid — anything less isn't worth hanging a habit on. */
const DONE_RATIO_MIN = 0.9;
const MIN_OCCURRENCES = 7;

/** The smallest habit each area opens with, reused from the starter map. */
function smallHabit(ctx: SuggestionContext, area: GrowthArea) {
  return STARTER_HABITS[area][ctx.surveyLevels[area] ?? "none"];
}

/**
 * PODCZEPIENIE — the user has a routine they never miss and an area they said
 * they care about. Hanging one on the other borrows the reliability instead of
 * asking for fresh willpower.
 */
export const attachRule: SuggestionRule = {
  id: ATTACH_RULE_ID,
  evaluate(ctx) {
    const solid = ctx.stats.filter(
      (s) =>
        s.kind === "maintenance" &&
        !s.hasAnchoredHabit &&
        s.occurrences14 >= MIN_OCCURRENCES &&
        s.done14 / s.occurrences14 >= DONE_RATIO_MIN,
    );

    return ctx.surveyAreas.flatMap((area) =>
      solid.map((s) => {
        const habit = smallHabit(ctx, area);
        return {
          ruleId: ATTACH_RULE_ID,
          subjectKey: `${area}:${s.routineId}`,
          observation: `${s.title} robisz ${s.done14} razy na ${s.occurrences14}.`,
          advice:
            `Dopnij do tego „${habit.title}". Nawyk, który wisi na czymś ` +
            `pewnym, nie potrzebuje osobnej siły woli.`,
          action: {
            type: "add_habit" as const,
            title: habit.title,
            area,
            weekdays: s.weekdays,
            anchorRoutineId: s.routineId,
          },
        };
      }),
    );
  },
};
