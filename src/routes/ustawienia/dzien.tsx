import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlayCircle, Sunrise, Sunset } from "lucide-react";
import {
  Screen,
  SettingsGroup,
  SettingsGroupLabel,
  SettingsTile,
  SubScreenHeader,
} from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/pickers";
import { useProfile, useUpdateProfile } from "@/lib/profile";
import { toast } from "sonner";

export const Route = createFileRoute("/ustawienia/dzien")({
  head: () => ({
    meta: [{ title: "Godziny dnia" }],
  }),
  component: DaySettingsScreen,
});

const pad = (n: number) => String(n).padStart(2, "0");

const toTimeInput = (value: string | null | undefined) => (value ? value.slice(0, 5) : "");

function DaySettingsScreen() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [dayStart, setDayStart] = useState("");
  const [dayEnd, setDayEnd] = useState("");
  const [picker, setPicker] = useState<"start" | "end" | null>(null);

  useEffect(() => {
    if (profile) {
      setDayStart(toTimeInput(profile.day_start_time));
      setDayEnd(toTimeInput(profile.day_end_time));
    }
  }, [profile]);

  const save = (patch: Parameters<typeof updateProfile.mutate>[0]) =>
    updateProfile.mutate(patch, {
      onError: () => toast.error("Nie udało się zapisać ustawień."),
    });

  const parseHM = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    return { h: h ?? 0, m: m ?? 0 };
  };

  return (
    <Screen>
      <SubScreenHeader title="Godziny dnia" />

      {isLoading ? (
        <p className="px-1 text-sm text-muted-foreground">Wczytywanie ustawień…</p>
      ) : (
        <>
          <SettingsGroupLabel style={{ animation: "cascadeIn 0.5s ease-out 0.08s both" }}>
            Dzień
          </SettingsGroupLabel>
          <SettingsGroup>
            <SettingsTile
              icon={Sunrise}
              title="Start dnia"
              subtitle={dayStart || "—:—"}
              onClick={() => setPicker("start")}
              right={<TimeChip value={dayStart} />}
              style={{ animation: "cascadeIn 0.5s ease-out 0.12s both" }}
            />
            <SettingsTile
              icon={Sunset}
              title="Koniec dnia"
              subtitle={dayEnd || "—:—"}
              onClick={() => setPicker("end")}
              right={<TimeChip value={dayEnd} />}
              style={{ animation: "cascadeIn 0.5s ease-out 0.18s both" }}
            />
          </SettingsGroup>

          <SettingsGroupLabel style={{ animation: "cascadeIn 0.5s ease-out 0.24s both" }}>
            Automatyzacja
          </SettingsGroupLabel>
          <SettingsGroup>
            <SettingsTile
              icon={PlayCircle}
              title="Autostart dnia"
              subtitle={profile?.autostart_day ? "Włączony" : "Wyłączony"}
              right={
                <Switch
                  checked={profile?.autostart_day ?? false}
                  onCheckedChange={(v) => save({ autostart_day: v })}
                />
              }
              style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}
            />
          </SettingsGroup>

          {picker && (
            <TimePicker
              value={picker === "start" ? dayStart : dayEnd}
              onChange={(time) => {
                if (picker === "start") {
                  setDayStart(time);
                  if (time) save({ day_start_time: time });
                } else {
                  setDayEnd(time);
                  if (time) save({ day_end_time: time });
                }
                setPicker(null);
              }}
              onClose={() => setPicker(null)}
            />
          )}
        </>
      )}
    </Screen>
  );
}

/** Godzina po prawej stronie kafelka — ten sam „chip" co wcześniej. */
function TimeChip({ value }: { value: string }) {
  return (
    <span className="shrink-0 rounded-[10px] border border-foreground/[0.06] bg-foreground/[0.08] px-[14px] py-2">
      <span className="text-[17px] font-semibold tabular-nums">{value || "—:—"}</span>
    </span>
  );
}
