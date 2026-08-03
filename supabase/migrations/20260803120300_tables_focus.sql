-- Dzien Lepszy — tabele mechanizmu blokowania aplikacji (Skupienie).
-- Zrodlo: BAZA_WIEDZY.md rozdz. 7.9–7.11, 12.

-- 7.9 blocked_apps -----------------------------------------------------------
create table public.blocked_apps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  package_name text not null,
  app_label    text,
  is_enabled   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint blocked_apps_user_package_key unique (user_id, package_name)
);

comment on table public.blocked_apps is
  'Pakiety Android wybrane do blokowania. Lustrzana kopia trzymana lokalnie na urzadzeniu.';

-- 7.10 block_schedules -------------------------------------------------------
create table public.block_schedules (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  mode       public.block_mode not null,
  start_time time,
  end_time   time,
  weekdays   smallint[],
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint block_schedules_weekdays_check
    check (weekdays is null or weekdays <@ '{1,2,3,4,5,6,7}'::smallint[])
);

comment on table public.block_schedules is
  'Harmonogram blokowania. start_time/end_time/weekdays uzywane w trybie custom.';

-- 7.11 block_unlocks ---------------------------------------------------------
create table public.block_unlocks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  day_id          uuid references public.days (id) on delete set null,
  package_name    text,
  reason          text,
  granted_minutes integer,
  started_at      timestamptz not null default now(),
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint block_unlocks_granted_minutes_check
    check (granted_minutes is null or granted_minutes > 0)
);

comment on table public.block_unlocks is
  'Log swiadomych odblokowan. Sluzy do liczenia dziennego limitu przerw i do podsumowania dnia.';
