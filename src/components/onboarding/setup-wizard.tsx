import { useEffect, useState } from "react";
import "../../today.css";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, ChevronLeft, Sunrise, Brain, Moon, Sparkles, ListChecks } from "lucide-react";
import { TenaxLogo } from "@/components/tenax-logo";
import { useAddRoutine, type NewRoutineInput } from "@/lib/routines";
import { isNativeBlocker, Blocker, type InstalledApp } from "@/lib/blocker";
import { useSetAppBlocked } from "@/lib/blocked-apps";
import { toast } from "sonner";
import {
  type SurveyAnswers,
  type WakeUp,
  type WorkType,
  type FocusCount,
  type Goal,
  DEFAULT_ANSWERS,
  WAKE_OPTIONS,
  WORK_OPTIONS,
  GOAL_OPTIONS,
  generateRoutines,
} from "@/lib/day-survey";

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
    description: "Wycisz telefon i pracuj w skupieniu",
    input: {
      title: "Głęboka praca",
      priority: "high",
      weekdays: [1, 2, 3, 4, 5],
      subtasks: ["Wycisz powiadomienia", "Włącz Skupienie", "Blok pracy bez telefonu"],
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
    <div className="overlay-bg fixed inset-0 z-50 flex flex-col">
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
        <TenaxLogo size={40} />
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
  const [path, setPath] = useState<"choose" | "survey" | "manual">("choose");
  const [surveyStep, setSurveyStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({ ...DEFAULT_ANSWERS });
  const [generated, setGenerated] = useState<NewRoutineInput[]>([]);
  const [selectedGen, setSelectedGen] = useState<Set<number>>(new Set());

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
    if (selected.size === 0) { onSkip(); return; }
    setSaving(true);
    try {
      const templates = ROUTINE_TEMPLATES.filter((t) => selected.has(t.id));
      for (const t of templates) await addRoutine.mutateAsync(t.input);
      onNext();
    } catch {
      toast.error("Nie udało się dodać rutyn.");
      setSaving(false);
    }
  };

  const handleSaveGenerated = async () => {
    const toSave = generated.filter((_, i) => selectedGen.has(i));
    if (toSave.length === 0) { onSkip(); return; }
    setSaving(true);
    try {
      for (const r of toSave) await addRoutine.mutateAsync(r);
      onNext();
    } catch {
      toast.error("Nie udało się dodać rutyn.");
      setSaving(false);
    }
  };

  const finishSurvey = () => {
    const routines = generateRoutines(answers);
    setGenerated(routines);
    setSelectedGen(new Set(routines.map((_, i) => i)));
    setPath("survey");
    setSurveyStep(SURVEY_QUESTIONS_COUNT);
  };

  const hasFixedHours = answers.workType !== "free";
  const totalSurveySteps = hasFixedHours ? 5 : 4;

  if (path === "choose") {
    return (
      <div className="flex flex-1 flex-col pt-8">
        <h1
          className="mb-2 text-2xl font-extrabold leading-tight"
          style={{ animation: "cascadeIn 0.5s ease-out both" }}
        >
          Jak chcesz zacząć?
        </h1>
        <p
          className="mb-6 text-sm text-muted-foreground"
          style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
        >
          Możemy ułożyć Ci dzień albo sam wybierzesz rutyny.
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => { setPath("survey"); setSurveyStep(0); }}
            className="flex items-center gap-4 rounded-3xl bg-foreground/5 px-4 py-4 text-left"
            style={{
              animation: "cascadeIn 0.5s ease-out 0.15s both",
              border: "1.5px solid var(--primary)",
            }}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "color-mix(in oklab, var(--primary) 15%, transparent)" }}
            >
              <Sparkles className="h-5 w-5" style={{ color: "var(--primary)" }} />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-semibold">Ułóż mi dzień</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                5 pytań — zero pisania
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => setPath("manual")}
            className="flex items-center gap-4 rounded-3xl bg-foreground/5 px-4 py-4 text-left"
            style={{
              animation: "cascadeIn 0.5s ease-out 0.21s both",
              border: "1.5px solid transparent",
            }}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "color-mix(in oklab, var(--foreground) 5%, transparent)" }}
            >
              <ListChecks className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-semibold">Wybiorę sam</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Gotowe szablony rutyn
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="mt-auto pb-4 pt-8">
          <button
            onClick={onSkip}
            className="h-10 w-full text-sm font-medium text-muted-foreground"
            type="button"
          >
            Pomiń
          </button>
        </div>
      </div>
    );
  }

  if (path === "manual") {
    return (
      <div className="flex flex-1 flex-col pt-8">
        <button
          type="button"
          onClick={() => setPath("choose")}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Wróć
        </button>
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
            Pomiń
          </button>
        </div>
      </div>
    );
  }

  // ── Survey path ──
  if (surveyStep < SURVEY_QUESTIONS_COUNT) {
    const effectiveStep = getEffectiveSurveyStep(surveyStep, hasFixedHours);
    return (
      <SurveyQuestion
        questionIndex={effectiveStep}
        answers={answers}
        setAnswers={setAnswers}
        onNext={() => {
          const nextRaw = surveyStep + 1;
          if (nextRaw >= totalSurveySteps) {
            finishSurvey();
          } else {
            setSurveyStep(nextRaw);
          }
        }}
        onBack={() => {
          if (surveyStep === 0) { setPath("choose"); }
          else setSurveyStep(surveyStep - 1);
        }}
        onSkip={onSkip}
        currentStep={surveyStep + 1}
        totalSteps={totalSurveySteps}
      />
    );
  }

  // ── Preview generated routines ──
  const toggleGen = (idx: number) => {
    setSelectedGen((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="flex flex-1 flex-col pt-8">
      <button
        type="button"
        onClick={() => setSurveyStep(totalSurveySteps - 1)}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Wróć
      </button>
      <h1
        className="mb-2 text-2xl font-extrabold leading-tight"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        Twój plan dnia
      </h1>
      <p
        className="mb-6 text-sm text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        Odznacz to, czego nie chcesz — resztę dodamy za Ciebie.
      </p>

      <div className="flex flex-col gap-2">
        {generated.map((r, i) => {
          const active = selectedGen.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggleGen(i)}
              className="flex items-center gap-4 rounded-3xl bg-foreground/5 px-4 py-3 text-left transition-colors"
              style={{
                animation: `cascadeIn 0.5s ease-out ${0.1 + i * 0.04}s both`,
                border: active ? "1.5px solid var(--primary)" : "1.5px solid transparent",
              }}
            >
              <div className="flex-1">
                <p className="text-[15px] font-semibold">{r.title}</p>
                {r.scheduled_time && (
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{r.scheduled_time}</p>
                )}
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
          onClick={handleSaveGenerated}
          disabled={saving}
          className="accent-gradient flex h-14 w-full items-center justify-center rounded-3xl text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Dodawanie…" : selectedGen.size > 0 ? `Dodaj ${selectedGen.size} rutyn` : "Kontynuuj"}
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

const SURVEY_QUESTIONS_COUNT = 5;

function getEffectiveSurveyStep(rawStep: number, hasFixedHours: boolean): number {
  // Q0=wake, Q1=workType, Q2=workHours (skipped if free), Q3=focus, Q4=goals
  if (!hasFixedHours && rawStep >= 2) return rawStep + 1;
  return rawStep;
}

function SurveyQuestion({
  questionIndex,
  answers,
  setAnswers,
  onNext,
  onBack,
  onSkip,
  currentStep,
  totalSteps,
}: {
  questionIndex: number;
  answers: SurveyAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<SurveyAnswers>>;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex flex-1 flex-col pt-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Wróć
      </button>

      <p
        className="mb-2 text-xs font-medium text-muted-foreground"
        style={{ animation: "cascadeIn 0.5s ease-out both" }}
      >
        {currentStep} z {totalSteps}
      </p>

      {questionIndex === 0 && (
        <SurveyWakeUp value={answers.wakeUp} onChange={(v) => { setAnswers((a) => ({ ...a, wakeUp: v })); onNext(); }} />
      )}
      {questionIndex === 1 && (
        <SurveyWorkType value={answers.workType} onChange={(v) => { setAnswers((a) => ({ ...a, workType: v })); onNext(); }} />
      )}
      {questionIndex === 2 && (
        <SurveyWorkHours
          start={answers.workStart}
          end={answers.workEnd}
          onChange={(s, e) => setAnswers((a) => ({ ...a, workStart: s, workEnd: e }))}
          onNext={onNext}
        />
      )}
      {questionIndex === 3 && (
        <SurveyFocusCount value={answers.focusCount} onChange={(v) => { setAnswers((a) => ({ ...a, focusCount: v })); onNext(); }} />
      )}
      {questionIndex === 4 && (
        <SurveyGoals value={answers.goals} onChange={(v) => setAnswers((a) => ({ ...a, goals: v }))} onNext={onNext} />
      )}

      <div className="mt-auto pb-4 pt-8">
        <button onClick={onSkip} className="h-10 w-full text-sm font-medium text-muted-foreground" type="button">
          Pomiń
        </button>
      </div>
    </div>
  );
}

function OptionButton({ active, label, onClick, delay }: { active: boolean; label: string; onClick: () => void; delay: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 rounded-3xl bg-foreground/5 px-4 py-4 text-left transition-colors"
      style={{
        animation: `cascadeIn 0.5s ease-out ${delay}s both`,
        border: active ? "1.5px solid var(--primary)" : "1.5px solid transparent",
      }}
    >
      <span className="flex-1 text-[15px] font-semibold">{label}</span>
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
}

function SurveyWakeUp({ value, onChange }: { value: WakeUp; onChange: (v: WakeUp) => void }) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold leading-tight" style={{ animation: "cascadeIn 0.5s ease-out 0.05s both" }}>
        O której wstajesz?
      </h1>
      <div className="flex flex-col gap-3">
        {WAKE_OPTIONS.map((o, i) => (
          <OptionButton key={o.value} active={value === o.value} label={o.label} onClick={() => onChange(o.value)} delay={0.1 + i * 0.06} />
        ))}
      </div>
    </>
  );
}

function SurveyWorkType({ value, onChange }: { value: WorkType; onChange: (v: WorkType) => void }) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold leading-tight" style={{ animation: "cascadeIn 0.5s ease-out 0.05s both" }}>
        Czym się zajmujesz?
      </h1>
      <div className="flex flex-col gap-3">
        {WORK_OPTIONS.map((o, i) => (
          <OptionButton key={o.value} active={value === o.value} label={o.label} onClick={() => onChange(o.value)} delay={0.1 + i * 0.06} />
        ))}
      </div>
    </>
  );
}

function SurveyWorkHours({
  start,
  end,
  onChange,
  onNext,
}: {
  start: string;
  end: string;
  onChange: (s: string, e: string) => void;
  onNext: () => void;
}) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold leading-tight" style={{ animation: "cascadeIn 0.5s ease-out 0.05s both" }}>
        Godziny pracy
      </h1>
      <div
        className="flex items-center gap-4 rounded-3xl bg-foreground/5 px-5 py-5"
        style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}
      >
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground">Od</span>
          <input
            type="time"
            value={start}
            onChange={(e) => onChange(e.target.value, end)}
            className="w-full rounded-2xl bg-foreground/5 px-3 py-2 text-center text-lg font-bold"
          />
        </div>
        <span className="mt-4 text-muted-foreground">—</span>
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground">Do</span>
          <input
            type="time"
            value={end}
            onChange={(e) => onChange(start, e.target.value)}
            className="w-full rounded-2xl bg-foreground/5 px-3 py-2 text-center text-lg font-bold"
          />
        </div>
      </div>
      <button
        onClick={onNext}
        className="accent-gradient mt-6 flex h-14 w-full items-center justify-center rounded-3xl text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        style={{ animation: "cascadeIn 0.5s ease-out 0.2s both" }}
      >
        Dalej
        <ChevronRight className="ml-2 h-5 w-5" />
      </button>
    </>
  );
}

