import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronRight, Clock, ListChecks, Play, SkipForward, Timer } from "lucide-react";
import { Screen, ScreenHeader, Card, ProgressBar } from "@/components/ui-kit";
import { BLOCK_LABELS, useDayProgress, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

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

function Today() {
  const { dayStatus, items, routines, tasks, startDay, setItemStatus, toggleSubtask, postponeItem } =
    useStore();
  const progress = useDayProgress();
  const [justDone, setJustDone] = useState<string | null>(null);

  if (dayStatus === "planned") {
    const plannedRoutines = routines.filter((r) => r.isActive).length;
    const plannedTasks = tasks.filter((t) => !t.isDone).length;
    const minutes =
      routines.filter((r) => r.isActive).reduce((s, r) => s + r.estimatedMinutes, 0) +
      tasks.filter((t) => !t.isDone).reduce((s, t) => s + t.estimatedMinutes, 0);

    return (
      <Screen>
        <ScreenHeader eyebrow={dateLabel()} title="Gotowy na dziś?" />
        <Card className="flex flex-col gap-6 py-8">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat value={plannedRoutines} label="Rutyny" />
            <Stat value={plannedTasks} label="Zadania" />
            <Stat value={`${Math.round(minutes / 60)}h`} label="Czas" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Poprowadzę Cię przez dzień krok po kroku. Zobaczysz zawsze jedno zadanie.
          </p>
          <button
            onClick={startDay}
            className="accent-gradient accent-glow flex h-16 w-full items-center justify-center gap-2 rounded-3xl text-lg font-bold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Play className="h-5 w-5" fill="currentColor" />
            Rozpocznij dzień
          </button>
        </Card>
      </Screen>
    );
  }

  const current = items.find((i) => i.status === "pending");
  const next = items.filter((i) => i.status === "pending")[1];

  return (
    <Screen>
      <ScreenHeader
        eyebrow={dateLabel()}
        title={current ? "Teraz" : "Dzień wykonany"}
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

      <Card className="mb-4 flex flex-col gap-3 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Postęp dnia</span>
          <span className="text-sm font-semibold">
            {progress.done}/{progress.total}
          </span>
        </div>
        <ProgressBar percent={progress.percent} />
      </Card>

      {current ? (
        <Card
          className={cn(
            "flex flex-col gap-5 transition-all duration-300",
            justDone === current.id && "scale-[0.97] opacity-40",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{BLOCK_LABELS[current.block]}</Badge>
            <Badge>
              <Clock className="mr-1 inline h-3 w-3" />
              {current.estimatedMinutes} min
            </Badge>
            {current.priority === "high" ? <Badge accent>Priorytet</Badge> : null}
          </div>

          <div>
            <h2 className="text-2xl font-bold leading-snug">{current.title}</h2>
            {current.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{current.description}</p>
            ) : null}
          </div>

          {current.subtasks.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {current.subtasks.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => toggleSubtask(current.id, s.id)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-elevated px-4 py-3 text-left transition-colors"
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                        s.isDone ? "accent-gradient border-transparent" : "border-input",
                      )}
                    >
                      {s.isDone ? <Check className="h-3.5 w-3.5 text-primary-foreground" /> : null}
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        s.isDone && "text-muted-foreground line-through",
                      )}
                    >
                      {s.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            onClick={() => {
              setJustDone(current.id);
              setTimeout(() => {
                setItemStatus(current.id, "done");
                setJustDone(null);
              }, 280);
            }}
            className="accent-gradient accent-glow flex h-16 w-full items-center justify-center gap-2 rounded-3xl text-lg font-bold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Check className="h-5 w-5" strokeWidth={3} />
            Zrobione
          </button>

          <div className="grid grid-cols-2 gap-3">
            <SecondaryButton onClick={() => postponeItem(current.id)}>
              <Timer className="h-4 w-4" />
              Odłóż
            </SecondaryButton>
            <SecondaryButton onClick={() => setItemStatus(current.id, "skipped")}>
              <SkipForward className="h-4 w-4" />
              Pomiń
            </SecondaryButton>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-lg font-semibold">Wszystko odhaczone</p>
          <p className="text-sm text-muted-foreground">
            Zamknij dzień i zobacz podsumowanie.
          </p>
          <Link
            to="/dzien"
            className="accent-gradient flex h-14 w-full items-center justify-center rounded-3xl font-bold text-primary-foreground"
          >
            Zakończ dzień
          </Link>
        </Card>
      )}

      {next ? (
        <Link
          to="/dzien"
          className="mt-4 flex items-center justify-between rounded-2xl border border-border px-4 py-3"
        >
          <span className="text-sm text-muted-foreground">
            Następnie: <span className="text-foreground">{next.title}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      ) : null}
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

function Badge({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold",
        accent ? "bg-primary-soft text-primary" : "bg-elevated text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-semibold text-secondary-foreground transition-transform active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
