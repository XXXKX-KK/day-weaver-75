import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/ui-kit";

export const Route = createFileRoute("/ustawienia/regulamin")({
  head: () => ({
    meta: [{ title: "Regulamin" }],
  }),
  component: TermsScreen,
});

function TermsScreen() {
  return (
    <Screen>
      <div
        className="mb-5 flex items-center gap-3"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        <Link
          to="/ustawienia"
          className="flex h-10 w-10 items-center justify-center rounded-2xl glass"
          aria-label="Wróć"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold leading-tight">Regulamin</h1>
      </div>

      <div
        className="max-w-prose space-y-6 pb-12"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        <p className="text-xs text-muted-foreground">
          Ostatnia aktualizacja: [DATA — np. 15 września 2026]
        </p>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Usługodawca:</span>{" "}
            [TWOJE IMIĘ I NAZWISKO / NAZWA], kontakt: [TWÓJ EMAIL KONTAKTOWY]
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">1. Postanowienia ogólne</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Niniejszy Regulamin określa zasady korzystania z aplikacji mobilnej{" "}
            <strong className="text-foreground">TENAX</strong> („Aplikacja"). Korzystając z Aplikacji,
            akceptujesz ten Regulamin. Jeśli się z nim nie zgadzasz, nie korzystaj z Aplikacji.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">2. Czym jest Aplikacja</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            TENAX to narzędzie wspierające produktywność i dyscyplinę: planowanie dnia (rutyny
            i zadania) oraz opcjonalna funkcja blokowania rozpraszających aplikacji, która pomaga
            trzymać się planu. Aplikacja jest{" "}
            <strong className="text-foreground">narzędziem wspomagającym</strong>, a nie gwarancją
            rezultatów.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">3. Konto</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Do korzystania z pełni funkcji wymagane jest konto (rejestracja adresem e-mail).
            </li>
            <li>
              Odpowiadasz za poufność danych logowania i za działania wykonane na swoim koncie.
            </li>
            <li>Podane dane powinny być prawdziwe i aktualne.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">4. Zasady korzystania</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Zobowiązujesz się nie:</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>korzystać z Aplikacji w sposób niezgodny z prawem,</li>
            <li>zakłócać działania Aplikacji ani prób obchodzenia jej zabezpieczeń,</li>
            <li>podejmować działań naruszających prawa Usługodawcy lub osób trzecich.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">5. Funkcja blokowania aplikacji</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Funkcja blokowania działa w oparciu o uprawnienia systemu Android, które nadajesz
              samodzielnie (dostęp do statystyk użycia, wyświetlanie nad innymi aplikacjami).
            </li>
            <li>
              Jest to <strong className="text-foreground">środek wspomagający samodyscyplinę</strong>.
              Ze względu na ograniczenia systemu Android i różnice między urządzeniami Usługodawca{" "}
              <strong className="text-foreground">nie gwarantuje</strong>, że każda próba otwarcia
              wybranej aplikacji zostanie przechwycona.
            </li>
            <li>
              Blokadę możesz w każdej chwili wyłączyć w ustawieniach Aplikacji. Ty pozostajesz
              odpowiedzialny za sposób korzystania z własnego urządzenia.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">6. Opłaty</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Na dzień publikacji Regulaminu Aplikacja jest{" "}
            <strong className="text-foreground">bezpłatna</strong>. Jeśli w przyszłości pojawią się
            funkcje płatne lub subskrypcja, ich warunki zostaną określone przed zakupem, a Regulamin
            zostanie zaktualizowany.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">7. Dane osobowe</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Zasady przetwarzania danych opisuje{" "}
            <strong className="text-foreground">Polityka prywatności</strong>, dostępna w Aplikacji
            oraz pod adresem [ADRES URL POLITYKI].
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">8. Odpowiedzialność</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Aplikacja dostarczana jest „w takim stanie, w jakim jest" (as-is).
            </li>
            <li>
              W najszerszym zakresie dozwolonym przez prawo Usługodawca nie ponosi
              odpowiedzialności za szkody pośrednie wynikające z korzystania lub niemożności
              korzystania z Aplikacji, ani za utratę danych spowodowaną czynnikami niezależnymi od
              Usługodawcy.
            </li>
            <li>
              Powyższe nie wyłącza ani nie ogranicza odpowiedzialności w zakresie, w jakim nie może
              ona zostać wyłączona zgodnie z obowiązującym prawem (w tym praw konsumenta).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            9. Usunięcie konta i zakończenie korzystania
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              W każdej chwili możesz zaprzestać korzystania z Aplikacji i usunąć konto; usunięcie
              konta powoduje usunięcie powiązanych danych.
            </li>
            <li>
              Usługodawca może zawiesić lub zakończyć świadczenie usługi w razie istotnego
              naruszenia Regulaminu.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">10. Zmiany Regulaminu</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Usługodawca może aktualizować Regulamin. O istotnych zmianach poinformuje w Aplikacji.
            Dalsze korzystanie po wejściu zmian w życie oznacza ich akceptację.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">11. Prawo właściwe i kontakt</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Regulamin podlega prawu polskiemu; nie narusza to bezwzględnie obowiązujących praw
              konsumenta.
            </li>
            <li>
              Kontakt: <strong className="text-foreground">[TWÓJ EMAIL KONTAKTOWY]</strong>.
            </li>
          </ul>
        </section>
      </div>
    </Screen>
  );
}
