import path from "node:path";

import { useMemo } from "react";

import { InlineTool } from "../../inline-tool.js";
import type { ToolRendererProps } from "../../types.js";

function normalizePath(input?: string): string {
  if (!input) {
    return "";
  }
  if (path.isAbsolute(input)) {
    return path.relative(process.cwd(), input) || ".";
  }
  return input;
}

export function ListTool({ tool, isComplete }: ToolRendererProps) {
  const { input, error } = tool.state;
  const inputPath = input?.path as string | undefined;

  const dir = useMemo(() => {
    if (inputPath) {
      return normalizePath(inputPath);
    }
    return ".";
  }, [inputPath]);

  return (
    <InlineTool
      complete={isComplete}
      hasError={!!error}
      icon={"\u2192"}
      pending="Listing directory..."
    >
      List {dir}
    </InlineTool>
  );
}
