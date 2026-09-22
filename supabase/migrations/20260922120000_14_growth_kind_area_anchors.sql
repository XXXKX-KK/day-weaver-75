-- Etap 1: sekcja Rozwoj — kind/area/kotwice + zapis ankiety.
-- Wszystko dodawane wstecznie kompatybilnie: istniejace rutyny domyslnie
-- traktujemy jako 'maintenance', wiec dotychczasowe zachowanie sie nie zmienia.

do $$ begin
  create type public.routine_kind as enum ('maintenance','growth');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.growth_area as enum ('body','mind','money','discipline');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.anchor_label as enum ('wake_up','after_work');
exception when duplicate_object then null; end $$;

alter table public.routines
  add column if not exists kind public.routine_kind not null default 'maintenance',
  add column if not exists area public.growth_area,
  add column if not exists anchor_routine_id uuid references public.routines(id) on delete set null,
  add column if not exists anchor_label public.anchor_label;

-- day_items dostaje wlasna kopie kind przy skladaniu dnia (start_day), zeby
-- historia liczyla sie poprawnie nawet po pozniejszej zmianie rutyny.
alter table public.day_items
  add column if not exists kind public.routine_kind not null default 'maintenance';

-- Odpowiedzi z ankiety startowej (wersjonowane, patrz src/lib/day-survey.ts).
alter table public.profiles
  add column if not exists survey jsonb;

-- Zamrozona passa sprzed wprowadzenia Rozwoju. Nowa regula passy liczy tylko
-- dni z pozycjami Rozwoju, a historii nie przeliczamy wstecz — wiec stan z dnia
-- migracji zostaje zapisany jako baza, do ktorej dokladane sa nowe dni.
alter table public.profiles
  add column if not exists streak_base integer not null default 0,
  add column if not exists streak_base_date date;

update public.profiles
set streak_base = streak_count,
    streak_base_date = last_completed_date
where streak_base = 0 and streak_base_date is null;

create index if not exists routines_kind
  on public.routines (user_id, kind) where archived_at is null;

create index if not exists routines_anchor
  on public.routines (anchor_routine_id) where anchor_routine_id is not null;

create index if not exists day_items_kind
  on public.day_items (day_id, kind);

-- Migracja danych: dotychczasowe rutyny rozwojowe rozpoznane po tytule.
-- Warianty bez polskich znakow sa celowe — czesc userow pisze "silownia".
update public.routines
set kind = 'growth',
    area = case
      when title ilike '%trening%' or title ilike '%silown%' or title ilike '%siłown%'
        or title ilike '%pompk%' or title ilike '%bieg%'
      then 'body'::public.growth_area
      else 'mind'::public.growth_area
    end
where kind = 'maintenance'
  and (
    title ilike '%trening%' or title ilike '%silown%' or title ilike '%siłown%'
    or title ilike '%pompk%' or title ilike '%bieg%'
    or title ilike '%czyta%' or title ilike '%ksiazk%' or title ilike '%książk%'
    or title ilike '%nauk%' or title ilike '%kurs%'
  );

-- RLS: polityki sa wierszowe (user_id = auth.uid()) i obejmuja nowe kolumny
-- automatycznie — nowe polityki nie sa potrzebne.
