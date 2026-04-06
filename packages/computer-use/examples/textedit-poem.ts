/**
 * Opens TextEdit on macOS via Spotlight and types a poem.
 *
 * Run with: ANTHROPIC_API_KEY=... npx tsx examples/textedit-poem.ts
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";

import { createComputerTool } from "../src/index.js";

async function main() {
  const { tool, displaySize } = createComputerTool({
    target: { mode: "desktop" },
    toolVersion: "20251124",
  });

  console.log(`Display: ${displaySize.width}x${displaySize.height}`);
  console.log("Starting agent...\n");

  const result = await generateText({
    model: anthropic("claude-opus-4-6"),
    tools: { computer: tool },
    stopWhen: stepCountIs(50),
    system: `You control a Mac computer. The screen is ${displaySize.width}x${displaySize.height} pixels.`,
    prompt: `Open TextEdit using Spotlight (cmd+space, type "TextEdit", press Return).
Wait for it to open, then type a short original poem (4-6 lines) about the joy of writing code.
After typing the poem, take a screenshot to confirm it looks good.`,
  });

  console.log("\n========== RESULT ==========");
  console.log(result.text || "(no text response)");
  console.log(`\nSteps: ${result.steps.length}`);
}

main().catch(console.error);
