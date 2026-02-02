/**
 * Frecency tracking with persistence
 * Combines frequency + recency for ranking file suggestions
 * Matches OpenCode's frecency implementation
 */

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { FrecencyEntry } from "./types.ts";

const MAX_FRECENCY_ENTRIES = 1000;
const FRECENCY_FILENAME = "frecency.jsonl";

/**
 * Calculate frecency score using weighted decay formula
 * Score = frequency * weight, where weight decreases over time
 */
function calculateFrecency(entry?: FrecencyEntry): number {
  if (!entry) {
    return 0;
  }
  const daysSince = (Date.now() - entry.lastOpen) / 86_400_000; // ms per day
  const weight = 1 / (1 + daysSince);
  return entry.frequency * weight;
}

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
 * Load frecency data from disk
 */
async function loadFrecency(
  frecencyFile: string
): Promise<Map<string, FrecencyEntry>> {
  try {
    const text = await readFile(frecencyFile, "utf-8");
    const lines = text
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as FrecencyEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is FrecencyEntry => entry !== null);

    // Keep only the latest entry for each path (last one wins)
    const latest = new Map<string, FrecencyEntry>();
    for (const entry of lines) {
      latest.set(entry.path, entry);
    }

    // Sort by lastOpen and keep only top entries
    const sorted = Array.from(latest.values())
      .sort((a, b) => b.lastOpen - a.lastOpen)
      .slice(0, MAX_FRECENCY_ENTRIES);

    return new Map(sorted.map((entry) => [entry.path, entry]));
  } catch {
    return new Map();
  }
}

/**
 * Save all frecency data to disk (compact rewrite)
 */
async function saveFrecency(
  frecencyFile: string,
  configDir: string,
  data: Map<string, FrecencyEntry>
): Promise<void> {
  await ensureConfigDir(configDir);
  const entries = Array.from(data.values());
  const content =
    entries.length > 0
      ? `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`
      : "";
  await writeFile(frecencyFile, content).catch(() => {
    /* ignore */
  });
}

/**
 * Append a single frecency entry
 */
async function appendFrecencyEntry(
  frecencyFile: string,
  configDir: string,
  entry: FrecencyEntry
): Promise<void> {
  await ensureConfigDir(configDir);
  await appendFile(frecencyFile, `${JSON.stringify(entry)}\n`).catch(() => {
    /* ignore */
  });
}

/**
 * Create a frecency tracker with persistence.
 *
 * @param configDir - Config directory path (required)
 */
export function createFrecencyTracker(configDir: string) {
  const frecencyFile = join(configDir, FRECENCY_FILENAME);

  let data = new Map<string, FrecencyEntry>();
  let loaded = false;

  return {
    /**
     * Load frecency data from disk (call on mount)
     */
    async load(): Promise<void> {
      if (loaded) {
        return;
      }
      await ensureConfigDir(configDir);
      data = await loadFrecency(frecencyFile);
      loaded = true;
    },

    /**
     * Get frecency score for a file path
     */
    getFrecency(filePath: string): number {
      const absolutePath = resolve(process.cwd(), filePath);
      return calculateFrecency(data.get(absolutePath));
    },

    /**
     * Update frecency when a file is selected
     */
    async updateFrecency(filePath: string): Promise<void> {
      const absolutePath = resolve(process.cwd(), filePath);
      const existing = data.get(absolutePath);

      const newEntry: FrecencyEntry = {
        path: absolutePath,
        frequency: (existing?.frequency ?? 0) + 1,
        lastOpen: Date.now(),
      };

      data.set(absolutePath, newEntry);

      // Compact if over limit
      if (data.size > MAX_FRECENCY_ENTRIES) {
        const sorted = Array.from(data.entries())
          .sort(([, a], [, b]) => b.lastOpen - a.lastOpen)
          .slice(0, MAX_FRECENCY_ENTRIES);
        data = new Map(sorted);
        await saveFrecency(frecencyFile, configDir, data);
      } else {
        await appendFrecencyEntry(frecencyFile, configDir, newEntry);
      }
    },

    /**
     * Sort items by frecency score (highest first)
     */
    sortByFrecency<T>(items: T[], getPath: (item: T) => string): T[] {
      return [...items].sort((a, b) => {
        const scoreA = this.getFrecency(getPath(a));
        const scoreB = this.getFrecency(getPath(b));
        return scoreB - scoreA;
      });
    },

    /**
     * Get all tracked data
     */
    getData(): Map<string, FrecencyEntry> {
      return new Map(data);
    },

    /**
     * Check if data is loaded
     */
    isLoaded(): boolean {
      return loaded;
    },
  };
}

export type FrecencyTracker = ReturnType<typeof createFrecencyTracker>;
