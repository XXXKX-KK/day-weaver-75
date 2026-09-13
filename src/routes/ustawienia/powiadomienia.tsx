import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/lib/profile";
import { useToday } from "@/lib/day";
import {
  areNotificationsEnabled,
  cancelReminders,
  refreshNotifications,
  setNotificationsEnabledLocal,
} from "@/lib/notifications";

export const Route = createFileRoute("/ustawienia/powiadomienia")({
  head: () => ({
    meta: [{ title: "Powiadomienia" }],
  }),
  component: NotificationsScreen,
});

function NotificationsScreen() {
  const { data: profile } = useProfile();
  const { data: today } = useToday();
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    setNotifEnabled(areNotificationsEnabled());
  }, []);

  const toggleNotifications = (enabled: boolean) => {
    setNotifEnabled(enabled);
    setNotificationsEnabledLocal(enabled);
    if (!enabled) {
      void cancelReminders();
      return;
    }
    void refreshNotifications({
      dayStartTime: profile?.day_start_time ?? null,
      dayEndTime: profile?.day_end_time ?? null,
      undoneCount:
        today?.status === "in_progress"
          ? today.items.filter((i) => i.status !== "done").length
          : 0,
      streak: profile?.streak_count ?? 0,
      dayCompleted: today?.status === "completed",
    });
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
        <h1 className="text-2xl font-bold leading-tight">Powiadomienia</h1>
      </div>

      <div
        className="card-surface overflow-hidden p-0"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-[15px] font-medium">Przypomnienia dnia</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Powiadomienie o planie dnia
            </p>
          </div>
          <Switch checked={notifEnabled} onCheckedChange={toggleNotifications} />
        </div>
      </div>
    </Screen>
  );
}
