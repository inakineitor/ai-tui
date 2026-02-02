import { InlineTool } from "../../inline-tool.tsx";
import type { ToolRendererProps } from "../../types.ts";

export function WebFetchTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, error } = tool.state;

  const url = input?.url as string | undefined;
  const format = input?.format as string | undefined;

  let displayUrl = url ?? "URL";
  if (displayUrl.length > 40) {
    try {
      const urlObj = new URL(displayUrl);
      displayUrl = urlObj.hostname + urlObj.pathname.slice(0, 20);
      if (urlObj.pathname.length > 20) {
        displayUrl += "...";
      }
    } catch {
      displayUrl = `${displayUrl.slice(0, 40)}...`;
    }
  }

  return (
    <InlineTool
      complete={isComplete}
      hasError={!!error}
      icon={"\u2299"}
      pending={`Fetching ${displayUrl}...`}
    >
      {displayUrl}
      {format && format !== "markdown" && (
        <span fg={theme.textMuted}> ({format})</span>
      )}
    </InlineTool>
  );
}
