import { BlockTool } from "../../block-tool.tsx";
import { InlineTool } from "../../inline-tool.tsx";
import type { ToolRendererProps } from "../../types.ts";

export function TaskTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, error, metadata } = tool.state;

  const description = input?.description as string | undefined;
  const prompt = input?.prompt as string | undefined;
  const subagentType = input?.subagent_type as string | undefined;
  const duration = metadata?.duration as number | undefined;

  const taskDesc = description ?? prompt?.slice(0, 40) ?? "task";

  if (error) {
    return (
      <BlockTool hasError title={`Task: ${taskDesc}`}>
        <text fg={theme.error} paddingLeft={1}>
          {error}
        </text>
      </BlockTool>
    );
  }

  if (!isComplete) {
    return (
      <InlineTool complete={false} icon={"\u25B6"} pending={taskDesc}>
        {taskDesc}
      </InlineTool>
    );
  }

  return (
    <InlineTool complete icon={"\u25B6"} pending={taskDesc}>
      {taskDesc}
      {subagentType && <span fg={theme.textMuted}> ({subagentType})</span>}
      {duration !== undefined && (
        <span fg={theme.textMuted}> {Math.round(duration / 1000)}s</span>
      )}
    </InlineTool>
  );
}
