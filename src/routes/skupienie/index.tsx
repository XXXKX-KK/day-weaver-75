import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Target,
  TriangleAlert,
} from "lucide-react";
import { Screen, ScreenHeader, Card } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Blocker, isNativeBlocker } from "@/lib/blocker";

export const Route = createFileRoute("/skupienie/")({
  head: () => ({
    meta: [
      { title: "Skupienie – blokada rozpraszających aplikacji" },
      {
        name: "description",
        content:
          "Włącz blokadę, przyznaj uprawnienie usługi dostępności i wybierz aplikacje do zablokowania.",
      },
      { property: "og:title", content: "Skupienie – blokada rozpraszających aplikacji" },
      {
        property: "og:description",
        content: "Ekran motywacyjny zamiast Instagrama.",
      },
    ],
  }),
  component: FocusScreen,
});

function FocusScreen() {
  const native = isNativeBlocker();
  const [blockingEnabled, setBlockingEnabled] = useState(false);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [currentTask, setCurrentTask] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const refresh = useCallback(async () => {
    if (!native) return;
    try {
      const [enabled, access, blocked] = await Promise.all([
        Blocker.isBlockingEnabled(),
        Blocker.isAccessibilityEnabled(),
        Blocker.getBlockedApps(),
      ]);
      setBlockingEnabled(enabled.enabled);
      setAccessibilityEnabled(access.enabled);
      setBlockedCount(blocked.packages.length);
    } catch (e) {
      console.error("Blocker refresh failed", e);
    }
  }, [native]);

  useEffect(() => {
    refresh();
    // Re-check after returning from the system accessibility settings.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  // Seed the current-task field once on mount (kept out of refresh so a
  // re-focus never clobbers what the user is typing).
  useEffect(() => {
    if (!native) return;
    Blocker.getCurrentTask()
      .then((r) => {
        setCurrentTask(r.title);
        setTaskInput(r.title);
      })
      .catch((e) => console.error("getCurrentTask failed", e));
  }, [native]);

  const onToggleBlocking = async (next: boolean) => {
    if (!native) {
      toast.info("Blokada działa tylko w aplikacji na telefonie.");
      return;
    }
    setBusy(true);
    try {
      await Blocker.setBlockingEnabled({ enabled: next });
      setBlockingEnabled(next);
      if (next && !accessibilityEnabled) {
        toast.warning("Włącz usługę dostępności, aby blokada zadziałała.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się zmienić blokady.");
    } finally {
      setBusy(false);
    }
  };

  const openSettings = async () => {
    if (!native) {
      toast.info("Ustawienia dostępności są dostępne tylko na telefonie.");
      return;
    }
    try {
      await Blocker.openAccessibilitySettings();
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się otworzyć ustawień.");
    }
  };

  const saveTask = async () => {
    if (!native) {
      toast.info("Zapis zadania działa tylko w aplikacji na telefonie.");
      return;
    }
    setSavingTask(true);
    try {
      const r = await Blocker.setCurrentTask({ title: taskInput });
      setCurrentTask(r.title);
      setTaskInput(r.title);
      toast.success("Zapisano bieżące zadanie.");
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się zapisać zadania.");
    } finally {
      setSavingTask(false);
    }
  };

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
        <Switch checked={blockingEnabled} disabled={busy} onCheckedChange={onToggleBlocking} />
      </Card>

      {native ? (
        accessibilityEnabled ? (
          <Card className="mb-4 flex items-center gap-3 border-primary/25 py-4">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
              Usługa dostępności jest włączona. Blokada może działać.
            </p>
          </Card>
        ) : (
          <Card className="mb-4 flex items-start gap-3 border-warning/25 py-4">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="flex-1">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Blokada wymaga usługi dostępności Androida. Bez niej przełącznik nic nie zablokuje.
              </p>
              <button
                onClick={openSettings}
                className="mt-3 h-10 rounded-2xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground"
              >
                Włącz usługę
              </button>
            </div>
          </Card>
        )
      ) : (
        <Card className="mb-4 flex items-start gap-3 border-warning/25 py-4">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Realna blokada wymaga usługi dostępności Androida. W podglądzie webowym widzisz
            wyłącznie interfejs sterowania.
          </p>
        </Card>
      )}

      <Card className="mb-4 flex flex-col gap-3 py-5">
        <div className="flex items-center gap-3">
          <span className="accent-gradient flex h-10 w-10 items-center justify-center rounded-2xl">
            <Target className="h-5 w-5 text-primary-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Na czym się teraz skupiasz?</p>
            <p className="truncate text-xs text-muted-foreground">
              {currentTask
                ? `Nakładka pokaże: „Wróć do: ${currentTask}”`
                : "Nakładka pokaże tekst zapasowy"}
            </p>
          </div>
        </div>
        <input
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder="np. Dokończ raport"
          maxLength={80}
          className="h-12 w-full rounded-2xl border border-input bg-elevated px-4 text-sm outline-none focus:border-primary/40"
        />
        <button
          onClick={saveTask}
          disabled={savingTask || taskInput.trim() === currentTask}
          className="accent-gradient h-12 w-full rounded-2xl font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Zapisz zadanie
        </button>
      </Card>

      <Link to="/skupienie/aplikacje" className="block">
        <Card className="flex items-center gap-4 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-elevated">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Blokowane aplikacje ({blockedCount})</p>
            <p className="truncate text-xs text-muted-foreground">
              Wybierz aplikacje, które mają być blokowane
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Card>
      </Link>
    </Screen>
  );
}
