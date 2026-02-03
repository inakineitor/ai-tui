import { InlineTool } from "../../inline-tool.js";
import type { ToolRendererProps } from "../../types.js";

export function CodeSearchTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, metadata, error } = tool.state;
  const query = input?.query as string | undefined;
  const results = metadata?.results as number | undefined;

  const displayQuery = query
    ? query.length > 30
      ? `${query.slice(0, 30)}...`
      : query
    : "code";

  return (
    <InlineTool
      complete={isComplete}
      hasError={!!error}
      icon={"\u25C7"}
      pending={"Searching code..."}
    >
      Exa Code Search "{displayQuery}"
      {results !== undefined && (
        <text fg={theme.textMuted}> ({results} results)</text>
      )}
    </InlineTool>
  );
}
