import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ListChecks, Play, Repeat, SkipForward } from "lucide-react";
import { Screen, ScreenHeader, Card, ProgressBar, EmptyState } from "@/components/ui-kit";
import {
  useToday,
  useStartDay,
  useSetItemStatus,
  useToggleDayItemSubtask,
  useCompleteDay,
  useReorderDayItems,
  type DayItemRow,
} from "@/lib/day";
import { XpBar } from "@/components/xp-bar";
import { SortableList } from "@/components/sortable-list";
import { useRoutines } from "@/lib/routines";
import { useTasks } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dziś – prowadzony plan dnia i skupienie" },
      {
        name: "description",
        content:
          "Rozpocznij dzień jednym przyciskiem, wykonuj rutyny i zadania po kolei i blokuj rozpraszające aplikacje.",
      },
      { property: "og:title", content: "Dziś – prowadzony plan dnia i skupienie" },
      {
        property: "og:description",
        content: "Jedno zadanie na ekranie, rutyny każdego dnia, blokada rozpraszaczy.",
      },
    ],
  }),
  component: Today,
});

const dateLabel = () =>
  new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(),
  );

/** Today's ISO weekday, 1=Mon .. 7=Sun (matches routines.weekdays). */
function todayIsoWeekday(): number {
  const jsDay = new Date().getDay(); // 0=Sun .. 6=Sat
  return jsDay === 0 ? 7 : jsDay;
}

