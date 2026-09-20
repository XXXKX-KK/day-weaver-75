import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight,
  Lock,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import { Screen, ScreenHeader } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { PinPad } from "@/components/pin-pad";
import { PinReset } from "@/components/pin-reset";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Blocker, isNativeBlocker } from "@/lib/blocker";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/skupienie/")({
  head: () => ({
    meta: [
      { title: "Skupienie – blokada rozpraszających aplikacji" },
      {
        name: "description",
        content:
          "Włącz blokadę, nadaj uprawnienia i wybierz aplikacje do zablokowania.",
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
  const { user } = useAuth();
  const native = isNativeBlocker();
  const [blockingEnabled, setBlockingEnabled] = useState(false);
  const [usageAccessGranted, setUsageAccessGranted] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [pinAction, setPinAction] = useState<"verify-disable" | "set" | "change" | "reset-disable" | null>(null);
  const [pinError, setPinError] = useState("");

  const refresh = useCallback(async () => {
    if (!native) return;
    try {
      const [enabled, usage, overlay, blocked, pin] = await Promise.all([
        Blocker.isBlockingEnabled(),
        Blocker.isUsageAccessGranted(),
        Blocker.isOverlayGranted(),
        Blocker.getBlockedApps(),
        Blocker.hasPin(),
      ]);
      setBlockingEnabled(enabled.enabled);
      setUsageAccessGranted(usage.granted);
      setOverlayGranted(overlay.granted);
      setBlockedCount(blocked.packages.length);
      setPinSet(pin.hasPin);
    } catch (e) {
      console.error("Blocker refresh failed", e);
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

  const bothGranted = usageAccessGranted && overlayGranted;

  const doSetBlocking = async (enabled: boolean) => {
    setBusy(true);
    try {
      await Blocker.setBlockingEnabled({ enabled });
      setBlockingEnabled(enabled);
      if (enabled && !bothGranted) {
        toast.warning("Nadaj oba uprawnienia, aby blokada zadziałała.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się zmienić blokady.");
    } finally {
      setBusy(false);
    }
  };

  const onToggleBlocking = async (next: boolean) => {
    if (!native) {
      toast.info("Blokada działa tylko w aplikacji na telefonie.");
      return;
    }
    if (!next && pinSet) {
      setPinError("");
      setPinAction("verify-disable");
      return;
    }
    await doSetBlocking(next);
  };

  const onPinSetComplete = async (pin: string) => {
    try {
      await Blocker.setPin({ pin });
      setPinSet(true);
      setPinAction(null);
      toast.success(pinAction === "change" ? "PIN zmieniony." : "PIN ustawiony.");
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się ustawić PIN-u.");
      setPinAction(null);
    }
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    try {
      const { valid } = await Blocker.verifyPin({ pin });
      return valid;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const onVerifyDisableSuccess = async () => {
    setPinAction(null);
    await doSetBlocking(false);
  };

  const openUsageSettings = async () => {
    try {
      await Blocker.openUsageAccessSettings();
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się otworzyć ustawień.");
    }
  };

  const openOverlay = async () => {
    try {
      await Blocker.openOverlaySettings();
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się otworzyć ustawień.");
    }
  };

  return (
    <Screen>
      <div style={{ animation: "cascadeIn 0.5s ease-out both" }}>
        <ScreenHeader eyebrow="Tryb skupienia" title="Blokada aplikacji" />
      </div>

      {/* 1. Blokada toggle */}
      <div
        className={cn(
          "mb-3 flex items-center gap-4 rounded-3xl bg-foreground/5 p-5 transition-shadow",
          blockingEnabled && "accent-glow",
        )}
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            blockingEnabled ? "accent-gradient" : "bg-foreground/10",
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
      </div>

      {/* 2. Uprawnienia */}
      {native ? (
        bothGranted ? (
          <div className="mb-3 flex items-center gap-3 rounded-3xl bg-foreground/5 px-5 py-4" style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}>
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
              Uprawnienia nadane. Blokada może działać.
            </p>
          </div>
        ) : (
          <div className="mb-3 flex flex-col gap-4 rounded-3xl bg-foreground/5 px-5 py-4" style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}>
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Blokada wymaga dwóch uprawnień. Nadaj oba, aby przełącznik zadziałał.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {usageAccessGranted ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <ShieldOff className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <p className="flex-1 text-xs text-muted-foreground">Dostęp do użycia</p>
              {!usageAccessGranted && (
                <button
                  onClick={openUsageSettings}
                  className="h-8 rounded-full bg-foreground/10 px-3 text-xs font-semibold text-foreground"
                >
                  Nadaj
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {overlayGranted ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <ShieldOff className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <p className="flex-1 text-xs text-muted-foreground">Wyświetlanie nad innymi aplikacjami</p>
              {!overlayGranted && (
                <button
                  onClick={openOverlay}
                  className="h-8 rounded-full bg-foreground/10 px-3 text-xs font-semibold text-foreground"
                >
                  Nadaj
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="mb-3 flex items-start gap-3 rounded-3xl bg-foreground/5 px-5 py-4" style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}>
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Realna blokada wymaga uprawnień Androida. W podglądzie webowym widzisz wyłącznie
            interfejs sterowania.
          </p>
        </div>
      )}

      {/* 3. Blokowane aplikacje */}
      <Link to="/skupienie/aplikacje" className="block" style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}>
        <div className="mb-3 flex items-center gap-4 rounded-3xl bg-foreground/5 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/10">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Blokowane aplikacje ({blockedCount})</p>
            <p className="truncate text-xs text-muted-foreground">
              Wybierz aplikacje, które mają być blokowane
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
      </Link>

      {/* 4. Ustaw / Zmień PIN */}
      {native && (
        <div className="mb-3 flex items-center gap-4 rounded-3xl bg-foreground/5 px-5 py-4" style={{ animation: "cascadeIn 0.5s ease-out 0.4s both" }}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/10">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{pinSet ? "Zmień PIN" : "Ustaw PIN"}</p>
            <p className="text-xs text-muted-foreground">
              {pinSet
                ? "PIN chroni przed wyłączeniem blokady"
                : "Zabezpiecz blokadę kodem PIN"}
            </p>
          </div>
          <button
            onClick={() => {
              setPinError("");
              setPinAction(pinSet ? "change" : "set");
            }}
            className="h-9 rounded-full bg-foreground/10 px-4 text-xs font-semibold text-foreground"
          >
            {pinSet ? "Zmień" : "Ustaw"}
          </button>
        </div>
      )}

      {pinAction === "verify-disable" && (
        <PinPad
          mode="verify"
          error={pinError}
          onComplete={() => {}}
          onVerify={verifyPin}
          onVerifySuccess={onVerifyDisableSuccess}
          onCancel={() => setPinAction(null)}
          onForgot={user?.email ? () => setPinAction("reset-disable") : undefined}
        />
      )}
      {pinAction === "set" && (
        <PinPad
          mode="set"
          error={pinError}
          onComplete={onPinSetComplete}
          onCancel={() => setPinAction(null)}
        />
      )}
      {pinAction === "change" && (
        <PinPad
          mode="change"
          error={pinError}
          onComplete={onPinSetComplete}
          onVerify={verifyPin}
          onCancel={() => setPinAction(null)}
          onForgot={user?.email ? () => setPinAction("reset-disable") : undefined}
        />
      )}
      {pinAction === "reset-disable" && user?.email && (
        <PinReset
          email={user.email}
          onComplete={async () => {
            setPinSet(false);
            setPinAction(null);
            toast.success("PIN usunięty.");
            await doSetBlocking(false);
          }}
          onCancel={() => setPinAction(null)}
        />
      )}
    </Screen>
  );
}
