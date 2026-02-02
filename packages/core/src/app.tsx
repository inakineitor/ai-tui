import { execSync } from "node:child_process";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useChat } from "@ai-sdk/react";
import { RGBA } from "@opentui/core";
import {
  useKeyboard,
  useRenderer,
  useTerminalDimensions,
} from "@opentui/react";
import type { ChatTransport, UIMessage } from "ai";

import {
  DialogHelp,
  DialogProvider,
  DialogSessionList,
} from "#components/dialog/index.ts";
import { ToastProvider } from "#components/toast.tsx";
import { AgentProvider, useAgent } from "#context/agent.tsx";
import {
  type Command,
  CommandProvider,
  useCommand,
} from "#context/command.tsx";
import { ConfigProvider, useAgents } from "#context/config.tsx";
import { ElicitationProvider, useElicitation } from "#context/elicitation.tsx";
import { ExitProvider, useExit } from "#context/exit.tsx";
import { KeybindProvider, useKeybind } from "#context/keybind.tsx";
import { KVProvider, useKVSignal } from "#context/kv.tsx";
import { PromptProvider } from "#context/prompt.tsx";
import { RouteProvider, useRoute } from "#context/route.tsx";
import { SessionProvider } from "#context/session.tsx";
import {
  type ThemeMode,
  ThemeProvider,
  useTheme,
} from "#context/theme/index.tsx";
import type { FileUIPart } from "#hooks/use-message-queue.ts";
import { useMessageQueue } from "#hooks/use-message-queue.ts";
import type { KVStore } from "#lib/kv.ts";
import { isFinishPartWithUsage } from "#lib/type-guards.ts";
import { Home } from "#routes/home/index.tsx";
import { Session } from "#routes/session/index.tsx";
import type { Agent, AgentMetadata, ConfigInput } from "#types.ts";

const transportCache = new Map<string, Promise<ChatTransport<UIMessage>>>();

function initializeTransportCache(
  agents: Agent[],
  onElicitation: (message: string) => Promise<string>
) {
  if (transportCache.size > 0) {
    return;
  }

  for (const agentDef of agents) {
    transportCache.set(
      agentDef.id,
      agentDef.createTransport({
        onElicitation,
        transportOptions: {
          sendReasoning: true,
          messageMetadata: ({ part }) => {
            if (isFinishPartWithUsage(part)) {
              return {
                usage: {
                  inputTokens: part.totalUsage.inputTokens,
                  outputTokens: part.totalUsage.outputTokens,
                },
              };
            }
            return;
          },
        },
      })
    );
  }
}

function getCachedTransport(
  agentId: string
): Promise<ChatTransport<UIMessage>> | undefined {
  return transportCache.get(agentId);
}

type AppProps = {
  config: ConfigInput;
  initialThemeMode?: ThemeMode;
  kv: KVStore;
};

export function App({ config, initialThemeMode, kv }: AppProps) {
  return (
    <ConfigProvider value={config}>
      <KVProvider value={kv}>
        <ThemeProvider initialMode={initialThemeMode}>
          <ExitProvider>
            <ToastProvider>
              <KeybindProvider>
                <RouteProvider>
                  <AgentProvider>
                    <SessionProvider>
                      <DialogProvider>
                        <CommandProvider>
                          <ElicitationProvider>
                            <PromptProvider>
                              <CommandRegistration />
                              <AppContent />
                            </PromptProvider>
                          </ElicitationProvider>
                        </CommandProvider>
                      </DialogProvider>
                    </SessionProvider>
                  </AgentProvider>
                </RouteProvider>
              </KeybindProvider>
            </ToastProvider>
          </ExitProvider>
        </ThemeProvider>
      </KVProvider>
    </ConfigProvider>
  );
}

