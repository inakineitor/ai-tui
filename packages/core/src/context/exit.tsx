import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useRef,
} from "react";

import { useRenderer } from "@opentui/react";

export type CleanupFn = () => Promise<void> | void;

export type ExitContextValue = {
  registerCleanup: (fn: CleanupFn) => () => void;
  exit: (code?: number) => Promise<void>;
};

type ExitProviderProps = {
  children: ReactNode;
};

const ExitContext = createContext<ExitContextValue | null>(null);

export function ExitProvider({ children }: ExitProviderProps) {
  const cleanupFns = useRef<Set<CleanupFn>>(new Set());
  const exitTaskRef = useRef<Promise<void> | undefined>(undefined);
  const renderer = useRenderer();

  const registerCleanup = useCallback((fn: CleanupFn) => {
    cleanupFns.current.add(fn);
    return () => {
      cleanupFns.current.delete(fn);
    };
  }, []);

  const exit = useCallback(
    (code = 0): Promise<void> => {
      if (exitTaskRef.current) {
        return exitTaskRef.current;
      }
      exitTaskRef.current = (async () => {
        const fns = Array.from(cleanupFns.current);
        await Promise.all(fns.map((fn) => fn()));
        renderer.setTerminalTitle?.("");
        renderer.destroy();
        process.exit(code);
      })();
      return exitTaskRef.current;
    },
    [renderer]
  );

  return (
    <ExitContext.Provider value={{ registerCleanup, exit }}>
      {children}
    </ExitContext.Provider>
  );
}

export function useExit(): ExitContextValue {
  const context = useContext(ExitContext);
  if (!context) {
    throw new Error("useExit must be used within an ExitProvider");
  }
  return context;
}
