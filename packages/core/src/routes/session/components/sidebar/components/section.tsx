import type { ReactNode } from "react";

import { useTheme } from "#context/theme/index.tsx";

export type SidebarSectionProps = {
  title: string;
  children: ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
};

export function SidebarSection({
  title,
  children,
  collapsed = false,
}: SidebarSectionProps) {
  const { theme } = useTheme();

  return (
    <box flexDirection="column" paddingBottom={1}>
      <box flexDirection="row">
        <text fg={theme.textMuted}>{collapsed ? "+ " : "- "}</text>
        <text fg={theme.text}>{title}</text>
      </box>
      {!collapsed && (
        <box flexDirection="column" paddingLeft={2}>
          {children}
        </box>
      )}
    </box>
  );
}
