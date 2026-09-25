import { useState, useEffect, useMemo } from "react";
import "../../today.css";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, ChevronLeft, Plus } from "lucide-react";
import { TenaxShield } from "@/components/tenax-shield";
import { useCreateStarterPlan } from "@/lib/routines";
import { isNativeBlocker, Blocker, type InstalledApp } from "@/lib/blocker";
import { useSetAppBlocked } from "@/lib/blocked-apps";
import { useUpdateProfile } from "@/lib/profile";
import { toast } from "sonner";
import type { GrowthArea } from "@/lib/store";
import { Input } from "@/components/ui/input";
import {
  type SurveyAnswers,
  type Distraction,
  type Level,
  DEFAULT_ANSWERS,
  MAX_AREAS,
  AREA_OPTIONS,
  LEVEL_OPTIONS,
  LEVEL_QUESTION,
  MAINTENANCE_TILES,
  DISTRACTION_OPTIONS,
  STARTER_HABITS,
  ANCHOR_REF_WAKE_UP,
  ANCHOR_REF_AFTER_WORK,
  tileAnchorRef,
  selectedTiles,
  growthHabitsFor,
  anchorTitleFor,
  buildStarterPlan,
  packagesForDistractions,
} from "@/lib/day-survey";

export const PROMISE_HEADING =
  "TENAX nie pozwoli Ci scrollować, dopóki nie zrobisz czegoś dla siebie.";

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({ ...DEFAULT_ANSWERS });
  const native = isNativeBlocker();
  const totalSteps = native ? 4 : 3;
  const updateProfile = useUpdateProfile();

  const finish = (final: SurveyAnswers) => {
    updateProfile.mutate({ onboarding_done: true, survey: final });
    onComplete();
  };

  // Web skips the block screen; its step index stays 2 so the dots line up.
  const afterSurvey = () => setStep(native ? 2 : 3);

  return (
    <div className="overlay-bg fixed inset-0 z-50 flex flex-col">
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
        {step === 0 && <StepPromise onNext={() => setStep(1)} />}
        {step === 1 && (
          <StepSurvey
            answers={answers}
            setAnswers={setAnswers}
            onDone={afterSurvey}
          />
        )}
        {step === 2 && native && (
          <StepBlockApps
            answers={answers}
            setAnswers={setAnswers}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && <StepDone onFinish={() => finish(answers)} />}
      </div>
    </div>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useTypewriter(text: string, enabled: boolean, charMs = 20) {
  const [displayed, setDisplayed] = useState(enabled ? "" : text);
  const [done, setDone] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      setDone(true);
      return;
    }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, charMs);
    return () => clearInterval(id);
  }, [text, enabled, charMs]);

  return { displayed, done };
}

