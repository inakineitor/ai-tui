import { useCallback, useEffect, useRef } from "react";

import type { ScrollBoxRenderable } from "@opentui/core";
import type { UIMessage } from "ai";

import type { DialogContextValue } from "#components/dialog/index.js";
import { Prompt } from "#components/prompt/index.js";
import { useToast } from "#components/toast.js";
import { useCommand } from "#context/command.js";
import { useTheme } from "#context/theme/index.js";
import type { FileUIPart, QueuedMessage } from "#hooks/use-message-queue.js";
import { Clipboard } from "#lib/clipboard.js";

import { DialogConfirm } from "./components/dialog-confirm.js";
import { DialogTimeline } from "./components/dialog-timeline.js";
import type { ToolComponentsMap } from "./components/message-list/components/message/types.js";
import { MessageList } from "./components/message-list/index.js";
import { QueueIndicator } from "./components/queue-indicator.js";
import { Sidebar } from "./components/sidebar/index.js";

type SessionProps = {
  directory: string;
  messages: UIMessage[];
  messageDurations: Map<string, number>;
  messageQueue: QueuedMessage[];
  isLoading: boolean;
  error: Error | undefined;
  onSubmit: (content: string, files?: FileUIPart[]) => void;
  onShellCommand?: (command: string) => void;
  onStop: () => void;
  onClearQueue: () => void;
  setMessages: (
    messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])
  ) => void;
  pendingElicitation?: {
    message: string;
  } | null;
  onElicitationRespond?: (answer: string) => void;
  onElicitationReject?: () => void;
  sidebarVisible?: boolean;
  tokenUsage?: { input: number; output: number };
  todos?: Array<{
    id: string;
    content: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    priority: "high" | "medium" | "low";
  }>;
  modifiedFiles?: Array<{
    id: string;
    path: string;
    status: "added" | "modified" | "deleted" | "unchanged";
  }>;
  /** Custom tool component renderers from the agent */
  toolComponents?: ToolComponentsMap;
};

