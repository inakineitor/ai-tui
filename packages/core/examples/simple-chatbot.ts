/**
 * Simple chatbot example using @ai-tui/core.
 *
 * This creates a terminal UI with a single agent powered by Claude
 * through the Vercel AI Gateway.
 *
 * Prerequisites:
 *   - Set the AI_GATEWAY_API_KEY environment variable (or VERCEL_OIDC_TOKEN)
 *
 * Run with:
 *   AI_GATEWAY_API_KEY=... bun run examples/simple-chatbot.ts
 */

import { Agent, type ConfigInput, TerminalUI } from "@ai-tui/core";
import { DirectChatTransport, ToolLoopAgent, stepCountIs } from "ai";

const assistant = new Agent({
  id: "assistant",
  name: "Assistant",
  model: { providerName: "AI Gateway", name: "Claude Opus 4.6" },
  color: "#82aaff",
  createTransport: ({ transportOptions }) => {
    const agent = new ToolLoopAgent({
      model: "anthropic/claude-opus-4-6",
      tools: {},
      instructions:
        "You are a friendly and helpful assistant. Answer questions clearly and concisely.",
      stopWhen: stepCountIs(50),
    });
    return new DirectChatTransport({ agent, ...transportOptions });
  },
});

const config: ConfigInput = {
  id: "simple-chatbot",
  agents: [assistant],
  appName: {
    sections: [
      { text: "Simple", style: "muted" },
      { text: "Chatbot", style: "gradient" },
    ],
  },
};

const tui = new TerminalUI(config);
await tui.run();
