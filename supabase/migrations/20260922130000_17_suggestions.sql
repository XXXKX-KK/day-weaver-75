-- Etap 3: silnik sugestii.
--
-- suggestion_events sluzy do trzech rzeczy naraz: limitu dziennego, pilnowania
-- zeby ta sama rada nie wrocila tego samego dnia, i mierzenia skutecznosci
-- (ile sugestii konczy sie 'accepted').

create table if not exists public.suggestion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rule_id text not null,
  -- id rutyny albo pary rutyn, zaleznie od reguly
  subject_key text not null,
  shown_at timestamptz not null default now(),
  action text check (action in ('accepted','dismissed')),
  acted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.suggestion_events enable row level security;

create policy "own_select" on public.suggestion_events
  for select using (user_id = auth.uid());
create policy "own_insert" on public.suggestion_events
  for insert with check (user_id = auth.uid());
create policy "own_update" on public.suggestion_events
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.suggestion_events
  for delete using (user_id = auth.uid());

create index if not exists suggestion_events_today
  on public.suggestion_events (user_id, shown_at desc);

-- Jak naprawde szly rutyny. Okna koncza sie wczoraj — dzien biezacy jeszcze
-- trwa i psulby kazdy procent.
create or replace function public.routine_stats()
returns table(
  routine_id uuid,
  occurrences_30 integer,
  done_30 integer,
  occurrences_21 integer,
  done_21 integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    di.routine_id,
    count(*) filter (where d.date >= current_date - 30)::int,
    count(*) filter (
      where d.date >= current_date - 30 and di.status = 'done'
    )::int,
    count(*) filter (where d.date >= current_date - 21)::int,
    count(*) filter (
      where d.date >= current_date - 21 and di.status = 'done'
    )::int
  from public.day_items di
  join public.days d on d.id = di.day_id
  where di.user_id = auth.uid()
    and di.source_type = 'routine'
    and di.routine_id is not null
    and d.date >= current_date - 30
    and d.date < current_date
  group by di.routine_id;
$$;

revoke all on function public.routine_stats() from public, anon;
grant execute on function public.routine_stats() to authenticated;
