import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Usunięcie konta — natychmiastowe i nieodwracalne.
 *
 * Kasowaniem zajmuje się Edge Function `delete-account`: sprawdza, kto pyta,
 * po jego własnym JWT, a potem usuwa rekord z auth.users kluczem serwisowym.
 * Reszta danych znika kaskadą, więc apka nie kasuje żadnej tabeli sama —
 * lista tabel, o której ktoś zapomni, zostawiłaby po użytkowniku śmieci.
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{
        success?: boolean;
        error?: string;
      }>("delete-account", { method: "POST" });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
  });
}
