import type { ReactNode } from "react";

import type { ThemeColors } from "#context/theme/index.tsx";

export type ToolStatus = "pending" | "running" | "completed" | "error";

export type ToolState = {
  status: ToolStatus;
  input?: Record<string, unknown>;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  title?: string;
};

export type ToolPartInfo = {
  toolName: string;
  callId?: string;
  state: ToolState;
};

export type ToolRendererProps = {
  tool: ToolPartInfo;
  isComplete: boolean;
  theme: ThemeColors;
};

export function mapAISDKState(state?: string): ToolStatus {
  if (!state) {
    return "pending";
  }

  switch (state) {
    // AI SDK v6 states for tool-{toolName} parts
    case "input-streaming":
      return "running";
    case "input-available":
      return "running"; // Input ready, tool about to execute
    case "output-available":
      return "completed";
    case "output-error":
      return "error";
    default:
      return "running";
  }
}

export function extractToolInfo(part: unknown): ToolPartInfo | null {
  const p = part as Record<string, unknown>;

  // 1. Handle dynamic-tool (custom format with state updates)
  if (p.type === "dynamic-tool") {
    return {
      toolName: p.toolName as string,
      state: {
        status: mapAISDKState(p.state as string),
        input: p.args as Record<string, unknown>,
        metadata: p.metadata as Record<string, unknown>,
      },
    };
  }

  // 2. Handle AI SDK RSC/legacy types FIRST (exact matches before startsWith)
  if (p.type === "tool-call") {
    return {
      toolName: p.toolName as string,
      callId: p.toolCallId as string,
      state: {
        status: "running",
        input: p.args as Record<string, unknown>,
      },
    };
  }

  if (p.type === "tool-result") {
    const isError = p.isError === true;
    return {
      toolName: p.toolName as string,
      callId: p.toolCallId as string,
      state: {
        status: isError ? "error" : "completed",
        output:
          p.result !== undefined
            ? typeof p.result === "string"
              ? p.result
              : JSON.stringify(p.result)
            : undefined,
        error: isError ? String(p.result) : undefined,
      },
    };
  }

  // 3. Handle "tool-{toolName}" format (e.g., "tool-bash", "tool-weather")
  // This is the preferred AI SDK v6 format with state property
  if (typeof p.type === "string" && p.type.startsWith("tool-")) {
    const toolName = p.type.replace("tool-", "");
    return {
      toolName,
      callId: p.toolCallId as string,
      state: {
        status: mapAISDKState(p.state as string),
        input: p.input as Record<string, unknown>,
        output: p.output !== undefined ? JSON.stringify(p.output) : undefined,
        error: p.errorText as string | undefined,
        metadata: p.metadata as Record<string, unknown>,
      },
    };
  }

  return null;
}

/**
 * Map of tool names to custom renderer components.
 * Keys are tool names (exact match only - no case normalization).
 * Values are React components that receive ToolRendererProps.
 *
 * @example
 * ```tsx
 * const toolComponents: ToolComponentsMap = {
 *   my_custom_tool: MyCustomToolRenderer,
 *   bash: CustomBashRenderer,
 * };
 * ```
 */
export type ToolComponentsMap = Record<
  string,
  (props: ToolRendererProps) => ReactNode
>;
