import { BlockTool } from "../../block-tool.tsx";
import { InlineTool } from "../../inline-tool.tsx";
import type { ToolRendererProps } from "../../types.ts";

function truncatePath(path: string, maxLen: number): string {
  if (path.length <= maxLen) {
    return path;
  }
  const parts = path.split("/");
  const filename = parts.pop() ?? "";
  if (filename.length >= maxLen - 3) {
    return `...${filename.slice(-(maxLen - 3))}`;
  }
  const remaining = maxLen - filename.length - 4;
  const prefix = parts.join("/").slice(0, remaining);
  return `${prefix}/.../${filename}`;
}

export function WriteTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, metadata, error } = tool.state;

  const filePath = input?.filePath as string | undefined;
  const content = input?.content as string | undefined;
  const linesWritten =
    (metadata?.linesWritten as number | undefined) ??
    (content ? (content.match(/\n/g)?.length ?? 0) + 1 : undefined);

  const displayPath = filePath ? truncatePath(filePath, 45) : "file";

  if (error) {
    return (
      <BlockTool hasError title={`Write: ${displayPath}`}>
        <text fg={theme.error} paddingLeft={1}>
          {error}
        </text>
      </BlockTool>
    );
  }

  return (
    <InlineTool
      complete={isComplete}
      icon={"\u270E"}
      pending={`Writing ${displayPath}...`}
    >
      {displayPath}
      {linesWritten !== undefined && (
        <span fg={theme.textMuted}> [{linesWritten} lines]</span>
      )}
    </InlineTool>
  );
}
