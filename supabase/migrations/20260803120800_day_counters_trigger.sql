-- Dzien Lepszy — utrzymanie days.completed_count.
-- Zrodlo: BAZA_WIEDZY.md rozdz. 7.6 ("aktualizowane triggerem").
--
-- Funkcja celowo NIE jest SECURITY DEFINER: dziala z uprawnieniami wywolujacego,
-- wiec RLS na public.days chroni licznik przed zapisem na cudzy dzien. Wywolana
-- z wnetrza start_day (SECURITY DEFINER) dziala juz jako wlasciciel funkcji.

create or replace function public.sync_day_completed_count()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_old_day uuid;
  v_new_day uuid;
begin
  -- OLD/NEW nie sa przypisane odpowiednio przy INSERT/DELETE, wiec czytamy je
  -- wylacznie w galeziach, w ktorych na pewno istnieja.
  if tg_op = 'INSERT' then
    v_new_day := new.day_id;
  elsif tg_op = 'DELETE' then
    v_old_day := old.day_id;
  else
    v_old_day := old.day_id;
    if new.day_id is distinct from old.day_id then
      v_new_day := new.day_id;
    end if;
  end if;

  if v_old_day is not null then
    update public.days d
       set completed_count = (
             select count(*) from public.day_items di
              where di.day_id = v_old_day and di.status = 'done'
           )
     where d.id = v_old_day;
  end if;

  if v_new_day is not null then
    update public.days d
       set completed_count = (
             select count(*) from public.day_items di
              where di.day_id = v_new_day and di.status = 'done'
           )
     where d.id = v_new_day;
  end if;

  return null;
end;
$$;

comment on function public.sync_day_completed_count() is
  'AFTER INSERT/UPDATE OF status,day_id/DELETE on day_items: przelicza days.completed_count.';

create trigger day_items_sync_completed_count
  after insert or delete or update of status, day_id on public.day_items
  for each row execute function public.sync_day_completed_count();
