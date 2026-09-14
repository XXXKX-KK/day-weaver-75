import { useEffect, useState } from "react";
import "../../today.css";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, Sparkles, Sunrise, Brain, Moon } from "lucide-react";
import { useAddRoutine, type NewRoutineInput } from "@/lib/routines";
import { isNativeBlocker, Blocker, type InstalledApp } from "@/lib/blocker";
import { useSetAppBlocked } from "@/lib/blocked-apps";
import { toast } from "sonner";

const ONBOARDING_KEY = "tenax:onboarding-done";

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

function markOnboardingDone() {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {}
}

type RoutineTemplate = {
  id: string;
  title: string;
  icon: typeof Sunrise;
  description: string;
  input: NewRoutineInput;
};

const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: "morning",
    title: "Poranny reset",
    icon: Sunrise,
    description: "Codziennie — woda, plan dnia, rozciąganie",
    input: {
      title: "Poranny reset",
      priority: "normal",
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      subtasks: ["Szklanka wody", "Przejrzyj plan dnia", "Rozciąganie 5 min"],
    },
  },
  {
    id: "deep-work",
    title: "Głęboka praca",
    icon: Brain,
    description: "Pon–Pt — wycisz i skup się na 90 minut",
    input: {
      title: "Głęboka praca",
      priority: "high",
      weekdays: [1, 2, 3, 4, 5],
      subtasks: ["Wycisz powiadomienia", "90 minut bez telefonu"],
    },
  },
  {
    id: "evening",
    title: "Wieczorne domknięcie",
    icon: Moon,
    description: "Codziennie — podsumuj i zaplanuj jutro",
    input: {
      title: "Wieczorne domknięcie",
      priority: "normal",
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      subtasks: ["Odhacz dzień", "Zaplanuj jutro"],
    },
  },
];

const POPULAR_APPS = [
  "com.instagram.android",
  "com.zhiliaoapp.musically",
  "com.snapchat.android",
  "com.twitter.android",
  "com.facebook.katana",
  "com.reddit.frontpage",
  "com.google.android.youtube",
  "com.discord",
];

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const native = isNativeBlocker();
  const totalSteps = native ? 4 : 3;

  const finish = () => {
    markOnboardingDone();
    onComplete();
  };

  const nextStep = () => {
    const next = step + 1;
    if (next === 2 && !native) {
      setStep(3);
    } else if (next >= totalSteps) {
      finish();
    } else {
      setStep(next);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 px-6 pt-[max(env(safe-area-inset-top,16px),16px)]">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepIdx = !native && i >= 2 ? i + 1 : i;
          return (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{
                backgroundColor:
                  stepIdx <= step
                    ? "var(--primary)"
                    : "color-mix(in oklab, var(--foreground) 10%, transparent)",
              }}
            />
          );
        })}
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-[max(env(safe-area-inset-bottom,16px),16px)]">
        {step === 0 && <StepPromise onNext={nextStep} />}
        {step === 1 && <StepRoutines onNext={nextStep} onSkip={nextStep} />}
        {step === 2 && native && <StepBlockApps onNext={nextStep} onSkip={nextStep} />}
        {step === 3 && <StepDone onFinish={finish} />}
      </div>
    </div>
  );
}

