import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Screen, SubScreenHeader } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useRequestAccountDeletion } from "@/lib/account";
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
 * Zgłoszenie usunięcia konta. Nic nie znika od razu: konto czeka 30 dni, więc
 * przypadkowe albo emocjonalne kliknięcie da się cofnąć samym zalogowaniem.
 */
function DeleteAccountScreen() {
  const { signOut } = useAuth();
  const request = useRequestAccountDeletion();
  const [word, setWord] = useState("");

  const confirmed = word.trim().toUpperCase() === CONFIRM_WORD;

  const submit = () => {
    if (!confirmed || request.isPending) return;
    request.mutate(undefined, {
      onSuccess: async () => {
        toast.success("Konto zostanie usunięte za 30 dni.");
        await signOut();
      },
      onError: () => toast.error("Nie udało się zgłosić usunięcia konta."),
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
      </div>

      <div
        className="mt-3 rounded-3xl glass px-4 py-4"
        style={{ animation: "cascadeIn 0.5s ease-out 0.16s both" }}
      >
        <p className="text-[16px] font-semibold">Masz 30 dni na zmianę zdania</p>
        <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
          Po zgłoszeniu wylogujemy Cię z aplikacji. Przez 30 dni wystarczy się zalogować, żeby
          przywrócić konto razem z całą historią. Po tym czasie dane znikają bezpowrotnie.
        </p>
      </div>

      <div
        className="mt-3 rounded-3xl glass px-4 py-4"
        style={{ animation: "cascadeIn 0.5s ease-out 0.22s both" }}
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

      <button
        type="button"
        onClick={submit}
        disabled={!confirmed || request.isPending}
        className="mt-5 w-full rounded-3xl bg-destructive px-4 py-4 text-[16px] font-semibold text-destructive-foreground transition-opacity disabled:opacity-40"
        style={{ animation: "cascadeIn 0.5s ease-out 0.28s both" }}
      >
        {request.isPending ? "Zgłaszam…" : "Usuń konto"}
      </button>
    </Screen>
  );
}
