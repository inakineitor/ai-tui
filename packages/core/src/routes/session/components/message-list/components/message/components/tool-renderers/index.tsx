import type { ReactNode } from "react";

import { GenericTool } from "../../generic.js";
import type { ToolRendererProps } from "../../types.js";
import { ApplyPatchTool } from "./apply-patch.js";
import { BashTool } from "./bash.js";
import { BatchTool } from "./batch.js";
import { CodeSearchTool } from "./codesearch.js";
import { EditTool } from "./edit.js";
import { GlobTool } from "./glob.js";
import { GrepTool } from "./grep.js";
import { ListTool } from "./list.js";
import { LspTool } from "./lsp.js";
import { MultiEditTool } from "./multiedit.js";
import { PlanTool } from "./plan.js";
import { QuestionTool } from "./question.js";
import { ReadTool } from "./read.js";
import { SkillTool } from "./skill.js";
import { TaskTool } from "./task.js";
import { TodoWriteTool } from "./todowrite.js";
import { WebFetchTool } from "./webfetch.js";
import { WebSearchTool } from "./websearch.js";
import { WriteTool } from "./write.js";

// biome-ignore lint/performance/noBarrelFile: intentional public API for tool renderers
export { BlockTool } from "../../block-tool.js";
export { InlineTool } from "../../inline-tool.js";
export type {
  ToolPartInfo,
  ToolRendererProps,
  ToolState,
  ToolStatus,
} from "../../types.js";
export { extractToolInfo, mapAISDKState } from "../../types.js";

/** Function component type for rendering tool calls */
export type ToolRenderer = (props: ToolRendererProps) => ReactNode;

const TOOL_RENDERERS: Record<string, ToolRenderer> = {
  bash: BashTool,
  interactive_bash: BashTool,
  read: ReadTool,
  write: WriteTool,
  edit: EditTool,
  glob: GlobTool,
  grep: GrepTool,
  task: TaskTool,
  webfetch: WebFetchTool,
  web_fetch: WebFetchTool,
  todowrite: TodoWriteTool,
  todo_write: TodoWriteTool,
  todoread: TodoWriteTool,
  apply_patch: ApplyPatchTool,
  applypatch: ApplyPatchTool,
  lsp_hover: LspTool,
  lsp_diagnostics: LspTool,
  lsp_goto_definition: LspTool,
  lsp_find_references: LspTool,
  lsp_document_symbols: LspTool,
  lsp_workspace_symbols: LspTool,
  lsp_rename: LspTool,
  lsp_code_actions: LspTool,
  lsp_code_action_resolve: LspTool,
  lsp_prepare_rename: LspTool,
  lsp_servers: LspTool,

  // Search tools
  codesearch: CodeSearchTool,
  code_search: CodeSearchTool,
  websearch: WebSearchTool,
  web_search: WebSearchTool,

  // List tool
  list: ListTool,
  ls: ListTool,

  // Question tool
  question: QuestionTool,

  // Batch tool
  batch: BatchTool,

  // MultiEdit tool
  multiedit: MultiEditTool,
  multi_edit: MultiEditTool,

  // Plan tools
  plan_enter: PlanTool,
  plan_exit: PlanTool,

  // Skill tool
  skill: SkillTool,
};

/**
 * Get the appropriate renderer for a tool call.
 *
 * @param toolName - The name of the tool to render
 * @param customComponents - Optional custom tool components from Agent
 * @returns The tool renderer component
 *
 * Resolution order (exact match only):
 * 1. Exact match in customComponents
 * 2. Exact match in global TOOL_RENDERERS
 * 3. GenericTool fallback
 */
export function getToolRenderer(
  toolName: string,
  customComponents?: Record<string, ToolRenderer>
): ToolRenderer {
  // Check custom components first (exact match)
  if (customComponents?.[toolName]) {
    return customComponents[toolName];
  }

  // Check global registry (exact match)
  if (TOOL_RENDERERS[toolName]) {
    return TOOL_RENDERERS[toolName];
  }

  return GenericTool;
}
