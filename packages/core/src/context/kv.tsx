import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

import type { KVStore } from "#lib/kv.js";

const KVContext = createContext<KVStore | null>(null);

type KVProviderProps = {
  children: ReactNode;
  value: KVStore;
};

/**
 * Provider component for the KV store.
 * Should wrap the app at the root level.
 */
export function KVProvider({ children, value }: KVProviderProps) {
  return <KVContext.Provider value={value}>{children}</KVContext.Provider>;
}

/**
 * Hook to access the KV store.
 * @throws Error if used outside of KVProvider
 */
export function useKV(): KVStore {
  const ctx = useContext(KVContext);
  if (!ctx) {
    throw new Error("useKV must be used within a KVProvider");
  }
  return ctx;
}

/**
 * A reactive hook that syncs state with the KV store.
 * Similar to useState but persisted and shared across all components using the same key.
 *
 * @param key - The KV store key
 * @param defaultValue - Default value if key doesn't exist
 * @returns A tuple of [value, setValue] like useState
 *
 * @example
 * const [showTimestamps, setShowTimestamps] = useKVSignal("showTimestamps", false);
 */
export function useKVSignal<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const kv = useKV();

  // Use useSyncExternalStore for proper React 18 concurrent mode support
  const subscribe = useCallback(
    (onStoreChange: () => void) => kv.subscribe<T>(key, onStoreChange),
    [kv, key]
  );

  const getSnapshot = useCallback(
    () => kv.get<T>(key, defaultValue),
    [kv, key, defaultValue]
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      const currentValue = kv.get<T>(key, defaultValue);
      const newValue =
        typeof action === "function"
          ? (action as (prev: T) => T)(currentValue)
          : action;

      // Fire and forget - persistence is best-effort
      kv.set(key, newValue).catch(() => {
        // Silently ignore persistence errors
      });
    },
    [kv, key, defaultValue]
  );

  return [value, setValue];
}
