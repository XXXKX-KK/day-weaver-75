-- Etap 1: nowa regula passy.
--
-- Dzien zaliczony = wszystkie pozycje Rozwoju zaplanowane na ten dzien zrobione.
-- Dzien bez zadnej pozycji Rozwoju jest neutralny: nie przerywa passy i jej nie
-- podbija. Dzien biezacy nigdy nie przerywa passy, bo jeszcze trwa.
--
-- Historii nie przeliczamy wstecz: dni sprzed migracji nie maja danych o
-- Rozwoju, wiec spacer po dniach zatrzymuje sie na profiles.streak_base_date, a
-- zamrozona wartosc streak_base jest doliczana, o ile lancuch dni dociagnal tam
-- bez przerwy.

create or replace function public.recompute_streak(target_date date)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_streak int := 0;
  v_cursor date := target_date;
  v_day_id uuid;
  v_growth_total int;
  v_growth_done int;
  v_last_earned date;
  v_base int;
  v_base_date date;
  v_broke boolean := false;
  v_guard int := 0;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select p.streak_base, p.streak_base_date
    into v_base, v_base_date
  from public.profiles p
  where p.id = v_user;

  v_base := coalesce(v_base, 0);

  loop
    v_guard := v_guard + 1;
    if v_guard > 400 then
      v_broke := true;
      exit;
    end if;

    -- dni sprzed wprowadzenia Rozwoju zostaja nietkniete
    exit when v_base_date is not null and v_cursor <= v_base_date;

    select d.id into v_day_id
    from public.days d
    where d.user_id = v_user and d.date = v_cursor;

    if not found then
      v_broke := true;
      exit;
    end if;

    select count(*) filter (
             where di.kind = 'growth'::public.routine_kind
           ),
           count(*) filter (
             where di.kind = 'growth'::public.routine_kind
               and di.status = 'done'::public.item_status
           )
      into v_growth_total, v_growth_done
    from public.day_items di
    where di.day_id = v_day_id;

    if v_growth_total = 0 then
      -- neutralny: przeskakujemy, passa plynie dalej
      null;
    elsif v_growth_done = v_growth_total then
      v_streak := v_streak + 1;
      if v_last_earned is null then
        v_last_earned := v_cursor;
      end if;
    elsif v_cursor = target_date then
      -- dzis jeszcze trwa: nie liczy sie, ale tez nie przerywa
      null;
    else
      v_broke := true;
      exit;
    end if;

    v_cursor := v_cursor - 1;
  end loop;

  if not v_broke and v_base_date is not null and v_cursor <= v_base_date then
    v_streak := v_streak + v_base;
  end if;

  update public.profiles
  set streak_count = v_streak,
      last_completed_date = coalesce(v_last_earned, last_completed_date),
      updated_at = now()
  where id = v_user;

  -- days.streak_counted zostaje jako znacznik "ten dzien zaliczyl passe" — teraz
  -- wedlug reguly Rozwoju. Napedza dluzsza passe na ekranie Statystyk.
  update public.days d
  set streak_counted = (
        select count(*) filter (
                 where di.kind = 'growth'::public.routine_kind
               ) > 0
           and count(*) filter (
                 where di.kind = 'growth'::public.routine_kind
                   and di.status <> 'done'::public.item_status
               ) = 0
        from public.day_items di
        where di.day_id = d.id
      ),
      updated_at = now()
  where d.user_id = v_user and d.date = target_date;

  return v_streak;
end;
$function$;

revoke all on function public.recompute_streak(date) from public;
revoke all on function public.recompute_streak(date) from anon;
grant execute on function public.recompute_streak(date) to authenticated;

-- Statystyki musza odrozniac dzien neutralny (zero Rozwoju) od przerwanego,
-- inaczej najdluzsza passa zerwie sie na kazdym dniu bez Rozwoju.
--
-- Drop przed create: dochodza kolumny growth_planned/growth_done, a Postgres nie
-- pozwala zmienic typu zwracanego przez CREATE OR REPLACE.
drop function if exists public.daily_progress();

create or replace function public.daily_progress()
returns table(
  date date,
  planned integer,
  completed integer,
  streak_counted boolean,
  xp integer,
  growth_planned integer,
  growth_done integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    d.date,
    d.planned_count   as planned,
    d.completed_count as completed,
    d.streak_counted,
    coalesce(sum(di.xp_awarded), 0)::int as xp,
    count(*) filter (where di.kind = 'growth')::int as growth_planned,
    count(*) filter (where di.kind = 'growth' and di.status = 'done')::int as growth_done
  from public.days d
  left join public.day_items di on di.day_id = d.id
  where d.user_id = auth.uid()
  group by d.date, d.planned_count, d.completed_count, d.streak_counted
  order by d.date;
$$;

revoke all on function public.daily_progress() from public, anon;
grant execute on function public.daily_progress() to authenticated;
