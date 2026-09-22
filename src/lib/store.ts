export type DayBlock = "morning" | "forenoon" | "afternoon" | "evening";
export type Priority = "low" | "normal" | "high";

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Niski",
  normal: "Normalny",
  high: "Wysoki",
};

/** Maintenance keeps the day running; growth is what moves the user forward.
 *  The split drives XP weight, the streak rule and the block overlay. */
export type RoutineKind = "maintenance" | "growth";

export type GrowthArea = "body" | "mind" | "money" | "discipline";

export const AREA_LABELS: Record<GrowthArea, string> = {
  body: "Ciało",
  mind: "Głowa",
  money: "Pieniądze",
  discipline: "Dyscyplina",
};

/** A growth habit can hang off a concrete routine, or off a moment of the day
 *  when no routine fits. */
export type AnchorLabel = "wake_up" | "after_work";

export const ANCHOR_LABELS: Record<AnchorLabel, string> = {
  wake_up: "Rano, zaraz po wstaniu",
  after_work: "Po powrocie z pracy",
};
