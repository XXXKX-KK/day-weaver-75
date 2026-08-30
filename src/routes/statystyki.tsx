import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CalendarDays, Flame, Star, TrendingUp } from "lucide-react";
import { Screen, ScreenHeader, Card } from "@/components/ui-kit";
import { useGamification, levelFromXp } from "@/lib/gamification";
import {
  useDailyProgress,
  longestStreak,
  totalDaysDone,
  xpCumulative,
  weeklyCompletion,
  completionBucket,
  type DayProgress,
} from "@/lib/stats";

export const Route = createFileRoute("/statystyki")({
  head: () => ({
    meta: [
      { title: "Statystyki – postęp i passa" },
      { name: "description", content: "Wykresy XP, realizacji tygodniowej i siatka nawyków." },
    ],
  }),
  component: StatsScreen,
});

type View = "progress" | "grid";

function StatsScreen() {
  const [view, setView] = useState<View>("progress");
  const { data: rows, isLoading } = useDailyProgress();
  const { totalXp, streak, level } = useGamification();

  const safe = rows ?? [];

  return (
    <Screen>
      <ScreenHeader eyebrow="Analiza" title="Statystyki" />

      <div className="mb-6 flex gap-2">
        <SegmentButton active={view === "progress"} onClick={() => setView("progress")}>
          Postęp
        </SegmentButton>
        <SegmentButton active={view === "grid"} onClick={() => setView("grid")}>
          Siatka
        </SegmentButton>
      </div>

      {isLoading ? (
        <Card className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Ładowanie…</p>
        </Card>
      ) : view === "progress" ? (
        <ProgressView rows={safe} totalXp={totalXp} streak={streak} level={level} />
      ) : (
        <GridView rows={safe} />
      )}
    </Screen>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors " +
        (active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground")
      }
    >
      {children}
    </button>
  );
}

function ProgressView({
  rows,
  totalXp,
  streak,
  level,
}: {
  rows: DayProgress[];
  totalXp: number;
  streak: number;
  level: number;
}) {
  const best = longestStreak(rows);
  const done = totalDaysDone(rows);
  const cumXp = xpCumulative(rows);
  const weekly = weeklyCompletion(rows);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatTile icon={<Star className="h-4 w-4" />} value={totalXp} label="XP łącznie" />
        <StatTile icon={<TrendingUp className="h-4 w-4" />} value={level} label="Poziom" />
        <StatTile icon={<Flame className="h-4 w-4" />} value={streak} label="Aktualna passa" />
        <StatTile icon={<CalendarDays className="h-4 w-4" />} value={done} label="Dni ukończone" />
      </div>

      {best > 0 && (
        <p className="mb-4 text-center text-xs text-muted-foreground">
          Najdłuższa passa: <span className="font-semibold text-foreground">{best} dni</span>
        </p>
      )}

      {cumXp.length > 1 && (
        <Card className="mb-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            XP skumulowane
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={cumXp}>
              <defs>
                <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={40} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="xp"
                stroke="var(--primary)"
                fill="url(#xpGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {weekly.length > 1 && (
        <Card className="mb-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Realizacja tygodniowa
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                width={32}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}%`, "Realizacja"]}
              />
              <Bar dataKey="pct" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {rows.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm font-semibold">Brak danych</p>
          <p className="text-xs text-muted-foreground">
            Ukończ pierwszy dzień, by zobaczyć statystyki.
          </p>
        </Card>
      )}
    </>
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

const BUCKET_COLORS = [
  "var(--border)",
  "#63992233",
  "#63992255",
  "#63992288",
  "#639922",
] as const;

function GridView({ rows }: { rows: DayProgress[] }) {
  if (rows.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm font-semibold">Brak danych</p>
        <p className="text-xs text-muted-foreground">
          Ukończ pierwszy dzień, by zobaczyć siatkę nawyków.
        </p>
      </Card>
    );
  }

  const byDate = new Map(rows.map((r) => [r.date, r]));

  const last = rows[rows.length - 1]!.date;
  const end = new Date(last + "T00:00:00");
  const start = new Date(end);
  start.setDate(start.getDate() - 364);
  const startDay = start.getDay();
  if (startDay !== 1) {
    start.setDate(start.getDate() - ((startDay + 6) % 7));
  }

  const cells: { date: string; bucket: 0 | 1 | 2 | 3 | 4 }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const row = byDate.get(key);
    cells.push({ date: key, bucket: row ? completionBucket(row) : 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <Card>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Siatka nawyków
      </p>
      <div className="overflow-x-auto">
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={cell.date}
                  className="h-[13px] w-[13px] rounded-[3px]"
                  style={{ background: BUCKET_COLORS[cell.bucket] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <span>Mniej</span>
        {BUCKET_COLORS.map((c, i) => (
          <div
            key={i}
            className="h-[10px] w-[10px] rounded-[2px]"
            style={{ background: c }}
          />
        ))}
        <span>Więcej</span>
      </div>
    </Card>
  );
}
