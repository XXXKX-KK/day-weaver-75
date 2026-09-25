-- Usuwanie konta z 30-dniowym oknem na zmianę zdania.
--
-- Zgłoszenie z apki tylko stempluje datę w profilu — nic nie znika od razu.
-- Faktycznie kasuje codzienne zadanie pg_cron, po 30 dniach. Dzięki temu
-- pomyłka albo chwila złości kosztuje jedno zalogowanie, a nie całą historię.
--
-- Wymagane przez Google Play (usuwanie konta z poziomu apki i spoza niej).

-- 1. Data zgłoszenia. Null = konto normalne.
alter table public.profiles
  add column if not exists deletion_requested_at timestamptz;

comment on column public.profiles.deletion_requested_at is
  'Kiedy użytkownik zgłosił usunięcie konta. Konto znika 30 dni później; wyzerowanie pola przywraca konto.';

-- RLS na profiles jest wierszowe (id = auth.uid()), więc nowa kolumna jest
-- objęta automatycznie: użytkownik może zgłosić i cofnąć usunięcie wyłącznie
-- własnego konta.

-- 2. Kasowanie ma iść kaskadą z auth.users. Wszystkie dzisiejsze tabele mają
--    `on delete cascade`, ale zamiast temu ufać — sprawdzamy i naprawiamy.
--    Blok jest idempotentny: przy poprawnym schemacie nie robi nic.
do $$
declare
  r record;
begin
  for r in
    select
      con.conname,
      ns.nspname  as schema_name,
      cl.relname  as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class cl      on cl.oid = con.conrelid
    join pg_namespace ns  on ns.oid = cl.relnamespace
    join pg_class fcl     on fcl.oid = con.confrelid
    join pg_namespace fns on fns.oid = fcl.relnamespace
    join lateral unnest(con.conkey) as k(attnum) on true
    join pg_attribute att on att.attrelid = cl.oid and att.attnum = k.attnum
    where con.contype = 'f'
      and ns.nspname = 'public'
      and fns.nspname = 'auth'
      and fcl.relname = 'users'
      and con.confdeltype <> 'c'   -- 'c' = cascade
  loop
    raise notice 'Naprawiam kaskadę: %.% (%).', r.schema_name, r.table_name, r.conname;
    execute format(
      'alter table %I.%I drop constraint %I',
      r.schema_name, r.table_name, r.conname
    );
    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references auth.users(id) on delete cascade',
      r.schema_name, r.table_name, r.conname, r.column_name
    );
  end loop;
end $$;

-- 3. Funkcja kasująca. Usuwa użytkownika z auth.users; wszystko w public
--    znika kaskadą (profiles, days, day_items, routines, tasks, focus_notes,
--    blocked_apps, block_schedules, block_unlocks, suggestion_events,
--    client_errors oraz ich podtabele).
create or replace function public.delete_expired_accounts()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  removed integer;
begin
  with expired as (
    select id
    from public.profiles
    where deletion_requested_at is not null
      and deletion_requested_at < now() - interval '30 days'
  ), gone as (
    delete from auth.users u
    using expired e
    where u.id = e.id
    returning u.id
  )
  select count(*) into removed from gone;

  return removed;
end $$;

comment on function public.delete_expired_accounts() is
  'Kasuje konta zgłoszone do usunięcia ponad 30 dni temu. Uruchamiane codziennie przez pg_cron.';

-- Tylko dla zadania cron — żaden klient nie ma prawa tego wywołać.
revoke all on function public.delete_expired_accounts() from public;
revoke all on function public.delete_expired_accounts() from anon;
revoke all on function public.delete_expired_accounts() from authenticated;

-- 4. Codzienne uruchomienie (pg_cron jest już włączony migracją 11).
--    unschedule najpierw, żeby migracja dała się puścić drugi raz.
select cron.unschedule('delete-expired-accounts')
where exists (select 1 from cron.job where jobname = 'delete-expired-accounts');

select cron.schedule(
  'delete-expired-accounts',
  '30 3 * * *',  -- codziennie o 3:30, pół godziny po sprzątaniu zadań
  $job$ select public.delete_expired_accounts(); $job$
);
