import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import { Blocker, isNativeBlocker } from "@/lib/blocker";
import { toast } from "sonner";

export const Route = createFileRoute("/ustawienia/uprawnienia")({
  head: () => ({
    meta: [{ title: "Uprawnienia" }],
  }),
  component: PermissionsScreen,
});

function PermissionsScreen() {
  const native = isNativeBlocker();
  const [usageAccess, setUsageAccess] = useState(false);
  const [overlay, setOverlay] = useState(false);

  const refresh = useCallback(async () => {
    if (!native) return;
    try {
      const [u, o] = await Promise.all([
        Blocker.isUsageAccessGranted(),
        Blocker.isOverlayGranted(),
      ]);
      setUsageAccess(u.granted);
      setOverlay(o.granted);
    } catch (e) {
      console.error("Permission check failed", e);
    }
  }, [native]);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const openUsage = async () => {
    try {
      await Blocker.openUsageAccessSettings();
    } catch {
      toast.error("Nie udało się otworzyć ustawień.");
    }
  };

  const openOverlay = async () => {
    try {
      await Blocker.openOverlaySettings();
    } catch {
      toast.error("Nie udało się otworzyć ustawień.");
    }
  };

  return (
    <Screen>
      <div
        className="mb-5 flex items-center gap-3"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        <Link
          to="/ustawienia"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/5"
          aria-label="Wróć"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold leading-tight">Uprawnienia</h1>
      </div>

      {!native ? (
        <div
          className="card-surface px-5 py-6 text-center"
          style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
        >
          <p className="text-sm text-muted-foreground">
            Uprawnienia można nadać tylko w aplikacji na Androidzie.
          </p>
        </div>
      ) : (
        <div
          className="card-surface overflow-hidden p-0"
          style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
        >
          <div
            className="flex items-center justify-between px-4 py-4"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <div>
              <p className="text-[15px] font-medium">Usługa ułatwień dostępu</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Wymagana do działania nakładki
              </p>
            </div>
            {usageAccess ? (
              <StatusDot color="var(--color-success)" label="Aktywna" />
            ) : (
              <button
                onClick={openUsage}
                className="h-8 rounded-xl bg-foreground/10 px-3 text-xs font-semibold"
              >
                Nadaj
              </button>
            )}
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-[15px] font-medium">Optymalizacja baterii</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Wyłącz dla stabilnego działania
              </p>
            </div>
            {overlay ? (
              <StatusDot color="var(--color-success)" label="Wyłączona" />
            ) : (
              <button
                onClick={openOverlay}
                className="h-8 rounded-xl bg-foreground/10 px-3 text-xs font-semibold"
              >
                Nadaj
              </button>
            )}
          </div>
        </div>
      )}
    </Screen>
  );
}

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-[7px] w-[7px] rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-[13px] font-medium" style={{ color }}>
        {label}
      </span>
    </span>
  );
}
