
-- Wlacz RLS na wszystkich tabelach uzytkownika
alter table public.profiles          enable row level security;
alter table public.routines          enable row level security;
alter table public.routine_subtasks  enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_subtasks     enable row level security;
alter table public.days              enable row level security;
alter table public.day_items         enable row level security;
alter table public.day_item_subtasks enable row level security;
alter table public.blocked_apps      enable row level security;
alter table public.block_schedules   enable row level security;
alter table public.block_unlocks     enable row level security;

-- profiles: klucz = id
create policy "own_profile_select" on public.profiles for select using (id = auth.uid());
create policy "own_profile_insert" on public.profiles for insert with check (id = auth.uid());
create policy "own_profile_update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "own_profile_delete" on public.profiles for delete using (id = auth.uid());

-- pozostale tabele: user_id = auth.uid()
do $$
declare t text;
begin
  foreach t in array array[
    'routines','routine_subtasks','tasks','task_subtasks','days',
    'day_items','day_item_subtasks','blocked_apps','block_schedules','block_unlocks'
  ]
  loop
    execute format('create policy "own_select" on public.%I for select using (user_id = auth.uid());', t);
    execute format('create policy "own_insert" on public.%I for insert with check (user_id = auth.uid());', t);
    execute format('create policy "own_update" on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
    execute format('create policy "own_delete" on public.%I for delete using (user_id = auth.uid());', t);
  end loop;
end $$;
