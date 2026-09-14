
-- Atomic, server-side XP increment. The DB does total_xp = total_xp + delta in a
-- single statement, so concurrent/rapid completions can't clobber each other
-- (fixes the client-side read-modify-write lost-update bug). Scoped to the
-- caller's own row via auth.uid(); returns the authoritative new total.
create or replace function public.add_xp(delta integer)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set total_xp = greatest(0, total_xp + delta)
  where id = auth.uid()
  returning total_xp;
$$;

revoke all on function public.add_xp(integer) from public;
grant execute on function public.add_xp(integer) to authenticated;
