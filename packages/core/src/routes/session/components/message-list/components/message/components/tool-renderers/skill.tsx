import { InlineTool } from "../../inline-tool.js";
import type { ToolRendererProps } from "../../types.js";

export function SkillTool({ tool, isComplete }: ToolRendererProps) {
  const { input, error } = tool.state;
  const skillName = input?.name as string | undefined;
  const displayName = skillName ?? "skill";

  return (
    <InlineTool
      complete={isComplete}
      hasError={!!error}
      icon={"\u2728"}
      pending={`Loading skill: ${displayName}...`}
    >
      Loaded skill: {displayName}
    </InlineTool>
  );
}
