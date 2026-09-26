import { STARTER_HABITS } from "@/lib/day-survey";
import { AREA_LABELS } from "@/lib/store";
import type { SuggestionRule } from "../types";

export const GAP_RULE_ID = "gap";

/**
 * LUKA — an area the user named in the survey that has had nothing in the plan.
 * The opening move is the same starter habit the survey would have given them,
 * because a concrete small thing beats renewing the intention.
 *
 * The survey stopped asking about areas (version 3), so for anyone who signed
 * up after that there is nothing to compare against and the rule stays quiet.
 */
export const gapRule: SuggestionRule = {
  id: GAP_RULE_ID,
  evaluate(ctx) {
    if (ctx.surveyAreas.length === 0) return [];
    return ctx.surveyAreas
      .filter(
        (area) =>
          !ctx.stats.some(
            (s) => s.kind === "growth" && s.area === area && s.occurrences14 > 0,
          ),
      )
      .map((area) => {
        const habit = STARTER_HABITS[area][ctx.surveyLevels[area] ?? "none"];
        return {
          ruleId: GAP_RULE_ID,
          subjectKey: area,
          observation: `${AREA_LABELS[area]}: od dwóch tygodni nic w planie.`,
          advice:
            `Wróć małym krokiem — „${habit.title}". Jeden konkret w planie ` +
            `robi więcej niż kolejne postanowienie.`,
          action: {
            type: "add_habit" as const,
            title: habit.title,
            area,
            weekdays: habit.weekdays,
            anchorRoutineId: null,
          },
        };
      });
  },
};
