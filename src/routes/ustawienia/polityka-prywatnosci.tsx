import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/ui-kit";

export const Route = createFileRoute("/ustawienia/polityka-prywatnosci")({
  head: () => ({
    meta: [{ title: "Polityka prywatności" }],
  }),
  component: PrivacyScreen,
});

function PrivacyScreen() {
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
        <h1 className="text-2xl font-bold leading-tight">Polityka prywatności</h1>
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
            <span className="font-medium text-foreground">Administrator danych:</span>{" "}
            [TWOJE IMIĘ I NAZWISKO / NAZWA] — twórca aplikacji TENAX
          </p>
          <p>
            <span className="font-medium text-foreground">Kontakt:</span>{" "}
            [TWÓJ EMAIL KONTAKTOWY]
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">1. Kim jesteśmy</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            TENAX to aplikacja mobilna wspierająca produktywność i dyscyplinę: planujesz dzień
            (rutyny i zadania), a opcjonalna blokada rozpraszających aplikacji pomaga Ci trzymać się
            planu. Niniejsza polityka wyjaśnia, jakie dane zbieramy, po co i jakie masz prawa.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">2. Jakie dane zbieramy</h2>

          <p className="text-sm font-medium text-foreground">
            Dane konta (przechowywane na serwerze):
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Adres e-mail — do założenia i logowania do konta.</li>
            <li>Opcjonalna nazwa wyświetlana.</li>
          </ul>

          <p className="text-sm font-medium text-foreground">
            Treści, które sam tworzysz w aplikacji (przechowywane na serwerze):
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Rutyny, zadania i podzadania, notatki, plany dnia i ich statusy.
            </li>
            <li>
              Punkty XP, poziom, passa (streak) oraz ustawienia (np. godziny dnia, limity przerw).
            </li>
            <li>
              Twoja lista aplikacji wybranych do zablokowania (nazwy pakietów i etykiety, które sam
              zaznaczysz), oraz zapisy zdarzeń blokady/odblokowania (log przerw).
            </li>
          </ul>

          <p className="text-sm font-medium text-foreground">
            Dane przetwarzane wyłącznie na Twoim urządzeniu (nie wysyłamy ich na serwer):
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Informacja o tym, która aplikacja jest w danym momencie na pierwszym planie. Używamy
              jej <strong className="text-foreground">tylko lokalnie</strong>, aby wykryć, że
              otworzyłeś aplikację oznaczoną przez Ciebie jako rozpraszająca, i wyświetlić nakładkę
              przypominającą o zadaniu.{" "}
              <strong className="text-foreground">
                Historia użycia aplikacji nie jest zbierana, zapisywana ani przesyłana poza Twoje
                urządzenie.
              </strong>
            </li>
            <li>
              Wydarzenia z kalendarza na Twoim telefonie — tytuł, godziny i nazwa kalendarza —
              odczytywane tylko wtedy, gdy sam włączysz opcję „Pokazuj wydarzenia z kalendarza".
              Pokazujemy je na ekranie Dziś, aby plan dnia uwzględniał to, co i tak masz umówione.{" "}
              <strong className="text-foreground">
                Wydarzeń nie zapisujemy, nie modyfikujemy i nie wysyłamy na serwer — są czytane na
                bieżąco na urządzeniu.
              </strong>
            </li>
          </ul>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Nie zbieramy danych o lokalizacji. Aplikacja nie zawiera zewnętrznych sieci reklamowych.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            3. Uprawnienia i po co ich używamy
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">
                Dostęp do statystyk użycia (PACKAGE_USAGE_STATS)
              </strong>{" "}
              — aby lokalnie wykryć, która aplikacja jest na pierwszym planie i pokazać nakładkę, gdy
              otworzysz wybrany rozpraszacz. Dane użycia nie opuszczają urządzenia.
            </li>
            <li>
              <strong className="text-foreground">
                Wyświetlanie nad innymi aplikacjami (SYSTEM_ALERT_WINDOW)
              </strong>{" "}
              — aby pokazać nakładkę „wróć do zadania" na wierzchu blokowanej aplikacji, w trakcie
              rozpoczętego dnia.
            </li>
            <li>
              <strong className="text-foreground">
                Usługa pierwszoplanowa (FOREGROUND_SERVICE / SPECIAL_USE)
              </strong>{" "}
              — aby blokada działała, gdy aktywnie z niej korzystasz; widoczne powiadomienie
              informuje, że blokada jest włączona.
            </li>
            <li>
              <strong className="text-foreground">Powiadomienia (POST_NOTIFICATIONS)</strong> —
              przypomnienia o rozpoczęciu/zakończeniu dnia i o zadaniach.
            </li>
            <li>
              <strong className="text-foreground">
                Uruchamianie po restarcie (RECEIVE_BOOT_COMPLETED)
              </strong>{" "}
              — aby blokada wznowiła działanie po ponownym uruchomieniu telefonu.
            </li>
            <li>
              <strong className="text-foreground">Odczyt kalendarza (READ_CALENDAR)</strong> — aby
              pokazać dzisiejsze wydarzenia na ekranie Dziś. Prosimy o nie dopiero wtedy, gdy
              włączysz tę opcję w Ustawieniach, a dostęp jest wyłącznie do odczytu — nie tworzymy
              ani nie zmieniamy wydarzeń.
            </li>
            <li>
              <strong className="text-foreground">Internet</strong> — do synchronizacji Twojego konta
              i treści.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">4. Po co przetwarzamy dane</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Utworzenie i obsługa konta oraz logowanie.</li>
            <li>
              Zapewnienie działania aplikacji (plan dnia, blokada, statystyki, synchronizacja między
              urządzeniami).
            </li>
            <li>Zapamiętanie Twoich ustawień i postępów.</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nie wykorzystujemy Twoich danych do reklamy ani profilowania marketingowego.{" "}
            <strong className="text-foreground">Nie sprzedajemy danych.</strong>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            5. Gdzie przechowujemy dane i komu je powierzamy
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Dane konta i treści przechowujemy w usłudze{" "}
            <strong className="text-foreground">Supabase</strong> (dostawca infrastruktury
            bazodanowej i uwierzytelniania), działającej jako podmiot przetwarzający na nasze
            zlecenie. Dane są przesyłane szyfrowanym połączeniem (HTTPS/TLS). Poza Supabase nie
            udostępniamy Twoich danych innym podmiotom, chyba że wymaga tego prawo.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            6. Jak długo przechowujemy dane
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Dane przechowujemy tak długo, jak istnieje Twoje konto. Gdy usuniesz konto, powiązane
            dane (rutyny, zadania, plany, lista blokad itd.) są usuwane.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">7. Twoje prawa</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Masz prawo do: dostępu do swoich danych, ich poprawienia, usunięcia oraz do usunięcia
            konta. Aby z nich skorzystać, napisz na:{" "}
            <strong className="text-foreground">[TWÓJ EMAIL KONTAKTOWY]</strong>. Jeśli podlegasz
            RODO, masz też prawo wniesienia skargi do organu nadzorczego (w Polsce: Prezes UODO).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">8. Dzieci</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            TENAX nie jest kierowany do dzieci i nie zbieramy świadomie danych osób poniżej [13/16]
            lat.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">9. Zmiany polityki</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Możemy aktualizować tę politykę. Istotne zmiany ogłosimy w aplikacji lub pod tym
            adresem. Data ostatniej aktualizacji jest podana na górze.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">10. Kontakt</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            W sprawach prywatności:{" "}
            <strong className="text-foreground">[TWÓJ EMAIL KONTAKTOWY]</strong>.
          </p>
        </section>
      </div>
    </Screen>
  );
}
