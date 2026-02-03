/**
 * Prompt Context Providers
 *
 * Provides React context for prompt-related state that needs to be shared
 * across components (history, frecency, stash).
 *
 * Note: The Prompt component uses singleton instances internally for
 * persistence. These contexts are optional and primarily useful for:
 * - Accessing history/stash from other components
 * - Building command dialogs that interact with prompt state
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type FrecencyTracker,
  createFrecencyTracker,
} from "#components/prompt/lib/frecency.js";
import { type History, createHistory } from "#components/prompt/lib/history.js";
import { type Stash, createStash } from "#components/prompt/lib/stash.js";
import type { HistoryEntry, StashEntry } from "#components/prompt/lib/types.js";
import { useKV } from "#context/kv.js";

// =============================================================================
// History Context
// =============================================================================

type HistoryContextValue = {
  history: History;
  items: HistoryEntry[];
  isLoaded: boolean;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

type HistoryProviderProps = {
  children: ReactNode;
};

export function HistoryProvider({ children }: HistoryProviderProps) {
  const kv = useKV();
  const configDir = kv.getConfigPath();

  // Create history instance once per configDir
  const historyRef = useRef<History | null>(null);
  if (!historyRef.current) {
    historyRef.current = createHistory(configDir);
  }
  const historyInstance = historyRef.current;

  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      await historyInstance.load();
      setItems(historyInstance.getItems());
      setIsLoaded(true);
    };
    load();
  }, [historyInstance]);

  // Refresh items when they might have changed
  const _refreshItems = useCallback(() => {
    setItems(historyInstance.getItems());
  }, [historyInstance]);

  const value = useMemo<HistoryContextValue>(
    () => ({
      history: historyInstance,
      items,
      isLoaded,
    }),
    [historyInstance, items, isLoaded]
  );

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    throw new Error("useHistory must be used within a HistoryProvider");
  }
  return ctx;
}

// =============================================================================
// Frecency Context
// =============================================================================

type FrecencyContextValue = {
  frecency: FrecencyTracker;
  isLoaded: boolean;
};

const FrecencyContext = createContext<FrecencyContextValue | null>(null);

type FrecencyProviderProps = {
  children: ReactNode;
};

export function FrecencyProvider({ children }: FrecencyProviderProps) {
  const kv = useKV();
  const configDir = kv.getConfigPath();

  // Create frecency instance once per configDir
  const frecencyRef = useRef<FrecencyTracker | null>(null);
  if (!frecencyRef.current) {
    frecencyRef.current = createFrecencyTracker(configDir);
  }
  const frecencyInstance = frecencyRef.current;

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      await frecencyInstance.load();
      setIsLoaded(true);
    };
    load();
  }, [frecencyInstance]);

  const value = useMemo<FrecencyContextValue>(
    () => ({
      frecency: frecencyInstance,
      isLoaded,
    }),
    [frecencyInstance, isLoaded]
  );

  return (
    <FrecencyContext.Provider value={value}>
      {children}
    </FrecencyContext.Provider>
  );
}

export function useFrecency(): FrecencyContextValue {
  const ctx = useContext(FrecencyContext);
  if (!ctx) {
    throw new Error("useFrecency must be used within a FrecencyProvider");
  }
  return ctx;
}

// =============================================================================
// Stash Context
// =============================================================================

type StashContextValue = {
  stash: Stash;
  entries: StashEntry[];
  isLoaded: boolean;
  refresh: () => void;
};

const StashContext = createContext<StashContextValue | null>(null);

type StashProviderProps = {
  children: ReactNode;
};

export function StashProvider({ children }: StashProviderProps) {
  const kv = useKV();
  const configDir = kv.getConfigPath();

  // Create stash instance once per configDir
  const stashRef = useRef<Stash | null>(null);
  if (!stashRef.current) {
    stashRef.current = createStash(configDir);
  }
  const stashInstance = stashRef.current;

  const [entries, setEntries] = useState<StashEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      await stashInstance.load();
      setEntries(stashInstance.list());
      setIsLoaded(true);
    };
    load();
  }, [stashInstance]);

  const refresh = useCallback(() => {
    setEntries(stashInstance.list());
  }, [stashInstance]);

  const value = useMemo<StashContextValue>(
    () => ({
      stash: stashInstance,
      entries,
      isLoaded,
      refresh,
    }),
    [stashInstance, entries, isLoaded, refresh]
  );

  return (
    <StashContext.Provider value={value}>{children}</StashContext.Provider>
  );
}

export function useStash(): StashContextValue {
  const ctx = useContext(StashContext);
  if (!ctx) {
    throw new Error("useStash must be used within a StashProvider");
  }
  return ctx;
}

// =============================================================================
// Combined Provider
// =============================================================================

type PromptProviderProps = {
  children: ReactNode;
};

/**
 * Combined provider for all prompt-related contexts.
 * Use this at the app root for convenience.
 * Must be used within a KVProvider.
 */
export function PromptProvider({ children }: PromptProviderProps) {
  return (
    <HistoryProvider>
      <FrecencyProvider>
        <StashProvider>{children}</StashProvider>
      </FrecencyProvider>
    </HistoryProvider>
  );
}
