alter table public.profiles
  add column onboarding_done boolean not null default false,
  add column coachmark_done  boolean not null default false;

-- Existing accounts already completed onboarding on-device — don't repeat it.
-- New rows get false by default, so fresh sign-ups go through onboarding.
update public.profiles set onboarding_done = true, coachmark_done = true;