function StepPromise({ onNext }: { onNext: () => void }) {
  const reducedMotion = useReducedMotion();
  const { displayed, done: typeDone } = useTypewriter(PROMISE_HEADING, !reducedMotion);
  const entrance = reducedMotion ? undefined : "cascadeIn 0.4s ease-out both";

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div
        className="mb-8 flex items-center justify-center"
        style={{ animation: entrance }}
      >
        <TenaxShield size={88} color="var(--primary)" />
      </div>
      <h1
        className="mb-4 max-w-[300px] text-[26px] font-extrabold leading-tight"
        style={{
          animation: reducedMotion ? undefined : "cascadeIn 0.4s ease-out 0.1s both",
        }}
      >
        {displayed}
      </h1>
      <p
        className="mb-10 max-w-[280px] text-[15px] leading-relaxed text-muted-foreground transition-opacity duration-300"
        style={{ opacity: typeDone ? 1 : 0 }}
      >
        Wybierzesz jedną rzecz, która Cię pcha do przodu. Reszta poczeka.
      </p>
      <button
        onClick={onNext}
        className="accent-gradient flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-full text-base font-bold text-primary-foreground transition-all duration-300 active:scale-[0.98]"
        style={{
          opacity: typeDone ? 1 : 0,
          transform: typeDone ? "translateY(0)" : "translateY(8px)",
        }}
        disabled={!typeDone}
      >
        Zaczynajmy
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

/** The survey is a list of screens derived from the answers themselves — pick
 *  two areas and you get two level questions and two anchor questions. */
type SurveyScreen =
  | { kind: "areas" }
  | { kind: "level"; area: GrowthArea }
  | { kind: "tiles" }
  | { kind: "anchor"; area: GrowthArea }
  | { kind: "preview" };

function surveyScreens(answers: SurveyAnswers): SurveyScreen[] {
  const levelled = answers.areas.filter((a) => answers.levels[a]);
  return [
    { kind: "areas" },
    ...answers.areas.map((area) => ({ kind: "level" as const, area })),
    { kind: "tiles" },
    ...levelled.map((area) => ({ kind: "anchor" as const, area })),
    { kind: "preview" },
  ];
}

function StepSurvey({
  answers,
  setAnswers,
  onDone,
}: {
  answers: SurveyAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<SurveyAnswers>>;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const screens = surveyScreens(answers);
  const clamped = Math.min(index, screens.length - 1);
  const screen = screens[clamped] ?? { kind: "areas" as const };

  const next = () => setIndex(Math.min(clamped + 1, screens.length - 1));
  const back = () => setIndex(Math.max(clamped - 1, 0));

  return (
    <div className="flex flex-1 flex-col pt-8">
      {clamped > 0 && (
        <button
          type="button"
          onClick={back}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Wróć
        </button>
      )}

      <p
        className="mb-2 text-xs font-medium text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        {clamped + 1} z {screens.length}
      </p>

      {screen.kind === "areas" && (
        <QuestionAreas answers={answers} setAnswers={setAnswers} onNext={next} />
      )}
      {screen.kind === "level" && (
        <QuestionLevel
          area={screen.area}
          value={answers.levels[screen.area]}
          onPick={(level) => {
            setAnswers((a) => ({ ...a, levels: { ...a.levels, [screen.area]: level } }));
            next();
          }}
        />
      )}
      {screen.kind === "tiles" && (
        <QuestionTiles answers={answers} setAnswers={setAnswers} onNext={next} />
      )}
      {screen.kind === "anchor" && (
        <QuestionAnchor
          area={screen.area}
          answers={answers}
          onPick={(ref) => {
            setAnswers((a) => ({ ...a, anchors: { ...a.anchors, [screen.area]: ref } }));
            next();
          }}
          onSkip={next}
        />
      )}
      {screen.kind === "preview" && <PreviewPlan answers={answers} onDone={onDone} />}
    </div>
  );
}

function OptionButton({
  active,
  label,
  hint,
  onClick,
  delay,
}: {
  active: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
  delay: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 rounded-3xl glass px-4 py-4 text-left transition-colors"
      style={{
        animation: `cascadeIn 0.5s ease-out ${delay}s both`,
        border: active ? "1.5px solid var(--primary)" : "1.5px solid transparent",
      }}
    >
      <span className="flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[13px] text-muted-foreground">{hint}</span>
        )}
      </span>
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
        style={{
          backgroundColor: active ? "var(--primary)" : "transparent",
          border: active
            ? "none"
            : "1.5px solid color-mix(in oklab, var(--foreground) 20%, transparent)",
        }}
      >
        {active && <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />}
      </div>
    </button>
  );
}

function PrimaryButton({
  onClick,
  children,
  disabled,
  delay = 0.3,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  delay?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="accent-gradient mt-6 flex h-14 w-full items-center justify-center rounded-full text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
      style={{ animation: `cascadeIn 0.5s ease-out ${delay}s both` }}
    >
      {children}
    </button>
  );
}

