
-- updated_at na wszystkich tabelach z ta kolumna
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','routines','routine_subtasks','tasks','task_subtasks','days',
    'day_items','day_item_subtasks','blocked_apps','block_schedules'
  ]
  loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- automatyczne utworzenie profilu po rejestracji
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- utrzymanie days.completed_count przy zmianie statusu pozycji
create or replace function public.sync_day_completed_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_day uuid;
begin
  v_day := coalesce(new.day_id, old.day_id);
  update public.days
  set completed_count = (
        select count(*) from public.day_items
        where day_id = v_day and status = 'done'
      )
  where id = v_day;
  return null;
end; $$;

create trigger trg_day_items_completed_count
after insert or delete or update of status on public.day_items
for each row execute function public.sync_day_completed_count();
