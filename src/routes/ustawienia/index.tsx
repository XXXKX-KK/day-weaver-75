import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  Check,
  ChevronRight,
  Clock,
  LogOut,
  Palette,
  Plus,
  ShieldCheck,
  StickyNote,
  Trash2,
  User,
} from "lucide-react";
import { Screen, ScreenHeader, Card } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useProfile, useUpdateProfile } from "@/lib/profile";
import { useToday } from "@/lib/day";
import {
  useFocusNotes,
  useAddFocusNote,
  useDeleteFocusNote,
  useToggleFocusNoteDone,
} from "@/lib/focus-notes";
import {
  areNotificationsEnabled,
  cancelReminders,
  refreshNotifications,
  setNotificationsEnabledLocal,
} from "@/lib/notifications";
import { toast } from "sonner";

export const Route = createFileRoute("/ustawienia/")({
  head: () => ({
    meta: [
      { title: "Ustawienia – godziny dnia i uprawnienia" },
      {
        name: "description",
        content:
          "Ustaw godziny startu i końca dnia, autostart planu oraz uprawnienia potrzebne do blokowania aplikacji.",
      },
      { property: "og:title", content: "Ustawienia – godziny dnia i uprawnienia" },
      {
        property: "og:description",
        content: "Konfiguracja dnia, przerw i uprawnień Androida.",
      },
    ],
  }),
  component: SettingsScreen,
});

/** "HH:MM:SS" (or null) -> "HH:MM" for the time input. */
const toTimeInput = (value: string | null | undefined) => (value ? value.slice(0, 5) : "");

function SettingsScreen() {
  const { resetDay } = useStore();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const { data: today } = useToday();
  const updateProfile = useUpdateProfile();

  // Local mirror for the time inputs, seeded from the profile.
  const [dayStart, setDayStart] = useState("");
  const [dayEnd, setDayEnd] = useState("");
  useEffect(() => {
    if (profile) {
      setDayStart(toTimeInput(profile.day_start_time));
      setDayEnd(toTimeInput(profile.day_end_time));
    }
  }, [profile]);

  // Notifications toggle — persisted locally (default on), seeded on mount.
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
        today?.status === "in_progress" ? today.items.filter((i) => i.status !== "done").length : 0,
      streak: profile?.streak_count ?? 0,
      dayCompleted: today?.status === "completed",
    });
  };

  const save = (patch: Parameters<typeof updateProfile.mutate>[0]) =>
    updateProfile.mutate(patch, {
      onError: () => toast.error("Nie udało się zapisać ustawień."),
    });

  return (
    <Screen>
      <ScreenHeader eyebrow="Konto" title="Ustawienia" />

      <Card className="mb-4 flex items-center gap-4 py-5">
        <span className="accent-gradient flex h-12 w-12 items-center justify-center rounded-2xl">
          <User className="h-5 w-5 text-primary-foreground" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold">Twój profil</p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.email ?? "Konto prywatne"}
          </p>
        </div>
      </Card>

      <Link to="/ustawienia/wyglad" className="mb-6 block">
        <Card className="flex items-center gap-4 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-elevated">
            <Palette className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Wygląd</p>
            <p className="truncate text-xs text-muted-foreground">Motyw, tryb i język</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Card>
      </Link>

      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Dzień
        </h2>
        {updateProfile.isPending ? (
          <span className="text-xs text-muted-foreground">Zapisywanie…</span>
        ) : null}
      </div>

      {isLoading ? (
        <Card className="mb-6 py-6">
          <p className="text-center text-sm text-muted-foreground">Wczytywanie ustawień…</p>
        </Card>
      ) : isError ? (
        <Card className="mb-6 flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">Nie udało się wczytać ustawień.</p>
          <button
            onClick={() => refetch()}
            className="h-10 rounded-2xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground"
          >
            Spróbuj ponownie
          </button>
        </Card>
      ) : (
        <Card className="mb-6 divide-y divide-border p-0">
          <TimeRow
            label="Start dnia"
            value={dayStart}
            onChange={(v) => {
              setDayStart(v);
              if (v) save({ day_start_time: v });
            }}
          />
          <TimeRow
            label="Koniec dnia"
            value={dayEnd}
            onChange={(v) => {
              setDayEnd(v);
              if (v) save({ day_end_time: v });
            }}
          />
          <div className="flex items-center justify-between px-5 py-4">
            <span className="flex items-center gap-3 text-sm">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Autostart dnia
            </span>
            <Switch
              checked={profile?.autostart_day ?? false}
              onCheckedChange={(v) => save({ autostart_day: v })}
            />
          </div>
        </Card>
      )}

      {/* TODO dzień: godziny są tu tylko zapisywane do profilu; podpięcie pod
          generowanie dnia (startDay/buildDay) to osobny brief. */}

      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Powiadomienia
      </h2>
      <Card className="mb-6 p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="flex items-center gap-3 text-sm">
            <BellRing className="h-4 w-4 text-muted-foreground" />
            Przypomnienia dnia
          </span>
          <Switch checked={notifEnabled} onCheckedChange={toggleNotifications} />
        </div>
      </Card>

      <FocusNotesSection
        enabled={profile?.focus_notes_enabled ?? false}
        onToggle={(v) => save({ focus_notes_enabled: v })}
      />

      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Uprawnienia Androida
      </h2>
      <Card className="mb-6 divide-y divide-border p-0">
        <Row
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Usługa ułatwień dostępu"
          value="Wymagana"
        />
        <Row
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Optymalizacja baterii"
          value="Wyłącz"
        />
      </Card>

      <button
        onClick={resetDay}
        className="mb-3 h-14 w-full rounded-3xl bg-secondary text-sm font-semibold text-secondary-foreground"
      >
        Zresetuj dzisiejszy dzień
      </button>
      <button
        onClick={() => void signOut()}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-3xl border border-border text-sm font-semibold text-muted-foreground"
      >
        <LogOut className="h-4 w-4" />
        Wyloguj się
      </button>
      <p className="mt-6 text-center text-xs text-muted-foreground">TENAX · Wersja 0.1</p>
    </Screen>
  );
}

