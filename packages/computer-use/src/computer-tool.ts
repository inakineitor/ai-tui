import { anthropic } from "@ai-sdk/anthropic";
import {
  Button,
  Point,
  keyboard,
  mouse,
  sleep,
  straightTo,
} from "@nut-tree-fork/nut-js";

import {
  type CaptureSource,
  type CaptureTarget,
  resolveCaptureSource,
} from "./capture.js";
import { parseKeys } from "./key-map.js";

// ─── Options ─────────────────────────────────────────────

export type ComputerToolOptions = {
  /**
   * What to capture and scope mouse actions to.
   * @default { mode: "desktop" }
   */
  target?: CaptureTarget;

  /**
   * When false (default), mouse teleports instantly and delays are
   * stripped to minimize the race window between setPosition and click.
   * When true, mouse moves smoothly at mouseSpeed and autoDelayMs
   * values are kept for a visible, human-like experience.
   * @default false
   */
  animated?: boolean;

  /**
   * Which Anthropic tool version to use.
   * - "20251124" for Claude Opus 4.5/4.6 (includes zoom action)
   * - "20250124" for Claude Sonnet 4 / Sonnet 3.7
   * @default "20251124"
   */
  toolVersion?: "20251124" | "20250124";

  /**
   * Enable the zoom action (cropped region screenshot).
   * Only applies to tool version "20251124".
   * @default true
   */
  enableZoom?: boolean;

  /**
   * X11 display number (for Linux/X11 environments).
   * Passed through to the Anthropic tool configuration.
   */
  displayNumber?: number;

  /**
   * Mouse movement speed in pixels/sec (for animated mode).
   * Ignored when animated is false since setPosition is instant.
   * @default 1500
   */
  mouseSpeed?: number;

  /**
   * Delay in ms after each mouse operation (for animated mode).
   * In non-animated mode this is forced to 0.
   * @default 50
   */
  mouseAutoDelayMs?: number;

  /**
   * Delay in ms after each keyboard operation (for animated mode).
   * In non-animated mode this is forced to 0.
   * @default 10
   */
  keyboardAutoDelayMs?: number;

  /**
   * Per-character delay in ms for the type action in non-animated mode.
   * Some apps (Electron, remote desktops) drop keystrokes if they arrive
   * too fast. Set to 0 if your target app handles rapid input reliably.
   * @default 8
   */
  typeCharDelayMs?: number;
};

// ─── Tool Input / Output Types ───────────────────────────

type ToolInput = {
  action: string;
  coordinate?: number[];
  text?: string;
  duration?: number;
  scroll_direction?: "up" | "down" | "left" | "right";
  scroll_amount?: number;
  start_coordinate?: number[];
  region?: number[];
  key?: string;
};

type ToolOutput = string | { type: "image"; data: string };

// ─── Factory ─────────────────────────────────────────────

