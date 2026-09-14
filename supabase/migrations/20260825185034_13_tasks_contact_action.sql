
-- Ręczne nadpisanie typu akcji kontaktu przy zadaniu.
-- null = brak ręcznego wyboru (użyj auto-wykrywania ze słów);
-- 'call' | 'message' | 'both' | 'none' = wybór użytkownika (ma priorytet nad auto).
alter table public.tasks
  add column if not exists contact_action text
  check (contact_action in ('call','message','both','none'));
