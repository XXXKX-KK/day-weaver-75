import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Check, Play, Repeat, SkipForward } from "lucide-react";
import { Screen, EmptyState } from "@/components/ui-kit";
import {
  useToday,
  useStartDay,
  useSetItemStatus,
  useToggleDayItemSubtask,
  useCompleteDay,
  useReorderDayItems,
  type DayItemRow,
  type DayRow,
} from "@/lib/day";
import { XpBar } from "@/components/xp-bar";
import { SortableList } from "@/components/sortable-list";
import { useRoutines } from "@/lib/routines";
import { useTasks } from "@/lib/tasks";
import { useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ContactActionButtons } from "@/components/contact-action-buttons";
import type { ContactActionType } from "@/lib/contact-action";
import "../today.css";

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

function todayIsoWeekday(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function isEveningWindow(dayEndTime: string | null | undefined): boolean {
  let endMinutes = 22 * 60;
  if (dayEndTime) {
    const [h, m] = dayEndTime.split(":");
    const hour = Number(h);
    const minute = Number(m);
    if (Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      endMinutes = hour * 60 + minute;
    }
  }
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= endMinutes - 120;
}

function Today() {
  const { data: today, isLoading, isError, refetch } = useToday();
  const startDay = useStartDay();
  const completeDay = useCompleteDay();
  const reorderDayItems = useReorderDayItems();

  if (isLoading) {
    return (
      <Screen>
        <div className="mb-5 animate-[cascadeIn_.5s_ease-out_both]">
          <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted-foreground mb-1">
            {dateLabel()}
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">Dziś</h1>
        </div>
        <p className="px-1 text-sm text-muted-foreground">Wczytywanie dnia…</p>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <div className="mb-5">
          <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted-foreground mb-1">
            {dateLabel()}
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">Dziś</h1>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-foreground/5 px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">Nie udało się wczytać dnia.</p>
          <button
            onClick={() => refetch()}
            className="h-10 rounded-2xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground"
          >
            Spróbuj ponownie
          </button>
        </div>
      </Screen>
    );
  }

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

  const { data: allTasks } = useTasks();
  const { data: profile } = useProfile();
  const showEndDay = isEveningWindow(profile?.day_end_time);
  const items = today.items;
  const done = items.filter((i) => i.status === "done").length;
  const total = items.length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const contactActionMap = useMemo<Record<string, ContactActionType | null>>(() => {
    const map: Record<string, ContactActionType | null> = {};
    for (const t of allTasks ?? []) {
      map[t.id] = t.contact_action;
    }
    return map;
  }, [allTasks]);

  if (today.status === "completed") {
    const unfinished = items.filter((i) => i.status !== "done");
    return (
      <Screen>
        <XpBar />
        <div className="mb-5 animate-[cascadeIn_.5s_ease-out_both]">
          <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted-foreground mb-1">
            Podsumowanie
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">
            Dzień zakończony
          </h1>
        </div>
        <div className="mb-4 flex flex-col items-center gap-3 rounded-3xl bg-foreground/5 px-5 py-8 text-center animate-[cascadeIn_.5s_ease-out_.1s_both]">
          <p className="text-5xl font-bold text-primary">{percent}%</p>
          <p className="text-sm text-muted-foreground">
            {done} z {total} pozycji wykonanych
          </p>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
            <div className="absolute inset-0 rounded-full bg-primary/[0.08] animate-[glowPulse_3s_ease-in-out_infinite]" />
            <div
              className="relative z-[1] h-full rounded-full accent-gradient animate-[fillBar_1s_ease-out_both]"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        {unfinished.length > 0 && (
          <div className="rounded-3xl bg-foreground/5 px-5 py-4 animate-[cascadeIn_.5s_ease-out_.2s_both]">
            <p className="mb-3 text-sm font-semibold">Niewykonane ({unfinished.length})</p>
            <ul className="flex flex-col gap-2">
              {unfinished.map((i) => (
                <li key={i.id} className="text-sm text-muted-foreground">
                  {i.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <XpBar />

      <div className="mb-5 animate-[cascadeIn_.5s_ease-out_.1s_both]">
        <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted-foreground mb-1">
          {dateLabel()}
        </div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">Plan dnia</h1>
      </div>

      <div className="mb-5 rounded-3xl bg-foreground/5 px-[18px] py-3.5 animate-[cascadeIn_.5s_ease-out_.2s_both]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted-foreground">Postęp dnia</span>
          <span className="text-[13px] font-bold text-foreground">
            {done}/{total}
          </span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
          <div className="absolute inset-0 rounded-full bg-primary/[0.08] animate-[glowPulse_3s_ease-in-out_infinite]" />
          <div
            className="relative z-[1] h-full rounded-full accent-gradient transition-[width] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          title="Pusty dzień"
          description="Na dziś nie ma aktywnych rutyn ani zaplanowanych zadań."
        />
      ) : (
        <>
          <SortableList
            items={items}
            className="flex flex-col gap-2"
            onReorder={(ids) => {
              reorderDayItems.mutate(ids, {
                onError: () => toast.error("Nie udało się zapisać kolejności."),
              });
            }}
            renderItem={(item, _selected, isDragActive) => (
              <DayItemPill
                item={item}
                day={today.day}
                items={items}
                index={items.indexOf(item)}
                isDragActive={isDragActive}
                manualAction={item.task_id ? contactActionMap[item.task_id] ?? null : null}
              />
            )}
          />

          {showEndDay && (
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
          )}
        </>
      )}
    </Screen>
  );
}

function DayItemPill({
  item,
  day,
  items,
  index,
  isDragActive,
  manualAction,
}: {
  item: DayItemRow;
  day: DayRow | null;
  items: DayItemRow[];
  index: number;
  isDragActive: boolean;
  manualAction: ContactActionType | null;
}) {
  const setItemStatus = useSetItemStatus();
  const toggleSubtask = useToggleDayItemSubtask();
  const doneSubtasks = item.day_item_subtasks.filter((s) => s.is_done).length;

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-foreground/5 px-4 py-2.5 transition-colors duration-200 hover:bg-foreground/[0.08] animate-[cascadeIn_.5s_ease-out_both]"
      style={{ animationDelay: `${0.3 + index * 0.06}s` }}
    >
      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 rounded-3xl border-[1.5px] border-primary/30 animate-[wiggle_.3s_ease-in-out_infinite]" />
      )}

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => {
            setItemStatus.mutate(
              { item, day, items },
              { onError: () => toast.error("Nie udało się zapisać zmiany.") },
            );
          }}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-transform active:scale-[0.99]"
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200",
              item.status === "done"
                ? "accent-gradient animate-[checkPop_.3s_ease-out]"
                : item.status === "skipped"
                  ? "bg-muted"
                  : "border-2 border-foreground/15",
            )}
          >
            {item.status === "done" && (
              <Check
                className="h-3.5 w-3.5 text-primary-foreground"
                strokeWidth={3}
              />
            )}
            {item.status === "skipped" && (
              <SkipForward className="h-3 w-3 text-muted-foreground" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="relative inline-block max-w-full">
              <span
                className={cn(
                  "block truncate text-[15px] font-medium transition-colors duration-[400ms]",
                  item.status !== "pending" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {item.title}
              </span>
              <span
                className={cn(
                  "absolute left-0 top-1/2 block h-[1.5px] rounded-sm bg-muted-foreground/60",
                  item.status === "done" ? "w-full animate-[strikeIn_.35s_ease-out_both]" : "w-0",
                )}
              />
            </span>
            {(item.source_type === "routine" || item.day_item_subtasks.length > 0) && (
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground/60">
                {item.source_type === "routine" && (
                  <>
                    <Repeat className="h-3 w-3" />
                    <span className="font-medium">Rutyna</span>
                  </>
                )}
                {item.day_item_subtasks.length > 0 && (
                  <span className="font-medium">
                    {doneSubtasks}/{item.day_item_subtasks.length}
                  </span>
                )}
              </span>
            )}
          </span>

          {item.priority === "high" && <span className="h-2 w-2 rounded-full bg-primary" />}
        </button>

        {item.status === "pending" && (
          <ContactActionButtons title={item.title} manualAction={manualAction} />
        )}
      </div>

      {item.day_item_subtasks.length > 0 && (
        <ul className="ml-[34px] mt-1.5 flex flex-col gap-1">
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
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                    s.is_done ? "accent-gradient" : "border border-foreground/15",
                  )}
                >
                  {s.is_done && (
                    <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                  )}
                </span>
                <span className={cn(s.is_done && "line-through")}>{s.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotStarted({ starting, onStart }: { starting: boolean; onStart: () => void }) {
  const { data: routines } = useRoutines();
  const { data: tasks } = useTasks();

  const isoDow = todayIsoWeekday();
  const todaysRoutines = (routines ?? []).filter((r) => r.is_active && r.weekdays.includes(isoDow));
  const openTasks = (tasks ?? []).filter((t) => t.status === "open");

  return (
    <Screen>
      <XpBar />
      <div className="mb-5 animate-[cascadeIn_.5s_ease-out_both]">
        <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted-foreground mb-1">
          {dateLabel()}
        </div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">
          Gotowy na dziś?
        </h1>
      </div>
      <div className="flex flex-col gap-6 rounded-3xl bg-foreground/5 px-5 py-8 animate-[cascadeIn_.5s_ease-out_.1s_both]">
        <div className="grid grid-cols-2 gap-3 text-center">
          <Stat value={todaysRoutines.length} label="Rutyny na dziś" />
          <Stat value={openTasks.length} label="Zadania" />
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
      </div>
    </Screen>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-foreground/5 py-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
