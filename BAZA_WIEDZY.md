# BAZA_WIEDZY.md

Jedyne źródło prawdy dla projektu. Wersja 1.0 — Faza 0.
Każda kolejna faza (projekt UI, implementacja, testy, wdrożenie) opiera się wyłącznie na tym dokumencie.
Zmiana zakresu = najpierw aktualizacja tego pliku, potem kod.

---

## 1. Cel aplikacji

Aplikacja prowadzi użytkownika przez cały dzień: od świadomego rozpoczęcia dnia, przez kolejne zadania i rutyny, aż po podsumowanie wieczorem. Zamiast pokazywać listę wszystkiego naraz, pokazuje **jedno zadanie do wykonania teraz** i pilnuje, żeby użytkownik nie uciekł w rozpraszające aplikacje (Instagram, Facebook itd.) — poprzez realne blokowanie ich na poziomie systemu Android.

Cel mierzalny: maksymalna liczba wykonanych zaplanowanych zadań w ciągu dnia przy minimalnym wysiłku organizacyjnym użytkownika.

---

## 2. Użytkownik docelowy

- Jedna osoba: właściciel projektu (aplikacja prywatna, single-user w MVP).
- Android, telefon jako główne urządzenie.
- Pracuje nad wieloma rzeczami naraz, ma powtarzalne rutyny (higiena, jedzenie, suplementy, trening) i zadania projektowe.
- Główna słabość: rozpraszanie się mediami społecznościowymi i utrata kontroli nad tym, co miało być zrobione dzisiaj.
- Architektura danych i RLS od początku przygotowane pod wielu użytkowników (`user_id` wszędzie), ale UX i funkcje projektowane pod jedną osobę.

---

## 3. Problem, który rozwiązujemy

1. **Rozproszenie uwagi** — telefon zabiera czas przeznaczony na zadania. Listy zadań tego nie rozwiązują, bo nie mają żadnej władzy nad telefonem.
2. **Przeciążenie decyzyjne** — widok 30 zadań naraz powoduje paraliż. Użytkownik potrzebuje odpowiedzi na jedno pytanie: „co teraz?”.
3. **Ręczne odtwarzanie rutyn** — codzienne przepisywanie tych samych czynności jest męczące i szybko się je porzuca.
4. **Brak zamknięcia dnia** — bez podsumowania nie widać postępu ani tego, co przepadło.

Aplikacja odpowiada na te cztery punkty: blokowanie aplikacji, tryb „jedno zadanie na ekranie”, automatyczna generacja dnia z rutyn, ekran zakończenia dnia.

---

## 4. Funkcje MVP

| # | Funkcja | Uzasadnienie |
|---|---------|--------------|
| M1 | Logowanie e-mail + hasło (Supabase Auth), sesja trwała | Dane w chmurze, dostęp z nowego urządzenia, podstawa RLS |
| M2 | Przycisk „Rozpocznij dzień” — generuje dzień z aktywnych rutyn i zaległych/zaplanowanych zadań | Rdzeń całej koncepcji, punkt startowy dnia |
| M3 | Widok „Teraz” — jedno bieżące zadanie + jego podzadania + akcje (zrobione / pomiń / odłóż) | Rozwiązuje przeciążenie decyzyjne |
| M4 | Lista dnia (plan dnia) z sekcjami i postępem | Odpowiada na „co już zrobiłem / co zostało” |
| M5 | Zadania jednorazowe: dodawanie, edycja, usuwanie, priorytet, szacowany czas, blok dnia | Podstawowy CRUD zadań |
| M6 | Podzadania (checklista) dla zadania i dla rutyny | Wymóg wprost z założeń (przykład „Dokończ aplikację”) |
| M7 | Rutyny: definicja szablonu, dni tygodnia, pora dnia, kolejność, aktywność on/off | Rutyny mają wracać automatycznie każdego dnia |
| M8 | Odhaczanie zadań i podzadań z natychmiastową animacją i aktualizacją postępu | Główna interakcja aplikacji |
| M9 | Zakończenie dnia + podsumowanie (wykonane / pominięte / przeniesione) | Zamknięcie pętli, poczucie postępu |
| M10 | Blokowanie aplikacji Android: lista blokowanych aplikacji, harmonogram, ekran motywacyjny | Kluczowy wyróżnik, rozwiązuje problem nr 1 |
| M11 | Świadome odblokowanie (przerwa z opóźnieniem i limitem czasu, logowana) | Bez zaworu bezpieczeństwa użytkownik wyłączy usługę na stałe |
| M12 | Historia dni (lista poprzednich dni + wskaźnik ukończenia) | Widoczny trend, motywacja |
| M13 | Ustawienia: profil, godziny dnia, domyślne bloki, uprawnienia, wylogowanie | Konfiguracja niezbędna do działania M2 i M10 |
| M14 | Offline-first w podstawowym zakresie: odczyt planu dnia i odhaczanie bez sieci, synchronizacja po powrocie | Telefon w trybie skupienia często bez zasięgu/danych |

