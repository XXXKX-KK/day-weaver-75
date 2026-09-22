import type { RoutineStat, Suggestion, SuggestionRule } from "../types";

export const MERGE_RULE_ID = "merge";

const MIN_OCCURRENCES = 10;
const STRONG_RATIO_MIN = 0.7;
const WEAK_RATIO_MAX = 0.4;

/**
 * Things that genuinely belong in one step. Matching by these beats matching by
 * clock time, because "same hour" can pair two unrelated habits whereas these
 * pairs are the same physical action.
 */
const PAIR_DICTIONARY: { weak: string[]; strong: string[] }[] = [
  {
    weak: ["kreatyn", "cytrulin", "suplement"],
    strong: ["białk", "bialk", "shake", "odżywk", "odzywk"],
  },
  { weak: ["witamin"], strong: ["śniadan", "sniadan"] },
];

function matchesAny(title: string, needles: string[]): boolean {
  const lower = title.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

function inDictionary(weak: RoutineStat, strong: RoutineStat): boolean {
  return PAIR_DICTIONARY.some(
    (pair) => matchesAny(weak.title, pair.weak) && matchesAny(strong.title, pair.strong),
  );
}

function sameDays(a: RoutineStat, b: RoutineStat): boolean {
  if (a.weekdays.length !== b.weekdays.length) return false;
  const sortedA = [...a.weekdays].sort((x, y) => x - y);
  const sortedB = [...b.weekdays].sort((x, y) => x - y);
  return sortedA.every((d, i) => d === sortedB[i]);
}

function sameTime(a: RoutineStat, b: RoutineStat): boolean {
  return a.scheduledTime !== null && a.scheduledTime === b.scheduledTime;
}

/**
 * SCALENIE — one habit runs on rails, a related one keeps slipping. Hanging the
 * weak one off the strong one turns two things to remember into one.
 *
 * A pair only qualifies if the dictionary or the clock says they belong
 * together; merging two unrelated habits would be worse advice than none.
 */
export const mergeRule: SuggestionRule = {
  id: MERGE_RULE_ID,
  evaluate(ctx) {
    const eligible = ctx.stats.filter((s) => s.occurrences30 >= MIN_OCCURRENCES);
    const strong = eligible.filter((s) => s.done30 / s.occurrences30 >= STRONG_RATIO_MIN);
    const weak = eligible.filter((s) => s.done30 / s.occurrences30 <= WEAK_RATIO_MAX);

    const scored: { suggestion: Suggestion; score: number }[] = [];
    for (const w of weak) {
      for (const s of strong) {
        if (w.routineId === s.routineId) continue;
        if (!sameDays(w, s)) continue;

        const score = inDictionary(w, s) ? 2 : sameTime(w, s) ? 1 : 0;
        if (score === 0) continue;

        scored.push({
          score,
          suggestion: {
            ruleId: MERGE_RULE_ID,
            subjectKey: `${s.routineId}:${w.routineId}`,
            observation:
              `${w.title} wychodzi ${w.done30} razy na ${w.occurrences30}, ` +
              `${s.title} — ${s.done30} na ${s.occurrences30}.`,
            advice:
              `Dopnij „${w.title}" jako krok do „${s.title}". Jeden nawyk ` +
              `zamiast dwóch, a ten słabszy przestaje zależeć od pamięci.`,
            action: {
              type: "merge" as const,
              sourceRoutineId: w.routineId,
              targetRoutineId: s.routineId,
            },
          },
        });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.suggestion);
  },
};
