import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useRoutines } from "@/lib/routines";
import { useToday, todayLocalISO } from "@/lib/day";
import {
  pickSuggestion,
  type RoutineStat,
  type ShownEvent,
  type Suggestion,
  type SuggestionAction,
} from "@/lib/suggestions";

/**
 * Wiring between the pure rule engine (src/lib/suggestions) and Supabase. The
 * rules never touch the network; everything impure lives here.
 */

type StatRow = {
  routine_id: string;
  occurrences_30: number;
  done_30: number;
  occurrences_21: number;
  done_21: number;
};

type EventRow = {
  id: string;
  rule_id: string;
  subject_key: string;
};

const STATS_KEY = ["routine-stats"] as const;
const EVENTS_KEY = ["suggestion-events"] as const;

function useRoutineStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...STATS_KEY, user?.id],
    enabled: isSupabaseConfigured && !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StatRow[]> => {
      const { data, error } = await supabase.rpc("routine_stats");
      if (error) throw error;
      return (data ?? []) as StatRow[];
    },
  });
}

function useSuggestionEventsToday() {
  const { user } = useAuth();
  const date = todayLocalISO();
  return useQuery({
    queryKey: [...EVENTS_KEY, user?.id, date],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from("suggestion_events")
        .select("id, rule_id, subject_key")
        .gte("shown_at", `${date}T00:00:00`)
        .order("shown_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });
}

/** The suggestion to show right now, or null when there's nothing to say. */
export function useSuggestion(): Suggestion | null {
  const { data: routines } = useRoutines();
  const { data: stats } = useRoutineStats();
  const { data: events } = useSuggestionEventsToday();
  const { data: today } = useToday();

  return useMemo(() => {
    if (!routines || !stats || !events || !today) return null;
    if (today.status !== "in_progress") return null;

    const statByRoutine = new Map(stats.map((s) => [s.routine_id, s]));
    const merged: RoutineStat[] = routines.map((r) => {
      const s = statByRoutine.get(r.id);
      return {
        routineId: r.id,
        title: r.title,
        kind: r.kind,
        area: r.area,
        priority: r.priority,
        weekdays: r.weekdays,
        scheduledTime: r.scheduled_time?.slice(0, 5) ?? null,
        occurrences30: s?.occurrences_30 ?? 0,
        done30: s?.done_30 ?? 0,
        occurrences21: s?.occurrences_21 ?? 0,
        done21: s?.done_21 ?? 0,
      };
    });

    const done = today.items.filter((i) => i.status === "done").length;
    const shownToday: ShownEvent[] = events.map((e) => ({
      ruleId: e.rule_id,
      subjectKey: e.subject_key,
    }));

    return pickSuggestion({
      stats: merged,
      shownToday,
      dayProgress: today.items.length > 0 ? done / today.items.length : 0,
    });
  }, [routines, stats, events, today]);
}

/** Log that a suggestion was put in front of the user; returns the row id. */
export function useRecordSuggestionShown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (suggestion: Suggestion): Promise<string> => {
      const { data, error } = await supabase
        .from("suggestion_events")
        .insert({ rule_id: suggestion.ruleId, subject_key: suggestion.subjectKey })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

async function applyAction(action: SuggestionAction, dayId: string | null) {
  if (action.type === "merge") {
    const { data: existing, error: posError } = await supabase
      .from("routine_subtasks")
      .select("position")
      .eq("routine_id", action.targetRoutineId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (posError) throw posError;

    const { data: source, error: sourceError } = await supabase
      .from("routines")
      .select("title")
      .eq("id", action.sourceRoutineId)
      .single();
    if (sourceError) throw sourceError;

    const { error: insertError } = await supabase.from("routine_subtasks").insert({
      routine_id: action.targetRoutineId,
      title: source.title as string,
      position: ((existing?.position as number | null) ?? -1) + 1,
    });
    if (insertError) throw insertError;

    const { error: archiveError } = await supabase
      .from("routines")
      .update({ archived_at: new Date().toISOString(), is_active: false })
      .eq("id", action.sourceRoutineId);
    if (archiveError) throw archiveError;
    return;
  }

  if (action.type === "add_lighter") {
    if (!dayId) throw new Error("Dzień nie został rozpoczęty");
    const { data: last, error: posError } = await supabase
      .from("day_items")
      .select("position")
      .eq("day_id", dayId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (posError) throw posError;

    // Deliberately not tied to the routine: the day already holds that row, and
    // the unique index would reject a second one for the same routine.
    const { error } = await supabase.from("day_items").insert({
      day_id: dayId,
      source_type: "task",
      task_id: null,
      title: action.title,
      priority: action.priority,
      kind: action.kind,
      position: ((last?.position as number | null) ?? -1) + 1,
      status: "pending",
    });
    if (error) throw error;
    return;
  }

  if (action.type === "add_habit") {
    const { data: last, error: posError } = await supabase
      .from("routines")
      .select("position")
      .is("archived_at", null)
      .order("position", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (posError) throw posError;

    const { error } = await supabase.from("routines").insert({
      title: action.title,
      priority: "normal",
      weekdays: action.weekdays,
      is_active: true,
      kind: "growth",
      area: action.area,
      anchor_routine_id: action.anchorRoutineId,
      position: ((last?.position as number | null) ?? -1) + 1,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("routines")
    .update({ title: action.title })
    .eq("id", action.routineId);
  if (error) throw error;
}

/** Accept or dismiss; accepting also carries out the suggestion's action. */
export function useRespondToSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      suggestion,
      accepted,
      dayId,
    }: {
      eventId: string | null;
      suggestion: Suggestion;
      accepted: boolean;
      dayId: string | null;
    }) => {
      if (accepted) await applyAction(suggestion.action, dayId);
      if (eventId) {
        const { error } = await supabase
          .from("suggestion_events")
          .update({
            action: accepted ? "accepted" : "dismissed",
            acted_at: new Date().toISOString(),
          })
          .eq("id", eventId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}
