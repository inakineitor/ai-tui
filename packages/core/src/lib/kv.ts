import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Listener<T> = (value: T) => void;

export type KVStore = {
  load(): Promise<void>;
  get<T>(key: string, defaultValue?: T): T;
  set<T>(key: string, value: T): Promise<void>;
  del(key: string): Promise<void>;
  subscribe<T>(key: string, listener: Listener<T>): () => void;
  isLoaded(): boolean;
  getConfigPath(): string;
  getDataPath(): string;
};

/**
 * Create a KV store instance with explicit paths.
 *
 * @param configDir - Full path to config directory
 * @param dataDir - Full path to data directory
 */
export function createKV(configDir: string, dataDir: string): KVStore {
  const KV_FILE = join(dataDir, "kv.json");

  let store: Record<string, unknown> = {};
  let loaded = false;
  const listeners = new Map<string, Set<Listener<unknown>>>();

  function notifyListeners<T>(key: string, value: T): void {
    const keyListeners = listeners.get(key);
    if (keyListeners) {
      for (const listener of keyListeners) {
        listener(value);
      }
    }
  }

  async function ensureDir(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  async function persist(): Promise<void> {
    try {
      await ensureDir(dataDir);
      await writeFile(KV_FILE, JSON.stringify(store, null, 2));
    } catch {
      /* persistence is best-effort */
    }
  }

  return {
    async load(): Promise<void> {
      if (loaded) {
        return;
      }
      try {
        await ensureDir(dataDir);
        const text = await readFile(KV_FILE, "utf-8");
        store = JSON.parse(text);
      } catch {
        store = {};
      }
      loaded = true;
    },

    get<T>(key: string, defaultValue?: T): T {
      const value = store[key];
      if (value === undefined) {
        return defaultValue as T;
      }
      return value as T;
    },

    async set<T>(key: string, value: T): Promise<void> {
      store[key] = value;
      notifyListeners(key, value);
      await persist();
    },

    async del(key: string): Promise<void> {
      delete store[key];
      notifyListeners(key, undefined);
      await persist();
    },

    subscribe<T>(key: string, listener: Listener<T>): () => void {
      let keyListeners = listeners.get(key);
      if (!keyListeners) {
        keyListeners = new Set();
        listeners.set(key, keyListeners);
      }
      keyListeners.add(listener as Listener<unknown>);

      return () => {
        keyListeners?.delete(listener as Listener<unknown>);
        if (keyListeners?.size === 0) {
          listeners.delete(key);
        }
      };
    },

    isLoaded(): boolean {
      return loaded;
    },

    getConfigPath(): string {
      return configDir;
    },

    getDataPath(): string {
      return dataDir;
    },
  };
}
