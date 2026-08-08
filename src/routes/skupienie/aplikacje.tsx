import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Search, Smartphone } from "lucide-react";
import { Screen } from "@/components/ui-kit";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Blocker, isNativeBlocker, type InstalledApp } from "@/lib/blocker";

export const Route = createFileRoute("/skupienie/aplikacje")({
  head: () => ({
    meta: [
      { title: "Wybór blokowanych aplikacji" },
      {
        name: "description",
        content: "Zaznacz aplikacje, które mają być blokowane w trybie skupienia.",
      },
    ],
  }),
  component: AppPickerScreen,
});

// Common distraction sources shown first under "Sugerowane".
const SUGGESTED = new Set<string>([
  "com.instagram.android",
  "com.facebook.katana",
  "com.facebook.orca",
  "com.zhiliaoapp.musically",
  "com.google.android.youtube",
  "com.twitter.android",
  "com.reddit.frontpage",
  "com.snapchat.android",
  "com.netflix.mediaclient",
  "com.pinterest",
  "tv.twitch.android.app",
]);

function AppPickerScreen() {
  const native = isNativeBlocker();
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!native) {
        setLoading(false);
        return;
      }
      try {
        const [installed, current] = await Promise.all([
          Blocker.getInstalledApps({ includeIcons: true }),
          Blocker.getBlockedApps(),
        ]);
        if (cancelled) return;
        const sorted = [...installed.apps].sort((a, b) =>
          a.appLabel.localeCompare(b.appLabel, "pl"),
        );
        setApps(sorted);
        setBlocked(new Set(current.packages));
      } catch (e) {
        console.error("getInstalledApps failed", e);
        if (!cancelled) toast.error("Nie udało się wczytać listy aplikacji.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [native]);

  const toggle = async (pkg: string) => {
    const next = new Set(blocked);
    if (next.has(pkg)) next.delete(pkg);
    else next.add(pkg);
    setBlocked(next);
    try {
      await Blocker.setBlockedApps({ packages: [...next] });
    } catch (e) {
      console.error(e);
      setBlocked(blocked); // revert on failure
      toast.error("Nie udało się zapisać wyboru.");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) => a.appLabel.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q),
    );
  }, [apps, query]);

  const suggested = useMemo(
    () => (query ? [] : filtered.filter((a) => SUGGESTED.has(a.packageName))),
    [filtered, query],
  );
  const rest = useMemo(
    () => (query ? filtered : filtered.filter((a) => !SUGGESTED.has(a.packageName))),
    [filtered, query],
  );

  return (
    <Screen>
      <div className="mb-5 flex items-center gap-3">
        <Link
          to="/skupienie"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-elevated"
          aria-label="Wróć"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold leading-tight">Blokowane aplikacje</h1>
      </div>

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj aplikacji"
          className="h-12 w-full rounded-2xl border border-input bg-elevated pl-11 pr-4 text-sm outline-none focus:border-primary/40"
        />
      </div>

      {!native ? (
        <div className="card-surface flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="text-base font-semibold">Dostępne na telefonie</p>
          <p className="max-w-[22rem] text-sm text-muted-foreground">
            Lista zainstalowanych aplikacji jest odczytywana z urządzenia — otwórz ekran w aplikacji
            na Androidzie.
          </p>
        </div>
      ) : loading ? (
        <p className="px-1 text-sm text-muted-foreground">Wczytywanie aplikacji…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {suggested.length > 0 && (
            <AppSection title="Sugerowane" apps={suggested} blocked={blocked} onToggle={toggle} />
          )}
          <AppSection
            title={query ? "Wyniki" : "Wszystkie aplikacje"}
            apps={rest}
            blocked={blocked}
            onToggle={toggle}
          />
        </div>
      )}
    </Screen>
  );
}

function AppSection({
  title,
  apps,
  blocked,
  onToggle,
}: {
  title: string;
  apps: InstalledApp[];
  blocked: Set<string>;
  onToggle: (pkg: string) => void;
}) {
  if (apps.length === 0) {
    return (
      <div>
        <SectionTitle>{title}</SectionTitle>
        <p className="px-1 text-sm text-muted-foreground">Brak aplikacji.</p>
      </div>
    );
  }
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <div className="flex flex-col gap-2">
        {apps.map((app) => (
          <div key={app.packageName} className="card-surface flex items-center gap-4 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-elevated">
              {app.icon ? (
                <img src={app.icon} alt="" className="h-8 w-8 rounded-xl" />
              ) : (
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{app.appLabel}</p>
              <p className="truncate text-xs text-muted-foreground">{app.packageName}</p>
            </div>
            <Switch
              checked={blocked.has(app.packageName)}
              onCheckedChange={() => onToggle(app.packageName)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </h2>
  );
}
