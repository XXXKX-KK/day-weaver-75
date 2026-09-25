import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Mail, User, UserPen } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Screen, SettingsGroup, SettingsTile, SubScreenHeader } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useProfile, useUpdateProfile } from "@/lib/profile";
import { toast } from "sonner";

export const Route = createFileRoute("/ustawienia/profil")({
  head: () => ({
    meta: [{ title: "Twój profil" }],
  }),
  component: ProfileScreen,
});

/**
 * Profil i konto w jednym miejscu — wcześniej oba ekrany pokazywały ten sam
 * e-mail i nie było wiadomo, po co są dwa.
 */
function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    setName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  const saveName = () => {
    setEditingName(false);
    const next = name.trim();
    if (next === (profile?.display_name ?? "")) return;
    updateProfile.mutate(
      { display_name: next || null },
      { onError: () => toast.error("Nie udało się zapisać imienia.") },
    );
  };

  const handleLogout = async () => {
    setConfirmLogout(false);
    try {
      await signOut();
    } catch {
      toast.error("Nie udało się wylogować.");
    }
  };

  return (
    <Screen>
      <SubScreenHeader title="Twój profil" />

      <div
        className="mb-7 flex flex-col items-center gap-3"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full border border-foreground/[0.08] bg-gradient-to-br from-foreground/[0.08] to-foreground/[0.02]">
          <User className="h-9 w-9 text-foreground/30" strokeWidth={1.5} />
        </span>
        <span className="text-sm font-medium text-primary">Zmień awatar</span>
      </div>

      <SettingsGroup>
        {editingName ? (
          <div
            className="rounded-3xl glass px-4 py-[14px]"
            style={{ animation: "cascadeIn 0.5s ease-out 0.16s both" }}
          >
            <p className="text-[13px] text-muted-foreground">Imię</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setName(profile?.display_name ?? "");
                  setEditingName(false);
                }
              }}
              maxLength={40}
              placeholder="Jak mamy się do Ciebie zwracać?"
              className="mt-1 w-full bg-transparent text-[16px] font-medium outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        ) : (
          <SettingsTile
            icon={UserPen}
            title="Imię"
            subtitle={profile?.display_name || "Nie ustawione"}
            onClick={() => setEditingName(true)}
            style={{ animation: "cascadeIn 0.5s ease-out 0.16s both" }}
          />
        )}

        <SettingsTile
          icon={Mail}
          title="E-mail"
          subtitle={user?.email ?? "—"}
          style={{ animation: "cascadeIn 0.5s ease-out 0.22s both" }}
        />
      </SettingsGroup>

      <div className="mt-8">
        <SettingsGroup>
          <SettingsTile
            icon={LogOut}
            title="Wyloguj się"
            danger
            onClick={() => setConfirmLogout(true)}
            right={<span />}
            style={{ animation: "cascadeIn 0.5s ease-out 0.28s both" }}
          />
        </SettingsGroup>
      </div>

      <button
        type="button"
        onClick={() => void navigate({ to: "/ustawienia/usun-konto" })}
        className="mx-auto mt-6 block text-[13px] text-muted-foreground underline underline-offset-4"
        style={{ animation: "cascadeIn 0.5s ease-out 0.34s both" }}
      >
        Usuń konto
      </button>

      <AlertDialog open={confirmLogout} onOpenChange={(o) => !o && setConfirmLogout(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">Wylogować się?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Twój plan i postęp zostają na koncie. Wrócisz do nich po ponownym zalogowaniu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1">Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleLogout()}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Wyloguj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