---

## 5. Funkcje po MVP (świadomie poza zakresem pierwszej wersji)

- P1. Widok tygodnia i kalendarza, planowanie z wyprzedzeniem.
- P2. Statystyki i wykresy (serie, skuteczność rutyn, czas skupienia).
- P3. Powiadomienia push i przypomnienia o porach rutyn.
- P4. Timer Pomodoro / sesje skupienia z licznikiem.
- P5. Nawyki z seriami (streaki) i celami tygodniowymi.
- P6. Zadania cykliczne inne niż dzienne (co 2 dni, co tydzień, konkretne daty miesiąca).
- P7. Tagi, projekty, filtrowanie i wyszukiwanie zadań.
- P8. Współdzielenie / wielu użytkowników, zapraszanie, role.
- P9. Integracje: Kalendarz Google, Health Connect, eksport CSV/PDF.
- P10. Widżet na ekran główny i kafelek Szybkich ustawień.
- P11. Blokowanie stron WWW w przeglądarce, blokowanie na podstawie lokalizacji.
- P12. Jakiekolwiek AI (podpowiedzi planu, priorytetyzacja, podsumowania) — wyraźnie poza MVP.
- P13. Wersja iOS (system nie pozwala na równoważne blokowanie; wymagałaby Screen Time API i osobnej analizy).
- P14. Motyw jasny.

---

## 6. Ekrany aplikacji

Nawigacja dolna, 4 zakładki: **Dziś**, **Zadania**, **Skupienie**, **Ustawienia**. Ekrany spoza paska otwierają się jako pełnoekranowe widoki lub arkusze (bottom sheet).

### 6.1 Onboarding / Logowanie (`/auth`)
Cel: uwierzytelnienie i minimalna konfiguracja startowa.
Zawiera: logo, logowanie e-mail+hasło, rejestracja, reset hasła. Po pierwszym logowaniu: krótki kreator (3 kroki) — godziny dnia, wybór startowych rutyn, prośba o uprawnienia blokowania (można pominąć).

### 6.2 Dziś — stan „dzień nierozpoczęty” (`/`)
Cel: jedno wyraźne wezwanie do działania.
Zawiera: data i powitanie, karta z podglądem („dziś zaplanowano X rutyn i Y zadań, ok. Z min”), duży przycisk **Rozpocznij dzień**. Brak innych rozpraszaczy.

### 6.3 Dziś — Teraz (`/`, stan „dzień w toku”)
Cel: pokazać dokładnie jedno zadanie do wykonania.
Zawiera: pasek postępu dnia (x/y), duża karta bieżącego zadania (tytuł, opis, blok dnia, szacowany czas, priorytet), lista podzadań z checkboxami, przyciski: **Zrobione**, **Pomiń**, **Odłóż na później**, link „Zobacz cały plan”. Na dole: podgląd następnego zadania (jedna linia).

### 6.4 Plan dnia (`/dzien`)
Cel: pełny obraz dnia, gdy użytkownik chce kontekstu.
Zawiera: sekcje wg bloków dnia (Poranek / Przedpołudnie / Popołudnie / Wieczór), w każdej lista pozycji z checkboxem, ikoną typu (rutyna/zadanie), priorytetem i czasem; sekcja „Zrobione” zwinięta na dole; przycisk **Zakończ dzień**. Zmiana kolejności przeciąganiem w obrębie bloku.

### 6.5 Szczegóły zadania dnia (`/dzien/:id`)
Cel: praca nad jednym zadaniem.
Zawiera: tytuł, opis, podzadania z checkboxami i dodawaniem w locie, priorytet, blok, szacowany czas, notatka do dzisiejszego wykonania, akcje: zrobione / pomiń / odłóż / przenieś na jutro / edytuj definicję źródłową.

