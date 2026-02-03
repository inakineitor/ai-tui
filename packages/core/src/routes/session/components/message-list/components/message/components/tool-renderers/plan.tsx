import { InlineTool } from "../../inline-tool.js";
import type { ToolRendererProps } from "../../types.js";

export function PlanTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { toolName } = tool;
  const { error } = tool.state;

  const isEnter = toolName === "plan_enter";
  const icon = isEnter ? "\u25B6" : "\u25A0";
  const action = isEnter ? "Entering" : "Exiting";

  return (
    <InlineTool
      complete={isComplete}
      hasError={!!error}
      icon={icon}
      iconColor={theme.accent}
      pending={`${action} plan mode...`}
    >
      {action} plan mode
    </InlineTool>
  );
}
