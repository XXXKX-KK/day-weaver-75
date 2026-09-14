-- A) tasks gets a manual position; backfill both tasks and routines by created_at.
alter table public.tasks add column if not exists position integer;

with ordered as (
  select id, (row_number() over (partition by user_id order by created_at, id) - 1) as pos
  from public.tasks
)
update public.tasks t
set position = o.pos
from ordered o
where o.id = t.id and t.position is null;

with ordered as (
  select id, (row_number() over (partition by user_id order by created_at, id) - 1) as pos
  from public.routines
)
update public.routines r
set position = o.pos
from ordered o
where o.id = r.id and r.position is null;