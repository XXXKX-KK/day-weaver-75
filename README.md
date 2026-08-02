# Dzień Lepszy

## KONTEKST



Tworzymy nową aplikację mobilną (PWA, mobile-first) do zarządzania dniem i produktywnością. Jest to aplikacja prywatna, tworzona przede wszystkim dla jednego użytkownika (właściciela projektu), z możliwością rozwoju w przyszłości.



Stack:

- React PWA

- Supabase (Auth, PostgreSQL, RLS)

- Vercel



Język interfejsu: polski.



Aktualna faza projektu: FAZA 0 – utworzenie BAZA_WIEDZY.md.



Założenia:

- Użytkownik rozpoczyna dzień przyciskiem "Rozpocznij dzień".

- Po rozpoczęciu dnia aplikacja prowadzi go przez kolejne zadania.

- Zadania mogą być jednorazowe lub należeć do codziennych rutyn.

- Zadania mogą zawierać podzadania (checklistę lub opis).

- Przykład:

  - Dokończ aplikację

      - Popraw logo

      - Dokończ ekran logowania

      - Napraw eksport PDF

- Codzienne rutyny:

  - Umyj zęby

  - Zjedz śniadanie

  - Weź suplementy

  - Trening

  - itd.

- Użytkownik będzie sam dodawał zadania jednorazowe.

- Rutyny mają być zapisywane i automatycznie pojawiać się każdego dnia.

- Aplikacja ma pomagać wykonywać jak najwięcej zadań poprzez odpowiednią organizację dnia.

- Nie implementujemy AI w MVP.

- Aplikacja ma posiadać prawdziwe blokowanie wybranych aplikacji Android (Instagram, Facebook i inne wskazane przez użytkownika), wykorzystując odpowiednie uprawnienia Androida (Accessibility Service / Device Admin lub inne zgodne z aktualnymi możliwościami systemu). W czasie blokady użytkownik widzi własny ekran motywacyjny zamiast przejścia do rozpraszającej aplikacji.



## ROLA



Jesteś senior full-stack developerem oraz software architectem.



Twoim zadaniem NIE jest implementacja aplikacji.



Masz stworzyć kompletny dokument BAZA_WIEDZY.md będący jedynym źródłem prawdy dla całego projektu.



Nie dodawaj funkcji, których nie opisano lub które nie wynikają logicznie z wymagań.



## ZADANIE



1. Utwórz plik BAZA_WIEDZY.md.



2. Opisz cel aplikacji.



3. Zdefiniuj użytkownika docelowego.



4. Opisz główny problem, który aplikacja rozwiązuje.



5. Przygotuj listę funkcji MVP.



6. Przygotuj osobną listę funkcji "Po MVP".



7. Opisz wszystkie ekrany aplikacji wraz z ich przeznaczeniem.



8. Zaprojektuj kompletny model danych:

   - tabele,

   - pola,

   - relacje,

   - indeksy,

   - co jest stałe,

   - co jest generowane codziennie.



9. Opisz sposób działania dnia:

   - rozpoczęcie dnia,

   - lista rutyn,

   - zadania jednorazowe,

   - odhaczanie,

   - zakończenie dnia.



10. Zaproponuj logiczny sposób organizacji zadań:

    - kolejność wykonywania,

    - grupowanie,

    - priorytety,

    - podzadania.



11. Opisz dokładnie mechanizm rutyn:

    - jak powstają,

    - jak są kopiowane na nowy dzień,

    - jak można je edytować.



12. Opisz mechanizm podzadań.



13. Opisz mechanizm blokowania aplikacji:

    - wybór blokowanych aplikacji,

    - harmonogram działania,

    - ekran motywacyjny,

    - możliwość świadomego odblokowania,

    - wymagane uprawnienia Android.



14. Opisz wszystkie decyzje techniczne.



15. Oszacuj koszty utrzymania.



16. Wypisz czego świadomie NIE robimy w MVP.



