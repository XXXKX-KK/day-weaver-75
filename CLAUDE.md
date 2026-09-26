# CLAUDE.md

Wskazówki dla Claude Code przy pracy nad TENAX (repo `day-weaver-75`).
Zobacz też `AGENTS.md` (zasady Lovable) i `BAZA_WIEDZY.md` (specyfikacja).

## Stos

TanStack Start (SSR przez Nitro) + TanStack Router/Query, React 19,
Tailwind v4, Capacitor 8 (Android), Supabase (Postgres + RLS + Auth).

## Zasady

- Repo jest podpięte pod Lovable: **żadnych force pushy ani przepisywania
  opublikowanej historii**. Branch ma zostać w stanie działającym.
- Migracje Supabase są wstecznie kompatybilne. Nie usuwamy kolumn ani nie
  przeliczamy istniejącej historii XP bez pytania.
- RLS jest wierszowe (`user_id = auth.uid()`), więc nowe kolumny są objęte
  automatycznie — nowe polityki potrzebne są tylko przy nowych tabelach.
- Copy: twardo, konkretnie, z szacunkiem. Bez ideologii, bez „red pill",
  bez wyrzutów w stylu „znowu odpuściłeś".

## Model dnia

- `routines.kind` dzieli powtarzalne pozycje na `maintenance` (utrzymanie)
  i `growth` (Rozwój). Zadania (`tasks`) są jednorazowe i zawsze utrzymaniowe.
- `start_day()` kopiuje `kind` do `day_items.kind`, żeby późniejsza zmiana
  rutyny nie przepisywała zamkniętej historii.
- Pozycja Rozwoju może mieć kotwicę: `anchor_routine_id` (konkretna rutyna)
  albo `anchor_label` (`wake_up` / `after_work`). Przy składaniu dnia ląduje
  bezpośrednio po swojej kotwicy.
- Rozwój jest **opcjonalną sekcją**, nie silnikiem apki: nie ma osobnego wpływu
  na passę, XP ani blokadę. Apka to planer (ClickUp) plus blokada (Scrolli).
- XP: każda pozycja `10 + priorytet` — rutyna, zadanie i nawyk Rozwoju tak samo.
- Passa: dzień zaliczony = zrobione **≥ 45%** wszystkich pozycji planu (rutyny,
  zadania i Rozwój razem). Dzień z pustym planem jest **neutralny** — nie
  przerywa passy i jej nie podbija; dzień bez rozpoczętego planu ją przerywa.
  Dzień raz zaliczony (`days.streak_counted`) zostaje zaliczony, nawet gdy
  później odznaczysz pozycje. Liczy to `recompute_streak()` po stronie bazy, bo
  reguła sięga wstecz.
- `profiles.streak_base` / `streak_base_date` zamrażają passę z dnia zmiany
  reguły, żeby nikomu nie spadła przy wdrożeniu i żeby nie przeliczać historii.

## Kalendarz

- Czytany z urządzenia (`CalendarContract`, `READ_CALENDAR`), bez Google
  Calendar API i bez logowania Google. Tylko odczyt.
- Przełącznik i wybrane kalendarze siedzą w natywnych SharedPreferences, nie
  w Supabase: id kalendarzy mają sens wyłącznie na tym urządzeniu, a dzięki temu
  żadne dane z kalendarza nie opuszczają telefonu.
- Wydarzenia są read-only: nie dają XP, nie liczą się do postępu ani passy.
- Uprawnienie pytane dopiero po włączeniu opcji w Ustawieniach → Dzień.

## Ukryte / planowane funkcje

### Wioska (gra)

- Trasa `src/routes/wioska.tsx` **działa**, ale wejście do niej jest ukryte.
- Flaga: `VILLAGE_ENABLED` w `src/lib/features.ts` (obecnie `false`).
- Link w `src/components/xp-bar.tsx` renderuje się tylko przy fladze `true`.
- Plan: wioska/zamek w stylu Heroes of Might & Magic V, odblokowywana zdobytym
  XP i passą. Poziomy i budynki mają odpowiadać postępowi w Rozwoju.
- Włączenie: przestaw `VILLAGE_ENABLED` na `true`. Nic więcej nie trzeba —
  trasa i ekran są na miejscu.

### Sugestie

- Silnik reguł żyje w `src/lib/suggestions/` i jest czysty (bez I/O), żeby dało
  się go testować jednostkowo.
- Karta sugestii pojawia się **wyłącznie** w apce, na zakładce Dziś. Nigdy w
  nakładce blokady ani w powiadomieniach.
- Kolejne reguły dopisuje się jako osobne moduły; priorytet rozstrzyga
  kolejność w tablicy `RULES` w `src/lib/suggestions/index.ts`.
