import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  Palette,
  Shield,
  ShieldCheck,
  Target,
  User,
  UserCircle,
} from "lucide-react";
import { Screen, ScreenHeader } from "@/components/ui-kit";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useOnboarding } from "@/lib/onboarding-context";
import { useNavReady } from "@/lib/nav-ready";

export const Route = createFileRoute("/ustawienia/")({
  head: () => ({
    meta: [
      { title: "Ustawienia – konfiguracja aplikacji" },
      {
        name: "description",
        content: "Profil, dzień, wygląd, powiadomienia, uprawnienia i konto.",
      },
    ],
  }),
  component: SettingsHub,
});

const menuItems = [
  { to: "/ustawienia/dzien", icon: Clock, title: "Dzień", subtitle: "Godziny aktywności" },
  { to: "/ustawienia/nakladka", icon: Target, title: "Nakładka i skupienie", subtitle: "Notatki i fokus" },
  { to: "/ustawienia/powiadomienia", icon: Bell, title: "Powiadomienia", subtitle: "Przypomnienia" },
  { to: "/ustawienia/wyglad", icon: Palette, title: "Wygląd", subtitle: "Motyw, akcent, język" },
  { to: "/ustawienia/uprawnienia", icon: ShieldCheck, title: "Uprawnienia", subtitle: "Dostęp i bateria" },
  { to: "/ustawienia/konto", icon: UserCircle, title: "Konto", subtitle: "Email i dane" },
] as const;

function SettingsHub() {
  const { user } = useAuth();
  const { restartCoachmark } = useOnboarding();
  const { markReady } = useNavReady();
  useEffect(markReady, [markReady]);

  return (
    <Screen>
      <div style={{ animation: "cascadeIn 0.5s ease-out both" }}>
        <ScreenHeader eyebrow="TENAX" title="Ustawienia" />
      </div>

      <Link
        to="/ustawienia/profil"
        className="mb-3 block"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        <div className="flex items-center gap-4 rounded-3xl glass px-4 py-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-foreground/10 to-foreground/[0.03] border border-foreground/[0.08]">
            <User className="h-5 w-5 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold">Twój profil</p>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {user?.email ?? "Zmień awatar i imię"}
            </p>
          </div>
          <ChevronRight className="h-[14px] w-[14px] shrink-0 text-foreground/[0.18]" />
        </div>
      </Link>

      <div className="flex flex-col gap-3">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="block"
              style={{ animation: `cascadeIn 0.5s ease-out ${0.2 + i * 0.06}s both` }}
            >
              <div className="flex items-center gap-[14px] rounded-3xl glass px-4 py-[14px]">
                <span className="flex h-9 w-9 items-center justify-center">
                  <Icon className="h-[22px] w-[22px] text-muted-foreground" strokeWidth={1.4} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-medium">{item.title}</p>
                  <p className="mt-px text-[13px] text-muted-foreground">{item.subtitle}</p>
                </div>
                <ChevronRight className="h-[14px] w-[14px] shrink-0 text-foreground/[0.18]" />
              </div>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={restartCoachmark}
        className="mt-3 w-full"
        style={{ animation: `cascadeIn 0.5s ease-out ${0.2 + menuItems.length * 0.06}s both` }}
      >
        <div className="flex items-center gap-[14px] rounded-3xl glass px-4 py-[14px]">
          <span className="flex h-9 w-9 items-center justify-center">
            <Compass className="h-[22px] w-[22px] text-muted-foreground" strokeWidth={1.4} />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[16px] font-medium">Pokaż samouczek jeszcze raz</p>
            <p className="mt-px text-[13px] text-muted-foreground">Przejdź ponownie przewodnik po aplikacji</p>
          </div>
        </div>
      </button>

      <div
        className="mt-6 flex flex-col gap-3"
        style={{ animation: `cascadeIn 0.5s ease-out ${0.2 + (menuItems.length + 1) * 0.06}s both` }}
      >
        <Link to="/ustawienia/regulamin" className="block">
          <div className="flex items-center gap-[14px] rounded-3xl glass px-4 py-[14px]">
            <span className="flex h-9 w-9 items-center justify-center">
              <FileText className="h-[22px] w-[22px] text-muted-foreground" strokeWidth={1.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-medium">Regulamin</p>
              <p className="mt-px text-[13px] text-muted-foreground">Zasady korzystania z aplikacji</p>
            </div>
            <ChevronRight className="h-[14px] w-[14px] shrink-0 text-foreground/[0.18]" />
          </div>
        </Link>
        <Link to="/ustawienia/polityka-prywatnosci" className="block">
          <div className="flex items-center gap-[14px] rounded-3xl glass px-4 py-[14px]">
            <span className="flex h-9 w-9 items-center justify-center">
              <Shield className="h-[22px] w-[22px] text-muted-foreground" strokeWidth={1.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-medium">Polityka prywatności</p>
              <p className="mt-px text-[13px] text-muted-foreground">Dane osobowe i uprawnienia</p>
            </div>
            <ChevronRight className="h-[14px] w-[14px] shrink-0 text-foreground/[0.18]" />
          </div>
        </Link>
      </div>
    </Screen>
  );
}
