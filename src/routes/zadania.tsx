import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Repeat, X } from "lucide-react";
import { Screen, ScreenHeader, Card, EmptyState } from "@/components/ui-kit";
import {
  BLOCK_LABELS,
  BLOCK_ORDER,
  PRIORITY_LABELS,
  useStore,
  type DayBlock,
  type Priority,
} from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const { tasks, routines, toggleRoutine, addTask } = useStore();
  const [tab, setTab] = useState<"tasks" | "routines">("tasks");
  const [formOpen, setFormOpen] = useState(false);

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
          {tasks.length === 0 ? (
            <EmptyState
              title="Brak zadań"
              description="Dodaj pierwsze zadanie jednorazowe, a pojawi się w planie dnia."
            />
          ) : (
            tasks.map((t) => (
              <Card key={t.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold">{t.title}</h3>
                  {t.priority === "high" ? (
                    <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
                      Wysoki
                    </span>
                  ) : null}
                </div>
                {t.description ? (
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                ) : null}
                {t.subtasks.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-1">
                    {t.subtasks.map((s) => (
                      <li key={s} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {BLOCK_LABELS[t.block]} · {t.estimatedMinutes} min
                </p>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {routines.map((r) => (
            <Card key={r.id} className="flex items-center gap-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
                <Repeat className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {BLOCK_LABELS[r.block]} · {r.estimatedMinutes} min
                  {r.subtasks.length > 0 ? ` · ${r.subtasks.length} podzadań` : ""}
                </p>
              </div>
              <Switch checked={r.isActive} onCheckedChange={() => toggleRoutine(r.id)} />
            </Card>
          ))}
        </div>
      )}

      {tab === "tasks" ? (
        <button
          onClick={() => setFormOpen(true)}
          className="accent-gradient accent-glow fixed bottom-28 left-1/2 z-40 flex h-14 -translate-x-1/2 items-center gap-2 rounded-full px-6 font-bold text-primary-foreground transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" strokeWidth={3} />
          Nowe zadanie
        </button>
      ) : null}

      {formOpen ? (
        <TaskForm
          onClose={() => setFormOpen(false)}
          onSave={(task, addToday) => {
            addTask(task, addToday);
            setFormOpen(false);
            toast.success("Zadanie dodane");
          }}
        />
      ) : null}
    </Screen>
  );
}

function TaskForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (
    task: {
      title: string;
      description?: string | undefined;
      block: DayBlock;
      priority: Priority;
      estimatedMinutes: number;
      subtasks: string[];
    },
    addToday: boolean,
  ) => void;
}) {
  const [title, setTitle] = useState("");
  const [block, setBlock] = useState<DayBlock>("forenoon");
  const [priority, setPriority] = useState<Priority>("normal");
  const [minutes, setMinutes] = useState(30);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [addToday, setAddToday] = useState(true);

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
                block === b
                  ? "bg-primary-soft text-primary"
                  : "bg-elevated text-muted-foreground",
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

        <div className="mb-5 flex items-center justify-between rounded-2xl bg-elevated px-4 py-3.5">
          <span className="text-sm">Dodaj do dzisiejszego dnia</span>
          <Switch checked={addToday} onCheckedChange={setAddToday} />
        </div>

        <button
          disabled={!title.trim()}
          onClick={() =>
            onSave(
              {
                title: title.trim(),
                block,
                priority,
                estimatedMinutes: minutes,
                subtasks,
              },
              addToday,
            )
          }
          className="accent-gradient mb-4 h-16 w-full rounded-3xl text-lg font-bold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Zapisz zadanie
        </button>
      </div>
    </div>
  );
}
