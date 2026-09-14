
-- ENUMY (rozdz. 7)
create type day_block   as enum ('morning','forenoon','afternoon','evening');
create type priority    as enum ('low','normal','high');
create type task_status as enum ('open','done','cancelled');
create type day_status  as enum ('planned','in_progress','completed');
create type item_source as enum ('routine','task');
create type item_status as enum ('pending','done','skipped','postponed');
create type block_mode  as enum ('always','day_hours','day_in_progress','custom');

-- wspolna funkcja updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- 7.1 profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Europe/Warsaw',
  day_start_time time not null default '07:00',
  day_end_time time not null default '22:00',
  autostart_day boolean not null default false,
  break_daily_limit int not null default 3,
  break_delay_seconds int not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7.2 routines
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  day_block day_block,
  weekdays smallint[] not null default '{1,2,3,4,5,6,7}',
  position int,
  estimated_minutes int,
  priority priority not null default 'normal',
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7.3 routine_subtasks
create table public.routine_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7.4 tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  day_block day_block,
  priority priority not null default 'normal',
  estimated_minutes int,
  scheduled_date date,
  status task_status not null default 'open',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7.5 task_subtasks
create table public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  position int not null default 0,
  is_done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7.6 days
create table public.days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  status day_status not null default 'planned',
  started_at timestamptz,
  completed_at timestamptz,
  planned_count int not null default 0,
  completed_count int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- 7.7 day_items
create table public.day_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id uuid not null references public.days(id) on delete cascade,
  source_type item_source not null,
  routine_id uuid references public.routines(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  description text,
  day_block day_block,
  priority priority not null default 'normal',
  estimated_minutes int,
  position int not null default 0,
  status item_status not null default 'pending',
  completed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- brak duplikatow przy ponownym start_day (obsluga NULL przez indeksy czesciowe)
create unique index day_items_uniq_routine on public.day_items (day_id, routine_id) where source_type = 'routine';
create unique index day_items_uniq_task    on public.day_items (day_id, task_id)    where source_type = 'task';

-- 7.8 day_item_subtasks
create table public.day_item_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_item_id uuid not null references public.day_items(id) on delete cascade,
  title text not null,
  position int not null default 0,
  is_done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7.9 blocked_apps
create table public.blocked_apps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_name text not null,
  app_label text,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, package_name)
);

-- 7.10 block_schedules
create table public.block_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode block_mode not null default 'day_in_progress',
  start_time time,
  end_time time,
  weekdays smallint[],
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7.11 block_unlocks (log)
create table public.block_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id uuid references public.days(id) on delete set null,
  package_name text,
  reason text,
  granted_minutes int,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- 7.13 INDEKSY
create index days_user_date_desc      on public.days (user_id, date desc);
create index day_items_render         on public.day_items (day_id, day_block, position);
create index day_items_user_status    on public.day_items (user_id, status);
create index day_item_subtasks_pos    on public.day_item_subtasks (day_item_id, position);
create index tasks_candidates         on public.tasks (user_id, status, scheduled_date);
create index routines_active          on public.routines (user_id, is_active, day_block, position);
create index block_unlocks_recent     on public.block_unlocks (user_id, started_at desc);
