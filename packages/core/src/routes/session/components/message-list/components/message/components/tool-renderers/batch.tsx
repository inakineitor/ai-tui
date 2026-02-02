import { useMemo } from "react";

import { BlockTool } from "../../block-tool.tsx";
import { InlineTool } from "../../inline-tool.tsx";
import type { ToolRendererProps } from "../../types.ts";

type BatchToolCall = {
  tool: string;
  parameters: Record<string, unknown>;
};

export function BatchTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, metadata, error } = tool.state;
  const description = input?.description as string | undefined;
  const toolCalls = input?.tool_calls as BatchToolCall[] | undefined;
  const results = metadata?.results as unknown[] | undefined;

  const count = useMemo(() => toolCalls?.length ?? 0, [toolCalls]);
  const completedCount = useMemo(() => results?.length ?? 0, [results]);

  const displayDesc = description
    ? description.length > 40
      ? `${description.slice(0, 40)}...`
      : description
    : "batch operation";

  if (results && results.length > 0) {
    return (
      <BlockTool hasError={!!error} title={`# Batch: ${displayDesc}`}>
        <box gap={1}>
          <text fg={theme.textMuted}>
            {completedCount}/{count} operations completed
          </text>
          {toolCalls?.slice(0, 5).map((tc, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: BatchToolCall has no unique identifier
            <text fg={theme.text} key={`tc-${i}`}>
              {i < completedCount ? "\u2713" : "\u25CB"} {tc.tool}
            </text>
          ))}
          {count > 5 && (
            <text fg={theme.textMuted}>... and {count - 5} more</text>
          )}
        </box>
      </BlockTool>
    );
  }

  return (
    <InlineTool
      complete={isComplete}
      hasError={!!error}
      icon={"\u229B"}
      pending={`Running batch: ${displayDesc}...`}
    >
      Batch "{displayDesc}" ({count} operations)
    </InlineTool>
  );
}
