/**
 * Tool icons for displaying tool calls in the chat interface
 * Matches OpenCode's icon conventions
 */

export const TOOL_ICONS: Record<string, string> = {
  bash: "$",
  read: "\u25CE", // ◎
  write: "\u270E", // ✎
  edit: "\u270E", // ✎
  glob: "\u229B", // ⊛
  grep: "\u2295", // ⊕
  webfetch: "\u2299", // ⊙
  task: "\u25B6", // ▶
  todowrite: "\u2610", // ☐
  todoread: "\u2611", // ☑
  question: "?",
  default: "\u2699", // ⚙
};

export function getToolIcon(name: string): string {
  // TOOL_ICONS.default is always defined above
  // biome-ignore lint/style/noNonNullAssertion: default key is explicitly defined in TOOL_ICONS
  return TOOL_ICONS[name] ?? TOOL_ICONS.default!;
}
