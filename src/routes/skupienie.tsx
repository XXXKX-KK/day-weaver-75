import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Coffee, ShieldCheck, ShieldOff, Smartphone, TriangleAlert } from "lucide-react";
import { Screen, ScreenHeader, Card } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/skupienie")({
  head: () => ({
    meta: [
      { title: "Skupienie – blokada rozpraszających aplikacji" },
      {
        name: "description",
        content:
          "Wybierz blokowane aplikacje, ustaw harmonogram i korzystaj ze świadomych przerw z limitem dziennym.",
      },
      { property: "og:title", content: "Skupienie – blokada rozpraszających aplikacji" },
      {
        property: "og:description",
        content: "Ekran motywacyjny zamiast Instagrama. Przerwa tylko świadoma.",
      },
    ],
  }),
  component: FocusScreen,
});

const MODES = [
  { id: "always", label: "Zawsze" },
  { id: "day_hours", label: "W godzinach dnia" },
  { id: "day_in_progress", label: "Gdy dzień trwa" },
] as const;

function FocusScreen() {
  const { apps, toggleApp, blockingEnabled, setBlockingEnabled, breaksUsed, useBreak } = useStore();
  const [mode, setMode] = useState<string>("day_hours");
  const blockedCount = apps.filter((a) => a.isEnabled).length;
  const breakLimit = 3;

  return (
    <Screen>
      <ScreenHeader eyebrow="Tryb skupienia" title="Blokada aplikacji" />

      <Card
        className={cn(
          "mb-4 flex items-center gap-4 py-5 transition-shadow",
          blockingEnabled && "accent-glow",
        )}
      >
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            blockingEnabled ? "accent-gradient" : "bg-elevated",
          )}
        >
          {blockingEnabled ? (
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          ) : (
            <ShieldOff className="h-6 w-6 text-muted-foreground" />
          )}
        </span>
        <div className="flex-1">
          <p className="text-base font-semibold">
            {blockingEnabled ? "Blokada włączona" : "Blokada wyłączona"}
          </p>
          <p className="text-xs text-muted-foreground">{blockedCount} blokowanych aplikacji</p>
        </div>
        <Switch checked={blockingEnabled} onCheckedChange={setBlockingEnabled} />
      </Card>

      <Card className="mb-4 flex items-start gap-3 border-warning/25 py-4">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Realna blokada wymaga usługi ułatwień dostępu Androida. W podglądzie webowym widzisz
          wyłącznie interfejs sterowania.
        </p>
      </Card>

      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Harmonogram
      </h2>
      <div className="mb-6 flex flex-col gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "card-surface flex items-center justify-between px-4 py-4 text-left text-sm font-medium",
              mode === m.id && "border-primary/40",
            )}
          >
            {m.label}
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border",
                mode === m.id ? "border-primary" : "border-input",
              )}
            >
              {mode === m.id ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
            </span>
          </button>
        ))}
      </div>

      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Blokowane aplikacje
      </h2>
      <div className="mb-6 flex flex-col gap-2">
        {apps.map((a) => (
          <Card key={a.id} className="flex items-center gap-4 py-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-elevated">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{a.name}</p>
              <p className="truncate text-xs text-muted-foreground">{a.pkg}</p>
            </div>
            <Switch checked={a.isEnabled} onCheckedChange={() => toggleApp(a.id)} />
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-4 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Świadoma przerwa</p>
            <p className="text-xs text-muted-foreground">
              Wykorzystane dziś: {breaksUsed}/{breakLimit}
            </p>
          </div>
          <Coffee className="h-5 w-5 text-muted-foreground" />
        </div>
        <button
          disabled={breaksUsed >= breakLimit}
          onClick={() => {
            useBreak();
            toast.success("Przerwa 10 min — blokada wróci automatycznie");
          }}
          className="h-14 w-full rounded-3xl bg-secondary font-semibold text-secondary-foreground transition-opacity disabled:opacity-40"
        >
          Zrób przerwę (10 min)
        </button>
      </Card>
    </Screen>
  );
}
