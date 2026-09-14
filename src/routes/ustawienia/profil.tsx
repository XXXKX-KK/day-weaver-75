import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, User } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/ustawienia/profil")({
  head: () => ({
    meta: [{ title: "Twój profil" }],
  }),
  component: ProfileScreen,
});

function ProfileScreen() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

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
        <h1 className="text-2xl font-bold leading-tight">Twój profil</h1>
      </div>

      <div
        className="mb-7 flex flex-col items-center gap-3"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-gradient-to-br from-foreground/[0.08] to-foreground/[0.02] border border-foreground/[0.08]">
          <User className="h-9 w-9 text-foreground/30" strokeWidth={1.5} />
        </span>
        <span className="text-sm font-medium text-primary">Zmień awatar</span>
      </div>

      <div
        className="mb-3 rounded-3xl bg-foreground/5 px-4 py-[14px]"
        style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}
      >
        <p className="text-xs text-muted-foreground">Imię</p>
        <p className="mt-1 text-base">{profile?.display_name || "—"}</p>
      </div>
      <div
        className="rounded-3xl bg-foreground/5 px-4 py-[14px]"
        style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}
      >
        <p className="text-xs text-muted-foreground">Email</p>
        <p className="mt-1 text-base">{user?.email ?? "—"}</p>
      </div>
    </Screen>
  );
}
