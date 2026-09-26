-- Powrot do passy sprzed Rozwoju: prog 45% calego planu dnia.
--
-- Dzien zaliczony = completed / planned >= 0.45, liczac WSZYSTKIE pozycje planu
-- (rutyny, zadania i Rozwoj razem, bez rozrozniania kind). Rozwoj przestaje byc
-- warunkiem passy — zostaje w apce jako zwykla sekcja.
--
-- Zasady brzegowe:
--   * dzien z planem, ale bez zadnej pozycji  -> neutralny: nie przerywa i nie podbija,
--   * dzien biezacy ponizej progu             -> neutralny: jeszcze trwa,
--   * dzien bez wiersza w days                -> przerwa: dzien nie zostal zaczety,
--   * dzien raz zaliczony (days.streak_counted) -> zaliczony na zawsze, nawet gdy
--     uzytkownik pozniej odznaczy pozycje i zejdzie ponizej 45%.
--
-- Kolumny kind/area zostaja nietkniete — nic ich nie usuwa ani nie przelicza.

-- ── 1. Zamrozenie obecnej passy ───────────────────────────────────────────────
--
-- Bez tego zmiana reguly moglaby komus passe SKROCIC: dzien, w ktorym zrobil
-- swoj jedyny Rozwoj, ale tylko 2 z 10 pozycji planu, liczyl sie wedlug starej
-- reguly, a wedlug nowej juz nie. Dlatego stan z dnia wdrozenia ląduje w
-- streak_base, a spacer po historii zatrzymuje sie na streak_base_date.
-- greatest() pilnuje, zeby ponowne uruchomienie migracji niczego nie obnizylo,
-- a `current_date - 1` zostawia dzien wdrozenia normalnemu liczeniu.
update public.profiles
set streak_base = greatest(coalesce(streak_base, 0), coalesce(streak_count, 0)),
    streak_base_date = greatest(coalesce(streak_base_date, date '1970-01-01'), current_date - 1),
    updated_at = now()
where coalesce(streak_count, 0) > 0
   or streak_base_date is null;

-- ── 2. Nowa regula passy ──────────────────────────────────────────────────────

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
  v_counted boolean;
  v_total int;
  v_done int;
  v_qualifies boolean;
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

    -- dni sprzed zamrozenia zostaja nietkniete
    exit when v_base_date is not null and v_cursor <= v_base_date;

    select d.id, d.streak_counted into v_day_id, v_counted
    from public.days d
    where d.user_id = v_user and d.date = v_cursor;

    if not found then
      -- dzien w ogole nie zostal zaczety
      v_broke := true;
      exit;
    end if;

    select count(*),
           count(*) filter (where di.status = 'done'::public.item_status)
      into v_total, v_done
    from public.day_items di
    where di.day_id = v_day_id;

    -- raz zaliczony dzien zostaje zaliczony, nawet po odznaczeniu pozycji
    v_qualifies := coalesce(v_counted, false)
                   or (v_total > 0 and v_done::numeric / v_total >= 0.45);

    if v_qualifies then
      v_streak := v_streak + 1;
      if v_last_earned is null then
        v_last_earned := v_cursor;
      end if;
    elsif v_total = 0 then
      -- pusty plan: neutralny, passa plynie dalej
      null;
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

  -- days.streak_counted to znacznik "ten dzien raz przekroczyl prog". Tylko go
  -- zapalamy — nigdy nie gasimy, bo zdjeta pozycja nie odbiera zaliczonego dnia.
  update public.days d
  set streak_counted = true,
      updated_at = now()
  where d.user_id = v_user
    and d.date = target_date
    and not d.streak_counted
    and (
      select count(*) > 0
         and count(*) filter (where di.status = 'done'::public.item_status)::numeric
             / greatest(count(*), 1) >= 0.45
      from public.day_items di
      where di.day_id = d.id
    );

  return v_streak;
end;
$function$;

revoke all on function public.recompute_streak(date) from public;
revoke all on function public.recompute_streak(date) from anon;
grant execute on function public.recompute_streak(date) to authenticated;

-- ── 3. Statystyki ─────────────────────────────────────────────────────────────
--
-- Sygnatura bez zmian (growth_planned/growth_done zostaja, zeby nie przepisywac
-- typu funkcji i ekranu), ale streak_counted liczy sie teraz z progu 45%, a nie
-- z zapisanej flagi — inaczej siatka pokazywalaby regule Rozwoju jeszcze przez
-- wiele dni wstecz. Zapisana flaga dalej wygrywa, gdy jest zapalona.
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
    d.streak_counted
      or (d.planned_count > 0
          and d.completed_count::numeric / d.planned_count >= 0.45) as streak_counted,
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
