/**
 * @ai-tui/core - A headless terminal UI framework for AI SDK applications
 *
 * Provides providers, hooks, types, and utilities for building AI TUI apps.
 * For the complete UI layer, use @ai-tui/components.
 */

// biome-ignore lint/performance/noBarrelFile: Intentional package entry point
export { RGBA } from "@opentui/core";

// --- Context Providers & Hooks ---

// Agent
export { AgentProvider, useAgent } from "./context/agent.js";
// Command
export {
  type Command,
  type CommandCategory,
  type CommandContextValue,
  type CommandPaletteOption,
  type CommandPaletteRenderer,
  CommandProvider,
  useCommand,
} from "./context/command.js";
// Config
export {
  ConfigProvider,
  useAgents,
  useAppId,
  useAppName,
  useCommands,
  useConfig,
  useSubagents,
  useTips,
} from "./context/config.js";
// Dialog
export {
  type DialogContextValue,
  DialogProvider,
  useDialog,
} from "./context/dialog.js";
// Elicitation
export {
  ElicitationProvider,
  type ElicitationRequest,
  useElicitation,
} from "./context/elicitation.js";
// Exit
export {
  type CleanupFn,
  type ExitContextValue,
  ExitProvider,
  useExit,
} from "./context/exit.js";
// Keybind
export {
  type KeyEvent,
  type KeybindAction,
  type KeybindConfig,
  type KeybindContextValue,
  type KeybindInfo,
  KeybindProvider,
  keybindInfoMatch,
  keybindInfoToString,
  useKeybind,
} from "./context/keybind.js";
// KV
export { KVProvider, useKV, useKVSignal } from "./context/kv.js";
// Prompt
export {
  FrecencyProvider,
  HistoryProvider,
  PromptProvider,
  StashProvider,
  useFrecency,
  useHistory,
  useStash,
} from "./context/prompt.js";
// Route
export {
  type HomeRoute,
  type Route,
  type RouteContext,
  RouteProvider,
  type SessionRoute,
  isHomeRoute,
  isSessionRoute,
  useRoute,
  useRouteData,
} from "./context/route.js";
// Session
export {
  type Session,
  type SessionContextStatus,
  type SessionContextValue,
  type SessionMessage,
  type SessionMessageMetadata,
  type SessionMessagePart,
  SessionProvider,
  type SessionStatus,
  useSession,
} from "./context/session.js";
// Theme
export {
  type DeepPartial,
  type Theme,
  type ThemeColors,
  type ThemeContextValue,
  type ThemeDefinition,
  type ThemeMode,
  ThemeProvider,
  extendTheme,
  getThemeNames,
  oneDarkTheme,
  openCodeTheme,
  resolveTheme,
  useTheme,
  vercelTheme,
} from "./context/theme/index.js";
// Toast
export {
  type ToastContextValue,
  type ToastOptions,
  ToastProvider,
  type ToastVariant,
  useToast,
} from "./context/toast.js";

// --- Hooks ---

export {
  type FileUIPart,
  type QueuedMessage,
  useMessageQueue,
} from "./hooks/use-message-queue.js";

// --- Library Utilities ---

// Clipboard
export { Clipboard, type ClipboardContent } from "./lib/clipboard.js";
// Terminal detection
export { detectTerminalMode } from "./lib/detect-terminal-mode.js";
// KV store
export { type KVStore, createKV } from "./lib/kv.js";
// Paths
export {
  getConfigDir,
  getDataDir,
  getXdgConfigHome,
  getXdgDataHome,
} from "./lib/paths.js";
// Prompt utilities
export {
  type FrecencyTracker,
  createFrecencyTracker,
} from "./lib/prompt/frecency.js";
export { type History, createHistory } from "./lib/prompt/history.js";
export { type Stash, createStash } from "./lib/prompt/stash.js";
export {
  type AgentPart,
  type AgentSegment,
  type AutocompleteOption,
  type AutocompleteState,
  type Extmark,
  type FilePart,
  type FileRefSegment,
  type FrecencyEntry,
  type HistoryEntry,
  type ImageSegment,
  type PromptInfo,
  type PromptPart,
  SUPPORTED_IMAGE_TYPES,
  type Segment,
  type StashEntry,
  type TextPart,
  type TextSegment,
  isEmbeddedImage,
  isImageMime,
} from "./lib/prompt/types.js";
// Type guards
export {
  type FinishPartWithUsage,
  isFinishPartWithUsage,
} from "./lib/type-guards.js";

// --- Types ---

// Tool renderer types and utilities
export {
  type ToolComponentsMap,
  type ToolPartInfo,
  type ToolRendererProps,
  type ToolState,
  type ToolStatus,
  extractToolInfo,
  mapAISDKState,
} from "./lib/tool-types.js";
export type {
  AgentColor,
  AgentCreateTransport,
  AgentId,
  AgentMetadata,
  AgentModel,
  AgentName,
  AppName,
  Color,
  CommandDefinition,
  Config,
  ConfigInput,
  ElicitationHandler,
  HexColor,
  SubagentDefinition,
  TitleSection,
  TitleStyle,
} from "./types.js";
export { Agent } from "./types.js";
