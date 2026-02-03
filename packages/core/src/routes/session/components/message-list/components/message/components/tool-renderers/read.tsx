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

  return `${prefix}/.../  ${filename}`;
}

export function ReadTool({ tool, isComplete }: ToolRendererProps) {
  const { input, metadata } = tool.state;

  const filePath = input?.filePath as string | undefined;
  const offset = input?.offset as number | undefined;
  const limit = input?.limit as number | undefined;
  const linesRead = metadata?.linesRead as number | undefined;

  const displayPath = filePath ? truncatePath(filePath, 45) : "file";

  let description = displayPath;

  if (offset !== undefined || limit !== undefined) {
    const start = offset ?? 0;
    const end = limit ? start + limit : "end";
    description += `:${start}-${end}`;
  }

  if (linesRead !== undefined) {
    description += ` [${linesRead} lines]`;
  }

  return (
    <InlineTool
      complete={isComplete}
      hasError={tool.state.status === "error"}
      icon={"\u25CE"}
      pending={`Reading ${displayPath}...`}
    >
      {description}
    </InlineTool>
  );
}
