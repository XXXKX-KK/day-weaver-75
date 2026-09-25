-- Diagnostyka bledow po stronie klienta.
--
-- Ekran bledu ma auto-retry po 1,5 s, wiec na telefonie nie da sie odczytac
-- tresci ani zrobic zrzutu. Bez tego zostaje zgadywanie, a logi Supabase
-- pokazuja same 200 — bo blad nigdy nie dolecial do serwera.

create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  message text not null,
  stack text,
  -- gdzie w aplikacji: sciezka routera w chwili bledu
  route text,
  -- co zlapalo: 'root_error_component' | 'window_error' | 'unhandled_rejection' | 'mutation'
  boundary text,
  app_version text,
  device text
);

alter table public.client_errors enable row level security;

-- Tylko wlasne wpisy. Brak update: log ma byc zapisem tego, co sie stalo.
create policy "own_select" on public.client_errors
  for select using (user_id = auth.uid());
create policy "own_insert" on public.client_errors
  for insert with check (user_id = auth.uid());
create policy "own_delete" on public.client_errors
  for delete using (user_id = auth.uid());

create index if not exists client_errors_recent
  on public.client_errors (user_id, created_at desc);
