import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type TranscriptEntry = {
  timestamp: number;
  type: "user" | "assistant" | "tool" | "system" | "error";
  content: string;
  metadata?: Record<string, unknown>;
};

export type Transcript = {
  sessionId: string;
  entries: TranscriptEntry[];
  startedAt: number;
  endedAt?: number;
};

export type TranscriptManager = {
  append(sessionId: string, entry: TranscriptEntry): Promise<void>;
  read(sessionId: string): Promise<TranscriptEntry[]>;
  clear(sessionId: string): Promise<void>;
  formatEntry(entry: TranscriptEntry): string;
  exportMarkdown(sessionId: string): Promise<string>;
};

/**
 * Create a transcript manager with explicit data directory.
 *
 * @param dataDir - Full path to data directory
 */
export function createTranscript(dataDir: string): TranscriptManager {
  function getTranscriptsDir(): string {
    return join(dataDir, "transcripts");
  }

  function getTranscriptPath(sessionId: string): string {
    return join(getTranscriptsDir(), `${sessionId}.jsonl`);
  }

  async function ensureTranscriptsDir(): Promise<void> {
    const dir = getTranscriptsDir();
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  const manager: TranscriptManager = {
    async append(sessionId: string, entry: TranscriptEntry): Promise<void> {
      try {
        await ensureTranscriptsDir();
        const path = getTranscriptPath(sessionId);
        const line = `${JSON.stringify(entry)}\n`;
        await appendFile(path, line);
      } catch {
        // Silently fail on append errors - non-critical operation
      }
    },

    async read(sessionId: string): Promise<TranscriptEntry[]> {
      try {
        const path = getTranscriptPath(sessionId);
        if (!existsSync(path)) {
          return [];
        }
        const content = await readFile(path, "utf-8");
        const entries: TranscriptEntry[] = [];
        for (const line of content.split("\n")) {
          if (line.trim()) {
            try {
              entries.push(JSON.parse(line) as TranscriptEntry);
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
        return entries;
      } catch {
        return [];
      }
    },

    async clear(sessionId: string): Promise<void> {
      try {
        const path = getTranscriptPath(sessionId);
        if (existsSync(path)) {
          await writeFile(path, "");
        }
      } catch {
        // Ignore clear errors - file may not exist
      }
    },

    formatEntry(entry: TranscriptEntry): string {
      const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const prefix = entry.type.toUpperCase().padEnd(10);
      return `[${time}] ${prefix} ${entry.content}`;
    },

    async exportMarkdown(sessionId: string): Promise<string> {
      const entries = await manager.read(sessionId);
      if (entries.length === 0) {
        return "# Session Transcript\n\nNo entries found.";
      }

      const lines: string[] = ["# Session Transcript", ""];

      for (const entry of entries) {
        const time = new Date(entry.timestamp).toISOString();
        lines.push(`## ${entry.type} (${time})`);
        lines.push("");
        lines.push(entry.content);
        lines.push("");
      }

      return lines.join("\n");
    },
  };

  return manager;
}
