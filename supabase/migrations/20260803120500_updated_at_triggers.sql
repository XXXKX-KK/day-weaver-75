-- Dzien Lepszy — trigger updated_at na wszystkich tabelach uzytkownika.
-- Zrodlo: BAZA_WIEDZY.md rozdz. 7 (zasady wspolne).

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger routines_set_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

create trigger routine_subtasks_set_updated_at
  before update on public.routine_subtasks
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger task_subtasks_set_updated_at
  before update on public.task_subtasks
  for each row execute function public.set_updated_at();

create trigger days_set_updated_at
  before update on public.days
  for each row execute function public.set_updated_at();

create trigger day_items_set_updated_at
  before update on public.day_items
  for each row execute function public.set_updated_at();

create trigger day_item_subtasks_set_updated_at
  before update on public.day_item_subtasks
  for each row execute function public.set_updated_at();

create trigger blocked_apps_set_updated_at
  before update on public.blocked_apps
  for each row execute function public.set_updated_at();

create trigger block_schedules_set_updated_at
  before update on public.block_schedules
  for each row execute function public.set_updated_at();

create trigger block_unlocks_set_updated_at
  before update on public.block_unlocks
  for each row execute function public.set_updated_at();
