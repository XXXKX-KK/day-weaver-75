
-- znacznik: czy dany dzien juz zaliczyl passe (prog 45% osiagniety),
-- zeby na-biezaco liczenie nie naliczalo passy wielokrotnie tego samego dnia
alter table public.days
  add column if not exists streak_counted boolean not null default false;
