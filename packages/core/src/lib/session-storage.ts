import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type StoredSession = {
  id: string;
  title: string;
  status: "active" | "archived";
  agentId: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
};

export type StoredMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  parts: unknown[];
  metadata?: Record<string, unknown>;
};

export type SessionStorage = {
  listSessions(): Promise<StoredSession[]>;
  getSession(
    sessionId: string
  ): Promise<{ session: StoredSession; messages: StoredMessage[] } | null>;
  saveSession(session: StoredSession, messages: StoredMessage[]): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  updateSessionTitle(sessionId: string, title: string): Promise<void>;
  archiveSession(sessionId: string): Promise<void>;
};

/**
 * Create a session storage instance with explicit data directory.
 *
 * @param dataDir - Full path to data directory
 */
export function createSessionStorage(dataDir: string): SessionStorage {
  function getSessionsDir(): string {
    return join(dataDir, "sessions");
  }

  function getSessionPath(sessionId: string): string {
    return join(getSessionsDir(), `${sessionId}.json`);
  }

  async function ensureSessionsDir(): Promise<void> {
    const dir = getSessionsDir();
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  return {
    async listSessions(): Promise<StoredSession[]> {
      try {
        await ensureSessionsDir();
        const files = await readdir(getSessionsDir());
        const sessions: StoredSession[] = [];

        for (const file of files) {
          if (!file.endsWith(".json")) {
            continue;
          }
          try {
            const content = await readFile(
              join(getSessionsDir(), file),
              "utf-8"
            );
            const data = JSON.parse(content) as {
              session: StoredSession;
              messages: StoredMessage[];
            };
            sessions.push(data.session);
          } catch {
            // Skip invalid session files
          }
        }

        return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      } catch {
        return [];
      }
    },

    async getSession(
      sessionId: string
    ): Promise<{ session: StoredSession; messages: StoredMessage[] } | null> {
      try {
        const path = getSessionPath(sessionId);
        if (!existsSync(path)) {
          return null;
        }
        const content = await readFile(path, "utf-8");
        return JSON.parse(content) as {
          session: StoredSession;
          messages: StoredMessage[];
        };
      } catch {
        return null;
      }
    },

    async saveSession(
      session: StoredSession,
      messages: StoredMessage[]
    ): Promise<void> {
      await ensureSessionsDir();
      const path = getSessionPath(session.id);
      const data = {
        session: {
          ...session,
          messageCount: messages.length,
          updatedAt: Date.now(),
        },
        messages,
      };
      await writeFile(path, JSON.stringify(data, null, 2));
    },

    async deleteSession(sessionId: string): Promise<void> {
      try {
        const path = getSessionPath(sessionId);
        if (existsSync(path)) {
          await unlink(path);
        }
      } catch {
        // Ignore deletion errors - file may already be gone
      }
    },

    async updateSessionTitle(sessionId: string, title: string): Promise<void> {
      const data = await this.getSession(sessionId);
      if (data) {
        data.session.title = title;
        data.session.updatedAt = Date.now();
        await this.saveSession(data.session, data.messages);
      }
    },

    async archiveSession(sessionId: string): Promise<void> {
      const data = await this.getSession(sessionId);
      if (data) {
        data.session.status = "archived";
        data.session.updatedAt = Date.now();
        await this.saveSession(data.session, data.messages);
      }
    },
  };
}
