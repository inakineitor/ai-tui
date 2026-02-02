import type { ReactNode } from "react";

import { TextAttributes } from "@opentui/core";

import { useTheme } from "#context/theme/index.tsx";

type DialogBoxProps = {
  children: ReactNode;
  title: string;
  minWidth?: number;
  maxWidth?: number;
};

export function DialogBox({
  children,
  title,
  minWidth,
  maxWidth,
}: DialogBoxProps) {
  const { theme } = useTheme();

  return (
    <box
      flexDirection="column"
      gap={1}
      maxWidth={maxWidth}
      minWidth={minWidth}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {title}
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      {children}
    </box>
  );
}
