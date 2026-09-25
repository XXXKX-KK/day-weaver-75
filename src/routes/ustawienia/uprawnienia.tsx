import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, BatteryCharging, CalendarDays, Layers, Timer } from "lucide-react";
import {
  Screen,
  SettingsGroup,
  SettingsGroupLabel,
  SettingsTile,
  SubScreenHeader,
} from "@/components/ui-kit";
import { Blocker, isNativeBlocker } from "@/lib/blocker";
import { DeviceCalendarApi, isCalendarSupported } from "@/lib/calendar";
import { toast } from "sonner";

export const Route = createFileRoute("/ustawienia/uprawnienia")({
  head: () => ({
    meta: [{ title: "Uprawnienia blokady" }],
  }),
  component: PermissionsScreen,
});

/**
 * Co blokada naprawdę potrzebuje. Nie ma tu „usługi ułatwień dostępu" — apka
 * nigdy jej nie używała: podgląd pierwszego planu idzie z UsageStats, a ekran
 * blokady z uprawnienia do rysowania po innych aplikacjach.
 */
type PermissionId = "usage" | "overlay" | "battery" | "notifications" | "calendar";

type PermissionDef = {
  id: PermissionId;
  title: string;
  icon: typeof Timer;
  /** Co użytkownik traci bez tego — widoczne tylko, gdy uprawnienia brakuje. */
  missing: string;
  required: boolean;
};

const PERMISSIONS: PermissionDef[] = [
  {
    id: "usage",
    title: "Dostęp do użycia",
    icon: Timer,
    missing: "Bez tego apka nie wie, co masz na ekranie",
    required: true,
  },
  {
    id: "overlay",
    title: "Wyświetlanie nad aplikacjami",
    icon: Layers,
    missing: "Bez tego nie pokaże się ekran blokady",
    required: true,
  },
  {
    id: "battery",
    title: "Optymalizacja baterii",
    icon: BatteryCharging,
    missing: "System uśpi blokadę po kilku minutach",
    required: true,
  },
  {
    id: "notifications",
    title: "Powiadomienia",
    icon: Bell,
    missing: "Nie dotrą przypomnienia ani licznik przerwy",
    required: false,
  },
  {
    id: "calendar",
    title: "Kalendarz",
    icon: CalendarDays,
    missing: "Wydarzenia z telefonu nie pojawią się w planie",
    required: false,
  },
];

type Statuses = Record<PermissionId, boolean>;

const EMPTY: Statuses = {
  usage: false,
  overlay: false,
  battery: false,
  notifications: false,
  calendar: false,
};

function PermissionsScreen() {
  const native = isNativeBlocker();
  const [status, setStatus] = useState<Statuses>(EMPTY);

  const refresh = useCallback(async () => {
    if (!native) return;
    try {
      const [usage, overlay, battery, notifications] = await Promise.all([
        Blocker.isUsageAccessGranted(),
        Blocker.isOverlayGranted(),
        Blocker.isBatteryOptimizationIgnored(),
        Blocker.areNotificationsEnabled(),
      ]);
      const calendar = isCalendarSupported()
        ? (await DeviceCalendarApi.checkPermission()).granted
        : false;
      setStatus({
        usage: usage.granted,
        overlay: overlay.granted,
        battery: battery.granted,
        notifications: notifications.granted,
        calendar,
      });
    } catch (e) {
      console.error("Permission check failed", e);
    }
  }, [native]);

  // Uprawnienia nadaje się poza apką, więc jedyny moment, w którym można je
  // sprawdzić, to powrót na wierzch.
  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const open = async (id: PermissionId) => {
    try {
      if (id === "usage") return await Blocker.openUsageAccessSettings();
      if (id === "overlay") return await Blocker.openOverlaySettings();
      if (id === "battery") return await Blocker.openBatterySettings();
      if (id === "notifications") return await Blocker.openNotificationSettings();
      // Kalendarz: najpierw systemowe okno zgody; gdy odmowa jest trwała,
      // okno się nie pokaże, więc zostaje ekran uprawnień aplikacji.
      const { granted } = await DeviceCalendarApi.requestPermission();
      if (!granted) await Blocker.openAppSettings();
      await refresh();
    } catch {
      toast.error("Nie udało się otworzyć ustawień.");
    }
  };

  const missingRequired = PERMISSIONS.filter((p) => p.required && !status[p.id]).length;

  return (
    <Screen>
      <SubScreenHeader title="Uprawnienia blokady" />

      {!native ? (
        <div
          className="rounded-3xl glass px-5 py-6 text-center"
          style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
        >
          <p className="text-sm text-muted-foreground">
            Uprawnienia można nadać tylko w aplikacji na Androidzie.
          </p>
        </div>
      ) : (
        <>
          <p
            className="mb-1 px-1 text-[15px] font-semibold"
            style={{
              color: missingRequired === 0 ? "var(--success)" : "var(--destructive)",
              animation: "cascadeIn 0.5s ease-out 0.1s both",
            }}
          >
            {missingRequired === 0
              ? "Blokada działa"
              : `Blokada nie działa — brakuje ${missingRequired} ${missingRequired === 1 ? "uprawnienia" : "uprawnień"}`}
          </p>

          {(
            [
              { label: "Wymagane do blokady", required: true },
              { label: "Opcjonalne", required: false },
            ] as const
          ).map((group, gi) => (
            <div key={group.label}>
              <SettingsGroupLabel
                style={{ animation: `cascadeIn 0.5s ease-out ${0.15 + gi * 0.1}s both` }}
              >
                {group.label}
              </SettingsGroupLabel>
              <SettingsGroup>
                {PERMISSIONS.filter((p) => p.required === group.required).map((p, i) => {
                  const on = status[p.id];
                  return (
                    <SettingsTile
                      key={p.id}
                      icon={p.icon}
                      title={p.title}
                      subtitle={on ? "Włączone" : `Wyłączone · ${p.missing}`}
                      subtitleColor={on ? "var(--success)" : "var(--destructive)"}
                      onClick={() => void open(p.id)}
                      style={{
                        animation: `cascadeIn 0.5s ease-out ${0.2 + gi * 0.1 + i * 0.06}s both`,
                      }}
                    />
                  );
                })}
              </SettingsGroup>
            </div>
          ))}
        </>
      )}
    </Screen>
  );
}
