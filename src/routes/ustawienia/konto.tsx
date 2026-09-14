import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useResetDay } from "@/lib/day";
import { toast } from "sonner";

export const Route = createFileRoute("/ustawienia/konto")({
  head: () => ({
    meta: [{ title: "Konto" }],
  }),
  component: AccountScreen,
});

function AccountScreen() {
  const { user, signOut } = useAuth();
  const resetDay = useResetDay();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      toast.error("Nie udało się wylogować.");
    }
  };

  const handleReset = () => {
    resetDay.mutate(undefined, {
      onSuccess: () => toast.success("Dzień został zresetowany."),
      onError: () => toast.error("Nie udało się zresetować dnia."),
    });
  };

  return (
    <Screen>
      <div
        className="mb-5 flex items-center gap-3"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        <Link
          to="/ustawienia"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/5"
          aria-label="Wróć"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold leading-tight">Konto</h1>
      </div>

      <div
        className="mb-3 rounded-3xl bg-foreground/5 px-4 py-[14px]"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        <p className="text-xs text-muted-foreground">Email</p>
        <p className="mt-1 text-base">{user?.email ?? "—"}</p>
      </div>

      <button
        onClick={handleLogout}
        className="mb-3 w-full rounded-3xl bg-foreground/5 px-4 py-4 text-left"
        style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}
      >
        <p className="text-[15px] font-medium text-destructive">Wyloguj się</p>
      </button>
      <button
        onClick={handleReset}
        className="w-full rounded-3xl bg-foreground/5 px-4 py-4 text-left"
        style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}
      >
        <p className="text-[15px] font-medium text-warning">Zresetuj dzień</p>
      </button>

      <p
        className="mt-8 text-center text-[13px] text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}
      >
        TENAX v1.0.0
      </p>
    </Screen>
  );
}
