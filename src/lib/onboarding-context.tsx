import { createContext, useContext, type ReactNode } from "react";

type OnboardingCtx = { restartCoachmark: () => void };

const Ctx = createContext<OnboardingCtx>({ restartCoachmark: () => {} });

export function OnboardingProvider({
  children,
  restartCoachmark,
}: {
  children: ReactNode;
  restartCoachmark: () => void;
}) {
  return <Ctx value={{ restartCoachmark }}>{children}</Ctx>;
}

export function useOnboarding() {
  return useContext(Ctx);
}
