-- Usuwanie konta: natychmiastowe, na żądanie użytkownika.
--
-- Samo kasowanie robi Edge Function `delete-account` — usuwa rekord
-- z auth.users, a wszystko w public znika kaskadą. Ta migracja odpowiada
-- wyłącznie za to, żeby ta kaskada faktycznie istniała na każdej tabeli.
--
-- Wymagane przez Google Play (usuwanie konta z poziomu aplikacji i spoza niej).

-- Wszystkie dzisiejsze tabele mają `on delete cascade`, ale zamiast temu ufać —
-- sprawdzamy i naprawiamy. Blok jest idempotentny: przy poprawnym schemacie
-- nie robi nic, a przy tabeli dołożonej kiedyś bez kaskady naprawia klucz obcy,
-- zanim zostawi po usuniętym użytkowniku osierocone wiersze.
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
