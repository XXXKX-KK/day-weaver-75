
-- baza sama podstawia user_id zalogowanego uzytkownika przy insercje
alter table public.routines          alter column user_id set default auth.uid();
alter table public.routine_subtasks  alter column user_id set default auth.uid();
alter table public.tasks             alter column user_id set default auth.uid();
alter table public.task_subtasks     alter column user_id set default auth.uid();
alter table public.days              alter column user_id set default auth.uid();
alter table public.day_items         alter column user_id set default auth.uid();
alter table public.day_item_subtasks alter column user_id set default auth.uid();
alter table public.blocked_apps      alter column user_id set default auth.uid();
alter table public.block_schedules   alter column user_id set default auth.uid();
alter table public.block_unlocks     alter column user_id set default auth.uid();
