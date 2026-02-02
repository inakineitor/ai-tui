# @ai-sdk-tui/core

A terminal UI framework for building AI agent interfaces with the [Vercel AI SDK](https://sdk.vercel.ai/). Built with React and [OpenTUI](https://github.com/AltNext/opentui).

## Requirements

- **Bun >= 1.1.0** (required runtime)

## Installation

```bash
bun add @ai-sdk-tui/core
```

## Quick Start

```typescript
import { TerminalUI, Agent, type ConfigInput } from "@ai-sdk-tui/core";
import { anthropic } from "@ai-sdk/anthropic";
import { DirectChatTransport, ToolLoopAgent, stepCountIs } from "ai";

// Define your agent
const myAgent = new Agent({
  id: "assistant",
  name: "Assistant",
  model: { providerName: "Anthropic", name: "Claude Sonnet 4" },
  color: "#82aaff",
  createTransport: async ({ transportOptions }) => {
    const agent = new ToolLoopAgent({
      model: anthropic("claude-sonnet-4-20250514"),
      tools: {},
      instructions: "You are a helpful assistant.",
      stopWhen: stepCountIs(50),
    });
    return new DirectChatTransport({ agent, ...transportOptions });
  },
});

// Configure and run the TUI
const config: ConfigInput = {
  id: "my-agent-cli",
  agents: [myAgent],
  appName: {
    sections: [
      { text: "My", style: "muted" },
      { text: "Agent" },
    ],
  },
};

const tui = new TerminalUI(config);
await tui.run();
```

## Features

- Multi-agent support with easy switching
- Customizable theming system
- Tool result renderers for rich UI
- Keyboard shortcuts and commands
- File attachments and clipboard support
- Session persistence

## Core Exports

### Classes

- `TerminalUI` - Main entry point for running the TUI
- `Agent` - Define AI agents with display properties

### Theme System

```typescript
import {
  openCodeTheme,
  vercelTheme,
  oneDarkTheme,
  resolveTheme,
  extendTheme,
} from "@ai-sdk-tui/core";
```

### Tool Renderers

```typescript
import { BlockTool, InlineTool } from "@ai-sdk-tui/core";

// Create custom tool renderers
function MyToolRenderer({ tool, isComplete, theme }: ToolRendererProps) {
  if (!isComplete) {
    return <InlineTool complete={false} icon="..." pending="Loading...">my-tool</InlineTool>;
  }
  return <BlockTool title="My Tool Result">{/* content */}</BlockTool>;
}

// Register per-agent
const agent = new Agent({
  // ...
  toolComponents: {
    "my-tool-name": MyToolRenderer,
  },
});
```

## Configuration

### ConfigInput

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | App identifier for XDG storage paths |
| `agents` | `Agent[]` | Array of agent definitions |
| `appName` | `AppName` | Title sections for the logo |
| `subagents` | `SubagentDefinition[]` | Optional subagent definitions |
| `commands` | `CommandDefinition[]` | Optional slash commands |
| `tips` | `string[]` | Optional tips shown on startup |

### Agent

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique agent identifier |
| `name` | `string` | Display name |
| `model` | `{ providerName, name }` | Model info for display |
| `color` | `HexColor \| RGBA` | Agent accent color |
| `createTransport` | `AgentCreateTransport` | Factory function for chat transport |
| `toolComponents` | `ToolComponentsMap` | Custom tool renderers |
| `placeholders` | `string[]` | Input placeholder suggestions |

## Peer Dependencies

- `@ai-sdk/react` >= 3.0.0
- `@opentui/core` >= 0.1.72
- `@opentui/react` >= 0.1.72
- `ai` >= 6.0.0
- `react` >= 19.0.0

## Acknowledgments

This TUI is adapted from [OpenCode](https://github.com/anomalyco/opencode) by Anomaly Co. The original Solid.js implementation was converted to React while preserving the core architectural patterns, theme system, keybind handling, and UI components. See [LICENSE](./LICENSE) for full attribution details.

## License

MIT
