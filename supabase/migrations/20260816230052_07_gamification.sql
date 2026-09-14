
-- Stan gry per uzytkownik (XP liczone na zywo; passa przy zakonczeniu dnia)
alter table public.profiles
  add column if not exists total_xp integer not null default 0,
  add column if not exists streak_count integer not null default 0,
  add column if not exists last_completed_date date;

-- XP przypadajace na pojedyncza pozycje dnia (migawka policzona przy generowaniu
-- lub przy pierwszym odhaczeniu); pozwala dzielic pule miedzy podzadania
alter table public.day_items
  add column if not exists xp_value integer not null default 10;

-- ile XP z danej pozycji zostalo juz przyznane (dla czesciowego postepu podzadan
-- i dla poprawnego cofania). Nigdy nie przekracza xp_value.
alter table public.day_items
  add column if not exists xp_awarded integer not null default 0;
