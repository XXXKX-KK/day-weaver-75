
-- Codzienne sprzątanie: usuwaj ukończone zadania jednorazowe starsze niż 30 dni
-- (liczone od momentu odhaczenia, completed_at). Działa po stronie bazy, 
-- niezależnie od tego, czy apka jest otwarta.
select cron.schedule(
  'cleanup-completed-tasks-30d',
  '0 3 * * *',  -- codziennie o 3:00
  $job$
    delete from public.tasks
    where status = 'done'
      and completed_at is not null
      and completed_at < now() - interval '30 days';
  $job$
);
