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

export function ApplyPatchTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, metadata, error } = tool.state;

  const filePath = input?.filePath as string | undefined;
  const patch = input?.patch as string | undefined;

  const patchLines = patch ? (patch.match(/\n/g)?.length ?? 0) + 1 : 0;
  const additions = (metadata?.additions as number | undefined) ?? 0;
  const deletions = (metadata?.deletions as number | undefined) ?? 0;
  const hunks = (metadata?.hunks as number | undefined) ?? 1;

  const displayPath = filePath ? truncatePath(filePath, 40) : "file";

  if (error) {
    return (
      <BlockTool hasError title={`Patch: ${displayPath}`}>
        <text fg={theme.error} paddingLeft={1}>
          {error}
        </text>
      </BlockTool>
    );
  }

  return (
    <InlineTool
      complete={isComplete}
      icon={"\u2699"}
      pending={`Applying patch to ${displayPath}...`}
    >
      {displayPath}
      {hunks > 0 && <span fg={theme.textMuted}> ({hunks} hunks)</span>}
      {patchLines > 0 && <span fg={theme.textMuted}> {patchLines} lines</span>}
      {(additions > 0 || deletions > 0) && (
        <>
          {additions > 0 && <span fg={theme.diffAdded}> +{additions}</span>}
          {deletions > 0 && <span fg={theme.diffRemoved}> -{deletions}</span>}
        </>
      )}
    </InlineTool>
  );
}
