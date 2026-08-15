import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Plus, Repeat, Trash2, X } from "lucide-react";
import { Screen, ScreenHeader, Card, EmptyState } from "@/components/ui-kit";
import {
  BLOCK_LABELS,
  BLOCK_ORDER,
  PRIORITY_LABELS,
  type DayBlock,
  type Priority,
} from "@/lib/store";
import {
  useAddTask,
  useDeleteTask,
  useTasks,
  useToggleTaskDone,
  type NewTaskInput,
} from "@/lib/tasks";
import {
  useAddRoutine,
  useDeleteRoutine,
  useRoutines,
  useToggleRoutineActive,
  type NewRoutineInput,
} from "@/lib/routines";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** ISO weekday order 1=Mon .. 7=Sun, with short PL labels. */
const WEEKDAYS: { n: number; short: string }[] = [
  { n: 1, short: "Pn" },
  { n: 2, short: "Wt" },
  { n: 3, short: "Śr" },
  { n: 4, short: "Cz" },
  { n: 5, short: "Pt" },
  { n: 6, short: "So" },
  { n: 7, short: "Nd" },
];

const ALL_WEEKDAYS = WEEKDAYS.map((d) => d.n);

/** "Codziennie" for all seven, otherwise the short day labels in order. */
function formatWeekdays(days: number[]): string {
  if (days.length >= 7) return "Codziennie";
  if (days.length === 0) return "Brak dni";
  return WEEKDAYS.filter((d) => days.includes(d.n))
    .map((d) => d.short)
    .join(", ");
}

export const Route = createFileRoute("/zadania")({
  head: () => ({
    meta: [
      { title: "Zadania i rutyny – jedna lista, zero chaosu" },
      {
        name: "description",
        content:
          "Dodawaj zadania jednorazowe z podzadaniami i zarządzaj codziennymi rutynami, które wracają każdego dnia.",
      },
      { property: "og:title", content: "Zadania i rutyny – jedna lista, zero chaosu" },
      {
        property: "og:description",
        content: "Zadania jednorazowe, podzadania i rutyny w jednym miejscu.",
      },
    ],
  }),
  component: TasksScreen,
});

