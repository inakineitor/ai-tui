/**
 * Verify the exact shape of parameters the AI SDK passes to execute().
 * Tests both tool versions with their compatible models:
 *   - computer_20250124  → claude-sonnet-4-20250514  (Sonnet 4)
 *   - computer_20251124  → claude-sonnet-4-6         (Sonnet 4.6)
 *
 * Run: ANTHROPIC_API_KEY=... npx tsx examples/verify-tool-params.ts
 */
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";

type ToolOutput = string | { type: "image"; data: string };

function makeExecute(label: string) {
  return (input: Record<string, unknown>): ToolOutput => {
    console.log(
      `\n[${label}] execute() received:`,
      JSON.stringify(input, null, 2)
    );
    console.log(`[${label}] Keys present:`, Object.keys(input));
    return `OK: ${input.action} done. Continue with the next action.`;
  };
}

function toModelOutput({ output }: { output: ToolOutput }) {
  if (typeof output === "string") {
    return { type: "text" as const, value: output };
  }
  return {
    type: "content" as const,
    value: [
      {
        type: "image-data" as const,
        data: output.data,
        mediaType: "image/png" as const,
      },
    ],
  };
}

const PROMPT = `Perform these actions in order, one per step:

1. left_click at coordinate [100, 200]
2. type the text "hello"
3. key: ctrl+c
4. scroll down by 3 at coordinate [500, 400]
5. hold_key "shift" for duration 2
6. left_click at coordinate [300, 400] while holding modifier key "ctrl"
7. double_click at coordinate [200, 300]
8. mouse_move to coordinate [400, 500]`;

const SYSTEM =
  "You control a computer. Execute every action the user asks for, one tool call per step. Never stop early.";

async function testVersion(version: "20250124" | "20251124", model: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Tool: computer_${version} | Model: ${model}`);
  console.log("=".repeat(60));

  const tool =
    version === "20250124"
      ? anthropic.tools.computer_20250124({
          displayWidthPx: 1024,
          displayHeightPx: 768,
          execute: makeExecute(version),
          toModelOutput,
        })
      : anthropic.tools.computer_20251124({
          displayWidthPx: 1024,
          displayHeightPx: 768,
          enableZoom: true,
          execute: makeExecute(version),
          toModelOutput,
        });

  const { steps } = await generateText({
    model: anthropic(model),
    tools: { computer: tool },
    toolChoice: "required",
    stopWhen: stepCountIs(12),
    system: SYSTEM,
    prompt: PROMPT,
  });

  console.log(`\n[${version}] Total steps: ${steps.length}`);
  for (const [i, step] of steps.entries()) {
    console.log(
      `  Step ${i + 1}: finishReason=${step.finishReason}, toolCalls=${step.toolCalls.length}`
    );
  }
}

async function main() {
  // computer_20250124 → Sonnet 4
  await testVersion("20250124", "claude-sonnet-4-20250514");
  // computer_20251124 → Sonnet 4.6
  await testVersion("20251124", "claude-sonnet-4-6");
}

main().catch(console.error);