### 6.6 Podsumowanie dnia (`/dzien/podsumowanie`)
Cel: zamknięcie dnia.
Zawiera: liczba wykonanych vs zaplanowanych, procent, lista pominiętych z pytaniem „przenieść na jutro?”, pole na jedno zdanie notatki, przycisk **Zakończ dzień**. Po zatwierdzeniu dzień zostaje zamknięty (read-only).

### 6.7 Zadania — lista (`/zadania`)
Cel: zarządzanie definicjami zadań jednorazowych.
Zawiera: zakładki „Aktywne / Zrobione”, lista kart, FAB **+ Nowe zadanie**, sortowanie po priorytecie i dacie.

### 6.8 Zadanie — dodaj/edytuj (`/zadania/nowe`, `/zadania/:id`)
Cel: pełna edycja definicji zadania.
Zawiera: tytuł, opis, podzadania (dodawanie, usuwanie, kolejność), priorytet, blok dnia, szacowany czas, data zaplanowania (dziś/jutro/data/bez daty), przełącznik „dodaj do dzisiejszego dnia”.

### 6.9 Rutyny — lista (`/rutyny`)
Cel: przegląd stałych elementów dnia. Wejście z zakładki Zadania (segment „Rutyny”).
Zawiera: lista rutyn pogrupowana po bloku dnia, przełącznik aktywności, kolejność przeciąganiem, FAB **+ Nowa rutyna**.

### 6.10 Rutyna — dodaj/edytuj (`/rutyny/nowa`, `/rutyny/:id`)
Cel: definicja szablonu powtarzanego codziennie.
Zawiera: nazwa, opis, podzadania szablonowe, dni tygodnia (domyślnie wszystkie), blok dnia, kolejność, szacowany czas, priorytet, aktywna on/off, archiwizacja.

### 6.11 Skupienie (`/skupienie`)
Cel: sterowanie blokowaniem aplikacji.
Zawiera: duży przełącznik **Blokada włączona/wyłączona**, status uprawnień (z przyciskiem naprawy), karta „Blokowane aplikacje (N)”, karta „Harmonogram”, karta „Przerwy dzisiaj: N”, przycisk **Zrób przerwę**.

### 6.12 Wybór blokowanych aplikacji (`/skupienie/aplikacje`)
Cel: wskazanie aplikacji do zablokowania.
Zawiera: wyszukiwarka, lista zainstalowanych aplikacji z ikoną i przełącznikiem, sekcja „Sugerowane” (media społecznościowe, wideo, gry) na górze.

### 6.13 Harmonogram blokowania (`/skupienie/harmonogram`)
Cel: kiedy blokada obowiązuje.
Zawiera: tryb („Zawsze”, „W godzinach dnia”, „Tylko gdy dzień w toku”, „Własne przedziały”), lista przedziałów czasowych z dniami tygodnia, dodawanie/edycja przedziału.

### 6.14 Ekran motywacyjny / blokady (natywna nakładka)
Cel: przerwać automatyzm sięgania po rozpraszającą aplikację.
Zawiera: pełny ekran w stylu aplikacji, nazwa zablokowanej aplikacji, jedno zdanie motywacyjne, przypomnienie bieżącego zadania („Teraz: Popraw logo”), przyciski: **Wróć do zadania** (główny) i **Potrzebuję przerwy** (drugorzędny, z odliczaniem).

### 6.15 Świadome odblokowanie (`/skupienie/przerwa`)
Cel: kontrolowany zawór bezpieczeństwa.
Zawiera: powód przerwy (opcjonalny, lista skrótów), odliczanie opóźnienia (domyślnie 15 s), wybór długości przerwy (5 / 10 / 15 min), informacja o liczbie wykorzystanych przerw dziś, przycisk **Odblokuj na X min**.

### 6.16 Historia (`/historia`)
Cel: przegląd poprzednich dni. Wejście z ekranu Dziś (ikona) i z Ustawień.
Zawiera: lista dni z datą, procentem ukończenia i paskiem; wejście w dzień otwiera read-only podsumowanie.

### 6.17 Ustawienia (`/ustawienia`)
Cel: konfiguracja i konto.
Zawiera: profil i e-mail, godziny startu/końca dnia, definicje bloków dnia, domyślna liczba przerw dziennie i długość opóźnienia, uprawnienia Androida (status + naprawa), autostart dnia (on/off), wylogowanie, wersja aplikacji.

### 6.18 Stany pomocnicze
Ekrany pustych stanów (brak zadań, brak rutyn, brak historii), ekran offline (baner „Brak połączenia — zmiany zapiszą się później”), ekran braku uprawnień blokowania z instrukcją krok po kroku, ekran błędu.

