import { useMemo } from "react";

import { BlockTool } from "../../block-tool.tsx";
import { InlineTool } from "../../inline-tool.tsx";
import type { ToolRendererProps } from "../../types.ts";

type EditOperation = {
  oldString: string;
  newString: string;
};

function truncatePath(filePath: string, maxLen: number): string {
  if (filePath.length <= maxLen) {
    return filePath;
  }
  const parts = filePath.split("/");
  const filename = parts.pop() ?? "";
  if (filename.length >= maxLen - 3) {
    return `...${filename.slice(-(maxLen - 3))}`;
  }
  const remaining = maxLen - filename.length - 4;
  const prefix = parts.join("/").slice(0, remaining);
  return `${prefix}/.../${filename}`;
}

export function MultiEditTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, error } = tool.state;
  const filePath = input?.filePath as string | undefined;
  const edits = input?.edits as EditOperation[] | undefined;

  const editCount = useMemo(() => edits?.length ?? 0, [edits]);
  const displayPath = filePath ? truncatePath(filePath, 40) : "file";

  const { additions, deletions } = useMemo(() => {
    if (!edits) {
      return { additions: 0, deletions: 0 };
    }
    let adds = 0;
    let dels = 0;
    for (const edit of edits) {
      const oldLines = edit.oldString
        ? (edit.oldString.match(/\n/g)?.length ?? 0) + 1
        : 0;
      const newLines = edit.newString
        ? (edit.newString.match(/\n/g)?.length ?? 0) + 1
        : 0;
      if (newLines > oldLines) {
        adds += newLines - oldLines;
      }
      if (oldLines > newLines) {
        dels += oldLines - newLines;
      }
    }
    return { additions: adds, deletions: dels };
  }, [edits]);

  if (error) {
    return (
      <BlockTool hasError title={`MultiEdit: ${displayPath}`}>
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
      {displayPath} ({editCount} edits)
      {(additions > 0 || deletions > 0) && (
        <>
          {additions > 0 && <span fg={theme.diffAdded}> +{additions}</span>}
          {deletions > 0 && <span fg={theme.diffRemoved}> -{deletions}</span>}
        </>
      )}
    </InlineTool>
  );
}
