
-- Per-day series powering the stats screen (grid, streaks, weekly completion,
-- XP-over-time). One row per started day, scoped to the caller. XP per day is
-- the sum of xp_awarded across that day's items.
create or replace function public.daily_progress()
returns table(date date, planned integer, completed integer, streak_counted boolean, xp integer)
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
    coalesce(sum(di.xp_awarded), 0)::int as xp
  from public.days d
  left join public.day_items di on di.day_id = d.id
  where d.user_id = auth.uid()
  group by d.date, d.planned_count, d.completed_count, d.streak_counted
  order by d.date;
$$;

revoke all on function public.daily_progress() from public, anon;
grant execute on function public.daily_progress() to authenticated;