---

## 7. Model danych (PostgreSQL / Supabase)

Zasady wspólne:
- Każda tabela użytkownika ma `user_id uuid not null references auth.users(id) on delete cascade`.
- RLS włączone na wszystkich tabelach; polityki: `user_id = auth.uid()` dla SELECT/INSERT/UPDATE/DELETE.
- Klucze główne `uuid default gen_random_uuid()`.
- `created_at`, `updated_at` timestamptz default now().
- Rozdział **definicja** (stała) vs **instancja dnia** (generowana codziennie) jest fundamentem modelu.

### 7.1 profiles (stałe)
| pole | typ | opis |
|---|---|---|
| id | uuid PK = auth.users.id | |
| display_name | text | |
| timezone | text | domyślnie `Europe/Warsaw` |
| day_start_time | time | domyślnie 07:00 |
| day_end_time | time | domyślnie 22:00 |
| autostart_day | boolean | automatyczne rozpoczęcie dnia o day_start_time |
| break_daily_limit | int | domyślnie 3 |
| break_delay_seconds | int | domyślnie 15 |

### 7.2 routines (stałe — szablony rutyn)
| pole | typ | opis |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| title | text not null | |
| description | text | |
| day_block | enum `day_block` | morning / forenoon / afternoon / evening |
| weekdays | smallint[] | 1–7 (ISO), domyślnie {1,...,7} |
| position | int | kolejność w bloku |
| estimated_minutes | int | |
| priority | enum `priority` | low / normal / high |
| is_active | boolean | rutyna generuje się codziennie |
| archived_at | timestamptz | archiwizacja zamiast usuwania |

### 7.3 routine_subtasks (stałe — szablon checklisty)
`id, user_id, routine_id (fk cascade), title, position`

### 7.4 tasks (stałe — definicje zadań jednorazowych)
| pole | typ | opis |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| title | text not null | |
| description | text | |
| day_block | enum day_block | preferowany blok, nullable |
| priority | enum priority | |
| estimated_minutes | int | |
| scheduled_date | date | null = pula „kiedyś” |
| status | enum `task_status` | open / done / cancelled |
| completed_at | timestamptz | |

### 7.5 task_subtasks (stałe)
`id, user_id, task_id (fk cascade), title, position, is_done, completed_at`
`is_done` na definicji dotyczy zadań realizowanych wielodniowo; instancja dnia trzyma własny stan (7.8).

### 7.6 days (generowane codziennie — jeden rekord na dzień)
| pole | typ | opis |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| date | date not null | |
| status | enum `day_status` | planned / in_progress / completed |
| started_at | timestamptz | |
| completed_at | timestamptz | |
| planned_count | int | migawka po wygenerowaniu |
| completed_count | int | aktualizowane triggerem |
| note | text | jedno zdanie z podsumowania |
| UNIQUE(user_id, date) | | jeden dzień = jeden rekord |

### 7.7 day_items (generowane codziennie — pozycje planu dnia)
| pole | typ | opis |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| day_id | uuid fk days cascade | |
| source_type | enum `item_source` | routine / task |
| routine_id | uuid fk routines set null | |
| task_id | uuid fk tasks set null | |
| title | text not null | **kopia** tytułu z chwili generowania |
| description | text | kopia |
| day_block | enum day_block | |
| priority | enum priority | |
| estimated_minutes | int | |
| position | int | kolejność w bloku |
| status | enum `item_status` | pending / done / skipped / postponed |
| completed_at | timestamptz | |
| note | text | notatka dotycząca tego wykonania |
| UNIQUE(day_id, source_type, routine_id, task_id) | | brak duplikatów przy ponownym generowaniu |

Kopiowanie tytułu i opisu jest celowe: historia dnia musi pozostać prawdziwa po późniejszej edycji rutyny.

### 7.8 day_item_subtasks (generowane codziennie)
`id, user_id, day_item_id (fk cascade), title (kopia), position, is_done, completed_at`

### 7.9 blocked_apps (stałe)
`id, user_id, package_name (text), app_label (text), is_enabled (bool), created_at` — UNIQUE(user_id, package_name)

### 7.10 block_schedules (stałe)
| pole | typ | opis |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| mode | enum `block_mode` | always / day_hours / day_in_progress / custom |
| start_time | time | dla custom |
| end_time | time | dla custom |
| weekdays | smallint[] | dla custom |
| is_enabled | boolean | |

