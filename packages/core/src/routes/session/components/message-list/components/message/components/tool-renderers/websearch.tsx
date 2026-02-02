import { InlineTool } from "../../inline-tool.tsx";
import type { ToolRendererProps } from "../../types.ts";

export function WebSearchTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, metadata, error } = tool.state;
  const query = input?.query as string | undefined;
  const numResults = metadata?.numResults as number | undefined;

  const displayQuery = query
    ? query.length > 30
      ? `${query.slice(0, 30)}...`
      : query
    : "web";

  return (
    <InlineTool
      complete={isComplete}
      hasError={!!error}
      icon={"\u25C8"}
      pending={"Searching web..."}
    >
      Exa Web Search "{displayQuery}"
      {numResults !== undefined && (
        <text fg={theme.textMuted}> ({numResults} results)</text>
      )}
    </InlineTool>
  );
}