17. Dodaj listę otwartych decyzji projektowych wymagających zatwierdzenia przed rozpoczęciem implementacji.



## ZASADA STOP



Jeżeli podczas tworzenia BAZA_WIEDZY.md pojawi się decyzja wpływająca na UX lub architekturę, której nie można jednoznacznie wywnioskować z wymagań, zatrzymaj się i zadaj jedno konkretne pytanie z 2–3 opcjami. Nie zgaduj.



## AUTOKOREKTA



Przed zakończeniem sprawdź:



1. Czy każdy ekran został opisany.

2. Czy model danych pokrywa wszystkie funkcje MVP.

3. Czy każda funkcja posiada uzasadnienie.

4. Czy lista "Po MVP" jest wyraźnie oddzielona.

5. Czy dokument może stanowić jedyne źródło wiedzy dla kolejnych faz projektu.



## RAPORT KOŃCOWY



- Co zrobiłem: lista utworzonych plików.

- Decyzje: najważniejsze decyzje architektoniczne.

- Testy: weryfikacja kompletności dokumentacji.

- TODO/Ryzyka: kwestie wymagające decyzji przed Fazą 1.

- Commit: "docs: utworzenie kompletnej BAZA_WIEDZY dla aplikacji produktywności" 



# Styl aplikacji



Interfejs ma być spójny z moimi pozostałymi aplikacjami (Metriq, Vital, SOLID). Nie twórz nowego stylu – zachowaj ten sam język projektowania.



## Główne założenia



- Nowoczesny, minimalistyczny premium UI.

- Mobile-first.

- Dark Mode jako domyślny motyw.

- Dużo wolnej przestrzeni (whitespace).

- Mało elementów na ekranie jednocześnie.

- Bardzo czytelna hierarchia informacji.

- Maksymalnie intuicyjna obsługa jedną ręką.



## Kolory



- Ciemne tło.

- Delikatne kontrasty.

- Jeden główny kolor akcentowy wykorzystywany konsekwentnie w całej aplikacji.

- Kolory sukcesu, ostrzeżeń i błędów subtelne, nie jaskrawe.



## Karty



- Większość treści umieszczona na dużych, zaokrąglonych kartach.

- Miękkie rogi (duży border radius).

- Delikatne cienie lub efekt podniesienia.

- Wyraźne odstępy pomiędzy kartami.



## Typografia



- Duże nagłówki.

- Krótkie opisy.

- Czytelna hierarchia tekstu.

- Bez zbędnych opisów i przeładowania treścią.



## Przyciski



- Duże.

- Łatwe do kliknięcia kciukiem.

- Zaokrąglone.

- Wyraźny stan aktywny i nieaktywny.



## Ikony



- Minimalistyczne.

- Jedna stylistyka ikon w całej aplikacji.

- Ikony wspierają tekst, nigdy go nie zastępują.



## Nawigacja



- Dolny pasek nawigacji.

- Maksymalnie 4–5 głównych zakładek.

- Wszystkie najważniejsze funkcje dostępne w maksymalnie 2 kliknięciach.



## Animacje



- Krótkie i płynne.

- Subtelne przejścia ekranów.

- Delikatne animacje podczas odhaczania zadań.

- Bez przesadzonych efektów.



## UX



Aplikacja ma sprawiać wrażenie spokojnej i uporządkowanej. Użytkownik po wejściu powinien od razu wiedzieć:

- co ma zrobić teraz,

- co już zrobił,

- co zostało do końca dnia.



Każdy ekran powinien prowadzić użytkownika do wykonania kolejnego zadania, a nie rozpraszać dodatkowymi opcjami.



Projekt ma wyglądać jak nowoczesna płatna aplikacja premium dostępna w App Store lub Google Play, z dużym naciskiem na prostotę, elegancję i wysoką jakość wykonania.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b1beec45-d186-4515-849d-0f3b4b9704fa).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
