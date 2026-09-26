// Typy danych ekranu „Statystyki" (TENAX)

export interface DayProgress {
  /** Data w formacie ISO `YYYY-MM-DD`. */
  date: string;
  /** Liczba zaplanowanych zadań danego dnia. */
  planned: number;
  /** Liczba ukończonych zadań danego dnia. */
  completed: number;
  /** Czy dzień liczy się do passy (zrobione >= 45% pozycji planu). */
  streak_counted: boolean;
  /** Zdobyte XP tego dnia. */
  xp: number;
  /** Pozycje Rozwoju zaplanowane tego dnia. Rozwój nie ma już wpływu na passę
   *  ani XP — te dwa pola zostają tylko jako liczniki sekcji. */
  growth_planned: number;
  /** Pozycje Rozwoju zrobione tego dnia. */
  growth_done: number;
}

export interface StatsSummary {
  days: DayProgress[];
  currentStreak: number;
  longestStreak: number;
  level: number;
  daysDone: number;
  todayPct: number;
  totalXp: number;
  toNext: number;
}

export type ViewState = 'loaded' | 'loading' | 'empty';
export type TabView = 'postep' | 'siatka';
export type RangeKey = '7' | '30' | 'all';
