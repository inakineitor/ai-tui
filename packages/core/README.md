# @ai-tui/core

[![npm version](https://img.shields.io/npm/v/@ai-tui/core?style=flat-square)](https://www.npmjs.com/package/@ai-tui/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-≥20-green?style=flat-square)](https://nodejs.org)

A terminal UI framework for building AI agent interfaces with the [Vercel AI SDK](https://sdk.vercel.ai). Built with React and [OpenTUI](https://github.com/AltNext/opentui).

[Get started](#getting-started) | [Features](#features) | [Configuration](#configuration) | [Theming](#theming) | [Tool renderers](#tool-renderers)

---

## Overview

`@ai-tui/core` lets you build rich terminal interfaces for AI agents in minutes. Define your agents, pick a theme, and get a full-featured TUI with chat, tool visualization, session management, and keyboard-driven navigation — all wired into the Vercel AI SDK.

Adapted from [OpenCode](https://github.com/anomalyco/opencode) by Anomaly Co., converted from Solid.js to React while preserving the core architecture, theme system, and UI components. See [LICENSE](./LICENSE) for full attribution.

## Getting started

### Prerequisites

- Node.js 20 or later

### Installation

```bash
npm install @ai-tui/core
```

### Peer dependencies

You'll also need the following:

```bash
npm install ai @ai-sdk/react react @opentui/core @opentui/react
```

### Quick example

```typescript
import { TerminalUI, Agent, type ConfigInput } from "@ai-tui/core";
import { anthropic } from "@ai-sdk/anthropic";
import { DirectChatTransport, ToolLoopAgent, stepCountIs } from "ai";

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

- **Multi-agent support** — define multiple agents and switch between them
- **Theming** — built-in themes (OpenCode, Vercel, One Dark) with full customization support
- **Tool renderers** — rich terminal UI for tool calls (bash, file edits, search, etc.) with custom renderer support
- **Slash commands** — extensible command system with fuzzy autocomplete
- **Session persistence** — XDG-compliant storage with session history and resume
- **File attachments** — attach files and paste from clipboard
- **Keyboard-driven** — comprehensive keybindings for navigation, dialogs, and agent switching
- **Subagent display** — show subagent activity inline
- **Sidebar** — context panel with files, todos, and session info
- **Elicitation** — handle interactive prompts from AI agents

## Configuration

### `ConfigInput`

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | App identifier for XDG storage paths (kebab-case) |
| `agents` | `Agent[]` | Yes | Array of agent definitions |
| `appName` | `AppName` | No | Title sections for the ASCII logo |
| `subagents` | `SubagentDefinition[]` | No | Subagent definitions for inline display |
| `commands` | `CommandDefinition[]` | No | Custom slash commands |
| `tips` | `string[]` | No | Tips shown on the home screen |

### `Agent`

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique agent identifier |
| `name` | `string` | Yes | Display name |
| `model` | `{ providerName, name }` | Yes | Model info shown in the header |
| `color` | `HexColor \| RGBA` | Yes | Agent accent color |
| `createTransport` | `AgentCreateTransport` | Yes | Factory function returning a `ChatTransport` |
| `toolComponents` | `ToolComponentsMap` | No | Custom tool renderers for this agent |
| `placeholders` | `string[]` | No | Random placeholder text for the input |

## Theming

Three built-in themes are available, and you can extend any of them:

```typescript
import {
  openCodeTheme,
  vercelTheme,
  oneDarkTheme,
  resolveTheme,
  extendTheme,
} from "@ai-tui/core";

// Use a built-in theme
const theme = resolveTheme(vercelTheme, "dark");

// Extend with custom overrides
const customTheme = extendTheme(theme, {
  colors: { primary: "#ff6b6b" },
});
```

Each theme supports both `"dark"` and `"light"` modes. Themes control colors, syntax highlighting styles, and UI element appearance.

## Tool renderers

The package includes built-in renderers for common tools (bash, file read/write/edit, glob, grep, search, etc.) and provides two base components for building custom renderers:

```typescript
import { BlockTool, InlineTool } from "@ai-tui/core";

// Inline: single-line display for lightweight tools
function MyInlineRenderer({ tool, isComplete }: ToolRendererProps) {
  return (
    <InlineTool complete={isComplete} icon=">" pending="Running...">
      my-tool
    </InlineTool>
  );
}

// Block: multi-line display for tools with rich output
function MyBlockRenderer({ tool, isComplete }: ToolRendererProps) {
  return <BlockTool title="My Tool">{tool.result}</BlockTool>;
}

// Register per agent
const agent = new Agent({
  // ...
  toolComponents: {
    "my-tool": MyBlockRenderer,
  },
});
```

> [!TIP]
> Custom `toolComponents` on an agent take precedence over the built-in renderers.