### 7.11 block_unlocks (log zdarzeń)
`id, user_id, day_id (nullable fk), package_name, reason (text), granted_minutes (int), started_at, expires_at`
Służy do liczenia limitu przerw i do podsumowania dnia.

### 7.12 Relacje (skrót)
```text
auth.users 1—1 profiles
profiles 1—N routines 1—N routine_subtasks
profiles 1—N tasks 1—N task_subtasks
profiles 1—N days 1—N day_items 1—N day_item_subtasks
routines 1—N day_items (soft ref)
tasks    1—N day_items (soft ref)
profiles 1—N blocked_apps / block_schedules / block_unlocks
```

### 7.13 Indeksy
- `days (user_id, date desc)` — historia i pobranie dzisiejszego dnia.
- UNIQUE `days (user_id, date)`.
- `day_items (day_id, day_block, position)` — render planu dnia.
- `day_items (user_id, status)` — liczniki.
- `day_item_subtasks (day_item_id, position)`.
- `tasks (user_id, status, scheduled_date)` — kandydaci do generowania dnia.
- `routines (user_id, is_active, day_block, position)`.
- UNIQUE `blocked_apps (user_id, package_name)`.
- `block_unlocks (user_id, started_at desc)`.

### 7.14 Co stałe, co generowane
- **Stałe (definicje):** profiles, routines, routine_subtasks, tasks, task_subtasks, blocked_apps, block_schedules.
- **Generowane codziennie:** days, day_items, day_item_subtasks.
- **Log:** block_unlocks.

---

## 8. Przebieg dnia

1. **Przed startem.** Ekran Dziś pokazuje podgląd i przycisk „Rozpocznij dzień”. Nic nie jest jeszcze zapisane jako dzień w toku.
2. **Rozpoczęcie dnia.** Jedna operacja serwerowa (funkcja `start_day(date)`), idempotentna:
   - tworzy `days` (status `in_progress`, `started_at`),
   - kopiuje wszystkie aktywne `routines`, których `weekdays` zawiera dzisiejszy dzień → `day_items` (source_type=routine) razem z podzadaniami,
   - dokłada `tasks` ze `status='open'` i `scheduled_date <= dziś` (czyli także zaległe) → `day_items` (source_type=task),
   - ustala kolejność (rozdz. 9),
   - zapisuje `planned_count`.
   Ponowne wywołanie tego samego dnia nie duplikuje pozycji (UNIQUE) — jedynie dodaje nowe.
3. **Rutyny w ciągu dnia.** Pojawiają się w swoich blokach, przemieszane z zadaniami zgodnie z kolejnością.
4. **Zadania jednorazowe dodane w trakcie.** Dodanie zadania z przełącznikiem „dodaj do dzisiejszego dnia” tworzy natychmiast `day_item` na końcu właściwego bloku.
5. **Odhaczanie.** Kliknięcie checkboxa: optymistyczna aktualizacja UI + animacja, zapis `status='done'`, `completed_at`. Odhaczenie wszystkich podzadań proponuje zamknięcie zadania (ale nie wymusza). Odhaczenie `day_item` typu `task` ustawia też `tasks.status='done'`; typu `routine` nie zmienia definicji rutyny.
6. **Pomiń / odłóż.** „Pomiń” → `skipped` (pozycja znika z Teraz, trafia do sekcji pominiętych). „Odłóż” → pozycja wraca na koniec bieżącego bloku. „Przenieś na jutro” → `postponed` + `tasks.scheduled_date = jutro`.
7. **Zakończenie dnia.** Ręcznie przyciskiem lub automatycznie po `day_end_time`. Ekran podsumowania: statystyki, decyzja o pominiętych zadaniach (przenieś/porzuć), notatka. Po zatwierdzeniu `days.status='completed'`, dzień staje się read-only i trafia do Historii.

---

## 9. Organizacja zadań

**Kolejność wykonywania** wyznaczana jest deterministycznie:
1. blok dnia (Poranek → Przedpołudnie → Popołudnie → Wieczór),
2. wewnątrz bloku: `position` (ustawiona przy generowaniu, edytowalna przeciąganiem),
3. domyślna `position` przy generowaniu: rutyny przed zadaniami w tym samym bloku (rutyny są krótkie i budują rozpęd), potem priorytet malejąco (high → normal → low), potem krótszy szacowany czas jako pierwszy.

**Grupowanie:** wyłącznie po bloku dnia. Świadomie rezygnujemy z projektów i tagów w MVP — jedna oś grupowania utrzymuje ekran spokojny.

