-- Dzien Lepszy — funkcja start_day.
-- Zrodlo: BAZA_WIEDZY.md rozdz. 8 (przebieg dnia), rozdz. 9 (kolejnosc),
--         rozdz. 10 (rutyny), rozdz. 11 (podzadania), rozdz. 13 (SECURITY DEFINER).
--
-- Idempotentna: ponowne wywolanie tego samego dnia nie duplikuje pozycji,
-- dokłada wylacznie nowe (nowa rutyna, nowe zaleglosci) na koniec wlasciwego bloku,
-- zeby nie kasowac recznej kolejnosci ustawionej przeciaganiem (rozdz. 9 pkt 2).

create or replace function public.start_day(target_date date default current_date)
returns public.days
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid     := auth.uid();
  v_iso  smallint := extract(isodow from target_date)::smallint;
  v_day  public.days;
begin
  if v_user is null then
    raise exception 'start_day: brak zalogowanego uzytkownika' using errcode = '28000';
  end if;

  -- Dzien zamkniety jest read-only (rozdz. 8 pkt 7, decyzja D10) — nie ruszamy go.
  select * into v_day from public.days d
   where d.user_id = v_user and d.date = target_date;

  if found and v_day.status = 'completed' then
    return v_day;
  end if;

  -- Utworz dzien albo podnies istniejacy do stanu "w toku".
  insert into public.days as d (user_id, date, status, started_at)
  values (v_user, target_date, 'in_progress', now())
      on conflict (user_id, date) do update
         set status     = 'in_progress',
             started_at = coalesce(d.started_at, now())
  returning * into v_day;

  ------------------------------------------------------------------------------
  -- 1) Aktywne rutyny przypadajace na ten dzien tygodnia (rozdz. 10).
  --    Rutyny ida jako pierwsze w bloku — stad ta wstawka przed zadaniami.
  ------------------------------------------------------------------------------
  with candidate as (
    select r.id, r.title, r.description, r.day_block, r.priority,
           r.estimated_minutes, r.position
      from public.routines r
     where r.user_id = v_user
       and r.is_active
       and r.archived_at is null
       and v_iso = any (r.weekdays)
       and not exists (
             select 1 from public.day_items di
              where di.day_id = v_day.id
                and di.source_type = 'routine'
                and di.routine_id = r.id
           )
  ),
  tail as (
    select di.day_block, max(di.position) as max_position
      from public.day_items di
     where di.day_id = v_day.id
     group by di.day_block
  )
  insert into public.day_items (
    user_id, day_id, source_type, routine_id, task_id,
    title, description, day_block, priority, estimated_minutes, position, status
  )
  select
    v_user, v_day.id, 'routine', c.id, null,
    c.title, c.description, c.day_block, c.priority, c.estimated_minutes,
    (coalesce(t.max_position, -1) + row_number() over (
        partition by c.day_block
        order by c.priority desc,                      -- high -> normal -> low
                 c.estimated_minutes asc nulls last,   -- krotszy czas pierwszy
                 c.position asc,                       -- kolejnosc z definicji rutyny
                 c.title asc,
                 c.id asc
     ))::integer,
    'pending'
    from candidate c
    left join tail t on t.day_block = c.day_block
      -- NOT EXISTS wyzej odsiewa juz istniejace pozycje; ON CONFLICT jest siatka
      -- bezpieczenstwa na wypadek dwoch rownoleglych wywolan start_day.
      on conflict (day_id, routine_id) where source_type = 'routine' and routine_id is not null
      do nothing;

  ------------------------------------------------------------------------------
  -- 2) Zadania otwarte zaplanowane na dzis lub wczesniej (zaleglosci, decyzja D4).
  --    scheduled_date IS NULL to pula "kiedys" — nie trafia do dnia.
  ------------------------------------------------------------------------------
  with candidate as (
    select t.id, t.title, t.description,
           coalesce(t.day_block, 'forenoon'::public.day_block) as day_block,
           t.priority, t.estimated_minutes, t.scheduled_date
      from public.tasks t
     where t.user_id = v_user
       and t.status = 'open'
       and t.scheduled_date is not null
       and t.scheduled_date <= target_date
       and not exists (
             select 1 from public.day_items di
              where di.day_id = v_day.id
                and di.source_type = 'task'
                and di.task_id = t.id
           )
  ),
  tail as (
    select di.day_block, max(di.position) as max_position
      from public.day_items di
     where di.day_id = v_day.id
     group by di.day_block
  )
  insert into public.day_items (
    user_id, day_id, source_type, routine_id, task_id,
    title, description, day_block, priority, estimated_minutes, position, status
  )
  select
    v_user, v_day.id, 'task', null, c.id,
    c.title, c.description, c.day_block, c.priority, c.estimated_minutes,
    (coalesce(t.max_position, -1) + row_number() over (
        partition by c.day_block
        order by c.priority desc,                      -- high -> normal -> low
                 c.estimated_minutes asc nulls last,   -- krotszy czas pierwszy
                 c.scheduled_date asc,                 -- zaleglosci przed dzisiejszymi
                 c.title asc,
                 c.id asc
     ))::integer,
    'pending'
    from candidate c
    left join tail t on t.day_block = c.day_block
      on conflict (day_id, task_id) where source_type = 'task' and task_id is not null
      do nothing;

  ------------------------------------------------------------------------------
  -- 3) Podzadania rutyn — kopia szablonu, stan zawsze startuje jako niewykonany
  --    (rozdz. 11). Kopiujemy tylko do pozycji, ktore nie maja jeszcze checklisty,
  --    zeby ponowne wywolanie nie odtwarzalo usunietych recznie podzadan.
  ------------------------------------------------------------------------------
  insert into public.day_item_subtasks (user_id, day_item_id, title, position, is_done)
  select v_user, di.id, rs.title, rs.position, false
    from public.day_items di
    join public.routine_subtasks rs on rs.routine_id = di.routine_id
   where di.day_id = v_day.id
     and di.source_type = 'routine'
     and di.routine_id is not null
     and not exists (
           select 1 from public.day_item_subtasks s where s.day_item_id = di.id
         );

  ------------------------------------------------------------------------------
  -- 4) Podzadania zadan — dla zadan wielodniowych przenosimy biezacy is_done
  --    z definicji, zeby postep sie nie gubil (rozdz. 11).
  ------------------------------------------------------------------------------
  insert into public.day_item_subtasks (user_id, day_item_id, title, position, is_done, completed_at)
  select v_user, di.id, ts.title, ts.position, ts.is_done, ts.completed_at
    from public.day_items di
    join public.task_subtasks ts on ts.task_id = di.task_id
   where di.day_id = v_day.id
     and di.source_type = 'task'
     and di.task_id is not null
     and not exists (
           select 1 from public.day_item_subtasks s where s.day_item_id = di.id
         );

  ------------------------------------------------------------------------------
  -- 5) Migawka licznikow (rozdz. 7.6, rozdz. 8 pkt 2).
  ------------------------------------------------------------------------------
  update public.days d
     set planned_count = (
           select count(*) from public.day_items di where di.day_id = v_day.id
         ),
         completed_count = (
           select count(*) from public.day_items di
            where di.day_id = v_day.id and di.status = 'done'
         )
   where d.id = v_day.id
  returning * into v_day;

  return v_day;
end;
$$;

comment on function public.start_day(date) is
  'Idempotentnie rozpoczyna dzien: tworzy/podnosi days, kopiuje aktywne rutyny i otwarte '
  'zadania (takze zalegle) do day_items wraz z podzadaniami, ustala position wg rozdz. 9 '
  'i zapisuje planned_count. Ponowne wywolanie dodaje wylacznie nowe pozycje.';

revoke all on function public.start_day(date) from public;
grant execute on function public.start_day(date) to authenticated;
