import { BlockTool } from "../../block-tool.js";
import { InlineTool } from "../../inline-tool.js";
import type { ToolRendererProps } from "../../types.js";

export function GlobTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, output, error } = tool.state;

  const pattern = input?.pattern as string | undefined;

  let files: string[] = [];
  if (output) {
    try {
      const parsed = JSON.parse(output);
      files = Array.isArray(parsed) ? parsed : [];
    } catch {
      files = output.split("\n").filter(Boolean);
    }
  }

  const fileCount = files.length;

  if (error) {
    return (
      <InlineTool
        complete={isComplete}
        hasError
        icon={"\u229B"}
        pending={`Searching ${pattern ?? "files"}...`}
      >
        {pattern ?? "glob"} [error]
      </InlineTool>
    );
  }

  if (fileCount <= 3) {
    return (
      <InlineTool
        complete={isComplete}
        icon={"\u229B"}
        pending={`Searching ${pattern ?? "files"}...`}
      >
        {pattern ?? "glob"}
        <span fg={theme.textMuted}> [{fileCount} files]</span>
      </InlineTool>
    );
  }

  return (
    <BlockTool
      collapsible
      defaultCollapsed
      title={`${pattern ?? "glob"} [${fileCount} files]`}
    >
      <box maxHeight={10} paddingLeft={1}>
        {files.slice(0, 10).map((file) => (
          <text fg={theme.textMuted} key={file}>
            {file.endsWith("/") ? "\u{1F4C1}" : "\u{1F4C4}"} {file}
          </text>
        ))}
        {fileCount > 10 && (
          <text fg={theme.textMuted}>... and {fileCount - 10} more</text>
        )}
      </box>
    </BlockTool>
  );
}
