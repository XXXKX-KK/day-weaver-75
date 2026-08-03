-- Dzien Lepszy — tabele "stale" (definicje).
-- Zrodlo: BAZA_WIEDZY.md rozdz. 7.1–7.5, 7.14.

-- 7.1 profiles ---------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text,
  timezone            text        not null default 'Europe/Warsaw',
  day_start_time      time        not null default '07:00',
  day_end_time        time        not null default '22:00',
  autostart_day       boolean     not null default false,
  break_daily_limit   integer     not null default 3,
  break_delay_seconds integer     not null default 15,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint profiles_break_daily_limit_check   check (break_daily_limit >= 0),
  constraint profiles_break_delay_seconds_check check (break_delay_seconds >= 0)
);

comment on table public.profiles is
  'Profil uzytkownika 1—1 z auth.users. Tworzony automatycznie triggerem po rejestracji.';
comment on column public.profiles.autostart_day is
  'Automatyczne rozpoczecie dnia o day_start_time (BAZA_WIEDZY.md D7 — domyslnie wylaczone).';

-- 7.2 routines ---------------------------------------------------------------
create table public.routines (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  title             text not null,
  description       text,
  day_block         public.day_block not null default 'morning',
  weekdays          smallint[]       not null default '{1,2,3,4,5,6,7}'::smallint[],
  position          integer          not null default 0,
  estimated_minutes integer,
  priority          public.priority  not null default 'normal',
  is_active         boolean          not null default true,
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint routines_weekdays_check
    check (weekdays <@ '{1,2,3,4,5,6,7}'::smallint[] and array_length(weekdays, 1) >= 1),
  constraint routines_estimated_minutes_check
    check (estimated_minutes is null or estimated_minutes > 0)
);

comment on table public.routines is
  'Szablony rutyn. Kopiowane do day_items wylacznie przez start_day (BAZA_WIEDZY.md rozdz. 10).';
comment on column public.routines.weekdays is
  'Dni tygodnia ISO (1 = poniedzialek ... 7 = niedziela).';
comment on column public.routines.archived_at is
  'Archiwizacja zamiast twardego DELETE — historia dni musi pozostac prawdziwa.';

-- 7.3 routine_subtasks -------------------------------------------------------
create table public.routine_subtasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  title      text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.routine_subtasks is 'Szablon checklisty rutyny (jeden poziom zagniezdzenia).';

-- 7.4 tasks ------------------------------------------------------------------
create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  title             text not null,
  description       text,
  day_block         public.day_block,
  priority          public.priority    not null default 'normal',
  estimated_minutes integer,
  scheduled_date    date,
  status            public.task_status not null default 'open',
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint tasks_estimated_minutes_check
    check (estimated_minutes is null or estimated_minutes > 0)
);

comment on table public.tasks is 'Definicje zadan jednorazowych.';
comment on column public.tasks.day_block is 'Preferowany blok dnia; NULL = brak preferencji.';
comment on column public.tasks.scheduled_date is 'NULL = pula "kiedys", zadanie nie trafia do start_day.';

-- 7.5 task_subtasks ----------------------------------------------------------
create table public.task_subtasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  task_id      uuid not null references public.tasks (id) on delete cascade,
  title        text not null,
  position     integer not null default 0,
  is_done      boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.task_subtasks is
  'Szablon checklisty zadania. is_done sluzy zadaniom realizowanym wielodniowo (BAZA_WIEDZY.md rozdz. 11).';