export function createComputerTool(options: ComputerToolOptions = {}) {
  const {
    target = { mode: "desktop" },
    animated = false,
    toolVersion = "20251124",
    enableZoom = true,
    displayNumber,
    mouseSpeed = 1500,
    mouseAutoDelayMs = 50,
    keyboardAutoDelayMs = 10,
    typeCharDelayMs = 8,
  } = options;

  // ── Configure nut-js ────────────────────────────────────

  if (animated) {
    mouse.config.mouseSpeed = mouseSpeed;
    mouse.config.autoDelayMs = mouseAutoDelayMs;
    keyboard.config.autoDelayMs = keyboardAutoDelayMs;
  } else {
    mouse.config.mouseSpeed = 8000;
    mouse.config.autoDelayMs = 0;
    keyboard.config.autoDelayMs = 0;
  }

  // ── Resolve capture source ──────────────────────────────

  let source: CaptureSource = resolveCaptureSource(target);
  const displayWidth = source.width;
  const displayHeight = source.height;

  function refreshSource(): void {
    source = resolveCaptureSource(target);
  }

  // ── Coordinate helpers ──────────────────────────────────

  function toAbsolute(x: number, y: number): Point {
    return new Point(x + source.offsetX, y + source.offsetY);
  }

  function absPoint(coord: number[]): Point {
    return toAbsolute(coord[0], coord[1]);
  }

  // ── Mouse movement (animated vs instant) ────────────────

  async function moveTo(point: Point): Promise<void> {
    if (animated) {
      await mouse.move(straightTo(point));
    } else {
      await mouse.setPosition(point);
    }
  }

  async function moveToCoord(coord: number[]): Promise<void> {
    await moveTo(absPoint(coord));
  }

  // ── Screenshot helpers ──────────────────────────────────

  async function captureScreenshot(): Promise<string> {
    const image = await source.captureImage();
    const png = await image.toPng();
    return png.toString("base64");
  }

  async function captureZoom(region: number[]): Promise<string> {
    const [x1, y1, x2, y2] = region;
    const image = await source.captureImage();
    const cropped = await image.crop(x1, y1, x2 - x1, y2 - y1);
    const png = await cropped.toPng();
    return png.toString("base64");
  }

  // ── Modifier key helper ──────────────────────────────────

  async function withModifiers<T>(
    text: string | undefined,
    fn: () => Promise<T>
  ): Promise<T> {
    if (text === undefined) {
      return fn();
    }
    const keys = parseKeys(text);
    await keyboard.pressKey(...keys);
    try {
      return await fn();
    } finally {
      await keyboard.releaseKey(...keys);
    }
  }

  // ── Action executor ─────────────────────────────────────

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: action dispatch over 18 Anthropic actions is inherently branchy
  async function execute(input: ToolInput): Promise<ToolOutput> {
    const { action } = input;

    switch (action) {
      // ─── Screenshots ─────────────────────────────────────
      case "screenshot": {
        if (target.mode === "window") {
          refreshSource();
        }
        const data = await captureScreenshot();
        return { type: "image", data };
      }

      case "zoom": {
        if (input.region === undefined) {
          throw new Error("zoom requires a region parameter");
        }
        if (target.mode === "window") {
          refreshSource();
        }
        const data = await captureZoom(input.region);
        return { type: "image", data };
      }

      // ─── Mouse Movement ──────────────────────────────────
      case "mouse_move": {
        if (input.coordinate === undefined) {
          throw new Error("mouse_move requires coordinate");
        }
        await moveToCoord(input.coordinate);
        return `Moved mouse to (${input.coordinate[0]}, ${input.coordinate[1]})`;
      }

      case "cursor_position": {
        const pos = await mouse.getPosition();
        return `Cursor is at (${pos.x}, ${pos.y})`;
      }

      // ─── Mouse Clicks ────────────────────────────────────
      case "left_click": {
        if (input.coordinate !== undefined) {
          await moveToCoord(input.coordinate);
        }
        await withModifiers(input.text, () => mouse.click(Button.LEFT));
        return "Left clicked";
      }

      case "right_click": {
        if (input.coordinate !== undefined) {
          await moveToCoord(input.coordinate);
        }
        await withModifiers(input.text, () => mouse.click(Button.RIGHT));
        return "Right clicked";
      }

      case "middle_click": {
        if (input.coordinate !== undefined) {
          await moveToCoord(input.coordinate);
        }
        await withModifiers(input.text, () => mouse.click(Button.MIDDLE));
        return "Middle clicked";
      }

      case "double_click": {
        if (input.coordinate !== undefined) {
          await moveToCoord(input.coordinate);
        }
        await withModifiers(input.text, () => mouse.doubleClick(Button.LEFT));
        return "Double clicked";
      }

      case "triple_click": {
        if (input.coordinate !== undefined) {
          await moveToCoord(input.coordinate);
        }
        await withModifiers(input.text, async () => {
          await mouse.click(Button.LEFT);
          await mouse.click(Button.LEFT);
          await mouse.click(Button.LEFT);
        });
        return "Triple clicked";
      }

      // ─── Fine-Grained Mouse Control ──────────────────────
      case "left_mouse_down": {
        if (input.coordinate !== undefined) {
          await moveToCoord(input.coordinate);
        }
        await withModifiers(input.text, () => mouse.pressButton(Button.LEFT));
        return "Left mouse button pressed down";
      }

      case "left_mouse_up": {
        if (input.coordinate !== undefined) {
          await moveToCoord(input.coordinate);
        }
        await withModifiers(input.text, () => mouse.releaseButton(Button.LEFT));
        return "Left mouse button released";
      }

      // ─── Drag ────────────────────────────────────────────
      case "left_click_drag": {
        if (
          input.start_coordinate === undefined ||
          input.coordinate === undefined
        ) {
          throw new Error(
            "left_click_drag requires start_coordinate and coordinate"
          );
        }
        const start = absPoint(input.start_coordinate);
        const end = absPoint(input.coordinate);
        await withModifiers(input.text, async () => {
          await moveTo(start);
          await mouse.pressButton(Button.LEFT);
          await moveTo(end);
          await mouse.releaseButton(Button.LEFT);
        });
        const [sx, sy] = input.start_coordinate;
        const [ex, ey] = input.coordinate;
        return `Dragged from (${sx}, ${sy}) to (${ex}, ${ey})`;
      }

      // ─── Scroll ──────────────────────────────────────────
      case "scroll": {
        const amount = input.scroll_amount ?? 3;

        if (input.coordinate !== undefined) {
          await moveToCoord(input.coordinate);
        }

        await withModifiers(input.text, async () => {
          switch (input.scroll_direction) {
            case "up":
              await mouse.scrollUp(amount);
              break;
            case "down":
              await mouse.scrollDown(amount);
              break;
            case "left":
              await mouse.scrollLeft(amount);
              break;
            case "right":
              await mouse.scrollRight(amount);
              break;
            default:
              throw new Error(
                `Unknown scroll direction: ${input.scroll_direction}`
              );
          }
        });
        return `Scrolled ${input.scroll_direction} by ${amount}`;
      }

      // ─── Keyboard ────────────────────────────────────────
      case "type": {
        if (input.text === undefined) {
          throw new Error("type requires text");
        }
        if (animated) {
          await keyboard.type(input.text);
        } else {
          for (const char of input.text) {
            await keyboard.type(char);
            if (typeCharDelayMs > 0) {
              await sleep(typeCharDelayMs);
            }
          }
        }
        return `Typed "${input.text}"`;
      }

      case "key": {
        const keyStr = input.key ?? input.text;
        if (keyStr === undefined) {
          throw new Error("key requires a key string");
        }
        const keys = parseKeys(keyStr);
        await keyboard.pressKey(...keys);
        await keyboard.releaseKey(...keys);
        return `Pressed key(s): ${keyStr}`;
      }

      case "hold_key": {
        const keyStr = input.key ?? input.text;
        if (keyStr === undefined) {
          throw new Error("hold_key requires a key string");
        }
        const duration = input.duration ?? 1;
        const keys = parseKeys(keyStr);
        await keyboard.pressKey(...keys);
        await sleep(duration * 1000);
        await keyboard.releaseKey(...keys);
        return `Held key(s) "${keyStr}" for ${duration}s`;
      }

      // ─── Wait ────────────────────────────────────────────
      case "wait": {
        const duration = input.duration ?? 1;
        await sleep(duration * 1000);
        return `Waited ${duration}s`;
      }

      default:
        throw new Error(`Unhandled action: ${action}`);
    }
  }

  // ── Build model output converter ────────────────────────

  function toModelOutput({ output }: { output: ToolOutput }) {
    if (typeof output === "string") {
      return { type: "text" as const, value: output };
    }
    return {
      type: "content" as const,
      value: [
        {
          type: "file-data" as const,
          data: output.data,
          mediaType: "image/png" as const,
        },
      ],
    };
  }

  // ── Build and return the tool ───────────────────────────

  const commonOpts = {
    displayWidthPx: displayWidth,
    displayHeightPx: displayHeight,
    ...(displayNumber !== undefined && { displayNumber }),
  };

  if (toolVersion === "20251124") {
    return {
      tool: anthropic.tools.computer_20251124({
        ...commonOpts,
        enableZoom,
        execute,
        toModelOutput,
      }),
      displaySize: { width: displayWidth, height: displayHeight },
      refreshSource,
    };
  }

  return {
    tool: anthropic.tools.computer_20250124({
      ...commonOpts,
      execute,
      toModelOutput,
    }),
    displaySize: { width: displayWidth, height: displayHeight },
    refreshSource,
  };
}
