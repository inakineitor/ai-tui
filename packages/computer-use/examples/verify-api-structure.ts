/**
 * End-to-end test of @ai-sdk-utils/computer-use.
 *
 * Verifies:
 * 1. The model can perceive screenshot content (describe what it sees)
 * 2. The model can act on what it sees (click on specific UI elements)
 *
 * Run with: ANTHROPIC_API_KEY=... bun run examples/verify-api-structure.ts
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";

import { createComputerTool, listMonitors } from "../src/index.js";

async function main() {
  console.log("Monitors:", JSON.stringify(listMonitors(), null, 2));

  const { tool, displaySize, scaling } = createComputerTool({
    target: { mode: "desktop" },
    toolVersion: "20250124",
    animated: false,
  });

  console.log(
    `Display size reported to model: ${displaySize.width}x${displaySize.height}`
  );
  console.log(`Scaling enabled: ${scaling.enabled}`);
  if (scaling.enabled) {
    console.log(`  Native: ${scaling.nativeWidth}x${scaling.nativeHeight}`);
    console.log(`  Scaled: ${scaling.scaledWidth}x${scaling.scaledHeight}`);
  }

  console.log("\nStarting agent...\n");

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    tools: { computer: tool },
    stopWhen: stepCountIs(15),
    system: `You are testing a computer use tool.
The screen is ${displaySize.width}x${displaySize.height} pixels.`,
    prompt: `This is a test to verify screenshot perception and action capabilities.

Step 1 - PERCEIVE: Take a screenshot and describe what you see. List the visible
applications, any text you can read, and the general layout of the screen.

Step 2 - ACT: Open Spotlight search (press cmd+space), type "TextEdit", and press
Return to open it. Then take a screenshot and confirm TextEdit opened.

After both steps, summarize what happened.`,
  });

  console.log("\n========== MODEL RESPONSE ==========");
  console.log(result.text || "(no text response)");

  console.log(`\n========== STEPS (${result.steps.length}) ==========`);
  for (const [i, step] of result.steps.entries()) {
    const toolCalls = step.toolCalls.length;
    const hasText = step.text.length > 0;
    console.log(
      `\nStep ${i + 1}: ${toolCalls} tool call(s)${hasText ? " + text" : ""}`
    );
    if (hasText) {
      console.log(
        `  Text: ${step.text.slice(0, 200)}${step.text.length > 200 ? "..." : ""}`
      );
    }
    if (step.warnings.length > 0) {
      console.log(`  Warnings: ${JSON.stringify(step.warnings)}`);
    }
  }
}

main().catch(console.error);
