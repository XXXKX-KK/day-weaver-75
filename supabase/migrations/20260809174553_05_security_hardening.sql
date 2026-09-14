
-- 1) ustaw staly search_path dla funkcji updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- 2) funkcje triggerowe nie maja byc wywolywalne przez API (dzialaja jako triggery i tak)
revoke all on function public.handle_new_user()          from public, anon, authenticated;
revoke all on function public.sync_day_completed_count()  from public, anon, authenticated;

-- 3) start_day tylko dla zalogowanych (nie anon)
revoke all on function public.start_day(date) from public, anon;
grant execute on function public.start_day(date) to authenticated;
