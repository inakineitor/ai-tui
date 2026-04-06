/**
 * Verify that the model's coordinate output matches expected screen positions.
 * Takes a screenshot, asks the model to mouse_move to specific positions,
 * and compares model coordinates vs expected.
 *
 * Run: ANTHROPIC_API_KEY=... npx tsx examples/verify-coords.ts
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";

import { createComputerTool } from "../src/index.js";

type ToolCall = {
  input?: Record<string, unknown>;
  args?: Record<string, unknown>;
};

function getInput(tc: ToolCall): Record<string, unknown> | undefined {
  return tc.input ?? tc.args;
}

async function main() {
  const { tool, displaySize, scaling } = createComputerTool({
    target: { mode: "desktop" },
    toolVersion: "20251124",
    autoScreenshot: false,
  });

  console.log(
    `Display reported to model: ${displaySize.width}x${displaySize.height}`
  );
  console.log(
    `Scaling: ${scaling.enabled ? `${scaling.nativeWidth}x${scaling.nativeHeight} → ${scaling.scaledWidth}x${scaling.scaledHeight}` : "disabled"}`
  );
  console.log("");

  const positions = [
    { name: "top-left corner", expectedPct: [0.05, 0.05] },
    { name: "top-right corner", expectedPct: [0.95, 0.05] },
    { name: "bottom-left corner", expectedPct: [0.05, 0.95] },
    { name: "bottom-right corner", expectedPct: [0.95, 0.95] },
    { name: "center", expectedPct: [0.5, 0.5] },
    { name: "top-center", expectedPct: [0.5, 0.167] },
    { name: "left-third center", expectedPct: [0.333, 0.5] },
    { name: "right-third center", expectedPct: [0.667, 0.5] },
  ];

  for (const pos of positions) {
    const expectedX = Math.round(pos.expectedPct[0] * scaling.nativeWidth);
    const expectedY = Math.round(pos.expectedPct[1] * scaling.nativeHeight);

    const result = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      tools: { computer: tool },
      toolChoice: "required",
      stopWhen: stepCountIs(3),
      system: `You control a computer. The screen is ${displaySize.width}x${displaySize.height} pixels.`,
      prompt: `First take a screenshot. Then use mouse_move to move the cursor to the exact ${pos.name} of the screen.`,
    });

    let coord: number[] | undefined;
    for (const step of result.steps) {
      for (const tc of step.toolCalls) {
        const input = getInput(tc as ToolCall);
        if (input?.action === "mouse_move" && input.coordinate) {
          coord = input.coordinate as number[];
        }
      }
    }

    if (!coord) {
      const actions = result.steps.flatMap((s) =>
        s.toolCalls.map((tc) => getInput(tc as ToolCall)?.action ?? "?")
      );
      console.log(
        `${pos.name.padEnd(25)} NO mouse_move (actions: ${actions.join(", ")})`
      );
      continue;
    }

    const nativeCoord = scaling.toNative(coord[0], coord[1]);
    const dx = nativeCoord.x - expectedX;
    const dy = nativeCoord.y - expectedY;
    const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
    console.log(
      `${pos.name.padEnd(25)} ` +
        `model=(${String(coord[0]).padStart(4)},${String(coord[1]).padStart(4)}) ` +
        `native=(${String(nativeCoord.x).padStart(4)},${String(nativeCoord.y).padStart(4)}) ` +
        `expected=(${String(expectedX).padStart(4)},${String(expectedY).padStart(4)}) ` +
        `Δ=(${String(dx).padStart(4)},${String(dy).padStart(4)}) ` +
        `dist=${dist}px`
    );
  }
}

main().catch(console.error);
