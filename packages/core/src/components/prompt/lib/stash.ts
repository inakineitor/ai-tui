/**
 * Stash utility for temporarily saving and restoring prompt drafts
 * Matches OpenCode's stash implementation with persistence
 */

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { PromptPart, StashEntry } from "./types.js";

const MAX_STASH_ENTRIES = 50;
const STASH_FILENAME = "prompt-stash.jsonl";

/**
 * Ensure config directory exists
 */
async function ensureConfigDir(configDir: string): Promise<void> {
  try {
    await mkdir(configDir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

/**
 * Load stash entries from disk
 */
async function loadStash(stashFile: string): Promise<StashEntry[]> {
  try {
    const text = await readFile(stashFile, "utf-8");
    const lines = text
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as StashEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is StashEntry => entry !== null)
      .slice(-MAX_STASH_ENTRIES);

    return lines;
  } catch {
    return [];
  }
}

/**
 * Save all stash entries to disk
 */
async function saveStash(
  stashFile: string,
  configDir: string,
  entries: StashEntry[]
): Promise<void> {
  await ensureConfigDir(configDir);
  const content =
    entries.length > 0
      ? `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`
      : "";
  await writeFile(stashFile, content).catch(() => {
    /* ignore */
  });
}

/**
 * Append a single stash entry
 */
async function appendStashEntry(
  stashFile: string,
  configDir: string,
  entry: StashEntry
): Promise<void> {
  await ensureConfigDir(configDir);
  await appendFile(stashFile, `${JSON.stringify(entry)}\n`).catch(() => {
    /* ignore */
  });
}

/**
 * Create a stash manager with persistence.
 *
 * @param configDir - Config directory path (required)
 */
export function createStash(configDir: string) {
  const stashFile = join(configDir, STASH_FILENAME);

  let entries: StashEntry[] = [];
  let loaded = false;

  return {
    /**
     * Load stash from disk (call on mount)
     */
    async load(): Promise<void> {
      if (loaded) {
        return;
      }
      await ensureConfigDir(configDir);
      entries = await loadStash(stashFile);
      loaded = true;
    },

    /**
     * Get all stashed entries
     */
    list(): StashEntry[] {
      return [...entries];
    },

    /**
     * Push a new entry to the stash
     */
    async push(entry: { input: string; parts: PromptPart[] }): Promise<void> {
      if (!entry.input.trim()) {
        return;
      }

      const stashEntry: StashEntry = {
        input: entry.input,
        parts: [...entry.parts],
        timestamp: Date.now(),
      };

      entries.push(stashEntry);

      // Trim to max entries
      let trimmed = false;
      if (entries.length > MAX_STASH_ENTRIES) {
        entries = entries.slice(-MAX_STASH_ENTRIES);
        trimmed = true;
      }

      // Persist
      if (trimmed) {
        await saveStash(stashFile, configDir, entries);
      } else {
        await appendStashEntry(stashFile, configDir, stashEntry);
      }
    },

    /**
     * Pop the most recent stash entry
     */
    async pop(): Promise<StashEntry | undefined> {
      if (entries.length === 0) {
        return;
      }

      const entry = entries.pop();
      await saveStash(stashFile, configDir, entries);
      return entry;
    },

    /**
     * Remove a specific entry by index
     */
    async remove(index: number): Promise<void> {
      if (index < 0 || index >= entries.length) {
        return;
      }

      entries.splice(index, 1);
      await saveStash(stashFile, configDir, entries);
    },

    /**
     * Check if there are any stashed entries
     */
    hasEntries(): boolean {
      return entries.length > 0;
    },

    /**
     * Get the number of stashed entries
     */
    count(): number {
      return entries.length;
    },

    /**
     * Clear all stashed entries
     */
    async clear(): Promise<void> {
      entries = [];
      await saveStash(stashFile, configDir, entries);
    },

    /**
     * Check if stash is loaded
     */
    isLoaded(): boolean {
      return loaded;
    },
  };
}

export type Stash = ReturnType<typeof createStash>;
