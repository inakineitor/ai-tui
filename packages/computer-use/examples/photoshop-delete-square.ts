/**
 * Example: Delete a red square in Photoshop using window-scoped computer use.
 *
 * Run with: ANTHROPIC_API_KEY=... bun run examples/photoshop-delete-square.ts
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";

import { createComputerTool, listWindows } from "../src/index.js";

async function main() {
  // Find the Photoshop window
  const windows = listWindows();
  // Match the canvas window (e.g. "Untitled-1 @ 100% (RGB/8)"),
  // not the debug window ("DesignAgent - Adobe Photoshop v27.2.0 (Debug)")
  const psWindow = windows.find(
    (w) => w.title.includes("@") && w.title.includes("RGB")
  );

  if (psWindow === undefined) {
    console.error("No Photoshop window found. Available windows:");
    for (const w of windows) {
      console.log(`  [${w.id}] "${w.title}" ${w.width}x${w.height}`);
    }
    process.exit(1);
  }

  console.log(
    `Found Photoshop: "${psWindow.title}" ${psWindow.width}x${psWindow.height}`
  );

  const { tool, displaySize, scaling } = createComputerTool({
    target: { mode: "desktop" },
    toolVersion: "20251124",
    animated: false,
  });

  console.log(`Display: ${displaySize.width}x${displaySize.height}`);
  console.log(`Scaling: ${scaling.enabled}`);
  console.log("\nStarting agent...\n");

  const result = await generateText({
    model: anthropic("claude-opus-4-6"),
    tools: { computer: tool },
    stopWhen: stepCountIs(50),
    system: `You are controlling a Photoshop 2026 window on macOS.
The captured area is ${displaySize.width}x${displaySize.height} pixels.
All coordinates are relative to the Photoshop window.`,
    prompt: "There is a red square in the center of the canvas. Delete it.",
  });

  console.log("\n========== MODEL RESPONSE ==========");
  console.log(result.text || "(no text response)");

  console.log(`\n========== STEPS (${result.steps.length}) ==========`);
  for (let i = 0; i < result.steps.length; i++) {
    const step = result.steps[i];
    const toolCalls = step.toolCalls.length;
    const hasText = step.text.length > 0;
    console.log(
      `Step ${i + 1}: ${toolCalls} tool call(s)${hasText ? " + text" : ""}`
    );
    if (hasText) {
      console.log(
        `  ${step.text.slice(0, 300)}${step.text.length > 300 ? "..." : ""}`
      );
    }
  }
}

main().catch(console.error);
