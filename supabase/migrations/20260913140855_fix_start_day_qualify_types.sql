
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
           null::time as src_time
    from public.routines r
    where r.user_id = v_user and r.is_active = true and r.archived_at is null
      and v_dow = any(r.weekdays)
    union all
    select 'task'::public.item_source, null::uuid, t.id,
           t.title, t.description, t.day_block, t.priority, t.estimated_minutes,
           1 as source_rank, t.position as src_pos, t.created_at as src_created,
           t.scheduled_time as src_time
    from public.tasks t
    where t.user_id = v_user and t.status = 'open'
      and t.scheduled_date is not null and t.scheduled_date <= target_date
  ),
  existing_offset as (
    select coalesce(max(position), -1) as max_pos
    from public.day_items where day_id = v_day_id
  ),
  ranked as (
    select c.*,
      (select max_pos from existing_offset)
      + row_number() over (
          order by c.source_rank, c.src_time asc nulls last, c.src_pos asc nulls last, c.src_created asc
        ) as position
    from candidates c
  ),
  inserted as (
    insert into public.day_items
      (user_id, day_id, source_type, routine_id, task_id, title, description,
       day_block, priority, estimated_minutes, position, status)
    select v_user, v_day_id, r.source_type, r.routine_id, r.task_id, r.title, r.description,
           r.day_block, r.priority, r.estimated_minutes, r.position, 'pending'::public.item_status
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
