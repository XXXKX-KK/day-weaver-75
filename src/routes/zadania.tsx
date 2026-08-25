import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Calendar, Check, Clock, Plus, Repeat, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Screen, ScreenHeader, Card, EmptyState } from "@/components/ui-kit";
import { PRIORITY_LABELS, type Priority } from "@/lib/store";
import {
  useAddTask,
  useDeleteTask,
  useReorderTasks,
  useSetContactAction,
  useTasks,
  useToggleTaskDone,
  type NewTaskInput,
  type TaskRow,
} from "@/lib/tasks";
import { ContactActionButtons } from "@/components/contact-action-buttons";
import {
  useAddRoutine,
  useDeleteRoutine,
  useReorderRoutines,
  useRoutines,
  useToggleRoutineActive,
  useUpdateRoutine,
  type NewRoutineInput,
  type RoutineRow,
} from "@/lib/routines";
import { SortableList } from "@/components/sortable-list";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { scheduleTaskReminder, cancelTaskReminder } from "@/lib/notifications";

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
  const reorderTasks = useReorderTasks();

  const {
    data: routines,
    isLoading: routinesLoading,
    isError: routinesError,
    refetch: refetchRoutines,
  } = useRoutines();
  const addRoutine = useAddRoutine();
  const updateRoutine = useUpdateRoutine();
  const toggleRoutineActive = useToggleRoutineActive();
  const deleteRoutine = useDeleteRoutine();
  const reorderRoutines = useReorderRoutines();

  const [tab, setTab] = useState<"tasks" | "routines">("tasks");
  const [formOpen, setFormOpen] = useState(false);
  const [routineFormOpen, setRoutineFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineRow | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inSelectMode = selectedIds.size > 0;

  const handleTabChange = (t: "tasks" | "routines") => {
    setSelectedIds(new Set());
    setTab(t);
  };

  const handleLongPress = (id: string) => {
    setSelectedIds(new Set([id]));
  };

  const handleTapInSelectMode = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmDelete = () => {
    const ids = [...selectedIds];
    if (tab === "tasks") {
      for (const id of ids) {
        deleteTask.mutate(id, {
          onSuccess: () => void cancelTaskReminder(id),
          onError: () => toast.error("Nie udało się usunąć zadania."),
        });
      }
      toast.success(ids.length === 1 ? "Zadanie usunięte" : `Usunięto ${ids.length} zadań`);
    } else {
      for (const id of ids) {
        deleteRoutine.mutate(id, {
          onError: () => toast.error("Nie udało się usunąć rutyny."),
        });
      }
      toast.success(ids.length === 1 ? "Rutyna usunięta" : `Usunięto ${ids.length} rutyn`);
    }
    setSelectedIds(new Set());
    setShowDeleteDialog(false);
  };

  const deleteDialogDescription = (() => {
    if (selectedIds.size === 1) {
      const id = [...selectedIds][0]!;
      const item =
        tab === "tasks"
          ? tasks?.find((t) => t.id === id)
          : routines?.find((r) => r.id === id);
      return item ? `„${item.title}" zostanie trwale usunięte.` : "";
    }
    return `Zaznaczone pozycje (${selectedIds.size}) zostaną trwale usunięte.`;
  })();

  return (
    <Screen>
      {inSelectMode ? (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">
            {selectedIds.size} {selectedIds.size === 1 ? "zaznaczone" : "zaznaczonych"}
          </span>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 transition-transform active:scale-90"
          >
            <Trash2 className="h-5 w-5 text-destructive" />
          </button>
        </div>
      ) : (
        <ScreenHeader eyebrow="Biblioteka" title="Zadania" />
      )}

      <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
        {(["tasks", "routines"] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
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
        isLoading ? (
          <p className="px-1 text-sm text-muted-foreground">Wczytywanie zadań…</p>
        ) : isError ? (
          <RetryCard label="Nie udało się wczytać zadań." onRetry={() => refetch()} />
        ) : !tasks || tasks.length === 0 ? (
          <EmptyState
            title="Brak zadań"
            description="Dodaj pierwsze zadanie jednorazowe, a pojawi się w planie dnia."
          />
        ) : (
          <TasksWithCompleted
            tasks={tasks}
            inSelectMode={inSelectMode}
            selectedIds={selectedIds}
            onToggle={(t) => toggleDone.mutate({ id: t.id, status: t.status })}
            onReorder={(ids) =>
              reorderTasks.mutate(ids, {
                onError: () => toast.error("Nie udało się zapisać kolejności."),
              })
            }
            onLongPress={handleLongPress}
            onTapInSelectMode={handleTapInSelectMode}
            onDelete={(id) =>
              deleteTask.mutate(id, {
                onSuccess: () => {
                  void cancelTaskReminder(id);
                  toast.success("Zadanie usunięte");
                },
                onError: () => toast.error("Nie udało się usunąć zadania."),
              })
            }
          />
        )
      ) : routinesLoading ? (
        <p className="px-1 text-sm text-muted-foreground">Wczytywanie rutyn…</p>
      ) : routinesError ? (
        <RetryCard label="Nie udało się wczytać rutyn." onRetry={() => refetchRoutines()} />
      ) : !routines || routines.length === 0 ? (
        <EmptyState
          title="Brak rutyn"
          description="Dodaj pierwszą rutynę, a będzie wracać w wybrane dni tygodnia."
        />
      ) : (
        <SortableList
          items={routines}
          onReorder={(ids) =>
            reorderRoutines.mutate(ids, {
              onError: () => toast.error("Nie udało się zapisać kolejności."),
            })
          }
          onLongPress={handleLongPress}
          selectedIds={selectedIds}
          onTapInSelectMode={handleTapInSelectMode}
          renderItem={(r) => (
            <RoutineCard
              routine={r}
              onEdit={() => !inSelectMode && setEditingRoutine(r)}
              onToggle={() =>
                !inSelectMode &&
                toggleRoutineActive.mutate(
                  { id: r.id, is_active: r.is_active },
                  { onError: () => toast.error("Nie udało się zmienić rutyny.") },
                )
              }
            />
          )}
        />
      )}

      <div className="h-24" />
      {!inSelectMode ? (
        <button
          onClick={() => (tab === "tasks" ? setFormOpen(true) : setRoutineFormOpen(true))}
          className="accent-gradient accent-glow fixed left-1/2 z-40 flex h-14 -translate-x-1/2 items-center gap-2 rounded-full px-6 font-bold text-primary-foreground transition-transform active:scale-95"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
        >
          <Plus className="h-5 w-5" strokeWidth={3} />
          {tab === "tasks" ? "Nowe zadanie" : "Nowa rutyna"}
        </button>
      ) : null}

      {formOpen ? (
        <TaskForm
          saving={addTask.isPending}
          onClose={() => setFormOpen(false)}
          onSave={(task) =>
            addTask.mutate(task, {
              onSuccess: (taskId) => {
                setFormOpen(false);
                toast.success("Zadanie dodane");
                if (task.scheduled_time && taskId) {
                  void scheduleTaskReminder({
                    id: taskId,
                    title: task.title,
                    scheduled_date: task.scheduled_date ?? todayLocalISO(),
                    scheduled_time: task.scheduled_time,
                  });
                }
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

      {editingRoutine ? (
        <RoutineForm
          saving={updateRoutine.isPending}
          initial={editingRoutine}
          onClose={() => setEditingRoutine(null)}
          onSave={(routine) =>
            updateRoutine.mutate(
              {
                id: editingRoutine.id,
                ...routine,
                description: editingRoutine.description ?? undefined,
              },
              {
                onSuccess: () => {
                  setEditingRoutine(null);
                  toast.success("Zmiany zapisane");
                },
                onError: () => toast.error("Nie udało się zapisać zmian."),
              },
            )
          }
        />
      ) : null}

      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={(o) => !o && setShowDeleteDialog(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">
              Czy na pewno chcesz usunąć?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {deleteDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1">Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}

function RetryCard({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <button
        onClick={onRetry}
        className="h-10 rounded-2xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground"
      >
        Spróbuj ponownie
      </button>
    </Card>
  );
}

// TODO auto-usuwanie po 30 dniach
function TasksWithCompleted({
  tasks,
  inSelectMode,
  selectedIds,
  onToggle,
  onReorder,
  onLongPress,
  onTapInSelectMode,
  onDelete,
}: {
  tasks: TaskRow[];
  inSelectMode: boolean;
  selectedIds: Set<string>;
  onToggle: (t: TaskRow) => void;
  onReorder: (ids: string[]) => void;
  onLongPress: (id: string) => void;
  onTapInSelectMode: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const active = tasks.filter((t) => t.status === "open");
  const completed = tasks.filter((t) => t.status === "done");

  return (
    <>
      {active.length === 0 && completed.length > 0 ? (
        <EmptyState
          title="Wszystko zrobione"
          description="Brak aktywnych zadań. Dodaj nowe lub odznacz ukończone."
        />
      ) : (
        <SortableList
          items={active}
          onReorder={onReorder}
          onLongPress={onLongPress}
          selectedIds={selectedIds}
          onTapInSelectMode={onTapInSelectMode}
          renderItem={(t) => (
            <TaskCard
              task={t}
              onToggle={() => !inSelectMode && onToggle(t)}
            />
          )}
        />
      )}

      {completed.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ukończone
          </h2>
          <div className="flex flex-col gap-2">
            {completed.map((t) => (
              <CompletedTaskCard
                key={t.id}
                task={t}
                onToggle={() => onToggle(t)}
                onDelete={() => onDelete(t.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function CompletedTaskCard({
  task,
  onToggle,
  onDelete,
}: {
  task: TaskRow;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex items-center gap-3">
      <button
        onClick={onToggle}
        aria-label="Oznacz jako niezrobione"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground"
      >
        <Check className="h-4 w-4" />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through">
        {task.title}
      </span>
      <button
        onClick={onDelete}
        aria-label="Usuń zadanie"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </Card>
  );
}

function TaskCard({
  task,
  onToggle,
}: {
  task: TaskRow;
  onToggle: () => void;
}) {
  const done = task.status === "done";
  const setContactAction = useSetContactAction();
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
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
            "min-w-0 flex-1 text-base font-semibold",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </h3>
        {!done && (
          <ContactActionButtons
            title={task.title}
            manualAction={task.contact_action}
            onSetManual={(action) =>
              setContactAction.mutate({ taskId: task.id, action })
            }
          />
        )}
        {task.priority === "high" && !done ? (
          <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
            Wysoki
          </span>
        ) : null}
      </div>
      {task.description ? (
        <p className="text-sm text-muted-foreground">{task.description}</p>
      ) : null}
      {task.task_subtasks.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-1">
          {task.task_subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {s.title}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function RoutineCard({
  routine,
  onEdit,
  onToggle,
}: {
  routine: RoutineRow;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <Card className="flex items-center gap-4 py-4">
      <button
        onClick={onEdit}
        aria-label={`Edytuj rutynę ${routine.title}`}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
          <Repeat className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-semibold",
              !routine.is_active && "text-muted-foreground",
            )}
          >
            {routine.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatWeekdays(routine.weekdays)}
            {routine.routine_subtasks.length > 0
              ? ` · ${routine.routine_subtasks.length} podzadań`
              : ""}
          </p>
        </div>
      </button>
      <Switch checked={routine.is_active} onCheckedChange={onToggle} />
    </Card>
  );
}

/** Shared priority picker (the one control both forms kept). */
function PriorityPicker({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <>
      <label className="mb-2 block text-xs font-semibold text-muted-foreground">Priorytet</label>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(["low", "normal", "high"] as const).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              "h-11 rounded-2xl text-sm font-medium transition-colors",
              value === p ? "bg-primary-soft text-primary" : "bg-elevated text-muted-foreground",
            )}
          >
            {PRIORITY_LABELS[p]}
          </button>
        ))}
      </div>
    </>
  );
}

/** Shared subtask editor. */
function SubtaskEditor({
  subtasks,
  setSubtasks,
  placeholder,
}: {
  subtasks: string[];
  setSubtasks: (updater: (prev: string[]) => string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <>
      <label className="mb-2 block text-xs font-semibold text-muted-foreground">Podzadania</label>
      <div className="mb-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="h-12 flex-1 rounded-2xl border border-input bg-elevated px-4 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => {
            if (!draft.trim()) return;
            setSubtasks((p) => [...p, draft.trim()]);
            setDraft("");
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
    </>
  );
}

function Sheet({
  title,
  onClose,
  headerExtra,
  children,
}: {
  title: string;
  onClose: () => void;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm">
      <div className="card-surface safe-bottom max-h-[88vh] w-full overflow-y-auto rounded-b-none px-5 pt-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function todayLocalISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

function formatDateShort(dateStr: string): string {
  const todayStr = todayLocalISO();
  if (dateStr === todayStr) return "Dziś";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === tomorrow.toLocaleDateString("en-CA")) return "Jutro";
  const parts = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(
    new Date(parts[0]!, parts[1]! - 1, parts[2]!),
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
  const [priority, setPriority] = useState<Priority>("normal");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(todayLocalISO());
  const [scheduledTime, setScheduledTime] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  return (
    <Sheet
      title="Nowe zadanie"
      onClose={onClose}
      headerExtra={
        <>
          <button
            type="button"
            onClick={() => dateRef.current?.showPicker?.()}
            className="relative flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-semibold text-secondary-foreground"
          >
            <Calendar className="h-3.5 w-3.5" />
            {formatDateShort(scheduledDate)}
            <input
              ref={dateRef}
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value || todayLocalISO())}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </button>
          <button
            type="button"
            onClick={() => timeRef.current?.showPicker?.()}
            className="relative flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-semibold text-secondary-foreground"
          >
            <Clock className="h-3.5 w-3.5" />
            {scheduledTime || "Godz."}
            <input
              ref={timeRef}
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </button>
        </>
      }
    >
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tytuł</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="np. Dokończ aplikację"
        className="mb-4 h-13 w-full rounded-2xl border border-input bg-elevated px-4 py-3.5 text-sm outline-none focus:border-primary"
      />

      <PriorityPicker value={priority} onChange={setPriority} />
      <SubtaskEditor subtasks={subtasks} setSubtasks={setSubtasks} placeholder="np. Popraw logo" />

      <button
        disabled={!title.trim() || saving}
        onClick={() =>
          onSave({
            title: title.trim(),
            priority,
            subtasks,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime || undefined,
          })
        }
        className="accent-gradient mb-4 h-16 w-full rounded-3xl text-lg font-bold text-primary-foreground transition-opacity disabled:opacity-40"
      >
        {saving ? "Zapisywanie…" : "Zapisz zadanie"}
      </button>
    </Sheet>
  );
}

function RoutineForm({
  saving,
  initial,
  onClose,
  onSave,
}: {
  saving: boolean;
  initial?: RoutineRow | undefined;
  onClose: () => void;
  onSave: (routine: NewRoutineInput) => void;
}) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "normal");
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? ALL_WEEKDAYS);
  const [subtasks, setSubtasks] = useState<string[]>(
    initial?.routine_subtasks.map((s) => s.title) ?? [],
  );

  const toggleDay = (n: number) =>
    setWeekdays((prev) =>
      prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n].sort((a, b) => a - b),
    );

  return (
    <Sheet title={isEdit ? "Edytuj rutynę" : "Nowa rutyna"} onClose={onClose}>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tytuł</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="np. Poranna medytacja"
        className="mb-4 h-13 w-full rounded-2xl border border-input bg-elevated px-4 py-3.5 text-sm outline-none focus:border-primary"
      />

      <label className="mb-2 block text-xs font-semibold text-muted-foreground">Dni tygodnia</label>
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

      <PriorityPicker value={priority} onChange={setPriority} />
      <SubtaskEditor subtasks={subtasks} setSubtasks={setSubtasks} placeholder="np. Rozgrzewka" />

      <button
        disabled={!title.trim() || weekdays.length === 0 || saving}
        onClick={() => onSave({ title: title.trim(), priority, weekdays, subtasks })}
        className="accent-gradient mb-4 h-16 w-full rounded-3xl text-lg font-bold text-primary-foreground transition-opacity disabled:opacity-40"
      >
        {saving ? "Zapisywanie…" : isEdit ? "Zapisz zmiany" : "Zapisz rutynę"}
      </button>
    </Sheet>
  );
}
