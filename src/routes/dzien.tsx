import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Repeat, SkipForward } from "lucide-react";
import { Screen, ScreenHeader, Card, ProgressBar, EmptyState } from "@/components/ui-kit";
import { BLOCK_LABELS, BLOCK_ORDER, useDayProgress, useStore } from "@/lib/store";
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
  const { dayStatus, items, setItemStatus, completeDay, resetDay } = useStore();
  const progress = useDayProgress();

  if (dayStatus === "planned") {
    return (
      <Screen>
        <ScreenHeader eyebrow="Plan dnia" title="Dzień nierozpoczęty" />
        <EmptyState
          title="Najpierw rozpocznij dzień"
          description="Plan powstaje w momencie rozpoczęcia dnia — z aktywnych rutyn i zaplanowanych zadań."
        />
      </Screen>
    );
  }

  if (dayStatus === "completed") {
    const done = items.filter((i) => i.status === "done");
    const skipped = items.filter((i) => i.status !== "done");
    return (
      <Screen>
        <ScreenHeader eyebrow="Podsumowanie" title="Dzień zamknięty" />
        <Card className="mb-4 flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-5xl font-bold text-primary">{progress.percent}%</p>
          <p className="text-sm text-muted-foreground">
            {done.length} z {items.length} pozycji wykonanych
          </p>
          <ProgressBar percent={progress.percent} />
        </Card>
        {skipped.length > 0 ? (
          <Card className="mb-4">
            <p className="mb-3 text-sm font-semibold">Niewykonane ({skipped.length})</p>
            <ul className="flex flex-col gap-2">
              {skipped.map((i) => (
                <li key={i.id} className="text-sm text-muted-foreground">
                  {i.title}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <button
          onClick={resetDay}
          className="h-14 w-full rounded-3xl bg-secondary font-semibold text-secondary-foreground"
        >
          Zacznij nowy dzień
        </button>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Plan dnia"
        title={`${progress.done}/${progress.total} wykonane`}
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
        <ProgressBar percent={progress.percent} />
      </div>

      <div className="flex flex-col gap-6">
        {BLOCK_ORDER.map((block) => {
          const blockItems = items.filter((i) => i.block === block);
          if (blockItems.length === 0) return null;
          return (
            <section key={block}>
              <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {BLOCK_LABELS[block]}
              </h2>
              <div className="flex flex-col gap-2">
                {blockItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setItemStatus(item.id, item.status === "done" ? "pending" : "done")
                    }
                    className="card-surface flex items-center gap-3 px-4 py-4 text-left transition-transform active:scale-[0.99]"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                        item.status === "done"
                          ? "accent-gradient border-transparent"
                          : "border-input",
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
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        {item.sourceType === "routine" ? (
                          <Repeat className="h-3 w-3" />
                        ) : null}
                        {item.estimatedMinutes} min
                        {item.subtasks.length > 0
                          ? ` · ${item.subtasks.filter((s) => s.isDone).length}/${item.subtasks.length}`
                          : ""}
                      </span>
                    </span>
                    {item.priority === "high" ? (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <button
        onClick={completeDay}
        className="accent-gradient accent-glow mt-8 h-16 w-full rounded-3xl text-lg font-bold text-primary-foreground transition-transform active:scale-[0.98]"
      >
        Zakończ dzień
      </button>
    </Screen>
  );
}
