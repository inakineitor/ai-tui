/**
 * Command history management with persistence
 * Matches OpenCode's history implementation with JSONL storage
 */

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { HistoryEntry, PromptPart } from "./types.ts";

const MAX_HISTORY_ENTRIES = 50;
const HISTORY_FILENAME = "prompt-history.jsonl";

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
 * Load history from disk
 */
async function loadHistory(historyFile: string): Promise<HistoryEntry[]> {
  try {
    const text = await readFile(historyFile, "utf-8");
    const lines = text
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as HistoryEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is HistoryEntry => entry !== null)
      .slice(-MAX_HISTORY_ENTRIES);

    return lines;
  } catch {
    return [];
  }
}

/**
 * Save history to disk (full rewrite)
 */
async function saveHistory(
  historyFile: string,
  configDir: string,
  items: HistoryEntry[]
): Promise<void> {
  await ensureConfigDir(configDir);
  const content =
    items.length > 0
      ? `${items.map((entry) => JSON.stringify(entry)).join("\n")}\n`
      : "";
  await writeFile(historyFile, content).catch(() => {
    /* ignore */
  });
}

/**
 * Append a single entry to history file
 */
async function appendHistoryEntry(
  historyFile: string,
  configDir: string,
  entry: HistoryEntry
): Promise<void> {
  await ensureConfigDir(configDir);
  await appendFile(historyFile, `${JSON.stringify(entry)}\n`).catch(() => {
    /* ignore */
  });
}

/**
 * Create a history manager with persistence.
 *
 * @param configDir - Config directory path (required)
 */
export function createHistory(configDir: string) {
  const historyFile = join(configDir, HISTORY_FILENAME);

  let items: HistoryEntry[] = [];
  let index = 0; // 0 = current input, negative = history
  let loaded = false;

  return {
    /**
     * Load history from disk (call on mount)
     */
    async load(): Promise<void> {
      if (loaded) {
        return;
      }
      await ensureConfigDir(configDir);
      items = await loadHistory(historyFile);
      loaded = true;
    },

    /**
     * Add an item to history
     */
    async append(entry: { input: string; parts: PromptPart[] }): Promise<void> {
      // Don't add empty items
      if (!entry.input.trim()) {
        return;
      }

      // Don't add duplicate consecutive items
      const lastItem = items.at(-1);
      if (lastItem && lastItem.input === entry.input) {
        return;
      }

      const newEntry: HistoryEntry = {
        ...entry,
        timestamp: Date.now(),
      };

      items.push(newEntry);

      // Trim to max items
      let trimmed = false;
      if (items.length > MAX_HISTORY_ENTRIES) {
        items = items.slice(-MAX_HISTORY_ENTRIES);
        trimmed = true;
      }

      // Reset index
      index = 0;

      // Persist
      if (trimmed) {
        await saveHistory(historyFile, configDir, items);
      } else {
        await appendHistoryEntry(historyFile, configDir, newEntry);
      }
    },

    /**
     * Navigate history
     * @param direction -1 for previous (older), 1 for next (newer)
     * @param currentInput Current input text to compare
     * @returns The history entry or undefined if at boundary
     */
    move(direction: -1 | 1, currentInput: string): HistoryEntry | undefined {
      if (items.length === 0) {
        return;
      }

      // Get current entry to compare (index is negative, so items.at(index) gives the current entry)
      const currentEntry = index < 0 ? items.at(index) : undefined;
      if (
        currentEntry &&
        currentEntry.input !== currentInput &&
        currentInput.length > 0
      ) {
        // User modified the input, don't navigate
        return;
      }

      const nextIndex = index + direction;

      // Check boundaries
      // index 0 = current (empty), index -1 = most recent history, etc.
      if (Math.abs(nextIndex) > items.length) {
        return;
      }
      if (nextIndex > 0) {
        return;
      }

      index = nextIndex;

      // Return empty prompt info when at index 0
      if (index === 0) {
        return { input: "", parts: [] };
      }

      // Return history entry (index -1 = last item, -2 = second to last, etc.)
      return items.at(index);
    },

    /**
     * Reset navigation state
     */
    reset(): void {
      index = 0;
    },

    /**
     * Get all history items
     */
    getItems(): HistoryEntry[] {
      return [...items];
    },

    /**
     * Get current navigation index
     */
    getIndex(): number {
      return index;
    },

    /**
     * Check if history is loaded
     */
    isLoaded(): boolean {
      return loaded;
    },
  };
}

export type History = ReturnType<typeof createHistory>;
