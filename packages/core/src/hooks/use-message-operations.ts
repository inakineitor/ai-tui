import { useCallback, useMemo } from "react";

import type { SessionMessage } from "#context/session.tsx";

export type MessageOperation =
  | "copy"
  | "copy_markdown"
  | "copy_code"
  | "retry"
  | "edit"
  | "fork"
  | "delete";

export type MessageOperationHandler = {
  id: MessageOperation;
  label: string;
  shortcut?: string;
  enabled: (message: SessionMessage) => boolean;
  handler: (message: SessionMessage) => void;
};

export type UseMessageOperationsOptions = {
  onCopy?: (text: string) => void;
  onRetry?: (message: SessionMessage) => void;
  onEdit?: (message: SessionMessage) => void;
  onFork?: (message: SessionMessage) => void;
  onDelete?: (message: SessionMessage) => void;
};

function extractText(message: SessionMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("\n");
}

function extractCodeBlocks(message: SessionMessage): string[] {
  const text = extractText(message);
  const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let match = codeBlockRegex.exec(text);
  while (match !== null) {
    if (match[1]) {
      blocks.push(match[1].trim());
    }
    match = codeBlockRegex.exec(text);
  }
  return blocks;
}

function formatAsMarkdown(message: SessionMessage): string {
  const lines: string[] = [];
  const role =
    message.role === "user"
      ? "User"
      : message.role === "assistant"
        ? "Assistant"
        : "System";

  lines.push(`## ${role}`);
  lines.push("");

  for (const part of message.parts) {
    if (part.type === "text") {
      lines.push(part.text);
    } else if (part.type === "tool-call") {
      lines.push(`**Tool Call:** \`${part.toolName}\``);
      lines.push("```json");
      lines.push(JSON.stringify(part.args, null, 2));
      lines.push("```");
    } else if (part.type === "tool-result") {
      lines.push(`**Tool Result:** \`${part.toolName}\``);
      lines.push("```");
      lines.push(
        typeof part.result === "string"
          ? part.result
          : JSON.stringify(part.result, null, 2)
      );
      lines.push("```");
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function useMessageOperations(
  options: UseMessageOperationsOptions = {}
): {
  getOperations: (message: SessionMessage) => MessageOperationHandler[];
  executeOperation: (
    operation: MessageOperation,
    message: SessionMessage
  ) => void;
} {
  const { onCopy, onRetry, onEdit, onFork, onDelete } = options;

  const handlers: Record<MessageOperation, (message: SessionMessage) => void> =
    useMemo(
      () => ({
        copy: (message) => {
          const text = extractText(message);
          onCopy?.(text);
        },
        copy_markdown: (message) => {
          const markdown = formatAsMarkdown(message);
          onCopy?.(markdown);
        },
        copy_code: (message) => {
          const blocks = extractCodeBlocks(message);
          onCopy?.(blocks.join("\n\n"));
        },
        retry: (message) => onRetry?.(message),
        edit: (message) => onEdit?.(message),
        fork: (message) => onFork?.(message),
        delete: (message) => onDelete?.(message),
      }),
      [onCopy, onRetry, onEdit, onFork, onDelete]
    );

  const getOperations = useCallback(
    (message: SessionMessage): MessageOperationHandler[] => {
      const isUser = message.role === "user";
      const isAssistant = message.role === "assistant";
      const hasText = message.parts.some((p) => p.type === "text");
      const hasCode = extractCodeBlocks(message).length > 0;

      const operations: MessageOperationHandler[] = [];

      if (hasText) {
        operations.push({
          id: "copy",
          label: "Copy",
          shortcut: "c",
          enabled: () => true,
          handler: handlers.copy,
        });
      }

      if (hasText) {
        operations.push({
          id: "copy_markdown",
          label: "Copy as Markdown",
          shortcut: "m",
          enabled: () => true,
          handler: handlers.copy_markdown,
        });
      }

      if (hasCode) {
        operations.push({
          id: "copy_code",
          label: "Copy Code",
          shortcut: "C",
          enabled: () => true,
          handler: handlers.copy_code,
        });
      }

      if (isUser && onRetry) {
        operations.push({
          id: "retry",
          label: "Retry",
          shortcut: "r",
          enabled: () => true,
          handler: handlers.retry,
        });
      }

      if (isUser && onEdit) {
        operations.push({
          id: "edit",
          label: "Edit",
          shortcut: "e",
          enabled: () => true,
          handler: handlers.edit,
        });
      }

      if (isAssistant && onFork) {
        operations.push({
          id: "fork",
          label: "Fork from here",
          shortcut: "f",
          enabled: () => true,
          handler: handlers.fork,
        });
      }

      if (onDelete) {
        operations.push({
          id: "delete",
          label: "Delete",
          shortcut: "d",
          enabled: () => true,
          handler: handlers.delete,
        });
      }

      return operations;
    },
    [handlers, onRetry, onEdit, onFork, onDelete]
  );

  const executeOperation = useCallback(
    (operation: MessageOperation, message: SessionMessage) => {
      handlers[operation](message);
    },
    [handlers]
  );

  return { getOperations, executeOperation };
}
