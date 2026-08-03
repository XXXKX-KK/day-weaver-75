-- Dzien Lepszy — typy wyliczeniowe i funkcje pomocnicze
-- Zrodlo: BAZA_WIEDZY.md rozdz. 7 (model danych).
--
-- Kolejnosc wartosci w enumach jest znaczaca: Postgres sortuje typ wyliczeniowy
-- wg kolejnosci deklaracji, co jest wykorzystywane przy ustalaniu kolejnosci
-- pozycji dnia (BAZA_WIEDZY.md rozdz. 9):
--   * day_block  rosnaco  -> Poranek, Przedpoludnie, Popoludnie, Wieczor
--   * priority   malejaco -> high, normal, low

create type public.day_block  as enum ('morning', 'forenoon', 'afternoon', 'evening');
create type public.priority   as enum ('low', 'normal', 'high');
create type public.task_status as enum ('open', 'done', 'cancelled');
create type public.day_status as enum ('planned', 'in_progress', 'completed');
create type public.item_source as enum ('routine', 'task');
create type public.item_status as enum ('pending', 'done', 'skipped', 'postponed');
create type public.block_mode  as enum ('always', 'day_hours', 'day_in_progress', 'custom');

-- Wspolny trigger utrzymujacy updated_at (BAZA_WIEDZY.md rozdz. 7, zasady wspolne).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE: ustawia updated_at = now() na kazdej tabeli uzytkownika.';
