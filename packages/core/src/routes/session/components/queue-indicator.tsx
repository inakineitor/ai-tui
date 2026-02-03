import { useTheme } from "#context/theme/index.js";
import type { QueuedMessage } from "#hooks/use-message-queue.js";

// function truncate(text: string, maxLength: number): string {
//   if (text.length <= maxLength) {
//     return text;
//   }
//   return `${text.slice(0, maxLength - 3)}...`;
// }

type QueueIndicatorProps = {
  queue: QueuedMessage[];
};

export function QueueIndicator({ queue }: QueueIndicatorProps) {
  const { theme } = useTheme();

  if (queue.length === 0) {
    return null;
  }

  return (
    <box flexDirection="column" flexShrink={0} paddingBottom={1}>
      <box flexDirection="row" gap={1}>
        <text fg={theme.warning}>
          {queue.length} message{queue.length > 1 ? "s" : ""} queued
        </text>
        <text fg={theme.textMuted}>(Esc to clear)</text>
      </box>
    </box>
  );
}
