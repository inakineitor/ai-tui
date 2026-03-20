/**
 * @ai-tui/components - UI components for AI TUI applications
 *
 * Re-exports the headless framework from @ai-tui/core and adds
 * the complete UI layer: App composition root, TerminalUI, routes,
 * and all visual components.
 */

// biome-ignore lint/performance/noBarrelFile: Intentional package entry point - re-exports @ai-tui/core
export * from "@ai-tui/core";

// Main entry points
export { type CliRendererConfig, TerminalUI } from "./agent-tui.js";
export { App } from "./app.js";
// Tool renderer base components
export {
  BlockTool,
  InlineTool,
} from "./routes/session/components/message-list/index.js";
