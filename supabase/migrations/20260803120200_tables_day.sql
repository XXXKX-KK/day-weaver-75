-- Dzien Lepszy — tabele generowane codziennie (instancja dnia).
-- Zrodlo: BAZA_WIEDZY.md rozdz. 7.6–7.8, 7.14.

-- 7.6 days -------------------------------------------------------------------
create table public.days (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  date            date not null,
  status          public.day_status not null default 'planned',
  started_at      timestamptz,
  completed_at    timestamptz,
  planned_count   integer not null default 0,
  completed_count integer not null default 0,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint days_user_date_key unique (user_id, date)
);

comment on table public.days is 'Jeden rekord na dobe uzytkownika. Tworzony przez start_day.';
comment on column public.days.planned_count is 'Migawka liczby pozycji zapisana przez start_day.';
comment on column public.days.completed_count is 'Utrzymywany triggerem na day_items.status.';

-- 7.7 day_items --------------------------------------------------------------
create table public.day_items (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  day_id            uuid not null references public.days (id) on delete cascade,
  source_type       public.item_source not null,
  routine_id        uuid references public.routines (id) on delete set null,
  task_id           uuid references public.tasks (id) on delete set null,
  title             text not null,
  description       text,
  day_block         public.day_block not null,
  priority          public.priority  not null default 'normal',
  estimated_minutes integer,
  position          integer not null default 0,
  status            public.item_status not null default 'pending',
  completed_at      timestamptz,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint day_items_estimated_minutes_check
    check (estimated_minutes is null or estimated_minutes > 0)
);

-- Odpowiednik UNIQUE(day_id, source_type, routine_id, task_id) z rozdz. 7.7,
-- rozbity na dwa indeksy czesciowe. Powod (odstepstwo od doslownego zapisu dokumentu):
--
--   * Zwykly UNIQUE na tej czworce NIE blokuje duplikatow — pozycja typu "routine" ma
--     task_id = NULL, a "task" ma routine_id = NULL, a domyslne NULLS DISTINCT
--     traktuje kazdy NULL jako inna wartosc. Ograniczenie byloby martwe.
--   * UNIQUE NULLS NOT DISTINCT blokuje duplikaty, ale wchodzi w konflikt z
--     "task_id fk tasks ON DELETE SET NULL": usuniecie drugiego zadania majacego
--     pozycje w tym samym dniu probuje utworzyc drugi wiersz (day_id, 'task', NULL, NULL)
--     i wywala sie na naruszeniu unikalnosci — a usuwanie zadan to funkcja M5.
--
-- Indeksy czesciowe daja dokladnie to, o co chodzi w rozdz. 7.7 ("brak duplikatow przy
-- ponownym generowaniu"): jedna pozycja na (dzien, rutyna) i jedna na (dzien, zadanie),
-- przy jednoczesnym dopuszczeniu dowolnej liczby pozycji-sierot po skasowanym zrodle.
create unique index day_items_day_routine_key
  on public.day_items (day_id, routine_id)
  where source_type = 'routine' and routine_id is not null;

create unique index day_items_day_task_key
  on public.day_items (day_id, task_id)
  where source_type = 'task' and task_id is not null;

comment on table public.day_items is
  'Pozycje planu dnia. title/description sa KOPIA z chwili generowania — historia dnia nie zmienia sie po edycji rutyny.';
comment on index public.day_items_day_routine_key is
  'Brak duplikatow rutyn przy ponownym generowaniu dnia (BAZA_WIEDZY.md rozdz. 7.7).';
comment on index public.day_items_day_task_key is
  'Brak duplikatow zadan przy ponownym generowaniu dnia (BAZA_WIEDZY.md rozdz. 7.7).';

-- 7.8 day_item_subtasks ------------------------------------------------------
create table public.day_item_subtasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  day_item_id  uuid not null references public.day_items (id) on delete cascade,
  title        text not null,
  position     integer not null default 0,
  is_done      boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.day_item_subtasks is
  'Instancja dnia checklisty. Kopia tytulu i kolejnosci z szablonu (BAZA_WIEDZY.md rozdz. 11).';