**Priorytety:** trzy poziomy (niski / normalny / wysoki). Priorytet wpływa tylko na domyślną kolejność i subtelny znacznik na karcie. Brak terminów godzinowych i alarmów w MVP.

**Podzadania:** jeden poziom zagnieżdżenia, bez podzadań w podzadaniach.

**Widok „Teraz”** to zawsze pierwsza pozycja o statusie `pending` w tej kolejności — użytkownik nie musi wybierać.

---

## 10. Mechanizm rutyn

- **Powstanie:** użytkownik tworzy rutynę w `/rutyny/nowa` (nazwa, blok, dni tygodnia, podzadania, czas, priorytet). Zapis do `routines` + `routine_subtasks`.
- **Kopiowanie na nowy dzień:** wyłącznie przy `start_day`. Kopiowana jest **treść** (tytuł, opis, blok, priorytet, czas) oraz podzadania. Powiązanie `routine_id` zostaje zachowane dla statystyk, ale dane są zdenormalizowane, więc historia się nie zmienia.
- **Edycja:** zmiana rutyny działa **od następnego dnia**. Dzisiejszy wygenerowany `day_item` pozostaje bez zmian, chyba że użytkownik świadomie wybierze „Zastosuj też dzisiaj” (nadpisuje pozycję, jeśli ma status `pending`).
- **Wyłączenie:** `is_active=false` — rutyna przestaje się generować, historia zostaje.
- **Usunięcie:** archiwizacja (`archived_at`), nigdy twarde DELETE, aby nie kaleczyć historii.
- **Dni tygodnia:** rutyna generuje się tylko w wybrane dni ISO (1=poniedziałek).

---

## 11. Mechanizm podzadań

- Podzadania istnieją na dwóch poziomach: szablon (`routine_subtasks`, `task_subtasks`) i instancja dnia (`day_item_subtasks`).
- Przy generowaniu dnia szablon jest kopiowany 1:1 (tytuł, kolejność), stan zawsze startuje jako niewykonany — z wyjątkiem zadań jednorazowych realizowanych wielodniowo, gdzie kopiowany jest bieżący `is_done` z `task_subtasks`.
- Odhaczenie podzadania w dniu aktualizuje `day_item_subtasks.is_done` oraz — dla zadań (`source_type='task'`) — odpowiadający `task_subtasks.is_done`, aby postęp zadania wielodniowego się nie gubił. Dla rutyn stan nie wraca do szablonu.
- W widoku Teraz podzadania widoczne są jako lista z checkboxami; postęp „2/3” pokazany na karcie.
- Dodanie podzadania w trakcie dnia dopisuje je do instancji; opcjonalnie („Zapisz też w definicji”) do szablonu.
- Jeden poziom zagnieżdżenia. Brak przypisywania czasu do podzadań.

---

## 12. Mechanizm blokowania aplikacji (Android)

Zgodnie z decyzją projektową aplikacja jest budowana jako **jedna aplikacja Capacitor na Androida** (React w środku) — patrz rozdz. 13.

**Wybór blokowanych aplikacji.** Natywny plugin zwraca listę zainstalowanych aplikacji (`PackageManager`, `QUERY_ALL_PACKAGES` z uzasadnieniem w Play Console). Użytkownik zaznacza pakiety → zapis do `blocked_apps` (Supabase) i lustrzana kopia lokalna (SharedPreferences/SQLite), aby blokada działała bez internetu.

**Wykrywanie i blokada.** `AccessibilityService` nasłuchuje `TYPE_WINDOW_STATE_CHANGED`. Gdy pakiet aktywnego okna znajduje się na liście, a harmonogram jest aktywny i nie trwa przerwa — usługa natychmiast uruchamia pełnoekranową Activity motywacyjną (`FLAG_ACTIVITY_NEW_TASK | CLEAR_TASK`). Alternatywnie/dodatkowo `performGlobalAction(GLOBAL_ACTION_HOME)`.

**Harmonogram.** Tryby: `always`, `day_hours` (godziny z profilu), `day_in_progress` (tylko gdy `days.status='in_progress'`), `custom` (własne przedziały z dniami tygodnia). Stan harmonogramu i statusu dnia jest cache'owany lokalnie i odświeżany przy każdej zmianie w aplikacji oraz przy starcie usługi.

**Ekran motywacyjny.** Natywna Activity w tym samym języku wizualnym: ciemne tło, jedno zdanie, przypomnienie bieżącego zadania z lokalnego cache, przycisk główny „Wróć do zadania” (zamyka nakładkę i otwiera widok Teraz) i drugorzędny „Potrzebuję przerwy”.

