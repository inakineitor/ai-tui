import { RGBA } from "@opentui/core";
import type {
  ChatTransport,
  DirectChatTransportOptions,
  InferUITools,
  Output,
  ToolSet,
  UIMessage,
} from "ai";

import type { ToolComponentsMap } from "#routes/session/components/message-list/index.ts";

/** Handler for elicitation requests from AI agents */
export type ElicitationHandler = (message: string) => Promise<string>;

export type AgentMetadata = {
  id: string;
  name: string;
  model: { providerName: string; name: string };
  color: RGBA;
};

export type SubagentDefinition = {
  id: string;
  description: string;
  color?: Color;
};

/**
 * Hex color string type.
 * Matches patterns like "#fff", "#ffffff", "#ABCDEF"
 */
export type HexColor = `#${string}`;

/**
 * Color input type - accepts RGBA object or hex string.
 * Used for public API to provide good DX.
 */
export type Color = RGBA | HexColor;

/**
 * Style for a title section in the logo.
 * - 'gradient': Apply gradient coloring across characters
 * - 'muted': Use theme.textMuted color
 * - 'plain': Use theme.text (default)
 */
export type TitleStyle = "gradient" | "muted" | "plain";

/**
 * A single section of the app title.
 * Each section is rendered as figlet text with the specified style.
 */
export type TitleSection = {
  /** The text to render (will be converted to figlet) */
  text: string;
  /** The visual style to apply (default: 'plain') */
  style?: TitleStyle;
  /** Gradient colors (only used when style is 'gradient'). Falls back to default teen colors if not provided. */
  gradient?: string[];
};

/**
 * App name configuration for the logo.
 * Defines an ordered array of title sections with configurable separator.
 */
export type AppName = {
  /** Ordered array of title sections */
  sections: TitleSection[];
  /** Separator between sections (default: "    " - 4 spaces) */
  separator?: string;
};

export type CommandDefinition = {
  name: string;
  hint: string;
};

export type AgentId = string;
export type AgentName = string;
export type AgentModel = {
  providerName: string;
  name: string;
};
export type AgentColor = RGBA;
// TODO: The `never` for DATA_PARTS (2nd generic) should probably be `UIDataTypes`.
// Using `never` may cause restrictive typing in messageMetadata callbacks.
export type AgentCreateTransport<
  CALL_OPTIONS,
  TOOLS extends ToolSet,
  OUTPUT extends Output.Output,
  UI_MESSAGE extends UIMessage<unknown, never, InferUITools<TOOLS>> = UIMessage<
    unknown,
    never,
    InferUITools<TOOLS>
  >,
> = (options: {
  /**
   * Elicitation handler for DirectChatTransport.
   * Ignored for HTTP-based transports (server handles elicitation).
   */
  onElicitation?: ElicitationHandler;

  /** Transport-level configuration */
  transportOptions: Omit<
    DirectChatTransportOptions<CALL_OPTIONS, TOOLS, OUTPUT, UI_MESSAGE>,
    "agent"
  >;
}) => Promise<ChatTransport<UIMessage>>;

export class Agent<
  CALL_OPTIONS = never,
  TOOLS extends ToolSet = ToolSet,
  OUTPUT extends Output.Output = never,
  UI_MESSAGE extends UIMessage<unknown, never, InferUITools<TOOLS>> = UIMessage<
    unknown,
    never,
    InferUITools<TOOLS>
  >,
> {
  id: AgentId;
  name: AgentName;
  model: AgentModel;
  color: AgentColor;
  /** Factory function that creates the transport */
  createTransport: AgentCreateTransport<
    CALL_OPTIONS,
    TOOLS,
    OUTPUT,
    UI_MESSAGE
  >;
  /**
   * Custom tool component renderers for this agent.
   * Keys are tool names (exact match only), values are React components.
   * These take precedence over the global tool renderer registry.
   */
  toolComponents?: ToolComponentsMap;
  /**
   * Placeholder suggestions shown in the prompt input when empty.
   * A random placeholder is selected from this array.
   * If not provided, defaults to "Ask anything...".
   */
  placeholders?: string[];

  constructor({
    id,
    name,
    model,
    color,
    createTransport,
    toolComponents,
    placeholders,
  }: {
    id: AgentId;
    name: AgentName;
    model: AgentModel;
    color: Color;
    createTransport: AgentCreateTransport<
      CALL_OPTIONS,
      TOOLS,
      OUTPUT,
      UI_MESSAGE
    >;
    /** Custom tool component renderers for this agent */
    toolComponents?: ToolComponentsMap;
    /** Placeholder suggestions shown in the prompt input when empty */
    placeholders?: string[];
  }) {
    this.id = id;
    this.name = name;
    this.model = model;
    this.color = color instanceof RGBA ? color : RGBA.fromHex(color);
    this.createTransport = createTransport;
    this.toolComponents = toolComponents;
    this.placeholders = placeholders;
  }

  metadata() {
    return {
      id: this.id,
      name: this.name,
      model: this.model,
      color: this.color,
    };
  }
}

/**
 * Base config properties shared between input and resolved types.
 */
type ConfigBase<
  TAgents extends readonly Agent<any, any, any, any>[] = Agent<
    any,
    any,
    any,
    any
  >[],
> = {
  /**
   * Application identifier used for XDG-compliant storage paths.
   * Should be kebab-case (e.g., "my-design-agent", "ai-sdk-tui").
   * Determines where config and data files are stored:
   * - Config: ~/.config/<id>/
   * - Data: ~/.local/share/<id>/
   */
  id: string;
  agents: TAgents;
};

/**
 * Config input type - what users pass to TerminalUI/ConfigProvider.
 * Optional properties have sensible defaults applied.
 *
 * @template TAgents - The array type of agents, preserving their specific type parameters
 */
export type ConfigInput<
  TAgents extends readonly Agent<any, any, any, any>[] = Agent<
    any,
    any,
    any,
    any
  >[],
> = ConfigBase<TAgents> & {
  subagents?: SubagentDefinition[];
  appName?: AppName;
  commands?: CommandDefinition[];
  tips?: string[];
};

/**
 * Resolved config type - returned by useConfig() with all defaults applied.
 * All properties are guaranteed to be present.
 *
 * @template TAgents - The array type of agents, preserving their specific type parameters
 */
export type Config<
  TAgents extends readonly Agent<any, any, any, any>[] = Agent<
    any,
    any,
    any,
    any
  >[],
> = ConfigBase<TAgents> & {
  subagents: SubagentDefinition[];
  appName: AppName;
  commands: CommandDefinition[];
  tips: string[];
};

// Re-export tool renderer types for custom tool components
export type {
  ToolComponentsMap,
  ToolPartInfo,
  ToolRendererProps,
  ToolState,
  ToolStatus,
} from "#routes/session/components/message-list/index.ts";
