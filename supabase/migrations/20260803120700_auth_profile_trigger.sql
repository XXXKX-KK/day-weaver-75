-- Dzien Lepszy — automatyczne utworzenie profilu po rejestracji.
-- Zrodlo: BAZA_WIEDZY.md rozdz. 7.1, 7.12 (auth.users 1—1 profiles).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT on auth.users: zaklada rekord w public.profiles z domyslnymi ustawieniami dnia.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
