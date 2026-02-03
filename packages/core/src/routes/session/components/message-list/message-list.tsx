import type { MutableRefObject } from "react";

import type { ScrollBoxRenderable } from "@opentui/core";
import type { UIMessage } from "ai";

import { useTheme } from "#context/theme/index.js";
import type { QueuedMessage } from "#hooks/use-message-queue.js";
import type { AgentMetadata } from "#types.js";

import { Message, QueuedUserMessage } from "./components/message/index.js";
import type { ToolComponentsMap } from "./components/message/types.js";

type MessageListProps = {
  messages: UIMessage[];
  messageDurations: Map<string, number>;
  queuedMessages: QueuedMessage[];
  scrollRef?: MutableRefObject<ScrollBoxRenderable | null>;
  /** Custom tool component renderers from the agent */
  toolComponents?: ToolComponentsMap;
};

export function MessageList({
  messages,
  messageDurations,
  queuedMessages,
  scrollRef,
  toolComponents,
}: MessageListProps) {
  const { theme } = useTheme();

  if (messages.length === 0) {
    return null;
  }

  return (
    <scrollbox
      backgroundColor={theme.background}
      flexGrow={1}
      ref={(el) => {
        if (scrollRef) {
          scrollRef.current = el;
        }
      }}
      stickyScroll
      verticalScrollbarOptions={{
        visible: false,
      }}
    >
      <box flexDirection="column">
        {messages.map((message, index) => {
          // For assistant messages, get agent from preceding user message's metadata
          let agentInfo: AgentMetadata | undefined;
          if (message.role === "assistant" && index > 0) {
            const prevMessage = messages[index - 1];
            if (prevMessage?.role === "user" && prevMessage.metadata) {
              const metadata = prevMessage.metadata as {
                agent?: AgentMetadata;
              };
              agentInfo = metadata.agent;
            }
          }

          return (
            <Message
              agentInfo={agentInfo}
              duration={messageDurations.get(message.id)}
              index={index}
              isLast={
                message.role === "assistant" && index === messages.length - 1
              }
              key={message.id}
              message={message}
              toolComponents={toolComponents}
            />
          );
        })}
        {queuedMessages.map((queuedMessage) => (
          <QueuedUserMessage key={queuedMessage.id} message={queuedMessage} />
        ))}
      </box>
    </scrollbox>
  );
}
