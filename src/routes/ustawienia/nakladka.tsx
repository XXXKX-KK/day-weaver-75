import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useProfile, useUpdateProfile } from "@/lib/profile";
import {
  useFocusNotes,
  useAddFocusNote,
  useDeleteFocusNote,
  useToggleFocusNoteDone,
} from "@/lib/focus-notes";
import { Blocker, isNativeBlocker } from "@/lib/blocker";
import { toast } from "sonner";

export const Route = createFileRoute("/ustawienia/nakladka")({
  head: () => ({
    meta: [{ title: "Nakładka i skupienie" }],
  }),
  component: OverlayScreen,
});

function OverlayScreen() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const native = isNativeBlocker();

  const save = (patch: Parameters<typeof updateProfile.mutate>[0]) =>
    updateProfile.mutate(patch, {
      onError: () => toast.error("Nie udało się zapisać ustawień."),
    });

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
        <h1 className="text-2xl font-bold leading-tight">Nakładka i skupienie</h1>
      </div>

      <CurrentTaskCard />

      <div
        className="mb-3 flex items-center justify-between rounded-3xl bg-foreground/5 px-4 py-4"
        style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}
      >
        <p className="text-[15px] font-medium">Pokazuj na nakładce</p>
        <Switch
          checked={profile?.focus_notes_enabled ?? false}
          onCheckedChange={(v) => save({ focus_notes_enabled: v })}
        />
      </div>

      <FocusNotesSection />
    </Screen>
  );
}

function CurrentTaskCard() {
  const native = isNativeBlocker();
  const [currentTask, setCurrentTask] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!native) return;
    Blocker.getCurrentTask()
      .then((r) => {
        setCurrentTask(r.title);
        setTaskInput(r.title);
      })
      .catch((e) => console.error("getCurrentTask failed", e));
  }, [native]);

  const saveTask = useCallback(async () => {
    if (!native) {
      toast.info("Zapis zadania działa tylko w aplikacji na telefonie.");
      return;
    }
    setSaving(true);
    try {
      const r = await Blocker.setCurrentTask({ title: taskInput });
      setCurrentTask(r.title);
      setTaskInput(r.title);
      toast.success("Zapisano bieżące zadanie.");
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się zapisać zadania.");
    } finally {
      setSaving(false);
    }
  }, [native, taskInput]);

  return (
    <div
      className="mb-3 rounded-3xl bg-foreground/5 p-4"
      style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
    >
      <p className="mb-[10px] text-xs font-medium text-muted-foreground">
        Na czym się teraz skupiasz?
      </p>
      <div className="flex items-center gap-[10px]">
        <input
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder="Wpisz cel..."
          maxLength={80}
          className="h-11 min-w-0 flex-1 rounded-xl border border-foreground/[0.08] bg-foreground/[0.06] px-[14px] text-[15px] outline-none focus:border-primary/40"
        />
        <button
          onClick={saveTask}
          disabled={saving || taskInput.trim() === currentTask}
          className="accent-gradient shrink-0 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Zapisz
        </button>
      </div>
    </div>
  );
}

function FocusNotesSection() {
  const { data: notes } = useFocusNotes();
  const addNote = useAddFocusNote();
  const deleteNote = useDeleteFocusNote();
  const toggleDone = useToggleFocusNoteDone();
  const [draft, setDraft] = useState("");

  return (
    <div style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}>
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Notatki na luz
      </h2>
      <div className="rounded-3xl bg-foreground/5 overflow-hidden p-0">
        {notes && notes.length > 0
          ? notes.map((note) => (
              <div
                key={note.id}
                className="flex items-center gap-3 px-4 py-[13px]"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <button
                  onClick={() =>
                    toggleDone.mutate({ id: note.id, last_done_at: note.last_done_at })
                  }
                  aria-label={note.last_done_at ? "Resetuj" : "Odhacz"}
                  className={cn(
                    "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    note.last_done_at
                      ? "border-primary bg-primary"
                      : "border-foreground/[0.18]",
                  )}
                >
                  {note.last_done_at ? (
                    <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3.5} />
                  ) : null}
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[15px]",
                    note.last_done_at && "text-muted-foreground line-through opacity-40",
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
                  className="p-1 text-foreground/25"
                >
                  <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.5} />
                </button>
              </div>
            ))
          : null}

        <div className="flex items-center gap-[10px] px-4 py-[11px]">
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-foreground/[0.12]" />
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
            placeholder="Dodaj notatkę..."
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          <button
            onClick={() => {
              if (!draft.trim()) return;
              addNote.mutate(draft.trim(), {
                onSuccess: () => setDraft(""),
                onError: () => toast.error("Nie udało się dodać notatki."),
              });
            }}
            disabled={!draft.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary transition-opacity disabled:opacity-30"
          >
            <Plus className="h-[14px] w-[14px] text-primary-foreground" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
