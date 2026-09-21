import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface NavReadyCtx {
  ready: boolean;
  markReady: () => void;
}

const Ctx = createContext<NavReadyCtx>({ ready: false, markReady: () => {} });

export function NavReadyProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const called = useRef(false);
  const markReady = useCallback(() => {
    if (called.current) return;
    called.current = true;
    setReady(true);
  }, []);
  return <Ctx.Provider value={{ ready, markReady }}>{children}</Ctx.Provider>;
}

export function useNavReady() {
  return useContext(Ctx);
}
