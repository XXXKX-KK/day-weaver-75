import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Clock,
  Compass,
  Palette,
  ShieldCheck,
  Sprout,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Screen,
  ScreenHeader,
  SettingsGroup,
  SettingsGroupLabel,
  SettingsTile,
} from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";
import { useOnboarding } from "@/lib/onboarding-context";
import { useNavReady } from "@/lib/nav-ready";
import { Blocker, isNativeBlocker } from "@/lib/blocker";
import { useCalendarSettings } from "@/lib/calendar";
import { APP_VERSION } from "@/lib/version";
import { areNotificationsEnabled, isReminderEnabled, REMINDER_KINDS } from "@/lib/notifications";
import { ACCENTS, readAccent } from "@/lib/accent";
import { readTheme } from "@/lib/theme";

export const Route = createFileRoute("/ustawienia/")({
  head: () => ({
    meta: [
      { title: "Ustawienia – konfiguracja aplikacji" },
      {
        name: "description",
        content: "Profil, plan dnia, skupienie, wygląd i Twój kierunek.",
      },
    ],
  }),
  component: SettingsHub,
});

const hhmm = (value: string | null | undefined) => (value ? value.slice(0, 5) : null);

/** Ile wymaganych uprawnień blokady brakuje — null, dopóki nie wiadomo. */
function useBlockerPermissions(): number | null {
  const native = isNativeBlocker();
  const [missing, setMissing] = useState<number | null>(null);

  useEffect(() => {
    if (!native) return;
    let cancelled = false;
    const check = async () => {
      try {
        const [usage, overlay, battery] = await Promise.all([
          Blocker.isUsageAccessGranted(),
          Blocker.isOverlayGranted(),
          Blocker.isBatteryOptimizationIgnored(),
        ]);
        if (cancelled) return;
        setMissing([usage, overlay, battery].filter((r) => !r.granted).length);
      } catch {
        /* brak odpowiedzi = nie udajemy, że wiemy */
      }
    };
    void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [native]);

  return missing;
}

function SettingsHub() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { restartCoachmark, restartSurvey } = useOnboarding();
  const { markReady } = useNavReady();
  const { enabled: calendarOn, supported: calendarSupported } = useCalendarSettings();
  const missingPermissions = useBlockerPermissions();
  useEffect(markReady, [markReady]);

  // localStorage i motyw czyta się dopiero po stronie klienta.
  const [look, setLook] = useState<string>("");
  const [reminders, setReminders] = useState<string>("");
  useEffect(() => {
    const accent = readAccent();
    const accentLabel =
      accent === "custom"
        ? "własny"
        : (ACCENTS.find((a) => a.key === accent)?.label.toLowerCase() ?? "");
    setLook(`${readTheme() === "light" ? "Jasny" : "Ciemny"}, ${accentLabel}`);

    if (!areNotificationsEnabled()) {
      setReminders("Wyłączone");
    } else {
      const on = REMINDER_KINDS.filter((r) => isReminderEnabled(r.kind)).length;
      setReminders(
        on === REMINDER_KINDS.length
          ? "Włączone"
          : on === 0
            ? "Wyłączone"
            : `Włączone: ${on} z ${REMINDER_KINDS.length}`,
      );
    }
  }, []);

  const dayStart = hhmm(profile?.day_start_time);
  const dayEnd = hhmm(profile?.day_end_time);

  return (
    <Screen>
      <div style={{ animation: "cascadeIn 0.5s ease-out both" }}>
        <ScreenHeader eyebrow="TENAX" title="Ustawienia" />
      </div>

      <Link
        to="/ustawienia/profil"
        className="block"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        <div className="flex items-center gap-4 rounded-3xl glass px-4 py-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-foreground/[0.08] bg-gradient-to-br from-foreground/10 to-foreground/[0.03]">
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

      <SettingsGroupLabel style={{ animation: "cascadeIn 0.5s ease-out 0.16s both" }}>
        Plan dnia
      </SettingsGroupLabel>
      <SettingsGroup>
        <SettingsTile
          icon={Clock}
          title="Godziny dnia"
          subtitle={dayStart && dayEnd ? `${dayStart}–${dayEnd}` : "Nie ustawione"}
          to="/ustawienia/dzien"
          style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}
        />
        {calendarSupported && (
          <SettingsTile
            icon={CalendarDays}
            title="Kalendarz"
            subtitle={calendarOn ? "Włączony" : "Wyłączony"}
            to="/ustawienia/kalendarz"
            style={{ animation: "cascadeIn 0.5s ease-out 0.26s both" }}
          />
        )}
        <SettingsTile
          icon={Bell}
          title="Przypomnienia"
          subtitle={reminders}
          to="/ustawienia/powiadomienia"
          style={{ animation: "cascadeIn 0.5s ease-out 0.32s both" }}
        />
      </SettingsGroup>

      {isNativeBlocker() && (
        <>
          <SettingsGroupLabel style={{ animation: "cascadeIn 0.5s ease-out 0.38s both" }}>
            Skupienie
          </SettingsGroupLabel>
          <SettingsGroup>
            <SettingsTile
              icon={ShieldCheck}
              title="Uprawnienia blokady"
              subtitle={
                missingPermissions === null
                  ? "Sprawdzam…"
                  : missingPermissions === 0
                    ? "Wszystko działa"
                    : `Brakuje: ${missingPermissions}`
              }
              subtitleColor={
                missingPermissions === null
                  ? undefined
                  : missingPermissions === 0
                    ? "var(--success)"
                    : "var(--destructive)"
              }
              to="/ustawienia/uprawnienia"
              style={{ animation: "cascadeIn 0.5s ease-out 0.42s both" }}
            />
          </SettingsGroup>
        </>
      )}

      <SettingsGroupLabel style={{ animation: "cascadeIn 0.5s ease-out 0.48s both" }}>
        Wygląd
      </SettingsGroupLabel>
      <SettingsGroup>
        <SettingsTile
          icon={Palette}
          title="Motyw i akcent"
          subtitle={look}
          to="/ustawienia/wyglad"
          style={{ animation: "cascadeIn 0.5s ease-out 0.52s both" }}
        />
      </SettingsGroup>

      <SettingsGroupLabel style={{ animation: "cascadeIn 0.5s ease-out 0.58s both" }}>
        Twój kierunek
      </SettingsGroupLabel>
      <SettingsGroup>
        <SettingsTile
          icon={Sprout}
          title="Powtórz ankietę startową"
          subtitle="Przestaw kierunek i dobierz nawyki od nowa"
          onClick={restartSurvey}
          style={{ animation: "cascadeIn 0.5s ease-out 0.62s both" }}
        />
        <SettingsTile
          icon={Compass}
          title="Pokaż samouczek"
          subtitle="Przejdź ponownie przewodnik po aplikacji"
          onClick={restartCoachmark}
          style={{ animation: "cascadeIn 0.5s ease-out 0.68s both" }}
        />
      </SettingsGroup>

      <div
        className="mt-10 flex flex-col items-center gap-1 text-[13px] text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.74s both" }}
      >
        <p>
          <Link to="/ustawienia/regulamin" className="underline underline-offset-4">
            Regulamin
          </Link>
          <span className="px-1.5">·</span>
          <Link to="/ustawienia/polityka-prywatnosci" className="underline underline-offset-4">
            Polityka prywatności
          </Link>
        </p>
        <p className="text-muted-foreground/60">TENAX v{APP_VERSION}</p>
      </div>
    </Screen>
  );
}
