import { BlockTool } from "../../block-tool.js";
import { InlineTool } from "../../inline-tool.js";
import type { ToolRendererProps } from "../../types.js";

export function GrepTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, output, error } = tool.state;

  const pattern = input?.pattern as string | undefined;

  let matchCount = 0;
  let matches: Array<{ file: string; line: number; text: string }> = [];

  if (output) {
    try {
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed)) {
        matches = parsed;
        matchCount = parsed.length;
      }
    } catch {
      matchCount = output.split("\n").filter(Boolean).length;
    }
  }

  const searchDesc = pattern
    ? `"${pattern.length > 20 ? `${pattern.slice(0, 20)}...` : pattern}"`
    : "search";

  if (error) {
    return (
      <InlineTool
        complete={isComplete}
        hasError
        icon={"\u2295"}
        pending={`Searching for ${searchDesc}...`}
      >
        grep {searchDesc} [error]
      </InlineTool>
    );
  }

  if (matchCount <= 3) {
    return (
      <InlineTool
        complete={isComplete}
        icon={"\u2295"}
        pending={`Searching for ${searchDesc}...`}
      >
        grep {searchDesc}
        <span fg={theme.textMuted}> [{matchCount} matches]</span>
      </InlineTool>
    );
  }

  return (
    <BlockTool
      collapsible
      defaultCollapsed
      title={`grep ${searchDesc} [${matchCount} matches]`}
    >
      <box maxHeight={10} paddingLeft={1}>
        {matches.slice(0, 5).map((match, i) => (
          <text fg={theme.textMuted} key={`${match.file}-${match.line}-${i}`}>
            {match.file}:{match.line}
          </text>
        ))}
        {matchCount > 5 && (
          <text fg={theme.textMuted}>... and {matchCount - 5} more</text>
        )}
      </box>
    </BlockTool>
  );
}