function CommandRegistration() {
  const command = useCommand();
  const { navigate } = useRoute();
  const { cycleAgent } = useAgent();
  const { exit } = useExit();

  // Use reactive KV signals for view preferences
  const [, setSidebarVisible] = useKVSignal("sidebarVisible", false);
  const [, setShowTimestamps] = useKVSignal("showTimestamps", false);
  const [, setShowThinking] = useKVSignal("showThinking", true);
  const [, setShowToolDetails] = useKVSignal("showToolDetails", true);

  useEffect(() => {
    const commands: Command[] = [
      {
        id: "session.new",
        title: "New session",
        category: "Session",
        slash: { name: "new" },
        onSelect: () => {
          navigate({ type: "session", sessionID: crypto.randomUUID() });
        },
      },
      {
        id: "session.list",
        title: "Switch session",
        category: "Session",
        keybind: "session_list",
        slash: { name: "sessions", aliases: ["resume"] },
        onSelect: (dialog) => {
          dialog.push(
            <DialogSessionList
              onNew={() => {
                navigate({ type: "session", sessionID: crypto.randomUUID() });
              }}
              onSelect={(session) => {
                navigate({ type: "session", sessionID: session.id });
              }}
            />
          );
        },
      },

      {
        id: "view.sidebar",
        title: "Toggle sidebar",
        category: "View",
        keybind: "sidebar_toggle",
        slash: { name: "sidebar" },
        onSelect: () => {
          setSidebarVisible((prev) => !prev);
        },
      },
      {
        id: "view.timestamps",
        title: "Toggle timestamps",
        category: "View",
        slash: { name: "timestamps" },
        onSelect: () => {
          setShowTimestamps((prev) => !prev);
        },
      },
      {
        id: "view.thinking",
        title: "Toggle thinking",
        category: "View",
        slash: { name: "thinking" },
        onSelect: () => {
          setShowThinking((prev) => !prev);
        },
      },
      {
        id: "view.toolDetails",
        title: "Toggle tool details",
        category: "View",
        slash: { name: "details" },
        onSelect: () => {
          setShowToolDetails((prev) => !prev);
        },
      },
      {
        id: "agent.cycle",
        title: "Cycle agent",
        category: "Agent",
        keybind: "agent_cycle",
        onSelect: () => cycleAgent(),
      },
      {
        id: "help.keybinds",
        title: "Show keybinds",
        category: "Help",
        keybind: "help",
        slash: { name: "help" },
        onSelect: (dialog) => {
          dialog.push(<DialogHelp />);
        },
      },
      {
        id: "app.quit",
        title: "Quit",
        category: "Help",
        keybind: "app_exit",
        slash: { name: "quit", aliases: ["exit"] },
        onSelect: () => exit(0),
      },
    ];

    return command.register(commands);
  }, [
    command,
    navigate,
    cycleAgent,
    exit,
    setSidebarVisible,
    setShowTimestamps,
    setShowThinking,
    setShowToolDetails,
  ]);

  return null;
}

