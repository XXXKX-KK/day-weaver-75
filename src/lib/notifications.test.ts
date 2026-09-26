import { describe, expect, it } from "vitest";
import { buildNotifications, isDayStreakCounted, type NotificationState } from "./notifications";
import type { DayItemRow, TodayData } from "./day";

/**
 * Wieczorne przypomnienie. Reguly sa dwie: przypominamy tylko wtedy, gdy cos
 * zostalo do zrobienia, a passa straszy tylko wtedy, gdy dzien jej jeszcze nie
 * zaliczyl (prog 45%, ten sam co w recompute_streak()).
 */

const EVENING_ID = 1002;

function state(over: Partial<NotificationState> = {}): NotificationState {
  return {
    dayStartTime: null,
    dayEndTime: "21:00",
    undoneCount: 0,
    streak: 0,
    streakCounted: false,
    ...over,
  };
}

const evening = (s: NotificationState) =>
  buildNotifications(s).find((n) => n.id === EVENING_ID)?.body ?? null;

function today(total: number, done: number, counted = false): TodayData {
  const items = Array.from({ length: total }, (_, i) => ({
    id: String(i),
    status: i < done ? "done" : "pending",
  })) as DayItemRow[];
  return {
    status: "in_progress",
    day: {
      id: "d",
      date: "2026-09-26",
      status: "in_progress",
      planned_count: total,
      completed_count: done,
      streak_counted: counted,
    },
    items,
  };
}

describe("wieczorne przypomnienie", () => {
  it("3 z 10 zrobione: przypomina o reszcie i o passie", () => {
    expect(evening(state({ undoneCount: 7, streak: 4, streakCounted: false }))).toBe(
      "Masz jeszcze 7 rzeczy do zrobienia. Nie strać swojej passy 4 dni!",
    );
  });

  it("5 z 10 zrobione: passa juz zaliczona, zostaje sama reszta", () => {
    expect(evening(state({ undoneCount: 5, streak: 4, streakCounted: true }))).toBe(
      "Masz jeszcze 5 rzeczy do zrobienia.",
    );
  });

  it("10 z 10 zrobione: nie ma powiadomienia", () => {
    expect(evening(state({ undoneCount: 0, streak: 4, streakCounted: true }))).toBeNull();
  });

  it("nic do zrobienia i passa niezaliczona: dalej nie ma powiadomienia", () => {
    expect(evening(state({ undoneCount: 0, streak: 4, streakCounted: false }))).toBeNull();
  });

  it("bez passy: samo przypomnienie o reszcie", () => {
    expect(evening(state({ undoneCount: 1, streak: 0 }))).toBe(
      "Masz jeszcze 1 rzecz do zrobienia.",
    );
  });
});

describe("isDayStreakCounted", () => {
  it("4 z 10 to za malo", () => {
    expect(isDayStreakCounted(today(10, 4))).toBe(false);
  });

  it("5 z 10 przekracza prog od razu, bez czekania na baze", () => {
    expect(isDayStreakCounted(today(10, 5))).toBe(true);
  });

  it("flaga z bazy wygrywa po odznaczeniu pozycji", () => {
    expect(isDayStreakCounted(today(10, 2, true))).toBe(true);
  });

  it("pusty dzien nie zalicza passy", () => {
    expect(isDayStreakCounted(today(0, 0))).toBe(false);
    expect(isDayStreakCounted(undefined)).toBe(false);
  });
});
