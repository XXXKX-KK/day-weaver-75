import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Flame, ListChecks, Sunrise } from "lucide-react";
import {
  Screen,
  SettingsGroup,
  SettingsGroupLabel,
  SettingsTile,
  SubScreenHeader,
} from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/lib/profile";
import { useToday } from "@/lib/day";
import {
  areNotificationsEnabled,
  cancelReminders,
  isReminderEnabled,
  refreshNotifications,
  isDayStreakCounted,
  REMINDER_KINDS,
  setNotificationsEnabledLocal,
  setReminderEnabled,
  type ReminderKind,
} from "@/lib/notifications";

export const Route = createFileRoute("/ustawienia/powiadomienia")({
  head: () => ({
    meta: [{ title: "Przypomnienia" }],
  }),
  component: NotificationsScreen,
});

const ICONS: Record<ReminderKind, typeof Bell> = {
  morning: Sunrise,
  undone: ListChecks,
  streak: Flame,
};

function NotificationsScreen() {
  const { data: profile } = useProfile();
  const { data: today } = useToday();
  const [master, setMaster] = useState(true);
  const [kinds, setKinds] = useState<Record<ReminderKind, boolean>>({
    morning: true,
    undone: true,
    streak: true,
  });

  // localStorage jest dostępny dopiero po stronie klienta, więc stan wczytuje
  // się po zamontowaniu, a nie w inicjalizatorze.
  useEffect(() => {
    setMaster(areNotificationsEnabled());
    setKinds({
      morning: isReminderEnabled("morning"),
      undone: isReminderEnabled("undone"),
      streak: isReminderEnabled("streak"),
    });
  }, []);

  /** Przeplanowuje alarmy z bieżącego stanu dnia — to samo, co robi apka po starcie. */
  const reschedule = () =>
    void refreshNotifications({
      dayStartTime: profile?.day_start_time ?? null,
      dayEndTime: profile?.day_end_time ?? null,
      undoneCount:
        today?.status === "in_progress" ? today.items.filter((i) => i.status !== "done").length : 0,
      streak: profile?.streak_count ?? 0,
      streakCounted: isDayStreakCounted(today),
    });

  const toggleMaster = (enabled: boolean) => {
    setMaster(enabled);
    setNotificationsEnabledLocal(enabled);
    if (!enabled) {
      void cancelReminders();
      return;
    }
    reschedule();
  };

  const toggleKind = (kind: ReminderKind, enabled: boolean) => {
    setKinds((prev) => ({ ...prev, [kind]: enabled }));
    setReminderEnabled(kind, enabled);
    if (master) reschedule();
  };

  return (
    <Screen>
      <SubScreenHeader title="Przypomnienia" />

      <SettingsGroup>
        <SettingsTile
          icon={Bell}
          title="Przypomnienia"
          subtitle={master ? "Włączone" : "Wyłączone"}
          right={<Switch checked={master} onCheckedChange={toggleMaster} />}
          style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
        />
      </SettingsGroup>

      <SettingsGroupLabel style={{ animation: "cascadeIn 0.5s ease-out 0.16s both" }}>
        Rodzaje
      </SettingsGroupLabel>
      {/* Przygaszone razem z głównym wyłącznikiem: przełączniki dalej działają
          i zapamiętują wybór, ale nic nie zaplanują, dopóki główny jest off. */}
      <div className={master ? undefined : "opacity-50"}>
        <SettingsGroup>
          {REMINDER_KINDS.map((r, i) => (
            <SettingsTile
              key={r.kind}
              icon={ICONS[r.kind]}
              title={r.title}
              subtitle={r.description}
              right={
                <Switch checked={kinds[r.kind]} onCheckedChange={(v) => toggleKind(r.kind, v)} />
              }
              style={{ animation: `cascadeIn 0.5s ease-out ${0.2 + i * 0.06}s both` }}
            />
          ))}
        </SettingsGroup>
      </div>

      <p
        className="mt-5 px-1 text-[13px] leading-relaxed text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.4s both" }}
      >
        Przypomnienia o rutynach i zadaniach z godziną chodzą osobno — zawsze wtedy, gdy ustawisz im
        porę. Główny wyłącznik wycisza również je.
      </p>
    </Screen>
  );
}