function QuestionAreas({
  answers,
  setAnswers,
  onNext,
}: {
  answers: SurveyAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<SurveyAnswers>>;
  onNext: () => void;
}) {
  const toggle = (area: GrowthArea) => {
    setAnswers((a) => {
      if (a.areas.includes(area)) {
        const areas = a.areas.filter((x) => x !== area);
        const levels = { ...a.levels };
        const anchors = { ...a.anchors };
        delete levels[area];
        delete anchors[area];
        return { ...a, areas, levels, anchors };
      }
      if (a.areas.length >= MAX_AREAS) {
        toast("Dwa wystarczą. Zacznij od nich.");
        return a;
      }
      return { ...a, areas: [...a.areas, area] };
    });
  };

  return (
    <>
      <h1
        className="mb-2 text-2xl font-extrabold leading-tight"
        style={{ animation: "cascadeIn 0.5s ease-out 0.05s both" }}
      >
        Nad czym pracujesz najpierw?
      </h1>
      <p
        className="mb-6 text-sm leading-relaxed text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        Wybierz maksymalnie dwa. Mniej na start znaczy więcej po miesiącu. Resztę
        dołożysz, jak te wejdą w krew.
      </p>
      <div className="flex flex-col gap-3">
        {AREA_OPTIONS.map((o, i) => (
          <OptionButton
            key={o.value}
            active={answers.areas.includes(o.value)}
            label={o.label}
            hint={o.hint}
            onClick={() => toggle(o.value)}
            delay={0.15 + i * 0.06}
          />
        ))}
      </div>
      <PrimaryButton onClick={onNext} disabled={answers.areas.length === 0} delay={0.4}>
        Dalej
        <ChevronRight className="ml-2 h-5 w-5" />
      </PrimaryButton>
    </>
  );
}

function QuestionLevel({
  area,
  value,
  onPick,
}: {
  area: GrowthArea;
  value: Level | undefined;
  onPick: (level: Level) => void;
}) {
  return (
    <>
      <h1
        className="mb-2 text-2xl font-extrabold leading-tight"
        style={{ animation: "cascadeIn 0.5s ease-out 0.05s both" }}
      >
        {LEVEL_QUESTION[area]}
      </h1>
      <p
        className="mb-6 text-sm text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        Powiedz jak jest, nie jak chciałbyś, żeby było. Od tego zależy, od czego zaczniesz.
      </p>
      <div className="flex flex-col gap-3">
        {LEVEL_OPTIONS[area].map((o, i) => (
          <OptionButton
            key={o.value}
            active={value === o.value}
            label={o.label}
            hint={STARTER_HABITS[area][o.value].title}
            onClick={() => onPick(o.value)}
            delay={0.15 + i * 0.06}
          />
        ))}
      </div>
    </>
  );
}

function QuestionTiles({
  answers,
  setAnswers,
  onNext,
}: {
  answers: SurveyAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<SurveyAnswers>>;
  onNext: () => void;
}) {
  const [customTitle, setCustomTitle] = useState("");

  const toggle = (key: string) => {
    setAnswers((a) => ({
      ...a,
      maintenance_tiles: a.maintenance_tiles.includes(key)
        ? a.maintenance_tiles.filter((k) => k !== key)
        : [...a.maintenance_tiles, key],
    }));
  };

  const addCustom = () => {
    const title = customTitle.trim();
    if (!title) return;
    setAnswers((a) => ({
      ...a,
      custom_tiles: [...a.custom_tiles, { title, weekdays: [1, 2, 3, 4, 5, 6, 7] }],
    }));
    setCustomTitle("");
  };

  return (
    <>
      <h1
        className="mb-2 text-2xl font-extrabold leading-tight"
        style={{ animation: "cascadeIn 0.5s ease-out 0.05s both" }}
      >
        Co ogarniasz na co dzień i nie chcesz zapominać?
      </h1>
      <p
        className="mb-6 text-sm text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        To trafi do Rutyn. Drobiazgi, ale trzymają dzień w ryzach.
      </p>

      <div className="flex flex-wrap gap-2">
        {MAINTENANCE_TILES.map((tile, i) => {
          const active = answers.maintenance_tiles.includes(tile.key);
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => toggle(tile.key)}
              className="rounded-full glass px-4 py-2.5 text-[14px] font-medium transition-colors"
              style={{
                animation: `cascadeIn 0.5s ease-out ${0.15 + i * 0.03}s both`,
                border: active
                  ? "1.5px solid var(--primary)"
                  : "1.5px solid transparent",
                color: active ? "var(--primary)" : undefined,
              }}
            >
              {tile.title}
            </button>
          );
        })}
      </div>

      {answers.custom_tiles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {answers.custom_tiles.map((tile, i) => (
            <button
              key={`${tile.title}-${i}`}
              type="button"
              onClick={() =>
                setAnswers((a) => ({
                  ...a,
                  custom_tiles: a.custom_tiles.filter((_, idx) => idx !== i),
                }))
              }
              className="rounded-full glass px-4 py-2.5 text-[14px] font-medium text-primary"
              style={{ border: "1.5px solid var(--primary)" }}
            >
              {tile.title}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addCustom();
            }}
            placeholder="+ własne"
            maxLength={60}
            className="h-11 w-full rounded-xl border border-foreground/[0.08] bg-foreground/[0.06] px-[14px] text-[15px] outline-none"
          />
        </div>
        <button
          type="button"
          onClick={addCustom}
          disabled={!customTitle.trim()}
          aria-label="Dodaj własną rutynę"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground/10 disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <PrimaryButton onClick={onNext} delay={0.4}>
        Dalej
        <ChevronRight className="ml-2 h-5 w-5" />
      </PrimaryButton>
    </>
  );
}

