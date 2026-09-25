import { LogOut, RotateCcw, TriangleAlert } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { formatDeletionDate, useCancelAccountDeletion } from "@/lib/account";
import { toast } from "sonner";

/**
 * Ekran, który wita użytkownika po zgłoszeniu usunięcia konta. Zamiast wpuścić
 * go do apki tak, jakby nic się nie stało, stawia sprawę jasno: konto zniknie
 * tego dnia, a przywrócenie to jedno kliknięcie.
 */
export function AccountDeletionPending({ requestedAt }: { requestedAt: string }) {
  const { signOut } = useAuth();
  const restore = useCancelAccountDeletion();

  return (
    <Screen>
      <div
        className="flex flex-col items-center pt-10 text-center"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <TriangleAlert className="h-7 w-7 text-destructive" />
        </span>
        <h1 className="text-2xl font-bold leading-tight">Twoje konto zostanie usunięte</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{formatDeletionDate(requestedAt)}</p>
        <p className="mt-4 max-w-[22rem] text-[14px] leading-relaxed text-muted-foreground">
          Do tego dnia wszystko czeka na swoim miejscu — plan, rutyny, XP i passa. Możesz wrócić
          jednym kliknięciem.
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          restore.mutate(undefined, {
            onSuccess: () => toast.success("Konto przywrócone."),
            onError: () => toast.error("Nie udało się przywrócić konta."),
          })
        }
        disabled={restore.isPending}
        className="accent-gradient mt-8 flex w-full items-center justify-center gap-2 rounded-3xl px-4 py-4 text-[16px] font-semibold text-primary-foreground disabled:opacity-60"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        <RotateCcw className="h-[18px] w-[18px]" />
        {restore.isPending ? "Przywracam…" : "Przywróć konto"}
      </button>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-3xl glass px-4 py-4 text-[16px] font-medium"
        style={{ animation: "cascadeIn 0.5s ease-out 0.16s both" }}
      >
        <LogOut className="h-[18px] w-[18px] text-muted-foreground" />
        Wyloguj
      </button>
    </Screen>
  );
}
