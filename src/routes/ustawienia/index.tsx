import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, ChevronRight, Clock, LogOut, Palette, ShieldCheck, User } from "lucide-react";
import { Screen, ScreenHeader, Card } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/ustawienia/")({
  head: () => ({
    meta: [
      { title: "Ustawienia – godziny dnia i uprawnienia" },
      {
        name: "description",
        content:
          "Ustaw godziny startu i końca dnia, autostart planu oraz uprawnienia potrzebne do blokowania aplikacji.",
      },
      { property: "og:title", content: "Ustawienia – godziny dnia i uprawnienia" },
      {
        property: "og:description",
        content: "Konfiguracja dnia, przerw i uprawnień Androida.",
      },
    ],
  }),
  component: SettingsScreen,
});

function SettingsScreen() {
  const { resetDay } = useStore();
  const [autostart, setAutostart] = useState(false);

  return (
    <Screen>
      <ScreenHeader eyebrow="Konto" title="Ustawienia" />

      <Card className="mb-4 flex items-center gap-4 py-5">
        <span className="accent-gradient flex h-12 w-12 items-center justify-center rounded-2xl">
          <User className="h-5 w-5 text-primary-foreground" />
        </span>
        <div>
          <p className="text-base font-semibold">Twój profil</p>
          <p className="text-xs text-muted-foreground">Konto prywatne</p>
        </div>
      </Card>

      <Link to="/ustawienia/wyglad" className="mb-6 block">
        <Card className="flex items-center gap-4 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-elevated">
            <Palette className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Wygląd</p>
            <p className="truncate text-xs text-muted-foreground">Kolor akcentu</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Card>
      </Link>

      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Dzień
      </h2>
      <Card className="mb-6 divide-y divide-border p-0">
        <Row icon={<Clock className="h-4 w-4" />} label="Start dnia" value="07:00" />
        <Row icon={<Clock className="h-4 w-4" />} label="Koniec dnia" value="22:00" />
        <div className="flex items-center justify-between px-5 py-4">
          <span className="flex items-center gap-3 text-sm">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Autostart dnia
          </span>
          <Switch checked={autostart} onCheckedChange={setAutostart} />
        </div>
      </Card>

      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Uprawnienia Androida
      </h2>
      <Card className="mb-6 divide-y divide-border p-0">
        <Row
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Usługa ułatwień dostępu"
          value="Wymagana"
        />
        <Row
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Optymalizacja baterii"
          value="Wyłącz"
        />
      </Card>

      <button
        onClick={resetDay}
        className="mb-3 h-14 w-full rounded-3xl bg-secondary text-sm font-semibold text-secondary-foreground"
      >
        Zresetuj dzisiejszy dzień
      </button>
      <button className="flex h-14 w-full items-center justify-center gap-2 rounded-3xl border border-border text-sm font-semibold text-muted-foreground">
        <LogOut className="h-4 w-4" />
        Wyloguj się
      </button>
      <p className="mt-6 text-center text-xs text-muted-foreground">Wersja 0.1 · Faza 1</p>
    </Screen>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}