function Today() {
  const { data: today, isLoading, isError, refetch } = useToday();
  const startDay = useStartDay();
  const completeDay = useCompleteDay();
  const reorderDayItems = useReorderDayItems();

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader eyebrow={dateLabel()} title="Dziś" />
        <p className="px-1 text-sm text-muted-foreground">Wczytywanie dnia…</p>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ScreenHeader eyebrow={dateLabel()} title="Dziś" />
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">Nie udało się wczytać dnia.</p>
          <button
            onClick={() => refetch()}
            className="h-10 rounded-2xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground"
          >
            Spróbuj ponownie
          </button>
        </Card>
      </Screen>
    );
  }

  // No day row yet (status "planned") → not started.
  if (!today || today.status === "planned") {
    return (
      <NotStarted
        starting={startDay.isPending}
        onStart={() =>
          startDay.mutate(undefined, {
            onError: () => toast.error("Nie udało się rozpocząć dnia."),
          })
        }
      />
    );
  }

  const items = today.items;
  // Progress is derived from item statuses so it moves with optimistic updates;
  // it converges to days.completed_count (kept by a DB trigger) after refetch.
  const done = items.filter((i) => i.status === "done").length;
  const total = items.length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  // Day already closed → show a wind-down summary.
  if (today.status === "completed") {
    const unfinished = items.filter((i) => i.status !== "done");
    return (
      <Screen>
        <XpBar />
        <ScreenHeader eyebrow="Podsumowanie" title="Dzień zakończony" />
        <Card className="mb-4 flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-5xl font-bold text-primary">{percent}%</p>
          <p className="text-sm text-muted-foreground">
            {done} z {total} pozycji wykonanych
          </p>
          <ProgressBar percent={percent} />
        </Card>
        {unfinished.length > 0 ? (
          <Card>
            <p className="mb-3 text-sm font-semibold">Niewykonane ({unfinished.length})</p>
            <ul className="flex flex-col gap-2">
              {unfinished.map((i) => (
                <li key={i.id} className="text-sm text-muted-foreground">
                  {i.title}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <XpBar />
      <ScreenHeader
        eyebrow={dateLabel()}
        title="Plan dnia"
        action={
          <Link
            to="/dzien"
            className="mt-1 flex items-center gap-1 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
          >
            <ListChecks className="h-4 w-4" />
            Plan
          </Link>
        }
      />

      <Card className="mb-6 flex flex-col gap-3 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Postęp dnia</span>
          <span className="text-sm font-semibold">
            {done}/{total}
          </span>
        </div>
        <ProgressBar percent={percent} />
      </Card>

      {total === 0 ? (
        <EmptyState
          title="Pusty dzień"
          description="Na dziś nie ma aktywnych rutyn ani zaplanowanych zadań."
        />
      ) : (
        <>
          <SortableList
            items={items}
            onReorder={(ids) =>
              reorderDayItems.mutate(ids, {
                onError: () => toast.error("Nie udało się zapisać kolejności."),
              })
            }
            renderItem={(item) => <DayItemCard item={item} />}
          />

          <button
            onClick={() => {
              if (!today.day) return;
              completeDay.mutate(today.day.id, {
                onError: () => toast.error("Nie udało się zakończyć dnia."),
              });
            }}
            disabled={completeDay.isPending}
            className="accent-gradient accent-glow mt-8 h-16 w-full rounded-3xl text-lg font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {completeDay.isPending ? "Kończenie…" : "Zakończ dzień"}
          </button>
        </>
      )}
    </Screen>
  );
}

/** One day item; tapping the row toggles done<->pending, subtasks toggle too. */
function DayItemCard({ item }: { item: DayItemRow }) {
  const setItemStatus = useSetItemStatus();
  const toggleSubtask = useToggleDayItemSubtask();
  const doneSubtasks = item.day_item_subtasks.filter((s) => s.is_done).length;

  return (
    <div className="card-surface flex flex-col gap-2 px-4 py-4">
      <button
        onClick={() =>
          setItemStatus.mutate(item, {
            onError: () => toast.error("Nie udało się zapisać zmiany."),
          })
        }
        className="flex items-center gap-3 text-left transition-transform active:scale-[0.99]"
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
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
              "block truncate text-sm font-semibold",
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
      </button>

      {item.day_item_subtasks.length > 0 ? (
        <ul className="ml-10 flex flex-col gap-1">
          {item.day_item_subtasks.map((s) => (
            <li key={s.id}>
              <button
                onClick={() =>
                  toggleSubtask.mutate(
                    { item, subtask: s },
                    { onError: () => toast.error("Nie udało się zapisać zmiany.") },
                  )
                }
                className="flex w-full items-center gap-2 text-left text-sm text-muted-foreground"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                    s.is_done ? "accent-gradient border-transparent" : "border-input",
                  )}
                >
                  {s.is_done ? (
                    <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                  ) : null}
                </span>
                <span className={cn(s.is_done && "line-through")}>{s.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Pre-start screen: previews what start_day will generate, then starts it. */
function NotStarted({ starting, onStart }: { starting: boolean; onStart: () => void }) {
  const { data: routines } = useRoutines();
  const { data: tasks } = useTasks();

  const isoDow = todayIsoWeekday();
  const todaysRoutines = (routines ?? []).filter((r) => r.is_active && r.weekdays.includes(isoDow));
  const openTasks = (tasks ?? []).filter((t) => t.status === "open");

  const plannedRoutines = todaysRoutines.length;
  const plannedTasks = openTasks.length;

  return (
    <Screen>
      <XpBar />
      <ScreenHeader eyebrow={dateLabel()} title="Gotowy na dziś?" />
      <Card className="flex flex-col gap-6 py-8">
        <div className="grid grid-cols-2 gap-3 text-center">
          <Stat value={plannedRoutines} label="Rutyny na dziś" />
          <Stat value={plannedTasks} label="Zadania" />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Poprowadzę Cię przez dzień krok po kroku — z rutyn na dziś i zaplanowanych zadań.
        </p>
        <button
          onClick={onStart}
          disabled={starting}
          className="accent-gradient accent-glow flex h-16 w-full items-center justify-center gap-2 rounded-3xl text-lg font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <Play className="h-5 w-5" fill="currentColor" />
          {starting ? "Rozpoczynanie…" : "Rozpocznij dzień"}
        </button>
      </Card>
    </Screen>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-elevated py-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