function StepPromise({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div
        className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <h1
        className="mb-4 max-w-[300px] text-[26px] font-extrabold leading-tight"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        TENAX nie pozwoli Ci scrollować, dopóki nie zrobisz swojego dnia.
      </h1>
      <p
        className="mb-10 max-w-[280px] text-[15px] leading-relaxed text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}
      >
        Zaplanuj dzień, zablokuj rozpraszacze, odhaczaj — a wieczorem zbieraj progres.
      </p>
      <button
        onClick={onNext}
        className="accent-gradient flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-3xl text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}
      >
        Zaczynajmy
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function StepRoutines({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["morning"]));
  const addRoutine = useAddRoutine();
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) {
      onSkip();
      return;
    }
    setSaving(true);
    try {
      const templates = ROUTINE_TEMPLATES.filter((t) => selected.has(t.id));
      for (const t of templates) {
        await addRoutine.mutateAsync(t.input);
      }
      onNext();
    } catch {
      toast.error("Nie udało się dodać rutyn.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col pt-8">
      <h1
        className="mb-2 text-2xl font-extrabold leading-tight"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        Wybierz swoje rutyny
      </h1>
      <p
        className="mb-6 text-sm text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        Pomogą Ci zbudować nawyki. Wybierz te, które pasują — możesz dodać kolejne potem.
      </p>

      <div className="flex flex-col gap-3">
        {ROUTINE_TEMPLATES.map((t, i) => {
          const active = selected.has(t.id);
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className="flex items-center gap-4 rounded-3xl bg-foreground/5 px-4 py-4 text-left transition-colors"
              style={{
                animation: `cascadeIn 0.5s ease-out ${0.15 + i * 0.06}s both`,
                border: active ? "1.5px solid var(--primary)" : "1.5px solid transparent",
              }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: active
                    ? "color-mix(in oklab, var(--primary) 15%, transparent)"
                    : "color-mix(in oklab, var(--foreground) 5%, transparent)",
                }}
              >
                <Icon className="h-5 w-5" style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }} />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold">{t.title}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{t.description}</p>
              </div>
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
                style={{
                  backgroundColor: active ? "var(--primary)" : "transparent",
                  border: active ? "none" : "1.5px solid color-mix(in oklab, var(--foreground) 20%, transparent)",
                }}
              >
                {active && <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-3 pb-4 pt-8">
        <button
          onClick={handleAdd}
          disabled={saving}
          className="accent-gradient flex h-14 w-full items-center justify-center rounded-3xl text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Dodawanie…" : selected.size > 0 ? "Dodaj wybrane" : "Kontynuuj"}
        </button>
        <button
          onClick={onSkip}
          className="h-10 text-sm font-medium text-muted-foreground"
          type="button"
        >
          Zrobię to później
        </button>
      </div>
    </div>
  );
}

function StepBlockApps({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const setAppBlocked = useSetAppBlocked();

  useEffect(() => {
    let cancelled = false;
    Blocker.getInstalledApps({ includeIcons: false })
      .then(({ apps: all }) => {
        if (cancelled) return;
        const popular = all.filter((a) => POPULAR_APPS.includes(a.packageName));
        const sorted = popular.length > 0 ? popular : all.slice(0, 12);
        sorted.sort((a, b) => a.appLabel.localeCompare(b.appLabel));
        setApps(sorted);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const toggle = (pkg: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      onSkip();
      return;
    }
    setSaving(true);
    try {
      const entries = apps.filter((a) => selected.has(a.packageName));
      for (const app of entries) {
        await setAppBlocked.mutateAsync({
          packageName: app.packageName,
          appLabel: app.appLabel,
          blocked: true,
        });
      }
      onNext();
    } catch {
      toast.error("Nie udało się zapisać blokady.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col pt-8">
      <h1
        className="mb-2 text-2xl font-extrabold leading-tight"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        Zablokuj rozpraszacze
      </h1>
      <p
        className="mb-6 text-sm text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        Te aplikacje zostaną zablokowane, gdy rozpoczniesz dzień. Możesz to zmienić później.
      </p>

      {!loaded ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Ładowanie aplikacji…</p>
        </div>
      ) : apps.length === 0 ? (
        <div
          className="rounded-3xl bg-foreground/5 px-5 py-8 text-center"
          style={{ animation: "cascadeIn 0.5s ease-out 0.15s both" }}
        >
          <p className="text-sm text-muted-foreground">
            Nie znaleziono popularnych aplikacji. Możesz je dodać później w ustawieniach.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {apps.map((app, i) => {
            const active = selected.has(app.packageName);
            return (
              <button
                key={app.packageName}
                type="button"
                onClick={() => toggle(app.packageName)}
                className="flex items-center gap-4 rounded-3xl bg-foreground/5 px-4 py-3 text-left transition-colors"
                style={{
                  animation: `cascadeIn 0.5s ease-out ${0.15 + i * 0.04}s both`,
                  border: active ? "1.5px solid var(--primary)" : "1.5px solid transparent",
                }}
              >
                <span className="flex-1 text-[15px] font-medium">{app.appLabel}</span>
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{
                    backgroundColor: active ? "var(--primary)" : "transparent",
                    border: active ? "none" : "1.5px solid color-mix(in oklab, var(--foreground) 20%, transparent)",
                  }}
                >
                  {active && <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 pb-4 pt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="accent-gradient flex h-14 w-full items-center justify-center rounded-3xl text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Zapisywanie…" : selected.size > 0 ? "Zablokuj wybrane" : "Kontynuuj"}
        </button>
        <button
          onClick={onSkip}
          className="h-10 text-sm font-medium text-muted-foreground"
          type="button"
        >
          Pomiń
        </button>
      </div>
    </div>
  );
}

function StepDone({ onFinish }: { onFinish: () => void }) {
  const navigate = useNavigate();

  const handleFinish = () => {
    onFinish();
    navigate({ to: "/" });
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div
        className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        <Check className="h-10 w-10 text-primary" strokeWidth={2.5} />
      </div>
      <h1
        className="mb-3 text-[26px] font-extrabold leading-tight"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        Wszystko gotowe!
      </h1>
      <p
        className="mb-10 max-w-[280px] text-[15px] leading-relaxed text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}
      >
        Twoje rutyny czekają. Kliknij &quot;Rozpocznij dzień&quot; na ekranie głównym, żeby zacząć.
      </p>
      <button
        onClick={handleFinish}
        className="accent-gradient flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-3xl text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}
      >
        Rozpocznij dzień
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
