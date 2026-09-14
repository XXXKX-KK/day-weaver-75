
-- add_xp is SECURITY DEFINER and only ever meaningful for a signed-in user
-- (it acts on auth.uid()). Remove the anon EXECUTE grant so it isn't callable
-- without a session. Harmless before (no-op for anon), but tidy defense-in-depth.
revoke execute on function public.add_xp(integer) from anon;