export function Session({
  messages,
  messageDurations,
  messageQueue,
  isLoading,
  error,
  onSubmit,
  onShellCommand,
  onStop,
  onClearQueue: _onClearQueue,
  setMessages,
  pendingElicitation,
  onElicitationRespond,
  onElicitationReject,
  sidebarVisible = false,
  tokenUsage,
  todos = [],
  modifiedFiles = [],
  toolComponents,
}: SessionProps) {
  const { theme } = useTheme();
  const command = useCommand();
  const toast = useToast();

  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

  const handleSubmit = (content: string, files?: FileUIPart[]) => {
    onSubmit(content, files);
  };

  const copyLastAssistantMessage = useCallback(async () => {
    const lastAssistant = messages.findLast((m) => m.role === "assistant");
    if (!lastAssistant) {
      toast.show({ message: "No assistant messages found", variant: "error" });
      return;
    }
    const text = lastAssistant.parts
      ?.filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("\n");
    if (text) {
      await Clipboard.copy(text);
      toast.show({ message: "Message copied!", variant: "success" });
    }
  }, [messages, toast]);

  useEffect(
    () =>
      command.register([
        {
          id: "session.clear",
          title: "Clear messages",
          category: "Session",
          slash: { name: "clear" },
          onSelect: async (dialog) => {
            const confirmed = await DialogConfirm.show(
              dialog,
              "Clear Session",
              "Are you sure you want to clear all messages?"
            );
            if (confirmed) {
              setMessages([]);
              toast.show({ message: "Session cleared", variant: "success" });
            }
          },
        },
        {
          id: "session.timeline",
          title: "Jump to message",
          category: "Session",
          keybind: "session_timeline",
          slash: { name: "timeline" },
          onSelect: (dialog) => {
            dialog.push(
              <DialogTimeline
                messages={messages}
                onJumpTo={(messageId) => {
                  const scrollbox = scrollRef.current;
                  if (!scrollbox) {
                    return;
                  }
                  const children = scrollbox.getChildren?.();
                  const child = children?.find(
                    (c: { id?: string }) => c.id === messageId
                  );
                  if (child) {
                    scrollbox.scrollBy?.(child.y - scrollbox.y - 1);
                  }
                }}
              />
            );
          },
        },
        {
          id: "session.copyLast",
          title: "Copy last assistant message",
          category: "Session",
          keybind: "messages_copy",
          onSelect: () => copyLastAssistantMessage(),
        },
        {
          id: "session.pageUp",
          title: "Page up",
          category: "Navigation",
          keybind: "messages_page_up",
          onSelect: () => {
            const scrollbox = scrollRef.current;
            if (scrollbox) {
              scrollbox.scrollBy?.(-scrollbox.height / 2);
            }
          },
        },
        {
          id: "session.pageDown",
          title: "Page down",
          category: "Navigation",
          keybind: "messages_page_down",
          onSelect: () => {
            const scrollbox = scrollRef.current;
            if (scrollbox) {
              scrollbox.scrollBy?.(scrollbox.height / 2);
            }
          },
        },
        {
          id: "session.scrollTop",
          title: "First message",
          category: "Navigation",
          keybind: "messages_first",
          onSelect: () => {
            scrollRef.current?.scrollTo?.(0);
          },
        },
        {
          id: "session.scrollBottom",
          title: "Last message",
          category: "Navigation",
          keybind: "messages_last",
          onSelect: () => {
            const scrollbox = scrollRef.current;
            if (scrollbox) {
              scrollbox.scrollTo?.(scrollbox.scrollHeight);
            }
          },
        },
      ]),
    [command, toast, messages, setMessages, copyLastAssistantMessage]
  );

  return (
    <box backgroundColor={theme.background} flexDirection="row">
      <box
        flexGrow={1}
        gap={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
      >
        <MessageList
          messageDurations={messageDurations}
          messages={messages}
          queuedMessages={messageQueue}
          scrollRef={scrollRef}
          toolComponents={toolComponents}
        />

        <box flexShrink={0}>
          <QueueIndicator queue={messageQueue} />
          {pendingElicitation ? (
            <ElicitationPrompt
              message={pendingElicitation.message}
              onReject={onElicitationReject}
              onRespond={onElicitationRespond}
            />
          ) : (
            <Prompt
              hasQueuedMessages={messageQueue.length > 0}
              isStreaming={isLoading}
              onInterrupt={onStop}
              onShellCommand={onShellCommand}
              onSubmit={handleSubmit}
              showShortcuts
              showSpinner
            />
          )}
        </box>

        {error && (
          <box
            flexDirection="row"
            flexShrink={0}
            gap={1}
            justifyContent="flex-end"
          >
            <text fg={theme.error}>Error: {error.message}</text>
          </box>
        )}
      </box>

      <Sidebar
        files={modifiedFiles}
        todos={todos}
        tokenUsage={tokenUsage}
        visible={sidebarVisible}
        width={40}
      />
    </box>
  );
}

// Inline elicitation prompt component
type ElicitationPromptProps = {
  message: string;
  onRespond?: (answer: string) => void;
  onReject?: () => void;
};

function ElicitationPrompt({
  message,
  onRespond,
  onReject: _onReject,
}: ElicitationPromptProps) {
  const { theme } = useTheme();

  return (
    <box
      backgroundColor={theme.backgroundPanel}
      border={["left"]}
      borderColor={theme.warning}
      flexDirection="column"
      gap={1}
    >
      <box
        gap={1}
        paddingBottom={1}
        paddingLeft={1}
        paddingRight={3}
        paddingTop={1}
      >
        <box flexDirection="row" gap={1}>
          <text fg={theme.warning}>?</text>
          <text fg={theme.text}>Agent Question</text>
        </box>
        <text fg={theme.textMuted}>{message}</text>
      </box>
      <box paddingBottom={1} paddingLeft={2} paddingRight={2}>
        <Prompt
          onSubmit={(answer) => onRespond?.(answer)}
          placeholder="Type your answer..."
        />
        <box flexDirection="row" gap={2} paddingTop={1}>
          <box flexDirection="row" gap={1}>
            <text fg={theme.text}>enter</text>
            <text fg={theme.textMuted}>submit</text>
          </box>
          <box flexDirection="row" gap={1}>
            <text fg={theme.text}>esc</text>
            <text fg={theme.textMuted}>dismiss</text>
          </box>
        </box>
      </box>
    </box>
  );
}
