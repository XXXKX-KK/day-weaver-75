import { createContext, useContext, type ReactNode } from "react";

type OnboardingCtx = {
  restartCoachmark: () => void;
  restartSurvey: () => void;
};

const Ctx = createContext<OnboardingCtx>({
  restartCoachmark: () => {},
  restartSurvey: () => {},
});

export function OnboardingProvider({
  children,
  restartCoachmark,
  restartSurvey,
}: {
  children: ReactNode;
  restartCoachmark: () => void;
  restartSurvey: () => void;
}) {
  return <Ctx value={{ restartCoachmark, restartSurvey }}>{children}</Ctx>;
}

export function useOnboarding() {
  return useContext(Ctx);
}