function QuestionAnchor({
  area,
  answers,
  onPick,
  onSkip,
}: {
  area: GrowthArea;
  answers: SurveyAnswers;
  onPick: (ref: string) => void;
  onSkip: () => void;
}) {
  const level = answers.levels[area];
  const habit = level ? STARTER_HABITS[area][level] : null;
  const tiles = selectedTiles(answers);
  const current = answers.anchors[area];

  const options = [
    ...tiles.map((t) => ({ ref: tileAnchorRef(t.key), label: t.title })),
    { ref: ANCHOR_REF_WAKE_UP, label: "Rano, zaraz po wstaniu" },
    { ref: ANCHOR_REF_AFTER_WORK, label: "Po powrocie z pracy" },
  ];

  return (
    <>
      <h1
        className="mb-2 text-2xl font-extrabold leading-tight"
        style={{ animation: "cascadeIn 0.5s ease-out 0.05s both" }}
      >
        Po czym zrobisz „{habit?.title ?? ""}"?
      </h1>
      <p
        className="mb-6 text-sm text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        Nawyk doczepiony do czegoś, co już robisz, ma dużo większą szansę przetrwać.
      </p>
      <div className="flex flex-col gap-3">
        {options.map((o, i) => (
          <OptionButton
            key={o.ref}
            active={current === o.ref}
            label={o.label}
            onClick={() => onPick(o.ref)}
            delay={0.15 + i * 0.05}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="mt-6 h-10 w-full text-sm font-medium text-muted-foreground"
      >
        Bez kotwicy
      </button>
    </>
  );
}

function PreviewPlan({
  answers,
  onDone,
}: {
  answers: SurveyAnswers;
  onDone: () => void;
}) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const createPlan = useCreateStarterPlan();

  const tiles = selectedTiles(answers);
  const habits = growthHabitsFor(answers);

  const toggle = (key: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const save = async () => {
    const plan = buildStarterPlan(answers);
    const filtered = {
      maintenance: plan.maintenance.filter((m) => !excluded.has(`tile:${m.key}`)),
      growth: plan.growth.filter((g) => !excluded.has(`growth:${g.area}`)),
    };
    if (filtered.maintenance.length === 0 && filtered.growth.length === 0) {
      onDone();
      return;
    }
    setSaving(true);
    try {
      await createPlan.mutateAsync(filtered);
      onDone();
    } catch {
      toast.error("Nie udało się zapisać planu.");
      setSaving(false);
    }
  };

  const rows = [
    ...habits.map(({ area, habit }) => {
      const anchor = anchorTitleFor(answers, area);
      return {
        key: `growth:${area}`,
        title: anchor ? `${anchor}: ${habit.title}` : habit.title,
        badge: "Rozwój",
      };
    }),
    ...tiles.map((t) => ({ key: `tile:${t.key}`, title: t.title, badge: "Rutyna" })),
  ];

  return (
    <>
      <h1
        className="mb-2 text-2xl font-extrabold leading-tight"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        Tak wygląda Twój start
      </h1>
      <p
        className="mb-6 text-sm text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        Odznacz, czego nie chcesz. Zawsze możesz to zmienić później.
      </p>

      <div className="flex flex-col gap-2">
        {rows.map((row, i) => {
          const active = !excluded.has(row.key);
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => toggle(row.key)}
              className="flex items-center gap-4 rounded-3xl glass px-4 py-3 text-left transition-colors"
              style={{
                animation: `cascadeIn 0.5s ease-out ${0.15 + i * 0.04}s both`,
                border: active
                  ? "1.5px solid var(--primary)"
                  : "1.5px solid transparent",
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{row.title}</p>
                <p className="mt-0.5 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                  {row.badge}
                </p>
              </div>
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
                style={{
                  backgroundColor: active ? "var(--primary)" : "transparent",
                  border: active
                    ? "none"
                    : "1.5px solid color-mix(in oklab, var(--foreground) 20%, transparent)",
                }}
              >
                {active && (
                  <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <PrimaryButton onClick={save} disabled={saving} delay={0.4}>
        {saving ? "Zapisywanie…" : "Zatwierdź"}
      </PrimaryButton>
    </>
  );
}

function StepBlockApps({
  answers,
  setAnswers,
  onNext,
}: {
  answers: SurveyAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<SurveyAnswers>>;
  onNext: () => void;
}) {
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
        setApps([...all].sort((a, b) => a.appLabel.localeCompare(b.appLabel, "pl")));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // What the user says pulls them in decides which installed apps get pre-ticked.
  const suggested = useMemo(() => {
    const wanted = packagesForDistractions(answers.distractions);
    return apps.filter((a) => wanted.has(a.packageName));
  }, [apps, answers.distractions]);

  const visible = suggested.length > 0 ? suggested : apps.slice(0, 12);

  useEffect(() => {
    setSelected(new Set(suggested.map((a) => a.packageName)));
  }, [suggested]);

  const toggleDistraction = (d: Distraction) => {
    setAnswers((a) => ({
      ...a,
      distractions: a.distractions.includes(d)
        ? a.distractions.filter((x) => x !== d)
        : [...a.distractions, d],
    }));
  };

  const toggleApp = (pkg: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  };

  const save = async () => {
    if (selected.size === 0) {
      onNext();
      return;
    }
    setSaving(true);
    try {
      for (const app of apps.filter((a) => selected.has(a.packageName))) {
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
        Co Cię najbardziej wciąga?
      </h1>
      <p
        className="mb-4 text-sm text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        Zaznacz, a podpowiemy, co zablokować. Blokada rusza po starcie dnia.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {DISTRACTION_OPTIONS.map((o, i) => {
          const active = answers.distractions.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggleDistraction(o.value)}
              className="rounded-full glass px-4 py-2.5 text-[14px] font-medium transition-colors"
              style={{
                animation: `cascadeIn 0.5s ease-out ${0.15 + i * 0.04}s both`,
                border: active
                  ? "1.5px solid var(--primary)"
                  : "1.5px solid transparent",
                color: active ? "var(--primary)" : undefined,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {!loaded ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Ładowanie aplikacji…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl glass px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nie znaleziono aplikacji. Dodasz je później w Ustawieniach.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((app, i) => {
            const active = selected.has(app.packageName);
            return (
              <button
                key={app.packageName}
                type="button"
                onClick={() => toggleApp(app.packageName)}
                className="flex items-center gap-4 rounded-3xl glass px-4 py-3 text-left transition-colors"
                style={{
                  animation: `cascadeIn 0.5s ease-out ${0.15 + i * 0.04}s both`,
                  border: active
                    ? "1.5px solid var(--primary)"
                    : "1.5px solid transparent",
                }}
              >
                <span className="flex-1 text-[15px] font-medium">{app.appLabel}</span>
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{
                    backgroundColor: active ? "var(--primary)" : "transparent",
                    border: active
                      ? "none"
                      : "1.5px solid color-mix(in oklab, var(--foreground) 20%, transparent)",
                  }}
                >
                  {active && (
                    <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 pb-4 pt-8">
        <button
          onClick={save}
          disabled={saving}
          className="accent-gradient flex h-14 w-full items-center justify-center rounded-full text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Zapisywanie…" : selected.size > 0 ? "Zablokuj wybrane" : "Dalej"}
        </button>
        <button
          onClick={onNext}
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
        Ustawione.
      </h1>
      <p
        className="mb-10 max-w-[280px] text-[15px] leading-relaxed text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}
      >
        Rozpocznij dzień i odhacz to jedno, co robisz dla siebie. Reszta jest dodatkiem.
      </p>
      <button
        onClick={handleFinish}
        className="accent-gradient flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-full text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        style={{ animation: "cascadeIn 0.5s ease-out 0.3s both" }}
      >
        Rozpocznij dzień
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
