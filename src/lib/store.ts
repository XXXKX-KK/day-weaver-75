export type DayBlock = "morning" | "forenoon" | "afternoon" | "evening";
export type Priority = "low" | "normal" | "high";

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Niski",
  normal: "Normalny",
  high: "Wysoki",
};
