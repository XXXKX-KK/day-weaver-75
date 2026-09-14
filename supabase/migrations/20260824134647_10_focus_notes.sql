
-- "Notatki na luz" - stała pula wartościowych rzeczy pokazywanych na nakładce,
-- gdy nie ma nic z planu dnia do zrobienia. Rotują się: odhaczone schodzą niżej,
-- ale nie znikają.
create table public.focus_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  position int not null default 0,
  -- kiedy ostatnio "odhaczona" (użyta) - do rotacji; null = jeszcze nie użyta
  last_done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.focus_notes enable row level security;
create policy "own_select" on public.focus_notes for select using (user_id = auth.uid());
create policy "own_insert" on public.focus_notes for insert with check (user_id = auth.uid());
create policy "own_update" on public.focus_notes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.focus_notes for delete using (user_id = auth.uid());

create trigger trg_focus_notes_updated_at before update on public.focus_notes
  for each row execute function public.set_updated_at();

-- przełącznik "pokazuj notatki na nakładce" trzymamy w profilu
alter table public.profiles
  add column if not exists focus_notes_enabled boolean not null default false;
