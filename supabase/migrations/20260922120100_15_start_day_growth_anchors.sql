-- Etap 1: start_day kopiuje routines.kind do day_items.kind i ustawia pozycje
-- z kotwica bezposrednio po jej kotwicy.
--
-- Kolejnosc powstaje dwuetapowo: najpierw bazowy numer porzadkowy (ord) wedlug
-- dotychczasowych regul, potem przegrupowanie — pozycja z kotwica dziedziczy
-- numer swojej kotwicy i lezy tuz za nia. Kotwica etykietowa nie wskazuje
-- konkretnej rutyny, wiec 'wake_up' ladauje na poczatku dnia, a 'after_work' na
-- koncu bloku rutyn (przed zadaniami). Kotwica niezaplanowana na dzis (inne dni
-- tygodnia) jest ignorowana i pozycja wraca na swoje zwykle miejsce.

CREATE OR REPLACE FUNCTION public.start_day(target_date date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := auth.uid();
  v_day_id uuid;
  v_dow smallint := extract(isodow from target_date)::smallint;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.days (user_id, date, status, started_at)
  values (v_user, target_date, 'in_progress', now())
  on conflict (user_id, date) do update
    set status = case when public.days.status = 'completed'
                      then public.days.status else 'in_progress' end,
        started_at = coalesce(public.days.started_at, now()),
        updated_at = now()
  returning id into v_day_id;

  with candidates as (
    select 'routine'::public.item_source as source_type, r.id as routine_id, null::uuid as task_id,
           r.title, r.description, r.day_block, r.priority, r.estimated_minutes,
           0 as source_rank, r.position as src_pos, r.created_at as src_created,
           null::time as src_time,
           r.kind, r.anchor_routine_id, r.anchor_label
    from public.routines r
    where r.user_id = v_user and r.is_active = true and r.archived_at is null
      and v_dow = any(r.weekdays)
    union all
    select 'task'::public.item_source, null::uuid, t.id,
           t.title, t.description, t.day_block, t.priority, t.estimated_minutes,
           1 as source_rank, t.position as src_pos, t.created_at as src_created,
           t.scheduled_time as src_time,
           'maintenance'::public.routine_kind, null::uuid, null::public.anchor_label
    from public.tasks t
    where t.user_id = v_user and t.status = 'open'
      and t.scheduled_date is not null and t.scheduled_date <= target_date
  ),
  existing_offset as (
    select coalesce(max(position), -1) as max_pos
    from public.day_items where day_id = v_day_id
  ),
  base as (
    select c.*,
      row_number() over (
        order by c.source_rank, c.src_time asc nulls last, c.src_pos asc nulls last, c.src_created asc
      ) as ord
    from candidates c
  ),
  anchored as (
    select b.*,
      (select a.ord from base a
        where a.source_type = 'routine'::public.item_source
          and a.routine_id = b.anchor_routine_id) as anchor_ord,
      (select max(a.ord) from base a
        where a.source_type = 'routine'::public.item_source) as last_routine_ord
    from base b
  ),
  ranked as (
    select x.*,
      (select max_pos from existing_offset)
      + row_number() over (
          order by
            case
              when x.anchor_ord is not null then x.anchor_ord
              when x.anchor_label = 'wake_up'::public.anchor_label then 0
              when x.anchor_label = 'after_work'::public.anchor_label
                then coalesce(x.last_routine_ord, x.ord)
              else x.ord
            end,
            case
              when x.anchor_ord is not null or x.anchor_label is not null then 1
              else 0
            end,
            x.ord
        ) as position
    from anchored x
  ),
  inserted as (
    insert into public.day_items
      (user_id, day_id, source_type, routine_id, task_id, title, description,
       day_block, priority, estimated_minutes, position, status, kind)
    select v_user, v_day_id, r.source_type, r.routine_id, r.task_id, r.title, r.description,
           r.day_block, r.priority, r.estimated_minutes, r.position,
           'pending'::public.item_status, r.kind
    from ranked r
    on conflict do nothing
    returning id, source_type, routine_id, task_id
  )
  insert into public.day_item_subtasks (user_id, day_item_id, title, position, is_done)
  select v_user, i.id, s.title, s.position, false
  from inserted i
  join public.routine_subtasks s
    on i.source_type = 'routine'::public.item_source and s.routine_id = i.routine_id and s.user_id = v_user
  union all
  select v_user, i.id, s.title, s.position, s.is_done
  from inserted i
  join public.task_subtasks s
    on i.source_type = 'task'::public.item_source and s.task_id = i.task_id and s.user_id = v_user;

  update public.days
  set planned_count = (select count(*) from public.day_items where day_id = v_day_id),
      updated_at = now()
  where id = v_day_id;

  return v_day_id;
end;
$function$;
