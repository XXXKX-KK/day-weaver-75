-- Dzien Lepszy — Row Level Security.
-- Zrodlo: BAZA_WIEDZY.md rozdz. 7 (zasady wspolne): RLS wlaczone na wszystkich
-- tabelach uzytkownika, polityki user_id = auth.uid() dla SELECT/INSERT/UPDATE/DELETE.
-- Dla profiles kluczem tozsamosci jest id (= auth.users.id).
--
-- auth.uid() jest opakowane w (select ...), zeby Postgres policzyl je raz na zapytanie
-- (InitPlan) zamiast raz na wiersz — semantyka warunku jest identyczna.

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

-- profiles -------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using (id = (select auth.uid()));

-- routines -------------------------------------------------------------------
create policy "routines_select_own" on public.routines
  for select to authenticated using (user_id = (select auth.uid()));
create policy "routines_insert_own" on public.routines
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "routines_update_own" on public.routines
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "routines_delete_own" on public.routines
  for delete to authenticated using (user_id = (select auth.uid()));

-- routine_subtasks -----------------------------------------------------------
create policy "routine_subtasks_select_own" on public.routine_subtasks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "routine_subtasks_insert_own" on public.routine_subtasks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "routine_subtasks_update_own" on public.routine_subtasks
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "routine_subtasks_delete_own" on public.routine_subtasks
  for delete to authenticated using (user_id = (select auth.uid()));

-- tasks ----------------------------------------------------------------------
create policy "tasks_select_own" on public.tasks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tasks_update_own" on public.tasks
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using (user_id = (select auth.uid()));

-- task_subtasks --------------------------------------------------------------
create policy "task_subtasks_select_own" on public.task_subtasks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "task_subtasks_insert_own" on public.task_subtasks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "task_subtasks_update_own" on public.task_subtasks
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "task_subtasks_delete_own" on public.task_subtasks
  for delete to authenticated using (user_id = (select auth.uid()));

-- days -----------------------------------------------------------------------
create policy "days_select_own" on public.days
  for select to authenticated using (user_id = (select auth.uid()));
create policy "days_insert_own" on public.days
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "days_update_own" on public.days
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "days_delete_own" on public.days
  for delete to authenticated using (user_id = (select auth.uid()));

-- day_items ------------------------------------------------------------------
create policy "day_items_select_own" on public.day_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "day_items_insert_own" on public.day_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "day_items_update_own" on public.day_items
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "day_items_delete_own" on public.day_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- day_item_subtasks ----------------------------------------------------------
create policy "day_item_subtasks_select_own" on public.day_item_subtasks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "day_item_subtasks_insert_own" on public.day_item_subtasks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "day_item_subtasks_update_own" on public.day_item_subtasks
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "day_item_subtasks_delete_own" on public.day_item_subtasks
  for delete to authenticated using (user_id = (select auth.uid()));

-- blocked_apps ---------------------------------------------------------------
create policy "blocked_apps_select_own" on public.blocked_apps
  for select to authenticated using (user_id = (select auth.uid()));
create policy "blocked_apps_insert_own" on public.blocked_apps
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "blocked_apps_update_own" on public.blocked_apps
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "blocked_apps_delete_own" on public.blocked_apps
  for delete to authenticated using (user_id = (select auth.uid()));

-- block_schedules ------------------------------------------------------------
create policy "block_schedules_select_own" on public.block_schedules
  for select to authenticated using (user_id = (select auth.uid()));
create policy "block_schedules_insert_own" on public.block_schedules
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "block_schedules_update_own" on public.block_schedules
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "block_schedules_delete_own" on public.block_schedules
  for delete to authenticated using (user_id = (select auth.uid()));

-- block_unlocks --------------------------------------------------------------
create policy "block_unlocks_select_own" on public.block_unlocks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "block_unlocks_insert_own" on public.block_unlocks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "block_unlocks_update_own" on public.block_unlocks
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "block_unlocks_delete_own" on public.block_unlocks
  for delete to authenticated using (user_id = (select auth.uid()));

-- Uprawnienia Data API -------------------------------------------------------
-- Nowe tabele w schemacie public nie sa juz automatycznie wystawiane rolom Data API
-- (config.toml: auto_expose_new_tables), wiec nadajemy uprawnienia jawnie.
-- Faktyczny dostep do wierszy i tak ogranicza RLS powyzej.
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles          to authenticated;
grant select, insert, update, delete on public.routines          to authenticated;
grant select, insert, update, delete on public.routine_subtasks  to authenticated;
grant select, insert, update, delete on public.tasks             to authenticated;
grant select, insert, update, delete on public.task_subtasks     to authenticated;
grant select, insert, update, delete on public.days              to authenticated;
grant select, insert, update, delete on public.day_items         to authenticated;
grant select, insert, update, delete on public.day_item_subtasks to authenticated;
grant select, insert, update, delete on public.blocked_apps      to authenticated;
grant select, insert, update, delete on public.block_schedules   to authenticated;
grant select, insert, update, delete on public.block_unlocks     to authenticated;
