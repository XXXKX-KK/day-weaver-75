import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/ui-kit";

export const Route = createFileRoute("/usun-konto")({
  head: () => ({
    meta: [
      { title: "Usunięcie konta TENAX" },
      {
        name: "description",
        content: "Jak usunąć konto TENAX z poziomu aplikacji albo zgłoszeniem e-mailem.",
      },
    ],
  }),
  component: PublicDeletionPage,
});

/** Adres, pod który idą zgłoszenia od osób bez dostępu do aplikacji. */
const CONTACT_EMAIL = "kontakt@tenax.app";

/**
 * Publiczna strona wymagana przez Google Play: użytkownik musi móc zgłosić
 * usunięcie konta również spoza aplikacji, bez instalowania jej ponownie.
 * Celowo bez logowania i bez nawigacji — to zwykła strona informacyjna.
 */
function PublicDeletionPage() {
  return (
    <Screen>
      <h1 className="text-3xl font-bold leading-tight">Usunięcie konta TENAX</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Konto możesz usunąć sam z aplikacji albo zgłosić to e-mailem, jeśli nie masz już do niej
        dostępu.
      </p>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        W aplikacji
      </h2>
      <ol className="mt-2 flex flex-col gap-2 text-[15px] leading-relaxed">
        <li>
          1. Otwórz <span className="font-medium">Ustawienia → Twój profil</span>.
        </li>
        <li>
          2. Na dole wybierz <span className="font-medium">Usuń konto</span>.
        </li>
        <li>
          3. Potwierdź, wpisując <span className="font-medium">USUŃ</span>.
        </li>
      </ol>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        E-mailem
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed">
        Napisz z adresu, na który jest założone konto, na{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-medium text-primary underline underline-offset-4"
        >
          {CONTACT_EMAIL}
        </a>{" "}
        z tematem „Usunięcie konta". Zgłoszenie obsługujemy w ciągu 30 dni.
      </p>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Co zostanie usunięte
      </h2>
      <ul className="mt-2 flex flex-col gap-1.5 text-[15px] leading-relaxed text-muted-foreground">
        <li>• Konto i adres e-mail</li>
        <li>• Plan dnia i historia dni</li>
        <li>• Rutyny, zadania i podzadania</li>
        <li>• XP, poziom i passa</li>
        <li>• Notatki skupienia i ustawienia blokady</li>
      </ul>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Lista blokowanych aplikacji, wybrane kalendarze i PIN są zapisane wyłącznie na Twoim
        telefonie — znikają razem z odinstalowaniem aplikacji i nigdy nie trafiają na serwer.
      </p>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Ile to trwa
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        Po zgłoszeniu konto czeka 30 dni — przez ten czas wystarczy się zalogować, żeby je
        przywrócić razem z całą historią. Po 30 dniach dane są kasowane bezpowrotnie i nie da się
        ich odtworzyć.
      </p>
    </Screen>
  );
}
