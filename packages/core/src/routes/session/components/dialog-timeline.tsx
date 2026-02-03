import { useMemo, useState } from "react";

import { useKeyboard } from "@opentui/react";
import type { UIMessage } from "ai";

import { DialogBox, useDialog } from "#components/dialog/index.js";
import { useTheme } from "#context/theme/index.js";

const TOOL_PREFIX_REGEX = /^tool-/;

type TimelineEntry = {
  id: string;
  type: "user" | "assistant" | "tool-call" | "tool-result";
  label: string;
  time: string;
  messageId: string;
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex message parsing for timeline display
function extractTimelineEntries(messages: UIMessage[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const message of messages) {
    const metadata = message.metadata as { createdAt?: number } | undefined;
    const timestamp = metadata?.createdAt ?? Date.now();
    const time = formatTime(timestamp);

    if (message.role === "user") {
      const textPart = message.parts.find((p) => p.type === "text");
      const preview =
        textPart && "text" in textPart
          ? textPart.text.slice(0, 50) +
            (textPart.text.length > 50 ? "..." : "")
          : "[message]";

      entries.push({
        id: `${message.id}-user`,
        type: "user",
        label: preview,
        time,
        messageId: message.id,
      });
    } else if (message.role === "assistant") {
      for (const part of message.parts) {
        if (part.type === "text") {
          const preview =
            part.text.slice(0, 50) + (part.text.length > 50 ? "..." : "");
          entries.push({
            id: `${message.id}-text`,
            type: "assistant",
            label: preview,
            time,
            messageId: message.id,
          });
        } else if (part.type.startsWith("tool-") && "toolCallId" in part) {
          // UIMessage tool parts have type like "tool-{toolName}"
          const toolPart = part as {
            type: string;
            toolCallId: string;
            state?: string;
            errorText?: string;
          };
          const toolName = toolPart.type.replace(TOOL_PREFIX_REGEX, "");
          const isResult = toolPart.state === "result";
          const isError = Boolean(toolPart.errorText);

          entries.push({
            id: `${message.id}-${toolPart.toolCallId}${isResult ? "-result" : ""}`,
            type: isResult ? "tool-result" : "tool-call",
            label: isResult
              ? `${toolName} ${isError ? "(error)" : "(success)"}`
              : toolName,
            time,
            messageId: message.id,
          });
        }
      }
    }
  }

  return entries;
}

type DialogTimelineProps = {
  messages: UIMessage[];
  onJumpTo?: (messageId: string) => void;
};

export function DialogTimeline({ messages, onJumpTo }: DialogTimelineProps) {
  const { clear } = useDialog();
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const entries = useMemo(() => extractTimelineEntries(messages), [messages]);

  const handleSelect = (entry: TimelineEntry) => {
    clear();
    onJumpTo?.(entry.messageId);
  };

  useKeyboard((key) => {
    if (key.name === "return" && entries[selectedIndex]) {
      handleSelect(entries[selectedIndex]);
    } else if (key.name === "up" || (key.ctrl && key.name === "p")) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.name === "down" || (key.ctrl && key.name === "n")) {
      setSelectedIndex((i) => Math.min(entries.length - 1, i + 1));
    }
  });

  const getTypeColor = (type: TimelineEntry["type"]): string => {
    switch (type) {
      case "user":
        return theme.info;
      case "assistant":
        return theme.success;
      case "tool-call":
        return theme.warning;
      case "tool-result":
        return theme.secondary;
      default:
        return theme.text;
    }
  };

  const getTypeIcon = (type: TimelineEntry["type"]): string => {
    switch (type) {
      case "user":
        return ">";
      case "assistant":
        return "<";
      case "tool-call":
        return "*";
      case "tool-result":
        return "=";
      default:
        return " ";
    }
  };

  return (
    <DialogBox maxWidth={70} minWidth={50} title="Message Timeline">
      <box flexDirection="column" maxHeight={20}>
        {entries.length === 0 ? (
          <text fg={theme.textMuted}>No messages in this session</text>
        ) : (
          entries.map((entry, index) => {
            const isSelected = index === selectedIndex;
            return (
              <box
                backgroundColor={isSelected ? theme.primary : undefined}
                flexDirection="row"
                gap={1}
                key={entry.id}
              >
                <text fg={isSelected ? theme.background : theme.textMuted}>
                  {entry.time}
                </text>
                <text
                  fg={isSelected ? theme.background : getTypeColor(entry.type)}
                >
                  {getTypeIcon(entry.type)}
                </text>
                <text fg={isSelected ? theme.background : theme.text}>
                  {entry.label}
                </text>
              </box>
            );
          })
        )}
      </box>

      <text fg={theme.textMuted} paddingTop={1}>
        Use arrows to navigate, Enter to jump, Esc to close
      </text>
    </DialogBox>
  );
}