**Świadome odblokowanie.** Wymaga tarcia: opóźnienie (domyślnie 15 s odliczania, bez możliwości pominięcia), wybór długości przerwy (5/10/15 min), limit dzienny z profilu (domyślnie 3). Przyznanie przerwy zapisuje `block_unlocks` i lokalny timer; po upływie czasu blokada wraca automatycznie. Wykorzystane przerwy pokazywane są w podsumowaniu dnia.

**Uprawnienia Androida (wymagane).**
| Uprawnienie / funkcja | Po co |
|---|---|
| `BIND_ACCESSIBILITY_SERVICE` (usługa włączana ręcznie w Ustawieniach systemu) | wykrywanie uruchomionej aplikacji |
| `QUERY_ALL_PACKAGES` | lista zainstalowanych aplikacji do wyboru |
| `SYSTEM_ALERT_WINDOW` (opcjonalnie) | pewne wyświetlenie nakładki na Androidzie 10+ |
| `FOREGROUND_SERVICE` + `POST_NOTIFICATIONS` | trwałe powiadomienie utrzymujące usługę |
| `RECEIVE_BOOT_COMPLETED` | wznowienie blokady po restarcie telefonu |
| Wyłączenie optymalizacji baterii (prośba) | zapobiega ubijaniu usługi przez producenta (Xiaomi/Samsung) |

**Świadome ograniczenia.** Device Admin / Device Owner nie jest używany (wymaga provisioningu urządzenia i utrudnia odinstalowanie aplikacji). Użytkownik z uprawnieniami może wyłączyć usługę w ustawieniach systemu — aplikacja wykrywa taki stan i pokazuje ostrzeżenie na ekranie Skupienie, ale nie próbuje temu zapobiegać.

---

## 13. Decyzje techniczne

| Obszar | Decyzja | Uzasadnienie |
|---|---|---|
| Aplikacja | **Capacitor + React (Android)** jako jedna aplikacja; brak dystrybucji jako czyste PWA | Realne blokowanie aplikacji wymaga AccessibilityService, niedostępnego w przeglądarce (decyzja użytkownika, Faza 0) |
| Frontend | React + TypeScript, mobile-first, dark mode domyślny | Zgodność z Metriq / Vital / SOLID |
| Stan i dane | TanStack Query jako warstwa cache/synchronizacji, persystencja cache do storage | Offline-first w podstawowym zakresie (M14) |
| Backend | Supabase: Auth (e-mail+hasło), PostgreSQL, RLS | Brak własnego serwera, bezpieczeństwo per użytkownik |
| Logika dnia | Funkcja bazodanowa `start_day` (SQL, SECURITY DEFINER) wywoływana z klienta | Atomowość i idempotencja generowania dnia |
| Natywny most | Własny plugin Capacitor: lista aplikacji, status uprawnień, start/stop usługi, przekazanie listy i harmonogramu | Brak gotowego pluginu pokrywającego te potrzeby |
| Blokada offline | Lustrzana kopia listy aplikacji, harmonogramu i bieżącego zadania w pamięci lokalnej | Blokada musi działać bez sieci |
| Strefa czasowa | `Europe/Warsaw`, doba wyznaczana lokalnie, `date` bez czasu | Uniknięcie przesunięcia dni przy UTC |
| Migracje | Wersjonowane pliki SQL w repozytorium | Powtarzalność środowisk |
| Web / Vercel | Vercel hostuje ewentualny landing i wersję webową do podglądu danych (bez blokowania) | Zachowanie pierwotnego założenia bez blokowania funkcji natywnych |
| Dystrybucja | Google Play (kanał wewnętrzny/testowy) lub bezpośredni APK | Aplikacja prywatna |
| Testy | Testy jednostkowe logiki dnia i kolejności; ręczne testy natywnego blokowania na fizycznym urządzeniu | AccessibilityService nie jest sensownie testowalny w emulacji |

---

## 14. Szacowane koszty utrzymania

| Pozycja | Koszt |
|---|---|
| Supabase Free (do 500 MB DB, 50 tys. MAU) | 0 zł/mies. — wystarczy z ogromnym zapasem dla 1 użytkownika |
| Vercel Hobby | 0 zł/mies. |
| Google Play Developer | 25 USD jednorazowo (tylko przy publikacji w Play) |
| Domena (opcjonalnie) | ok. 50–80 zł/rok |
| Supabase Pro (dopiero przy pauzowaniu projektu / wielu użytkownikach) | 25 USD/mies. |

