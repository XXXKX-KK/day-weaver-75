import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/pickers";
import { useProfile, useUpdateProfile } from "@/lib/profile";
import { toast } from "sonner";

export const Route = createFileRoute("/ustawienia/dzien")({
  head: () => ({
    meta: [{ title: "Dzień – godziny aktywności" }],
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
        <h1 className="text-2xl font-bold leading-tight">Dzień</h1>
      </div>

      {isLoading ? (
        <p className="px-1 text-sm text-muted-foreground">Wczytywanie ustawień…</p>
      ) : (
        <>
          <button
            onClick={() => setPicker("start")}
            className="mb-3 flex w-full items-center justify-between rounded-3xl bg-foreground/5 px-4 py-4"
            style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
          >
            <div className="text-left">
              <p className="text-[15px] font-medium">Start dnia</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Kiedy zaczynasz dzień</p>
            </div>
            <span className="rounded-[10px] border border-foreground/[0.06] bg-foreground/[0.08] px-[14px] py-2">
              <span className="text-[17px] font-semibold tabular-nums">
                {dayStart || "—:—"}
              </span>
            </span>
          </button>
          <button
            onClick={() => setPicker("end")}
            className="mb-3 flex w-full items-center justify-between rounded-3xl bg-foreground/5 px-4 py-4"
            style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}
          >
            <div className="text-left">
              <p className="text-[15px] font-medium">Koniec dnia</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Kiedy kończysz dzień</p>
            </div>
            <span className="rounded-[10px] border border-foreground/[0.06] bg-foreground/[0.08] px-[14px] py-2">
              <span className="text-[17px] font-semibold tabular-nums">
                {dayEnd || "—:—"}
              </span>
            </span>
          </button>

          <div
            className="flex items-center justify-between rounded-3xl bg-foreground/5 px-4 py-4"
            style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}
          >
            <div>
              <p className="text-[15px] font-medium">Autostart</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Automatycznie rozpocznij dzień
              </p>
            </div>
            <Switch
              checked={profile?.autostart_day ?? false}
              onCheckedChange={(v) => save({ autostart_day: v })}
            />
          </div>

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
