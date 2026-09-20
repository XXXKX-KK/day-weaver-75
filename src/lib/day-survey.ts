import type { NewRoutineInput } from "@/lib/routines";

export type WakeUp = "early" | "mid" | "late";
export type WorkType = "office" | "remote" | "student" | "free";
export type FocusCount = 1 | 2 | 3;
export type Goal = "fitness" | "learning" | "home" | "calm";

export type SurveyAnswers = {
  wakeUp: WakeUp;
  workType: WorkType;
  workStart: string;
  workEnd: string;
  focusCount: FocusCount;
  goals: Goal[];
};

export const DEFAULT_ANSWERS: SurveyAnswers = {
  wakeUp: "mid",
  workType: "office",
  workStart: "09:00",
  workEnd: "17:00",
  focusCount: 2,
  goals: [],
};

export const WAKE_OPTIONS: { value: WakeUp; label: string; time: string }[] = [
  { value: "early", label: "Przed 7:00", time: "06:00" },
  { value: "mid", label: "7:00 – 9:00", time: "07:30" },
  { value: "late", label: "Po 9:00", time: "09:30" },
];

export const WORK_OPTIONS: { value: WorkType; label: string }[] = [
  { value: "office", label: "Praca biurowa" },
  { value: "remote", label: "Praca zdalna" },
  { value: "student", label: "Nauka / studia" },
  { value: "free", label: "Brak stałych godzin" },
];

export const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "fitness", label: "Ruch / trening" },
  { value: "learning", label: "Nauka / czytanie" },
  { value: "home", label: "Porządki w domu" },
  { value: "calm", label: "Spokój / oddech" },
];

function morningTime(w: WakeUp): string {
  const map: Record<WakeUp, string> = { early: "06:00", mid: "07:30", late: "09:30" };
  return map[w];
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function generateRoutines(answers: SurveyAnswers): NewRoutineInput[] {
  const routines: NewRoutineInput[] = [];
  const allDays: number[] = [1, 2, 3, 4, 5, 6, 7];
  const weekdays: number[] = [1, 2, 3, 4, 5];

  const mTime = morningTime(answers.wakeUp);

  routines.push({
    title: "Poranny reset",
    priority: "normal",
    weekdays: allDays,
    scheduled_time: mTime,
    subtasks: ["Szklanka wody", "Przejrzyj plan dnia", "Rozciąganie 5 min"],
  });

  let effectiveFocus = answers.focusCount;
  if (answers.goals.includes("calm") && effectiveFocus > 1) {
    effectiveFocus = (effectiveFocus - 1) as FocusCount;
  }

  const hasFixedHours = answers.workType !== "free";
  const focusDays = answers.workType === "student" ? allDays : weekdays;

  for (let i = 0; i < effectiveFocus; i++) {
    let time: string;
    if (hasFixedHours) {
      const startMinutes =
        parseInt(answers.workStart.split(":")[0]) * 60 +
        parseInt(answers.workStart.split(":")[1]);
      const endMinutes =
        parseInt(answers.workEnd.split(":")[0]) * 60 +
        parseInt(answers.workEnd.split(":")[1]);
      const span = endMinutes - startMinutes;
      const slot = Math.floor(span / (effectiveFocus + 1));
      time = addMinutes(answers.workStart, slot * (i + 1));
    } else {
      const base = addMinutes(mTime, 90);
      time = addMinutes(base, i * 120);
    }

    const label = effectiveFocus === 1 ? "Głęboka praca" : `Głęboka praca ${i + 1}`;
    routines.push({
      title: label,
      priority: "high",
      weekdays: focusDays,
      scheduled_time: time,
      subtasks: ["Wycisz powiadomienia", "Włącz Skupienie", "Blok pracy bez telefonu"],
    });
  }

  for (const goal of answers.goals) {
    if (goal === "fitness") {
      routines.push({
        title: "Trening",
        priority: "normal",
        weekdays: weekdays,
        subtasks: ["Rozgrzewka", "Ćwiczenia 30 min", "Rozciąganie"],
      });
    }
    if (goal === "learning") {
      routines.push({
        title: "Nauka / czytanie",
        priority: "normal",
        weekdays: allDays,
        subtasks: ["Wybierz materiał", "Czytaj / ucz się 25 min"],
      });
    }
    if (goal === "home") {
      routines.push({
        title: "Porządki",
        priority: "low",
        weekdays: allDays,
        subtasks: ["Szybkie sprzątanie 15 min"],
      });
    }
    if (goal === "calm") {
      routines.push({
        title: "Reset / oddech",
        priority: "low",
        weekdays: allDays,
        subtasks: ["Oddychanie 5 min", "Spacer lub cisza"],
      });
    }
  }

  routines.push({
    title: "Wieczorne domknięcie",
    priority: "normal",
    weekdays: allDays,
    scheduled_time: "21:00",
    subtasks: ["Odhacz dzień", "Zaplanuj jutro"],
  });

  return routines;
}
