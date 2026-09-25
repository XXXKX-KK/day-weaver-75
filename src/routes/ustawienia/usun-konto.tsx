import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Screen, SubScreenHeader } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useDeleteAccount } from "@/lib/account";
import { toast } from "sonner";

export const Route = createFileRoute("/ustawienia/usun-konto")({
  head: () => ({
    meta: [{ title: "Usuń konto" }],
  }),
  component: DeleteAccountScreen,
});

const CONFIRM_WORD = "USUŃ";

const WHAT_GOES = [
  "Plan dnia i cała historia dni",
  "Rutyny, zadania i podzadania",
  "XP, poziom i passa",
  "Notatki skupienia i ustawienia blokady",
];

/**
 * Usunięcie konta. Działa od razu i bez odwrotu, więc jedyne zabezpieczenie to
 * świadome przepisanie słowa — przypadkowe kliknięcie nic nie zrobi.
 */
function DeleteAccountScreen() {
  const { signOut } = useAuth();
  const remove = useDeleteAccount();
  const [word, setWord] = useState("");
  const [error, setError] = useState("");

  // Wejście na ekran zawsze zaczyna od pustego pola — potwierdzenie sprzed
  // chwili nie może zostać na ekranie i wpuścić kogoś jednym tapnięciem.
  useEffect(() => {
    setWord("");
    setError("");
  }, []);

  const confirmed = word.trim().toLocaleUpperCase("pl-PL") === CONFIRM_WORD;

  const submit = () => {
    if (!confirmed || remove.isPending) return;
    setError("");
    remove.mutate(undefined, {
      onSuccess: async () => {
        toast.success("Konto usunięte");
        await signOut();
      },
      onError: (e) =>
        setError(e instanceof Error ? e.message : "Nie udało się usunąć konta. Spróbuj ponownie."),
    });
  };

  return (
    <Screen>
      <SubScreenHeader title="Usuń konto" back="/ustawienia/profil" />

      <div
        className="rounded-3xl glass px-4 py-4"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <TriangleAlert className="h-[18px] w-[18px] text-destructive" />
          </span>
          <p className="text-[16px] font-semibold">Co zostanie usunięte</p>
        </div>
        <ul className="flex flex-col gap-1.5">
          {WHAT_GOES.map((item) => (
            <li key={item} className="flex gap-2 text-[14px] text-muted-foreground">
              <span className="text-muted-foreground/50">•</span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[14px] font-semibold text-destructive">
          Tej operacji nie można cofnąć.
        </p>
      </div>

      <div
        className="mt-3 rounded-3xl glass px-4 py-4"
        style={{ animation: "cascadeIn 0.5s ease-out 0.16s both" }}
      >
        <label htmlFor="confirm-word" className="text-[14px] text-muted-foreground">
          Wpisz <span className="font-semibold text-foreground">{CONFIRM_WORD}</span>, żeby
          potwierdzić
        </label>
        <input
          id="confirm-word"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder={CONFIRM_WORD}
          className="mt-2 w-full rounded-2xl border border-foreground/[0.08] bg-foreground/[0.04] px-4 py-3 text-[16px] font-semibold tracking-[0.08em] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/50 focus:border-destructive/50"
        />
      </div>

      {/* Animacja wejścia siedzi na opakowaniu, nie na przycisku: `cascadeIn`
          kończy się na `opacity: 1` i z `both` trzyma tę wartość na zawsze, a
          animacja bije zwykłe deklaracje — więc `disabled:opacity-40` na samym
          przycisku nigdy by się nie pokazało i zablokowany przycisk wyglądałby
          na aktywny. */}
      <div style={{ animation: "cascadeIn 0.5s ease-out 0.22s both" }}>
        <button
          type="button"
          onClick={submit}
          disabled={!confirmed || remove.isPending}
          className="mt-5 w-full rounded-3xl bg-destructive px-4 py-4 text-[16px] font-semibold text-destructive-foreground transition-opacity disabled:opacity-40"
        >
          {remove.isPending ? "Usuwanie…" : "Usuń konto"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-center text-[13px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </Screen>
  );
}