function AppContent() {
  const [transport, setTransport] = useState<ChatTransport<UIMessage> | null>(
    null
  );
  const [initError, setInitError] = useState<Error | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const agents = useAgents();
  const { theme } = useTheme();
  const { selectedAgent } = useAgent();
  const dimensions = useTerminalDimensions();
  const cwd = process.cwd();

  const { showElicitation, pendingRequest, respond, reject } = useElicitation();
  const showElicitationRef = useRef(showElicitation);
  useEffect(() => {
    showElicitationRef.current = showElicitation;
  }, [showElicitation]);

  useEffect(() => {
    initializeTransportCache(agents, (message: string) =>
      showElicitationRef.current(message)
    );

    const cachedPromise = getCachedTransport(selectedAgent.id);
    if (!cachedPromise) {
      setInitError(
        new Error(`Transport for "${selectedAgent.id}" not found in cache`)
      );
      setIsInitializing(false);
      return;
    }

    setIsInitializing(true);
    setInitError(null);

    cachedPromise
      .then((resolvedTransport: ChatTransport<UIMessage>) => {
        setTransport(resolvedTransport);
      })
      .catch((err: unknown) => {
        setInitError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, [agents, selectedAgent.id]);

  if (initError) {
    return (
      <box
        alignItems="center"
        backgroundColor={theme.background}
        flexDirection="column"
        height={dimensions.height}
        justifyContent="center"
        width={dimensions.width}
      >
        <text fg={theme.error}>Failed to initialize agent</text>
        <text fg={theme.textMuted}>{initError.message}</text>
        <text fg={theme.textMuted}>Press Ctrl+C to exit</text>
      </box>
    );
  }

  if (!transport) {
    return (
      <Home
        directory={cwd}
        initError={null}
        isInitializing={isInitializing}
        isLoading={false}
      />
    );
  }

  return (
    <ChatContent
      directory={cwd}
      onElicitationReject={reject}
      onElicitationRespond={respond}
      pendingRequest={pendingRequest}
      transport={transport}
    />
  );
}

type ChatContentProps = {
  directory: string;
  onElicitationReject: () => void;
  onElicitationRespond: (response: string) => void;
  pendingRequest: { message: string } | null;
  transport: ChatTransport<UIMessage>;
};

function ChatContent({
  directory,
  onElicitationReject,
  onElicitationRespond,
  pendingRequest,
  transport,
}: ChatContentProps) {
  const { route, navigate } = useRoute();
  const { selectedAgent } = useAgent();
  const { theme } = useTheme();
  const keybind = useKeybind();

  const [sidebarVisible] = useKVSignal("sidebarVisible", false);

  const shellAgentMetadata: AgentMetadata = useMemo(
    () => ({
      id: "shell",
      name: "Shell",
      model: { providerName: "Local", name: "Shell" },
      color: RGBA.fromHex(theme.primary),
    }),
    [theme.primary]
  );

  const { messages, status, error, sendMessage, stop, setMessages } = useChat({
    transport,
  });

  const handleStop = useCallback(() => {
    stop();
    setTimeout(() => {
      setMessages((msgs) => {
        const lastAssistantIdx = msgs.findLastIndex(
          (msg) => msg.role === "assistant"
        );
        return msgs
          .map((msg, idx) => {
            if (
              msg.role === "assistant" &&
              idx === lastAssistantIdx &&
              msg.parts?.length > 0
            ) {
              return {
                ...msg,
                metadata: {
                  ...(msg.metadata as Record<string, unknown>),
                  interrupted: true,
                },
              };
            }
            return msg;
          })
          .filter((msg) => {
            if (msg.role === "assistant") {
              return msg.parts && msg.parts.length > 0;
            }
            return true;
          });
      });
    }, 100);
  }, [stop, setMessages]);

  const isLoading = status === "streaming" || status === "submitted";

  const {
    queue: messageQueue,
    submitMessage,
    clearQueue,
    hasQueuedMessages,
  } = useMessageQueue({
    status,
    sendMessage,
    selectedAgent,
  });

  const [currentMessageStartTime, setCurrentMessageStartTime] = useState<
    number | null
  >(null);
  const [messageDurations, setMessageDurations] = useState<Map<string, number>>(
    new Map()
  );

  useEffect(() => {
    if (
      status === "ready" &&
      currentMessageStartTime !== null &&
      messages.length > 0
    ) {
      const lastMessage = messages.at(-1);
      if (lastMessage && lastMessage.role === "assistant") {
        const duration = Date.now() - currentMessageStartTime;
        setMessageDurations((prev) =>
          new Map(prev).set(lastMessage.id, duration)
        );
        setCurrentMessageStartTime(null);
      }
    }
  }, [status, currentMessageStartTime, messages]);

  const handleSubmit = useCallback(
    (content: string, files?: FileUIPart[]) => {
      if (route.type === "home") {
        navigate({ type: "session", sessionID: crypto.randomUUID() });
      }
      if (!isLoading) {
        setCurrentMessageStartTime(Date.now());
      }
      submitMessage(content, files);
    },
    [route.type, navigate, submitMessage, isLoading]
  );

  const handleShellCommand = useCallback(
    (shellCommand: string) => {
      if (route.type === "home") {
        navigate({ type: "session", sessionID: crypto.randomUUID() });
      }

      try {
        const output = execSync(shellCommand, {
          encoding: "utf-8",
          cwd: directory,
          maxBuffer: 1024 * 1024 * 10,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "user" as const,
            parts: [{ type: "text" as const, text: `$ ${shellCommand}` }],
            metadata: { agent: shellAgentMetadata },
          },
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: output || "(no output)" }],
          },
        ]);
      } catch (err) {
        const errorOutput =
          err instanceof Error
            ? (err as { stderr?: string }).stderr || err.message
            : String(err);

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "user" as const,
            parts: [{ type: "text" as const, text: `$ ${shellCommand}` }],
            metadata: { agent: shellAgentMetadata },
          },
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: `Error: ${errorOutput}` }],
          },
        ]);
      }
    },
    [directory, route.type, navigate, setMessages, shellAgentMetadata]
  );

  useKeyboard((key) => {
    if (keybind.match("session_interrupt", key)) {
      if (pendingRequest) {
        onElicitationReject();
      } else if (hasQueuedMessages) {
        clearQueue();
      }
    }
  });

  if (route.type === "home") {
    return (
      <Home
        directory={directory}
        initError={null}
        isInitializing={false}
        isLoading={isLoading}
        onShellCommand={handleShellCommand}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <Session
      directory={directory}
      error={error}
      isLoading={isLoading}
      messageDurations={messageDurations}
      messageQueue={messageQueue}
      messages={messages}
      onClearQueue={clearQueue}
      onElicitationReject={onElicitationReject}
      onElicitationRespond={onElicitationRespond}
      onShellCommand={handleShellCommand}
      onStop={handleStop}
      onSubmit={handleSubmit}
      pendingElicitation={pendingRequest}
      setMessages={
        setMessages as (
          msgs: UIMessage[] | ((prevMsgs: UIMessage[]) => UIMessage[])
        ) => void
      }
      sidebarVisible={sidebarVisible}
      toolComponents={selectedAgent.toolComponents}
    />
  );
}
