import { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";
import {
  useSuggestion,
  useRecordSuggestionShown,
  useRespondToSuggestion,
} from "@/lib/suggestions-data";
import type { Suggestion } from "@/lib/suggestions";

/**
 * The coach card on Dziś. It lives only here — never in the block overlay and
 * never in a notification, because advice you can't act on is just nagging.
 *
 * Once a suggestion is on screen it's held in local state, so logging the "it
 * was shown" event (which is what stops it coming back today) doesn't yank the
 * card out from under the user mid-read.
 */
export function SuggestionCard({ dayId }: { dayId: string | null }) {
  const candidate = useSuggestion();
  const [active, setActive] = useState<Suggestion | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const recordShown = useRecordSuggestionShown();
  const respond = useRespondToSuggestion();
  const recorded = useRef<string | null>(null);

  useEffect(() => {
    if (active || !candidate) return;
    const key = `${candidate.ruleId}:${candidate.subjectKey}`;
    if (recorded.current === key) return;
    recorded.current = key;
    setActive(candidate);
    recordShown.mutate(candidate, {
      onSuccess: (id) => setEventId(id),
      onError: () => setEventId(null),
    });
  }, [candidate, active, recordShown]);

  if (!active) return null;

  const close = (accepted: boolean) => {
    const suggestion = active;
    setActive(null);
    setEventId(null);
    respond.mutate(
      { eventId, suggestion, accepted, dayId },
      {
        onSuccess: () => {
          if (accepted) toast.success("Dodane do planu");
        },
        onError: () => toast.error("Nie udało się zapisać."),
      },
    );
  };

  return (
    <div
      className="mb-4 rounded-3xl glass px-5 py-4"
      style={{ animation: "cascadeIn 0.5s ease-out both" }}
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
          <Lightbulb className="h-[18px] w-[18px] text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug">{active.observation}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
            {active.advice}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => close(true)}
          disabled={respond.isPending}
          className="accent-gradient h-11 flex-1 rounded-full text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          Dodaj do planu
        </button>
        <button
          type="button"
          onClick={() => close(false)}
          disabled={respond.isPending}
          className="h-11 rounded-full bg-foreground/5 px-5 text-sm font-semibold text-muted-foreground disabled:opacity-50"
        >
          Nie teraz
        </button>
      </div>
    </div>
  );
}
