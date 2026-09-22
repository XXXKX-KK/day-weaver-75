import { describe, expect, it } from "vitest";
import { pickSuggestion, MERGE_RULE_ID, SHRINK_RULE_ID } from "./index";
import { shrinkRule } from "./rules/shrink";
import { mergeRule } from "./rules/merge";
import type { RoutineStat, SuggestionContext } from "./types";

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

function stat(
  over: Partial<RoutineStat> & { routineId: string; title: string },
): RoutineStat {
  return {
    kind: "maintenance",
    area: null,
    priority: "normal",
    weekdays: ALL_DAYS,
    scheduledTime: null,
    occurrences30: 0,
    done30: 0,
    occurrences21: 0,
    done21: 0,
    ...over,
  };
}

function ctx(over: Partial<SuggestionContext> = {}): SuggestionContext {
  return { stats: [], shownToday: [], dayProgress: 0, ...over };
}

// Numbers taken from the author's own 30 days.
const kreatyna = stat({
  routineId: "kreatyna",
  title: "Kreatyna",
  occurrences30: 30,
  done30: 8,
});
const bialko = stat({
  routineId: "bialko",
  title: "Białko",
  occurrences30: 30,
  done30: 23,
});
const trening = stat({
  routineId: "trening",
  title: "Trening brzucha",
  kind: "growth",
  area: "body",
  occurrences21: 9,
  done21: 4,
});

describe("ZMNIEJSZENIE", () => {
  it("fires for a growth habit done 4 of 9", () => {
    const [suggestion] = shrinkRule.evaluate(ctx({ stats: [trening] }));
    expect(suggestion?.observation).toBe("Trening brzucha wpadł 4 razy na 9.");
    expect(suggestion?.action).toEqual({
      type: "add_lighter",
      routineId: "trening",
      title: "Trening brzucha — wersja 5 min",
      kind: "growth",
      priority: "normal",
    });
  });

  it("ignores maintenance routines, however badly they go", () => {
    const upkeep = { ...trening, kind: "maintenance" as const };
    expect(shrinkRule.evaluate(ctx({ stats: [upkeep] }))).toHaveLength(0);
  });

  it("stays quiet below the sample floor", () => {
    const thin = { ...trening, occurrences21: 3, done21: 1 };
    expect(shrinkRule.evaluate(ctx({ stats: [thin] }))).toHaveLength(0);
  });

  it("stays quiet once the habit is landing more than half the time", () => {
    const fine = { ...trening, occurrences21: 10, done21: 6 };
    expect(shrinkRule.evaluate(ctx({ stats: [fine] }))).toHaveLength(0);
  });
});

describe("SCALENIE", () => {
  it("pairs kreatyna (8/30) with białko (23/30) from the dictionary", () => {
    const [suggestion] = mergeRule.evaluate(ctx({ stats: [kreatyna, bialko] }));
    expect(suggestion?.observation).toBe(
      "Kreatyna wychodzi 8 razy na 30, Białko — 23 na 30.",
    );
    expect(suggestion?.action).toEqual({
      type: "merge",
      sourceRoutineId: "kreatyna",
      targetRoutineId: "bialko",
    });
  });

  it("will not merge routines that run on different days", () => {
    const mondayOnly = { ...bialko, weekdays: [1] };
    expect(mergeRule.evaluate(ctx({ stats: [kreatyna, mondayOnly] }))).toHaveLength(0);
  });

  it("will not merge unrelated habits that merely fail together", () => {
    const unrelated = stat({
      routineId: "pranie",
      title: "Pranie",
      occurrences30: 30,
      done30: 8,
    });
    const strong = stat({
      routineId: "lozko",
      title: "Posłać łóżko",
      occurrences30: 30,
      done30: 28,
    });
    expect(mergeRule.evaluate(ctx({ stats: [unrelated, strong] }))).toHaveLength(0);
  });

  it("falls back to pairing by a shared time of day", () => {
    const weak = stat({
      routineId: "a",
      title: "Rozciąganie",
      occurrences30: 30,
      done30: 8,
      scheduledTime: "07:00",
    });
    const strong = stat({
      routineId: "b",
      title: "Prysznic",
      occurrences30: 30,
      done30: 28,
      scheduledTime: "07:00",
    });
    const [suggestion] = mergeRule.evaluate(ctx({ stats: [weak, strong] }));
    expect(suggestion?.action).toEqual({
      type: "merge",
      sourceRoutineId: "a",
      targetRoutineId: "b",
    });
  });

  it("needs at least ten occurrences on both sides", () => {
    const thinWeak = { ...kreatyna, occurrences30: 9, done30: 2 };
    expect(mergeRule.evaluate(ctx({ stats: [thinWeak, bialko] }))).toHaveLength(0);
  });

  it("prefers the dictionary pair over one that only shares a time", () => {
    const timeOnly = stat({
      routineId: "inne",
      title: "Rozciąganie",
      occurrences30: 30,
      done30: 28,
      scheduledTime: "08:00",
    });
    const kreatynaTimed = { ...kreatyna, scheduledTime: "08:00" };
    const [first] = mergeRule.evaluate(
      ctx({ stats: [kreatynaTimed, timeOnly, bialko] }),
    );
    expect(first?.action).toMatchObject({ targetRoutineId: "bialko" });
  });
});

describe("pickSuggestion", () => {
  it("puts ZMNIEJSZENIE ahead of SCALENIE when both apply", () => {
    const picked = pickSuggestion(ctx({ stats: [kreatyna, bialko, trening] }));
    expect(picked?.ruleId).toBe(SHRINK_RULE_ID);
  });

  it("renders nothing when no rule matches", () => {
    expect(pickSuggestion(ctx({ stats: [bialko] }))).toBeNull();
  });

  it("holds the second slot until the day is half done", () => {
    const shown = [{ ruleId: SHRINK_RULE_ID, subjectKey: "trening" }];
    expect(
      pickSuggestion(ctx({ stats: [kreatyna, bialko], shownToday: shown, dayProgress: 0.3 })),
    ).toBeNull();
    expect(
      pickSuggestion(ctx({ stats: [kreatyna, bialko], shownToday: shown, dayProgress: 0.5 }))
        ?.ruleId,
    ).toBe(MERGE_RULE_ID);
  });

  it("never shows a third suggestion the same day", () => {
    const shown = [
      { ruleId: SHRINK_RULE_ID, subjectKey: "x" },
      { ruleId: MERGE_RULE_ID, subjectKey: "y" },
    ];
    expect(
      pickSuggestion(
        ctx({ stats: [kreatyna, bialko, trening], shownToday: shown, dayProgress: 1 }),
      ),
    ).toBeNull();
  });

  it("does not repeat the same suggestion on the same day", () => {
    const shown = [{ ruleId: SHRINK_RULE_ID, subjectKey: "trening" }];
    const picked = pickSuggestion(
      ctx({ stats: [trening], shownToday: shown, dayProgress: 1 }),
    );
    expect(picked).toBeNull();
  });
});