function TasksScreen() {
  const { data: tasks, isLoading, isError, refetch } = useTasks();
  const addTask = useAddTask();
  const toggleDone = useToggleTaskDone();
  const deleteTask = useDeleteTask();

  // Routines now live in Supabase too (same pattern as tasks).
  const {
    data: routines,
    isLoading: routinesLoading,
    isError: routinesError,
    refetch: refetchRoutines,
  } = useRoutines();
  const addRoutine = useAddRoutine();
  const toggleRoutineActive = useToggleRoutineActive();
  const deleteRoutine = useDeleteRoutine();

  const [tab, setTab] = useState<"tasks" | "routines">("tasks");
  const [formOpen, setFormOpen] = useState(false);
  const [routineFormOpen, setRoutineFormOpen] = useState(false);

  return (
    <Screen>
      <ScreenHeader eyebrow="Biblioteka" title="Zadania" />

      <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
        {(["tasks", "routines"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "h-11 rounded-xl text-sm font-semibold transition-colors",
              tab === t ? "accent-gradient text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {t === "tasks" ? "Jednorazowe" : "Rutyny"}
          </button>
        ))}
      </div>

      {tab === "tasks" ? (
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <p className="px-1 text-sm text-muted-foreground">Wczytywanie zadań…</p>
          ) : isError ? (
            <Card className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Nie udało się wczytać zadań.</p>
              <button
                onClick={() => refetch()}
                className="h-10 rounded-2xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground"
              >
                Spróbuj ponownie
              </button>
            </Card>
          ) : !tasks || tasks.length === 0 ? (
            <EmptyState
              title="Brak zadań"
              description="Dodaj pierwsze zadanie jednorazowe, a pojawi się w planie dnia."
            />
          ) : (
            tasks.map((t) => {
              const done = t.status === "done";
              return (
                <Card key={t.id} className="flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleDone.mutate({ id: t.id, status: t.status })}
                      aria-label={done ? "Oznacz jako niezrobione" : "Oznacz jako zrobione"}
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                        done ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : null}
                    </button>
                    <h3
                      className={cn(
                        "flex-1 text-base font-semibold",
                        done && "text-muted-foreground line-through",
                      )}
                    >
                      {t.title}
                    </h3>
                    {t.priority === "high" && !done ? (
                      <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
                        Wysoki
                      </span>
                    ) : null}
                    <button
                      onClick={() =>
                        deleteTask.mutate(t.id, {
                          onSuccess: () => toast.success("Zadanie usunięte"),
                          onError: () => toast.error("Nie udało się usunąć zadania."),
                        })
                      }
                      aria-label="Usuń zadanie"
                      className="shrink-0 text-muted-foreground transition-colors active:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {t.description ? (
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  ) : null}
                  {t.task_subtasks.length > 0 ? (
                    <ul className="mt-1 flex flex-col gap-1">
                      {t.task_subtasks.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {s.title}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {BLOCK_LABELS[t.day_block]} · {t.estimated_minutes} min
                  </p>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {routinesLoading ? (
            <p className="px-1 text-sm text-muted-foreground">Wczytywanie rutyn…</p>
          ) : routinesError ? (
            <Card className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Nie udało się wczytać rutyn.</p>
              <button
                onClick={() => refetchRoutines()}
                className="h-10 rounded-2xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground"
              >
                Spróbuj ponownie
              </button>
            </Card>
          ) : !routines || routines.length === 0 ? (
            <EmptyState
              title="Brak rutyn"
              description="Dodaj pierwszą rutynę, a będzie wracać w wybrane dni tygodnia."
            />
          ) : (
            routines.map((r) => (
              <Card key={r.id} className="flex items-center gap-4 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
                  <Repeat className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-semibold",
                      !r.is_active && "text-muted-foreground",
                    )}
                  >
                    {r.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {BLOCK_LABELS[r.day_block]} · {r.estimated_minutes ?? 0} min ·{" "}
                    {formatWeekdays(r.weekdays)}
                    {r.routine_subtasks.length > 0
                      ? ` · ${r.routine_subtasks.length} podzadań`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Switch
                    checked={r.is_active}
                    onCheckedChange={() =>
                      toggleRoutineActive.mutate(
                        { id: r.id, is_active: r.is_active },
                        { onError: () => toast.error("Nie udało się zmienić rutyny.") },
                      )
                    }
                  />
                  <button
                    onClick={() =>
                      deleteRoutine.mutate(r.id, {
                        onSuccess: () => toast.success("Rutyna usunięta"),
                        onError: () => toast.error("Nie udało się usunąć rutyny."),
                      })
                    }
                    aria-label="Usuń rutynę"
                    className="text-muted-foreground transition-colors active:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <button
        onClick={() => (tab === "tasks" ? setFormOpen(true) : setRoutineFormOpen(true))}
        className="accent-gradient accent-glow fixed bottom-28 left-1/2 z-40 flex h-14 -translate-x-1/2 items-center gap-2 rounded-full px-6 font-bold text-primary-foreground transition-transform active:scale-95"
      >
        <Plus className="h-5 w-5" strokeWidth={3} />
        {tab === "tasks" ? "Nowe zadanie" : "Nowa rutyna"}
      </button>

      {formOpen ? (
        <TaskForm
          saving={addTask.isPending}
          onClose={() => setFormOpen(false)}
          onSave={(task) =>
            addTask.mutate(task, {
              onSuccess: () => {
                setFormOpen(false);
                toast.success("Zadanie dodane");
              },
              onError: () => toast.error("Nie udało się zapisać zadania."),
            })
          }
        />
      ) : null}

      {routineFormOpen ? (
        <RoutineForm
          saving={addRoutine.isPending}
          onClose={() => setRoutineFormOpen(false)}
          onSave={(routine) =>
            addRoutine.mutate(routine, {
              onSuccess: () => {
                setRoutineFormOpen(false);
                toast.success("Rutyna dodana");
              },
              onError: () => toast.error("Nie udało się zapisać rutyny."),
            })
          }
        />
      ) : null}
    </Screen>
  );
}

function TaskForm({
  saving,
  onClose,
  onSave,
}: {
  saving: boolean;
  onClose: () => void;
  onSave: (task: NewTaskInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [block, setBlock] = useState<DayBlock>("forenoon");
  const [priority, setPriority] = useState<Priority>("normal");
  const [minutes, setMinutes] = useState(30);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm">
      <div className="card-surface safe-bottom max-h-[88vh] w-full overflow-y-auto rounded-b-none px-5 pt-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">Nowe zadanie</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tytuł</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="np. Dokończ aplikację"
          className="mb-4 h-13 w-full rounded-2xl border border-input bg-elevated px-4 py-3.5 text-sm outline-none focus:border-primary"
        />

        <label className="mb-2 block text-xs font-semibold text-muted-foreground">Blok dnia</label>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {BLOCK_ORDER.map((b) => (
            <button
              key={b}
              onClick={() => setBlock(b)}
              className={cn(
                "h-11 rounded-2xl text-sm font-medium transition-colors",
                block === b ? "bg-primary-soft text-primary" : "bg-elevated text-muted-foreground",
              )}
            >
              {BLOCK_LABELS[b]}
            </button>
          ))}
        </div>

        <label className="mb-2 block text-xs font-semibold text-muted-foreground">Priorytet</label>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {(["low", "normal", "high"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={cn(
                "h-11 rounded-2xl text-sm font-medium transition-colors",
                priority === p
                  ? "bg-primary-soft text-primary"
                  : "bg-elevated text-muted-foreground",
              )}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>

        <label className="mb-2 block text-xs font-semibold text-muted-foreground">
          Szacowany czas: {minutes} min
        </label>
        <input
          type="range"
          min={5}
          max={180}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="mb-5 w-full accent-[oklch(0.635_0.202_13.5)]"
        />

        <label className="mb-2 block text-xs font-semibold text-muted-foreground">Podzadania</label>
        <div className="mb-2 flex gap-2">
          <input
            value={subtaskDraft}
            onChange={(e) => setSubtaskDraft(e.target.value)}
            placeholder="np. Popraw logo"
            className="h-12 flex-1 rounded-2xl border border-input bg-elevated px-4 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => {
              if (!subtaskDraft.trim()) return;
              setSubtasks((p) => [...p, subtaskDraft.trim()]);
              setSubtaskDraft("");
            }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        {subtasks.length > 0 ? (
          <ul className="mb-4 flex flex-col gap-1">
            {subtasks.map((s, idx) => (
              <li
                key={`${s}-${idx}`}
                className="flex items-center justify-between rounded-xl bg-elevated px-4 py-2.5 text-sm"
              >
                {s}
                <button onClick={() => setSubtasks((p) => p.filter((_, i) => i !== idx))}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {/* TODO dzień: przełącznik „Dodaj do dzisiejszego dnia” wróci, gdy plan dnia
            przejdzie na Supabase (dziś jest jeszcze w pamięci). */}

        <button
          disabled={!title.trim() || saving}
          onClick={() =>
            onSave({
              title: title.trim(),
              block,
              priority,
              estimatedMinutes: minutes,
              subtasks,
            })
          }
          className="accent-gradient mb-4 h-16 w-full rounded-3xl text-lg font-bold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {saving ? "Zapisywanie…" : "Zapisz zadanie"}
        </button>
      </div>
    </div>
  );
}

function RoutineForm({
  saving,
  onClose,
  onSave,
}: {
  saving: boolean;
  onClose: () => void;
  onSave: (routine: NewRoutineInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [block, setBlock] = useState<DayBlock>("morning");
  const [priority, setPriority] = useState<Priority>("normal");
  const [minutes, setMinutes] = useState(15);
  const [weekdays, setWeekdays] = useState<number[]>(ALL_WEEKDAYS);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");

  const toggleDay = (n: number) =>
    setWeekdays((prev) =>
      prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n].sort((a, b) => a - b),
    );

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm">
      <div className="card-surface safe-bottom max-h-[88vh] w-full overflow-y-auto rounded-b-none px-5 pt-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">Nowa rutyna</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tytuł</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="np. Poranna medytacja"
          className="mb-4 h-13 w-full rounded-2xl border border-input bg-elevated px-4 py-3.5 text-sm outline-none focus:border-primary"
        />

        <label className="mb-2 block text-xs font-semibold text-muted-foreground">Blok dnia</label>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {BLOCK_ORDER.map((b) => (
            <button
              key={b}
              onClick={() => setBlock(b)}
              className={cn(
                "h-11 rounded-2xl text-sm font-medium transition-colors",
                block === b ? "bg-primary-soft text-primary" : "bg-elevated text-muted-foreground",
              )}
            >
              {BLOCK_LABELS[b]}
            </button>
          ))}
        </div>

        <label className="mb-2 block text-xs font-semibold text-muted-foreground">
          Dni tygodnia
        </label>
        <div className="mb-4 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => {
            const on = weekdays.includes(d.n);
            return (
              <button
                key={d.n}
                onClick={() => toggleDay(d.n)}
                aria-pressed={on}
                className={cn(
                  "h-11 rounded-2xl text-sm font-semibold transition-colors",
                  on ? "bg-primary-soft text-primary" : "bg-elevated text-muted-foreground",
                )}
              >
                {d.short}
              </button>
            );
          })}
        </div>

        <label className="mb-2 block text-xs font-semibold text-muted-foreground">Priorytet</label>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {(["low", "normal", "high"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={cn(
                "h-11 rounded-2xl text-sm font-medium transition-colors",
                priority === p
                  ? "bg-primary-soft text-primary"
                  : "bg-elevated text-muted-foreground",
              )}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>

        <label className="mb-2 block text-xs font-semibold text-muted-foreground">
          Szacowany czas: {minutes} min
        </label>
        <input
          type="range"
          min={5}
          max={180}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="mb-5 w-full accent-[oklch(0.635_0.202_13.5)]"
        />

        <label className="mb-2 block text-xs font-semibold text-muted-foreground">Podzadania</label>
        <div className="mb-2 flex gap-2">
          <input
            value={subtaskDraft}
            onChange={(e) => setSubtaskDraft(e.target.value)}
            placeholder="np. Rozgrzewka"
            className="h-12 flex-1 rounded-2xl border border-input bg-elevated px-4 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => {
              if (!subtaskDraft.trim()) return;
              setSubtasks((p) => [...p, subtaskDraft.trim()]);
              setSubtaskDraft("");
            }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        {subtasks.length > 0 ? (
          <ul className="mb-4 flex flex-col gap-1">
            {subtasks.map((s, idx) => (
              <li
                key={`${s}-${idx}`}
                className="flex items-center justify-between rounded-xl bg-elevated px-4 py-2.5 text-sm"
              >
                {s}
                <button onClick={() => setSubtasks((p) => p.filter((_, i) => i !== idx))}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <button
          disabled={!title.trim() || weekdays.length === 0 || saving}
          onClick={() =>
            onSave({
              title: title.trim(),
              block,
              priority,
              estimatedMinutes: minutes,
              weekdays,
              subtasks,
            })
          }
          className="accent-gradient mb-4 h-16 w-full rounded-3xl text-lg font-bold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {saving ? "Zapisywanie…" : "Zapisz rutynę"}
        </button>
      </div>
    </div>
  );
}