function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="flex items-center gap-3 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl bg-elevated px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/40"
      />
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

function FocusNotesSection({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  const { data: notes } = useFocusNotes();
  const addNote = useAddFocusNote();
  const deleteNote = useDeleteFocusNote();
  const toggleDone = useToggleFocusNoteDone();
  const [draft, setDraft] = useState("");

  return (
    <>
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Notatki na luz
      </h2>
      <Card className="mb-6 divide-y divide-border p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="flex items-center gap-3 text-sm">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            Pokazuj na nakładce
          </span>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>

        {enabled ? (
          <>
            <div className="flex items-center gap-2 px-4 py-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) {
                    addNote.mutate(draft.trim(), {
                      onSuccess: () => setDraft(""),
                      onError: () => toast.error("Nie udało się dodać notatki."),
                    });
                  }
                }}
                placeholder="np. Posłuchaj podcastu"
                className="h-11 min-w-0 flex-1 rounded-2xl border border-input bg-elevated px-4 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => {
                  if (!draft.trim()) return;
                  addNote.mutate(draft.trim(), {
                    onSuccess: () => setDraft(""),
                    onError: () => toast.error("Nie udało się dodać notatki."),
                  });
                }}
                disabled={!draft.trim() || addNote.isPending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary disabled:opacity-40"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {notes && notes.length > 0
              ? notes.map((note) => (
                  <div key={note.id} className="flex items-center gap-3 px-5 py-3">
                    <button
                      onClick={() => toggleDone.mutate({ id: note.id, last_done_at: note.last_done_at })}
                      aria-label={note.last_done_at ? "Resetuj" : "Odhacz"}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                        note.last_done_at
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {note.last_done_at ? <Check className="h-4 w-4" /> : null}
                    </button>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        note.last_done_at && "text-muted-foreground line-through",
                      )}
                    >
                      {note.title}
                    </span>
                    <button
                      onClick={() =>
                        deleteNote.mutate(note.id, {
                          onError: () => toast.error("Nie udało się usunąć notatki."),
                        })
                      }
                      aria-label="Usuń notatkę"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              : null}
          </>
        ) : null}
      </Card>
    </>
  );
}
