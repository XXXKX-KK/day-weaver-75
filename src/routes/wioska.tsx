import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Castle } from "lucide-react";
import { Screen, ScreenHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/wioska")({
  head: () => ({
    meta: [
      { title: "Twoja wioska – poziom, XP i passa" },
      {
        name: "description",
        content: "Twój postęp: poziom, zdobyte XP i passa dni z zakończonym planem.",
      },
    ],
  }),
  component: VillageScreen,
});

function VillageScreen() {
  return (
    <Screen>
      <ScreenHeader
        eyebrow="Postęp"
        title="Twoja wioska"
        action={
          <Link
            to="/"
            className="mt-1 flex items-center gap-1 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dziś
          </Link>
        }
      />

      <div className="flex flex-col items-center gap-3 rounded-3xl bg-foreground/5 px-5 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-foreground/5">
          <Castle className="h-6 w-6 text-muted-foreground" />
        </span>
        <p className="text-base font-semibold">Twoja wioska pojawi się tutaj</p>
        <p className="max-w-[22rem] text-sm text-muted-foreground">
          Za zdobywane XP i utrzymaną passę rozbudujesz swoją wioskę. Grafika jest w drodze — na
          razie liczą się punkty.
        </p>
      </div>
    </Screen>
  );
}
