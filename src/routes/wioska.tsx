import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Castle, Flame, Sparkles, Star } from "lucide-react";
import { Screen, ScreenHeader, Card } from "@/components/ui-kit";
import { useGamification } from "@/lib/gamification";

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
  const { level, intoLevel, toNext, totalXp, streak, progress } = useGamification();

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

      <Card className="mb-4 flex flex-col items-center gap-3 py-8 text-center">
        <span className="accent-gradient accent-glow flex h-16 w-16 items-center justify-center rounded-3xl">
          <span className="text-2xl font-bold text-primary-foreground">{level}</span>
        </span>
        <p className="text-base font-semibold">Poziom {level}</p>
        <p className="text-sm text-muted-foreground">
          Jeszcze {toNext} XP do poziomu {level + 1}
        </p>
        <div className="mt-1 h-2 w-full max-w-[16rem] overflow-hidden rounded-full bg-secondary">
          <div
            className="accent-gradient h-full rounded-full"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatTile icon={<Star className="h-4 w-4" />} value={totalXp} label="XP łącznie" />
        <StatTile icon={<Sparkles className="h-4 w-4" />} value={level} label="Poziom" />
        <StatTile icon={<Flame className="h-4 w-4" />} value={streak} label="Passa" />
      </div>

      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-elevated">
          <Castle className="h-6 w-6 text-muted-foreground" />
        </span>
        <p className="text-base font-semibold">Twoja wioska pojawi się tutaj</p>
        <p className="max-w-[22rem] text-sm text-muted-foreground">
          Za zdobywane XP i utrzymaną passę rozbudujesz swoją wioskę. Grafika jest w drodze — na
          razie liczą się punkty.
        </p>
      </Card>
    </Screen>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-elevated py-4">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
