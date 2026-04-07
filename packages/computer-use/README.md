# @ai-sdk-utils/computer-use

[![npm version](https://img.shields.io/npm/v/@ai-sdk-utils/computer-use?style=flat-square)](https://www.npmjs.com/package/@ai-sdk-utils/computer-use)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-≥20-green?style=flat-square)](https://nodejs.org)

Desktop automation tool for [Anthropic computer use](https://docs.anthropic.com/en/docs/agents-and-tools/computer-use) with the [Vercel AI SDK](https://sdk.vercel.ai).

[Get started](#getting-started) | [API](#api) | [Configuration](#configuration) | [Capture targets](#capture-targets)

---

## Overview

This package bridges the Anthropic computer use tool with real desktop automation. It captures screenshots, moves the mouse, clicks, types, scrolls, and drags — all driven by Claude through the Vercel AI SDK.

Under the hood it uses [`node-screenshots`](https://github.com/nicehash/node-screenshots) for screen capture and [`nut-js`](https://nutjs.dev) for input simulation, with [`sharp`](https://sharp.pixelplumbing.com) for image processing.

**Key features:**

- Full support for Anthropic computer use tool versions `20251124` and `20250124`
- Screenshot scaling to Anthropic-recommended resolutions (XGA/WXGA/FWXGA) for better accuracy and lower token usage
- Flexible capture targets: full desktop, specific monitor, or individual window
- HiDPI / Retina display support with automatic coordinate translation
- Auto-screenshot after actions for continuous visual feedback
- Animated or instant mouse movement modes
- Zoom action support (cropped region screenshots)

## Getting started

### Prerequisites

- Node.js 20 or later
- An [Anthropic API key](https://console.anthropic.com/)
- **macOS**: Grant accessibility and screen recording permissions to your terminal

### Installation

```bash
npm install @ai-sdk-utils/computer-use @ai-sdk/anthropic ai
```

### Quick example

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";
import { createComputerTool } from "@ai-sdk-utils/computer-use";

const { tool, displaySize } = createComputerTool();

const result = await generateText({
  model: anthropic("claude-opus-4-6"),
  tools: { computer: tool },
  stopWhen: stepCountIs(30),
  system: `You are controlling a desktop. The screen is ${displaySize.width}x${displaySize.height} pixels.`,
  prompt: "Open the calculator app and compute 42 * 17.",
});

console.log(result.text);
```

> [!IMPORTANT]
> On macOS, your terminal app needs **Accessibility** and **Screen & System Audio Recording** permissions in System Settings > Privacy & Security.

## API

### `createComputerTool(options?)`

Creates an Anthropic computer use tool ready to pass to the AI SDK.

```typescript
const { tool, displaySize, scaling, refreshSource } = createComputerTool({
  target: { mode: "desktop" },
  scalingEnabled: true,
});
```

**Returns:**

| Property | Type | Description |
|---|---|---|
| `tool` | AI SDK Tool | The tool object to pass to `generateText` / `streamText` |
| `displaySize` | `{ width, height }` | Screen dimensions reported to the model |
| `scaling` | `ScalingInfo` | Scaling info with `toNative()` and `toApi()` converters |
| `refreshSource` | `() => void` | Re-resolve the capture source (useful for window mode) |

### `listMonitors()`

Returns an array of all available monitors with their id, position, dimensions, scale factor, and primary status. Useful for choosing a capture target.

### `listWindows()`

Returns an array of all available windows with their id, title, position, dimensions, and z-order.

### `computeScaling(width, height)`

Computes the optimal scaling info for the given native resolution, targeting Anthropic-recommended resolutions.

### `parseKeys(keyString)`

Parses an Anthropic key string (e.g. `"ctrl+s"`, `"Return"`) into nut-js `Key` values. Follows xdotool / X11 keysym naming conventions.

## Configuration

All options for `createComputerTool` are optional:

| Option | Type | Default | Description |
|---|---|---|---|
| `target` | `CaptureTarget` | `{ mode: "desktop" }` | What to capture and scope mouse actions to |
| `animated` | `boolean` | `false` | Smooth mouse movement vs instant teleport |
| `toolVersion` | `"20251124" \| "20250124"` | `"20251124"` | Anthropic tool version (`20251124` for Opus, `20250124` for Sonnet) |
| `enableZoom` | `boolean` | `true` | Enable zoom action (tool version `20251124` only) |
| `scalingEnabled` | `boolean` | `true` | Scale screenshots to standard resolutions |
| `autoScreenshot` | `boolean` | `true` | Capture screenshot after each action |
| `mouseSpeed` | `number` | `1500` | Mouse speed in px/sec (animated mode only) |
| `mouseAutoDelayMs` | `number` | `50` | Delay after mouse ops (animated mode only) |
| `keyboardAutoDelayMs` | `number` | `10` | Delay after keyboard ops (animated mode only) |
| `typeCharDelayMs` | `number` | `8` | Per-character typing delay (non-animated mode) |
| `displayNumber` | `number` | — | X11 display number (Linux only) |

## Capture targets

Control what part of the screen is captured and where mouse actions are scoped:

```typescript
// Full desktop (primary monitor) — default
createComputerTool({ target: { mode: "desktop" } });

// Specific monitor by index
createComputerTool({ target: { mode: "monitor", by: "index", index: 1 } });

// Specific monitor by id
createComputerTool({ target: { mode: "monitor", by: "id", id: 42 } });

// Monitor at a screen coordinate
createComputerTool({ target: { mode: "monitor", by: "point", x: 100, y: 200 } });

// Window by id
createComputerTool({ target: { mode: "window", by: "id", id: 12345 } });

// Window by title (substring match, case-insensitive)
createComputerTool({ target: { mode: "window", by: "title", title: "Photoshop" } });
```

> [!TIP]
> Use `listMonitors()` and `listWindows()` to discover available targets at runtime.

## Supported actions

The tool handles all Anthropic computer use actions:

| Category | Actions |
|---|---|
| **Screenshots** | `screenshot`, `zoom` |
| **Mouse** | `mouse_move`, `left_click`, `right_click`, `middle_click`, `double_click`, `triple_click` |
| **Fine-grained mouse** | `left_mouse_down`, `left_mouse_up`, `left_click_drag` |
| **Scroll** | `scroll` (up, down, left, right) |
| **Keyboard** | `type`, `key`, `hold_key` |
| **Utility** | `cursor_position`, `wait` |

All click actions support modifier keys (e.g. `ctrl`, `shift`, `cmd`) and optional coordinates.
