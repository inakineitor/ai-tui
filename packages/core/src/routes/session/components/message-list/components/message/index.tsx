import type { UIMessage } from "ai";

import { useKVSignal } from "#context/kv.js";
import { useTheme } from "#context/theme/index.js";
import type { QueuedMessage } from "#hooks/use-message-queue.js";
import type { AgentMetadata } from "#types.js";

import {
  extractToolInfo,
  getToolRenderer,
} from "./components/tool-renderers/index.js";
import type { ToolComponentsMap } from "./types.js";

function formatTimestamp(date: Date | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) {
    return time;
  }

  const dateStr = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return `${dateStr}, ${time}`;
}

/**
 * Format token count for display (e.g., 1234 -> "1.2k")
 */
function formatTokens(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toString();
}

/**
 * Format duration for display (e.g., 125000 -> "2m 5s")
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

// Type guards for UI message parts
type UIMessagePart = UIMessage["parts"][number];

function isTextPart(
  part: UIMessagePart
): part is { type: "text"; text: string; state?: "streaming" | "done" } {
  return part.type === "text";
}

function isReasoningPart(
  part: UIMessagePart
): part is { type: "reasoning"; text: string; state?: "streaming" | "done" } {
  return part.type === "reasoning";
}

function isToolPart(part: UIMessagePart): boolean {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

type MessageProps = {
  message: UIMessage;
  index: number;
  agentInfo?: AgentMetadata;
  duration?: number;
  isLast?: boolean;
  /** Custom tool component renderers from the agent */
  toolComponents?: ToolComponentsMap;
};

export function Message({
  message,
  index,
  agentInfo,
  duration,
  isLast,
  toolComponents,
}: MessageProps) {
  if (message.role === "user") {
    return <UserMessage index={index} message={message} />;
  }
  if (message.role === "assistant") {
    if (!agentInfo) {
      throw new Error(`Missing agentInfo for assistant message ${message.id}`);
    }
    return (
      <AssistantMessage
        agentInfo={agentInfo}
        duration={duration}
        isLast={isLast}
        message={message}
        toolComponents={toolComponents}
      />
    );
  }
  // System messages - render as muted text
  return null;
}

function UserMessage({
  message,
  index,
}: {
  message: UIMessage;
  index: number;
}) {
  const { theme } = useTheme();
  const [showTimestamps] = useKVSignal("showTimestamps", false);

  const metadata = message.metadata as
    | {
        agent?: AgentMetadata;
        createdAt?: number;
      }
    | undefined;
  const agent = metadata?.agent;
  const timestamp = metadata?.createdAt;

  if (!agent) {
    throw new Error(`Missing agent metadata for user message ${message.id}`);
  }

  const textContent = message.parts
    .filter(isTextPart)
    .map((p) => p.text)
    .join("");

  return (
    <box
      backgroundColor={theme.backgroundPanel}
      border={["left"]}
      borderColor={agent.color}
      marginTop={index === 0 ? 0 : 1}
    >
      <box flexShrink={0} paddingBottom={1} paddingLeft={2} paddingTop={1}>
        {showTimestamps && timestamp && (
          <text fg={theme.textMuted} paddingBottom={1}>
            {formatTimestamp(timestamp)}
          </text>
        )}
        <text fg={theme.text}>{textContent}</text>
      </box>
    </box>
  );
}

/**
 * Queued user message - displays messages waiting to be sent
 * Shows with agent's color border and a QUEUED badge
 */
export function QueuedUserMessage({ message }: { message: QueuedMessage }) {
  const { theme } = useTheme();

  return (
    <box
      backgroundColor={theme.backgroundPanel}
      border={["left"]}
      borderColor={message.agent.color}
      marginTop={1}
    >
      <box flexShrink={0} paddingBottom={1} paddingLeft={2} paddingTop={1}>
        <text fg={theme.text}>{message.text}</text>
        <text>
          <span bg={message.agent.color} fg={theme.backgroundPanel}>
            {" QUEUED "}
          </span>
        </text>
      </box>
    </box>
  );
}

/**
 * Assistant message with separate parts rendering
 */
