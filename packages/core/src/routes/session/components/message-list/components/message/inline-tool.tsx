import type { ReactNode } from "react";

import { useTheme } from "#context/theme/index.tsx";

type InlineToolProps = {
  icon: string;
  iconColor?: string;
  complete: boolean;
  pending: string;
  children: ReactNode;
  hasError?: boolean;
};

export function InlineTool({
  icon,
  iconColor,
  complete,
  pending,
  children,
  hasError,
}: InlineToolProps) {
  const { theme } = useTheme();

  const fg = hasError ? theme.error : complete ? theme.textMuted : theme.text;

  return (
    <box marginTop={1} paddingLeft={3}>
      <box flexDirection="row" gap={1}>
        {complete ? (
          <text fg={fg}>
            <span fg={iconColor ?? fg}>{icon}</span> {children}
          </text>
        ) : (
          <text fg={fg}>~ {pending}</text>
        )}
        {hasError && <text fg={theme.error}>[error]</text>}
      </box>
    </box>
  );
}
