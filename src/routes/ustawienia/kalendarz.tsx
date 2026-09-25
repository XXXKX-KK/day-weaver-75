import { createFileRoute } from "@tanstack/react-router";
import { Screen, SubScreenHeader } from "@/components/ui-kit";
import { CalendarSettings } from "@/components/calendar-settings";
import { isCalendarSupported } from "@/lib/calendar";

export const Route = createFileRoute("/ustawienia/kalendarz")({
  head: () => ({
    meta: [{ title: "Kalendarz – wydarzenia z telefonu" }],
  }),
  component: CalendarScreen,
});

/**
 * Kalendarz dostał własny ekran, bo w „Dniu" był schowany pod godzinami i nikt
 * go tam nie szukał. Sama zawartość bez zmian: przełącznik i wybór kalendarzy.
 */
function CalendarScreen() {
  return (
    <Screen>
      <SubScreenHeader title="Kalendarz" />

      {isCalendarSupported() ? (
        <CalendarSettings />
      ) : (
        <div
          className="rounded-3xl glass px-5 py-6 text-center"
          style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
        >
          <p className="text-sm text-muted-foreground">
            Kalendarz czytamy tylko w aplikacji na Androidzie.
          </p>
        </div>
      )}
    </Screen>
  );
}
