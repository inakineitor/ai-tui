import { BlockTool } from "../../block-tool.js";
import { InlineTool } from "../../inline-tool.js";
import type { ToolRendererProps } from "../../types.js";

type LspToolType =
  | "lsp_hover"
  | "lsp_diagnostics"
  | "lsp_goto_definition"
  | "lsp_find_references"
  | "lsp_document_symbols"
  | "lsp_workspace_symbols"
  | "lsp_rename"
  | "lsp_code_actions"
  | "lsp_code_action_resolve"
  | "lsp_prepare_rename"
  | "lsp_servers";

function getLspToolIcon(toolName: string): string {
  if (toolName.includes("hover")) {
    return "\u24D8";
  }
  if (toolName.includes("diagnostics")) {
    return "\u26A0";
  }
  if (toolName.includes("definition")) {
    return "\u2192";
  }
  if (toolName.includes("references")) {
    return "\u2190";
  }
  if (toolName.includes("symbols")) {
    return "\u2261";
  }
  if (toolName.includes("rename")) {
    return "\u270E";
  }
  if (toolName.includes("code_action")) {
    return "\u2699";
  }
  if (toolName.includes("servers")) {
    return "\u2630";
  }
  return "\u2139";
}

function getLspToolLabel(toolName: string): string {
  if (toolName.includes("hover")) {
    return "Hover";
  }
  if (toolName.includes("diagnostics")) {
    return "Diagnostics";
  }
  if (toolName.includes("goto_definition")) {
    return "Definition";
  }
  if (toolName.includes("find_references")) {
    return "References";
  }
  if (toolName.includes("document_symbols")) {
    return "Symbols";
  }
  if (toolName.includes("workspace_symbols")) {
    return "Workspace Symbols";
  }
  if (toolName.includes("rename")) {
    return "Rename";
  }
  if (toolName.includes("code_action_resolve")) {
    return "Apply Action";
  }
  if (toolName.includes("code_actions")) {
    return "Code Actions";
  }
  if (toolName.includes("prepare_rename")) {
    return "Prepare Rename";
  }
  if (toolName.includes("servers")) {
    return "LSP Servers";
  }
  return "LSP";
}

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

export function LspTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, output, error } = tool.state;
  const toolName = tool.toolName as LspToolType;

  const filePath = input?.filePath as string | undefined;
  const line = input?.line as number | undefined;
  const character = input?.character as number | undefined;
  const query = input?.query as string | undefined;
  const newName = input?.newName as string | undefined;

  const icon = getLspToolIcon(toolName);
  const label = getLspToolLabel(toolName);
  const displayPath = filePath ? truncatePath(filePath, 30) : undefined;

  if (error) {
    return (
      <BlockTool hasError title={`${label}: ${displayPath ?? "LSP"}`}>
        <text fg={theme.error} paddingLeft={1}>
          {error}
        </text>
      </BlockTool>
    );
  }

  const locationInfo =
    displayPath && line !== undefined
      ? `${displayPath}:${line}${character !== undefined ? `:${character}` : ""}`
      : displayPath;

  const extraInfo = query
    ? `"${query}"`
    : newName
      ? `-> ${newName}`
      : undefined;

  const resultCount = output ? countResults(toolName, output) : undefined;

  return (
    <InlineTool
      complete={isComplete}
      icon={icon}
      pending={`${label}${locationInfo ? ` at ${locationInfo}` : ""}...`}
    >
      {label}
      {locationInfo && <span fg={theme.textMuted}> {locationInfo}</span>}
      {extraInfo && <span fg={theme.info}> {extraInfo}</span>}
      {resultCount !== undefined && (
        <span fg={theme.success}> ({resultCount})</span>
      )}
    </InlineTool>
  );
}

function countResults(toolName: string, output: string): number | undefined {
  try {
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed)) {
      return parsed.length;
    }
    if (
      toolName.includes("diagnostics") &&
      Array.isArray(parsed?.diagnostics)
    ) {
      return parsed.diagnostics.length;
    }
    if (toolName.includes("references") && Array.isArray(parsed?.references)) {
      return parsed.references.length;
    }
    if (toolName.includes("symbols") && Array.isArray(parsed?.symbols)) {
      return parsed.symbols.length;
    }
  } catch {
    return;
  }
  return;
}
