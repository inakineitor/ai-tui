import { InlineTool } from "./inline-tool.tsx";
import type { ToolRendererProps } from "./types.ts";

/**
 * Format tool input arguments for display
 * Matches OpenCode's format: [key=value, key=value]
 *
 * @param input - Tool input arguments
 * @param omit - Keys to exclude from display (e.g., primary argument already shown)
 */
function formatInput(
  input: Record<string, unknown> | undefined,
  omit?: string[]
): string {
  if (!input) {
    return "";
  }

  const primitives = Object.entries(input).filter(([key, value]) => {
    if (omit?.includes(key)) {
      return false;
    }
    return (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    );
  });

  if (primitives.length === 0) {
    return "";
  }

  return `[${primitives.map(([key, value]) => `${key}=${value}`).join(", ")}]`;
}

export function GenericTool({ tool, isComplete }: ToolRendererProps) {
  const { toolName, state } = tool;
  const inputStr = formatInput(state.input);

  return (
    <InlineTool
      complete={isComplete}
      hasError={state.status === "error"}
      icon={"\u2699"}
      pending={`Running ${toolName}...`}
    >
      {toolName} {inputStr && <span fg="textMuted">{inputStr}</span>}
    </InlineTool>
  );
}
