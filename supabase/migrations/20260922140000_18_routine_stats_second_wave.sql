-- Etap 5: reguly drugiej fali potrzebuja dwoch dodatkowych miar.
--
-- Okno 14-dniowe obsluguje PODCZEPIENIE (rutyna robiona >= 90%), a licznik
-- ostatnich siedmiu WYSTAPIEN — nie dni — obsluguje PROGRESJE. Rutyna chodzaca
-- w pn/sr/pt ma siedem wystapien dopiero po ponad dwoch tygodniach, wiec liczenie
-- po dniach kalendarzowych dawaloby tu zla odpowiedz.

create or replace function public.routine_stats()
returns table(
  routine_id uuid,
  occurrences_30 integer,
  done_30 integer,
  occurrences_21 integer,
  done_21 integer,
  occurrences_14 integer,
  done_14 integer,
  recent_planned integer,
  recent_done integer
)
language sql
security definer
set search_path = public
stable
as $$
  with history as (
    select
      di.routine_id,
      di.status,
      d.date,
      row_number() over (
        partition by di.routine_id order by d.date desc
      ) as recency
    from public.day_items di
    join public.days d on d.id = di.day_id
    where di.user_id = auth.uid()
      and di.source_type = 'routine'
      and di.routine_id is not null
      and d.date >= current_date - 30
      and d.date < current_date
  )
  select
    h.routine_id,
    count(*) filter (where h.date >= current_date - 30)::int,
    count(*) filter (where h.date >= current_date - 30 and h.status = 'done')::int,
    count(*) filter (where h.date >= current_date - 21)::int,
    count(*) filter (where h.date >= current_date - 21 and h.status = 'done')::int,
    count(*) filter (where h.date >= current_date - 14)::int,
    count(*) filter (where h.date >= current_date - 14 and h.status = 'done')::int,
    count(*) filter (where h.recency <= 7)::int,
    count(*) filter (where h.recency <= 7 and h.status = 'done')::int
  from history h
  group by h.routine_id;
$$;

revoke all on function public.routine_stats() from public, anon;
grant execute on function public.routine_stats() to authenticated;