function AssistantMessage({
  message,
  agentInfo,
  duration,
  isLast,
  toolComponents,
}: {
  message: UIMessage;
  agentInfo: AgentMetadata;
  duration?: number;
  isLast?: boolean;
  toolComponents?: ToolComponentsMap;
}) {
  // Check if message is "final" - last part is text (not a pending tool call)
  const lastPart = message.parts.at(-1);
  const isFinal = lastPart && isTextPart(lastPart);

  // Show footer when: last message OR final (text response complete)
  const showFooter = isLast || isFinal;

  return (
    <>
      {message.parts.map((part, idx) => {
        if (isReasoningPart(part) && part.text.length > 0) {
          // biome-ignore lint/suspicious/noArrayIndexKey: parts order is stable
          return <ReasoningPart key={idx} text={part.text} />;
        }
        if (isToolPart(part)) {
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: parts order is stable
            <ToolPartUI key={idx} part={part} toolComponents={toolComponents} />
          );
        }
        if (isTextPart(part) && part.text.length > 0) {
          // biome-ignore lint/suspicious/noArrayIndexKey: parts order is stable
          return <TextPart key={idx} text={part.text} />;
        }
        return null;
      })}

      {showFooter && (
        <MessageFooter
          agentInfo={agentInfo}
          duration={duration}
          metadata={message.metadata}
        />
      )}
    </>
  );
}

/**
 * Text part - assistant's text response with markdown rendering
 */
function TextPart({ text }: { text: string }) {
  const { theme, syntax } = useTheme();

  return (
    <box flexShrink={0} marginTop={1} paddingLeft={3}>
      <code
        conceal
        content={text}
        drawUnstyledText={false}
        fg={theme.text}
        filetype="markdown"
        streaming
        syntaxStyle={syntax}
      />
    </box>
  );
}

function ReasoningPart({ text }: { text: string }) {
  const { theme, syntax } = useTheme();
  const [showThinking] = useKVSignal("showThinking", true);

  if (!showThinking) {
    return null;
  }

  const content = text
    .replace(/\[REDACTED\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!content) {
    return null;
  }

  return (
    <box
      border={["left"]}
      borderColor={theme.backgroundElement}
      flexDirection="column"
      marginTop={1}
      paddingLeft={2}
    >
      <code
        conceal
        content={content}
        drawUnstyledText={false}
        fg={theme.textMuted}
        filetype="markdown"
        streaming
        syntaxStyle={syntax}
      />
    </box>
  );
}

function ToolPartUI({
  part,
  toolComponents,
}: {
  part: UIMessagePart;
  toolComponents?: ToolComponentsMap;
}) {
  const { theme } = useTheme();
  const [showToolDetails] = useKVSignal("showToolDetails", true);

  const toolInfo = extractToolInfo(part);
  if (!toolInfo) {
    return null;
  }

  // When tool details are hidden, only show a minimal indicator for pending tools
  if (!showToolDetails) {
    const isComplete =
      toolInfo.state.status === "completed" ||
      toolInfo.state.status === "error";
    if (isComplete) {
      return null; // Hide completed tools entirely
    }
    // Show minimal "working..." indicator for in-progress tools
    return (
      <box marginTop={1} paddingLeft={3}>
        <text fg={theme.textMuted}>● {toolInfo.toolName}...</text>
      </box>
    );
  }

  // Get renderer, checking custom components first (exact match only)
  const Renderer = getToolRenderer(toolInfo.toolName, toolComponents);

  const isComplete =
    toolInfo.state.status === "completed" || toolInfo.state.status === "error";

  return <Renderer isComplete={isComplete} theme={theme} tool={toolInfo} />;
}

/**
 * Message footer - shows agent/model info and token usage
 */
function MessageFooter({
  metadata,
  agentInfo,
  duration,
}: {
  metadata?: unknown;
  agentInfo: AgentMetadata;
  duration?: number;
}) {
  const { theme } = useTheme();

  // Extract usage and interrupted status from metadata
  const meta = metadata as
    | {
        usage?: { inputTokens?: number; outputTokens?: number };
        interrupted?: boolean;
      }
    | undefined;
  const usageInfo = meta?.usage;
  const isInterrupted = meta?.interrupted === true;

  // Use gray color for interrupted messages, agent color otherwise
  const iconColor = isInterrupted ? theme.textMuted : agentInfo.color;
  const agentName = agentInfo.name;
  const modelName = agentInfo.model.name;

  return (
    <box flexDirection="row" marginTop={1} paddingLeft={3}>
      <text fg={iconColor}>{"\u25A3  "}</text>
      <text fg={theme.text}>{agentName}</text>
      <text fg={theme.textMuted}>
        {" "}
        {"\u00B7"} {modelName}
      </text>
      {duration !== undefined && (
        <text fg={theme.textMuted}>
          {" "}
          {"\u00B7"} {formatDuration(duration)}
        </text>
      )}
      {usageInfo &&
        usageInfo.inputTokens !== undefined &&
        usageInfo.outputTokens !== undefined && (
          <text fg={theme.textMuted}>
            {" "}
            {"\u00B7"} {formatTokens(usageInfo.inputTokens)}↑{" "}
            {formatTokens(usageInfo.outputTokens)}↓
          </text>
        )}
      {isInterrupted && (
        <text fg={theme.textMuted}> {"\u00B7"} interrupted</text>
      )}
    </box>
  );
}
