import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type NavReadyContextValue = {
  ready: boolean;
  markReady: () => void;
};

const NavReadyContext = createContext<NavReadyContextValue>({ ready: false, markReady: () => {} });

export function NavReadyProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const called = useRef(false);
  const markReady = useCallback(() => {
    if (called.current) return;
    called.current = true;
    setReady(true);
  }, []);

  return (
    <NavReadyContext.Provider value={{ ready, markReady }}>
      {children}
    </NavReadyContext.Provider>
  );
}

export function useNavReady() {
  return useContext(NavReadyContext);
}
