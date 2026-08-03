-- Dzien Lepszy — indeksy.
-- Zrodlo: BAZA_WIEDZY.md rozdz. 7.13.
-- UNIQUE days(user_id, date) oraz UNIQUE blocked_apps(user_id, package_name)
-- powstaly juz jako ograniczenia tabel.

-- historia i pobranie dzisiejszego dnia
create index days_user_id_date_desc_idx on public.days (user_id, date desc);

-- render planu dnia
create index day_items_day_id_block_position_idx on public.day_items (day_id, day_block, position);

-- liczniki
create index day_items_user_id_status_idx on public.day_items (user_id, status);

-- checklisty w kolejnosci
create index day_item_subtasks_item_position_idx on public.day_item_subtasks (day_item_id, position);

-- kandydaci do generowania dnia
create index tasks_user_status_scheduled_idx on public.tasks (user_id, status, scheduled_date);

-- aktywne rutyny w kolejnosci blokow
create index routines_user_active_block_position_idx
  on public.routines (user_id, is_active, day_block, position);

-- log przerw
create index block_unlocks_user_started_desc_idx on public.block_unlocks (user_id, started_at desc);

-- Indeksy kluczy obcych spoza rozdz. 7.13: potrzebne przy kaskadowym usuwaniu
-- definicji i przy kopiowaniu szablonow w start_day.
create index routine_subtasks_routine_position_idx on public.routine_subtasks (routine_id, position);
create index task_subtasks_task_position_idx on public.task_subtasks (task_id, position);
create index day_items_routine_id_idx on public.day_items (routine_id) where routine_id is not null;
create index day_items_task_id_idx on public.day_items (task_id) where task_id is not null;
create index block_unlocks_day_id_idx on public.block_unlocks (day_id) where day_id is not null;
