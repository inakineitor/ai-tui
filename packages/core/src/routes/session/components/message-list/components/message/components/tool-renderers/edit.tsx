import { BlockTool } from "../../block-tool.js";
import { InlineTool } from "../../inline-tool.js";
import type { ToolRendererProps } from "../../types.js";

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

export function EditTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, metadata, error } = tool.state;

  const filePath = input?.filePath as string | undefined;
  const oldString = input?.oldString as string | undefined;
  const newString = input?.newString as string | undefined;

  const oldLines = oldString ? (oldString.match(/\n/g)?.length ?? 0) + 1 : 0;
  const newLines = newString ? (newString.match(/\n/g)?.length ?? 0) + 1 : 0;
  const additions =
    (metadata?.additions as number | undefined) ??
    (newLines > oldLines ? newLines - oldLines : 0);
  const deletions =
    (metadata?.deletions as number | undefined) ??
    (oldLines > newLines ? oldLines - newLines : 0);

  const displayPath = filePath ? truncatePath(filePath, 40) : "file";

  if (error) {
    return (
      <BlockTool hasError title={`Edit: ${displayPath}`}>
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
      pending={`Editing ${displayPath}...`}
    >
      {displayPath}
      {(additions > 0 || deletions > 0) && (
        <>
          {additions > 0 && <span fg={theme.diffAdded}> +{additions}</span>}
          {deletions > 0 && <span fg={theme.diffRemoved}> -{deletions}</span>}
        </>
      )}
    </InlineTool>
  );
}
