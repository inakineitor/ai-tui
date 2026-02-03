/**
 * @ai-sdk-tui/core - A terminal UI framework for AI SDK applications
 *
 * Main exports:
 * - TerminalUI: Main class for creating a TUI application
 * - Agent: Class for defining an AI agent with display properties
 *
 * Theme exports for customization:
 * - Theme definitions (raw JSON structures):
 *   - openCodeTheme: The OpenCode theme definition
 *   - vercelTheme: The Vercel theme definition
 *   - oneDarkTheme: The One Dark theme definition
 *
 * - Theme utilities:
 *   - resolveTheme: Convert a definition to a resolved Theme for a specific mode
 *   - extendTheme: Create custom themes by extending a resolved theme
 *
 * Tool Renderer exports:
 * - BlockTool: Multi-line tool display component
 * - InlineTool: Single-line tool display component
 *
 * @example
 * ```typescript
 * import { TerminalUI, Agent, type Config } from '@ai-sdk-tui/core';
 * import { anthropic } from '@ai-sdk/anthropic';
 * import { DirectChatTransport, ToolLoopAgent } from 'ai';
 *
 * const myAgent = new Agent({
 *   id: 'assistant',
 *   name: 'Assistant',
 *   model: { providerName: 'Anthropic', name: 'Claude Sonnet 4' },
 *   color: '#82aaff',
 *   createTransport: async ({ transportOptions }) => {
 *     const agent = new ToolLoopAgent({
 *       model: anthropic('claude-sonnet-4-20250514'),
 *       tools: {},
 *       instructions: 'You are a helpful assistant.',
 *     });
 *     return new DirectChatTransport({ agent, ...transportOptions });
 *   },
 * });
 *
 * const tui = new TerminalUI({
 *   id: 'my-app',
 *   agents: [myAgent],
 *   appName: {
 *     sections: [{ text: 'My', style: 'muted' }, { text: 'Agent' }],
 *   },
 * });
 *
 * await tui.run();
 * ```
 */

// Re-exports from dependencies for convenience
// biome-ignore lint/performance/noBarrelFile: Intentional package entry point - this is the main export file
export { RGBA } from "@opentui/core";

// Main class
export { type CliRendererConfig, TerminalUI } from "./agent-tui.js";
export type {
  DeepPartial,
  Theme,
  ThemeColors,
  ThemeDefinition,
  ThemeMode,
} from "./context/theme/index.js";
// Theme system
export {
  extendTheme,
  oneDarkTheme,
  openCodeTheme,
  resolveTheme,
  vercelTheme,
} from "./context/theme/index.js";
// Message queue types (used by QueuedUserMessage component)
export type { FileUIPart, QueuedMessage } from "./hooks/use-message-queue.js";
// Tool renderer base components
export {
  BlockTool,
  InlineTool,
} from "./routes/session/components/message-list/index.js";
export type {
  // Agent types
  AgentCreateTransport,
  AgentId,
  AgentMetadata,
  AgentModel,
  AppName,
  // Color types
  Color,
  CommandDefinition,
  // Config types
  Config,
  ConfigInput,
  // Handler type
  ElicitationHandler,
  HexColor,
  // UI types
  SubagentDefinition,
  TitleSection,
  TitleStyle,
  // Tool renderer types
  ToolComponentsMap,
  ToolPartInfo,
  ToolRendererProps,
  ToolState,
  ToolStatus,
} from "./types.js";
// Agent class and types
export { Agent } from "./types.js";
