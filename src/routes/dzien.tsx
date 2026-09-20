import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Repeat, SkipForward } from "lucide-react";
import { Screen, ScreenHeader, Card, ProgressBar, EmptyState } from "@/components/ui-kit";
import { useToday, type DayItemRow } from "@/lib/day";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dzien")({
  head: () => ({
    meta: [
      { title: "Plan dnia – rutyny i zadania w blokach" },
      {
        name: "description",
        content:
          "Pełny plan dnia podzielony na poranek, przedpołudnie, popołudnie i wieczór z postępem wykonania.",
      },
      { property: "og:title", content: "Plan dnia – rutyny i zadania w blokach" },
      {
        property: "og:description",
        content: "Zobacz co zostało do końca dnia i zamknij dzień podsumowaniem.",
      },
    ],
  }),
  component: DayPlan,
});

function DayPlan() {
  const { data: today, isLoading, isError, refetch } = useToday();

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader eyebrow="Plan dnia" title="Dziś" />
        <p className="px-1 text-sm text-muted-foreground">Wczytywanie planu…</p>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ScreenHeader eyebrow="Plan dnia" title="Dziś" />
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">Nie udało się wczytać planu.</p>
          <button
            onClick={() => refetch()}
            className="h-10 rounded-full bg-secondary px-4 text-sm font-semibold text-secondary-foreground"
          >
            Spróbuj ponownie
          </button>
        </Card>
      </Screen>
    );
  }

  if (!today || today.status === "planned") {
    return (
      <Screen>
        <ScreenHeader eyebrow="Plan dnia" title="Dzień nierozpoczęty" />
        <EmptyState
          title="Najpierw rozpocznij dzień"
          description="Plan powstaje w momencie rozpoczęcia dnia — na ekranie „Dziś”."
        />
      </Screen>
    );
  }

  const items = today.items;
  const done = items.filter((i) => i.status === "done").length;
  const total = items.length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Plan dnia"
        title={`${done}/${total} wykonane`}
        action={
          <Link
            to="/"
            className="mt-1 flex items-center gap-1 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Teraz
          </Link>
        }
      />

      <div className="mb-6">
        <ProgressBar percent={percent} />
      </div>

      {total === 0 ? (
        <EmptyState
          title="Pusty dzień"
          description="Na dziś nie ma aktywnych rutyn ani zaplanowanych zadań."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <PlanItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* TODO brief #2: odhaczanie pozycji i zakończenie dnia (zapis do bazy). */}
    </Screen>
  );
}

/** Read-only plan row — checking off / completing the day is brief #2. */
function PlanItem({ item }: { item: DayItemRow }) {
  const doneSubtasks = item.day_item_subtasks.filter((s) => s.is_done).length;
  return (
    <div className="card-surface flex items-center gap-3 px-4 py-4">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
          item.status === "done" ? "accent-gradient border-transparent" : "border-input",
        )}
      >
        {item.status === "done" ? (
          <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
        ) : null}
        {item.status === "skipped" ? (
          <SkipForward className="h-3.5 w-3.5 text-muted-foreground" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-medium",
            item.status !== "pending" && "text-muted-foreground line-through",
          )}
        >
          {item.title}
        </span>
        {item.source_type === "routine" || item.day_item_subtasks.length > 0 ? (
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {item.source_type === "routine" ? <Repeat className="h-3 w-3" /> : null}
            {item.day_item_subtasks.length > 0 ? (
              <span>
                {doneSubtasks}/{item.day_item_subtasks.length}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
      {item.priority === "high" ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
    </div>
  );
}
