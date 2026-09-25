import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Usuwanie konta z 30-dniowym oknem na zmianę zdania.
 *
 * Zgłoszenie tylko stempluje `profiles.deletion_requested_at` — nic nie znika
 * od razu. Faktycznie kasuje dopiero codzienne zadanie w bazie, po 30 dniach
 * (patrz migracja 20_account_deletion). Dzięki temu pomyłka albo chwila złości
 * kosztuje jedno zalogowanie, a nie całą historię.
 */

/** Ile dni konto czeka, zanim zniknie. Ta sama liczba siedzi w migracji. */
export const DELETION_GRACE_DAYS = 30;

/** Kiedy konto zniknie, licząc od zgłoszenia. */
export function deletionDate(requestedAt: string): Date {
  const d = new Date(requestedAt);
  d.setDate(d.getDate() + DELETION_GRACE_DAYS);
  return d;
}

export function formatDeletionDate(requestedAt: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(deletionDate(requestedAt));
}

async function setDeletionRequestedAt(value: string | null): Promise<void> {
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const id = data.user?.id;
  if (!id) throw new Error("Brak zalogowanego użytkownika");

  const { error } = await supabase
    .from("profiles")
    .update({ deletion_requested_at: value })
    .eq("id", id);
  if (error) throw error;
}

export function useRequestAccountDeletion() {
  return useMutation({
    mutationFn: () => setDeletionRequestedAt(new Date().toISOString()),
  });
}

export function useCancelAccountDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => setDeletionRequestedAt(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}
