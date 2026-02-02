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

import { useKV } from "#context/kv.tsx";
import type { AgentMetadata } from "#types.ts";

import {
  type SessionStorage,
  type StoredMessage,
  type StoredSession,
  createSessionStorage,
} from "../lib/session-storage";

export type SessionStatus = "active" | "archived";

export type Session = {
  id: string;
  title: string;
  status: SessionStatus;
  agentId: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
};

export type SessionMessageMetadata = {
  agent?: AgentMetadata;
  usage?: { inputTokens: number; outputTokens: number };
  duration?: number;
  interrupted?: boolean;
  createdAt: number;
};

export type SessionMessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | {
      type: "tool-call";
      toolName: string;
      toolCallId: string;
      args: unknown;
      state: string;
    }
  | {
      type: "tool-result";
      toolName: string;
      toolCallId: string;
      result: unknown;
      isError?: boolean;
    }
  | { type: "file"; url: string; mime: string; filename?: string };

export type SessionMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  parts: SessionMessagePart[];
  metadata?: SessionMessageMetadata;
};

export type SessionContextStatus = "idle" | "loading" | "ready" | "error";

export type SessionContextValue = {
  currentSession: Session | null;
  messages: SessionMessage[];
  status: SessionContextStatus;
  error: Error | null;

  createSession: (agentId: string, initialMessage?: string) => Promise<string>;
  loadSession: (sessionId: string) => Promise<void>;
  unloadSession: () => void;

  updateSessionTitle: (title: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  exportSession: (format: "markdown" | "json") => Promise<string>;

  addUserMessage: (
    content: string,
    files: Array<{ url: string; mime: string; filename?: string }>,
    metadata: Omit<SessionMessageMetadata, "createdAt">
  ) => Promise<SessionMessage>;
  addAssistantMessage: (
    parts: SessionMessagePart[],
    metadata: Omit<SessionMessageMetadata, "createdAt">
  ) => Promise<SessionMessage>;
  updateMessage: (
    messageId: string,
    updates: Partial<SessionMessage>
  ) => Promise<void>;

  sessions: Session[];
  refreshSessions: () => Promise<void>;
};

type SessionProviderProps = {
  children: ReactNode;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: SessionProviderProps) {
  const kv = useKV();
  const storageRef = useRef<SessionStorage | null>(null);
  if (!storageRef.current) {
    storageRef.current = createSessionStorage(kv.getDataPath());
  }
  const sessionStorage = storageRef.current;

  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [status, setStatus] = useState<SessionContextStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const refreshSessions = useCallback(async () => {
    const stored = await sessionStorage.listSessions();
    setSessions(stored);
  }, [sessionStorage]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const createSession = useCallback(
    async (agentId: string, _initialMessage?: string): Promise<string> => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const session: Session = {
        id,
        title: "New Session",
        status: "active",
        agentId,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
      };
      await sessionStorage.saveSession(session, []);
      setCurrentSession(session);
      setMessages([]);
      setStatus("ready");
      await refreshSessions();
      return id;
    },
    [refreshSessions, sessionStorage]
  );

  const loadSession = useCallback(
    async (sessionId: string) => {
      setStatus("loading");
      setError(null);
      const data = await sessionStorage.getSession(sessionId);
      if (!data) {
        setStatus("error");
        setError(new Error(`Session ${sessionId} not found`));
        return;
      }
      setCurrentSession(data.session);
      setMessages(
        data.messages.map((m) => ({
          ...m,
          parts: m.parts as SessionMessagePart[],
          metadata: m.metadata as SessionMessageMetadata | undefined,
        }))
      );
      setStatus("ready");
    },
    [sessionStorage]
  );

  const unloadSession = useCallback(() => {
    setCurrentSession(null);
    setMessages([]);
    setStatus("idle");
    setError(null);
  }, []);

  const updateSessionTitle = useCallback(
    async (title: string) => {
      if (!currentSession) {
        return;
      }
      await sessionStorage.updateSessionTitle(currentSession.id, title);
      setCurrentSession({ ...currentSession, title, updatedAt: Date.now() });
      await refreshSessions();
    },
    [currentSession, refreshSessions, sessionStorage]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await sessionStorage.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        unloadSession();
      }
    },
    [currentSession, unloadSession, sessionStorage]
  );

  const exportSession = useCallback(
    async (format: "markdown" | "json"): Promise<string> => {
      await Promise.resolve();
      if (!currentSession) {
        return "";
      }
      if (format === "json") {
        return JSON.stringify({ session: currentSession, messages }, null, 2);
      }
      return `# ${currentSession.title}\n\n${messages.map((m) => `## ${m.role}\n\n${m.parts.map((p) => ("text" in p ? p.text : "")).join("\n")}`).join("\n\n")}`;
    },
    [currentSession, messages]
  );

  const saveMessagesToStorage = useCallback(
    async (newMessages: SessionMessage[]) => {
      if (!currentSession) {
        return;
      }
      const storedMessages: StoredMessage[] = newMessages.map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        role: m.role,
        parts: m.parts,
        metadata: m.metadata,
      }));
      await sessionStorage.saveSession(currentSession, storedMessages);
    },
    [currentSession, sessionStorage]
  );

  const addUserMessage = useCallback(
    async (
      content: string,
      files: Array<{ url: string; mime: string; filename?: string }>,
      metadata: Omit<SessionMessageMetadata, "createdAt">
    ): Promise<SessionMessage> => {
      const message: SessionMessage = {
        id: crypto.randomUUID(),
        sessionId: currentSession?.id ?? "",
        role: "user",
        parts: [
          { type: "text", text: content },
          ...files.map(
            (f) =>
              ({
                type: "file",
                url: f.url,
                mime: f.mime,
                filename: f.filename,
              }) as SessionMessagePart
          ),
        ],
        metadata: { ...metadata, createdAt: Date.now() },
      };
      const newMessages = [...messages, message];
      setMessages(newMessages);
      await saveMessagesToStorage(newMessages);
      return message;
    },
    [currentSession, messages, saveMessagesToStorage]
  );

  const addAssistantMessage = useCallback(
    async (
      parts: SessionMessagePart[],
      metadata: Omit<SessionMessageMetadata, "createdAt">
    ): Promise<SessionMessage> => {
      const message: SessionMessage = {
        id: crypto.randomUUID(),
        sessionId: currentSession?.id ?? "",
        role: "assistant",
        parts,
        metadata: { ...metadata, createdAt: Date.now() },
      };
      const newMessages = [...messages, message];
      setMessages(newMessages);
      await saveMessagesToStorage(newMessages);
      return message;
    },
    [currentSession, messages, saveMessagesToStorage]
  );

  const updateMessage = useCallback(
    async (messageId: string, updates: Partial<SessionMessage>) => {
      const newMessages = messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      );
      setMessages(newMessages);
      await saveMessagesToStorage(newMessages);
    },
    [messages, saveMessagesToStorage]
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      currentSession,
      messages,
      status,
      error,
      createSession,
      loadSession,
      unloadSession,
      updateSessionTitle,
      deleteSession,
      exportSession,
      addUserMessage,
      addAssistantMessage,
      updateMessage,
      sessions,
      refreshSessions,
    }),
    [
      currentSession,
      messages,
      status,
      error,
      createSession,
      loadSession,
      unloadSession,
      updateSessionTitle,
      deleteSession,
      exportSession,
      addUserMessage,
      addAssistantMessage,
      updateMessage,
      sessions,
      refreshSessions,
    ]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