function SurveyFocusCount({ value, onChange }: { value: FocusCount; onChange: (v: FocusCount) => void }) {
  const options: { value: FocusCount; label: string }[] = [
    { value: 1, label: "1 blok" },
    { value: 2, label: "2 bloki" },
    { value: 3, label: "3 bloki" },
  ];
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold leading-tight" style={{ animation: "cascadeIn 0.5s ease-out 0.05s both" }}>
        Ile bloków głębokiej pracy?
      </h1>
      <div className="flex flex-col gap-3">
        {options.map((o, i) => (
          <OptionButton key={o.value} active={value === o.value} label={o.label} onClick={() => onChange(o.value)} delay={0.1 + i * 0.06} />
        ))}
      </div>
    </>
  );
}

function SurveyGoals({
  value,
  onChange,
  onNext,
}: {
  value: Goal[];
  onChange: (v: Goal[]) => void;
  onNext: () => void;
}) {
  const toggleGoal = (g: Goal) => {
    if (value.includes(g)) {
      onChange(value.filter((v) => v !== g));
    } else if (value.length < 2) {
      onChange([...value, g]);
    }
  };

  return (
    <>
      <h1 className="mb-2 text-2xl font-extrabold leading-tight" style={{ animation: "cascadeIn 0.5s ease-out 0.05s both" }}>
        Co jeszcze chcesz ogarnąć?
      </h1>
      <p className="mb-6 text-sm text-muted-foreground" style={{ animation: "cascadeIn 0.5s ease-out 0.1s both" }}>
        Wybierz maks. 2 — albo pomiń.
      </p>
      <div className="flex flex-col gap-3">
        {GOAL_OPTIONS.map((o, i) => (
          <OptionButton
            key={o.value}
            active={value.includes(o.value)}
            label={o.label}
            onClick={() => toggleGoal(o.value)}
            delay={0.15 + i * 0.06}
          />
        ))}
      </div>
      <button
        onClick={onNext}
        className="accent-gradient mt-6 flex h-14 w-full items-center justify-center rounded-3xl text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        style={{ animation: "cascadeIn 0.5s ease-out 0.4s both" }}
      >
        Gotowe
        <ChevronRight className="ml-2 h-5 w-5" />
      </button>
    </>
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