**Realny koszt MVP: 0 zł miesięcznie**, plus ewentualnie 25 USD jednorazowo za konto Play.
Uwaga: darmowy projekt Supabase jest pauzowany po 7 dniach bezczynności — przy codziennym użyciu to nie wystąpi.
Szacowany wolumen danych: ~30 pozycji dnia × 365 dni ≈ 11 tys. wierszy rocznie, czyli kilka MB.

---

## 15. Czego świadomie NIE robimy w MVP

1. Żadnego AI — brak podpowiedzi, automatycznej priorytetyzacji, generowania planu.
2. Brak wersji iOS.
3. Brak powiadomień push i przypomnień godzinowych.
4. Brak statystyk, wykresów i streaków.
5. Brak kalendarza i planowania tygodniowego.
6. Brak cykli innych niż dzienne (co 2 dni, tygodniowe, miesięczne).
7. Brak tagów, projektów, wyszukiwarki i filtrów.
8. Brak współdzielenia, wielu użytkowników w UI, ról i zaproszeń.
9. Brak integracji zewnętrznych (Kalendarz, Health, eksport).
10. Brak timera Pomodoro i pomiaru czasu skupienia.
11. Brak blokowania stron WWW i blokowania po lokalizacji.
12. Brak Device Admin / Device Owner.
13. Brak motywu jasnego i personalizacji kolorów.
14. Brak widżetu na ekran główny.
15. Brak pełnej synchronizacji offline z rozwiązywaniem konfliktów (tylko prosty zapis „ostatni wygrywa”).

---

## 16. Otwarte decyzje wymagające zatwierdzenia przed Fazą 1

| # | Decyzja | Opcje | Rekomendacja |
|---|---|---|---|
| D1 | Kolor akcentowy aplikacji | **ZATWIERDZONE: #EE4261 (żywy malinowy róż)** na ciemnym tle | Zamknięte — token `--primary` w `src/styles.css` |
| D2 | Nazwa aplikacji i ikona | do ustalenia | Wymagane przed konfiguracją Capacitora i Play |
| D3 | Bloki dnia | 4 stałe (Poranek/Przedpołudnie/Popołudnie/Wieczór) / 3 / definiowane przez użytkownika | 4 stałe w MVP |
| D4 | Zaległe zadania | automatycznie wpadają do nowego dnia / trafiają do „Do decyzji” na starcie dnia | Automatycznie, z możliwością pominięcia |
| D5 | Rutyna niewykonana wczoraj | znika bezpowrotnie / pyta o przeniesienie | Znika (rutyna wraca jutro i tak) |
| D6 | Limit i długość przerw | 3×10 min / 5×5 min / bez limitu | 3 przerwy, 5/10/15 min do wyboru |
| D7 | Automatyczne rozpoczęcie dnia | zawsze ręcznie / opcja autostartu o godzinie | Opcja w Ustawieniach, domyślnie wyłączona |
| D8 | Dystrybucja | Google Play (wewnętrzna) / bezpośredni APK | Play — łatwiejsze aktualizacje |
| D9 | Wersja webowa na Vercel | pełny podgląd danych / tylko landing / brak | Tylko landing w MVP |
| D10 | Zachowanie po zakończeniu dnia | pełna blokada edycji / możliwość dopisania wykonanego zadania | Read-only |

---

## 17. Autokorekta (weryfikacja kompletności)

1. **Każdy ekran opisany** — 17 ekranów + stany pomocnicze, każdy z celem i zawartością (rozdz. 6). ✔
2. **Model danych pokrywa MVP** — M1→profiles/auth, M2→days+start_day, M3/M4→day_items, M5→tasks, M6→*_subtasks, M7→routines, M8→statusy, M9→days.status+note, M10→blocked_apps+block_schedules, M11→block_unlocks, M12→days (historia), M13→profiles, M14→cache lokalny. ✔
3. **Każda funkcja ma uzasadnienie** — kolumna „Uzasadnienie” w rozdz. 4. ✔
4. **Lista „Po MVP” wyraźnie oddzielona** — rozdz. 5 oraz rozdz. 15. ✔
5. **Dokument jako jedyne źródło wiedzy** — zawiera cel, użytkownika, problem, zakres, ekrany, model danych, przepływy, mechanizmy, decyzje techniczne, koszty, wykluczenia i otwarte pytania. ✔
