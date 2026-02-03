import type { ReactNode } from "react";

import { useTheme } from "#context/theme/index.js";
import {
  type ContextItem,
  SidebarSectionContext,
} from "#routes/session/components/sidebar/components/section-context.js";
import {
  type FileItem,
  SidebarSectionFiles,
} from "#routes/session/components/sidebar/components/section-files.js";
import {
  SidebarSectionTodos,
  type TodoItem,
} from "#routes/session/components/sidebar/components/section-todos.js";

export type SidebarProps = {
  visible: boolean;
  width?: number;
  contextItems?: ContextItem[];
  todos?: TodoItem[];
  files?: FileItem[];
  tokenUsage?: { input: number; output: number };
};

export function Sidebar({
  visible,
  width = 40,
  contextItems = [],
  todos = [],
  files = [],
  tokenUsage,
}: SidebarProps) {
  const { theme } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <box
      backgroundColor={theme.backgroundPanel}
      flexDirection="column"
      flexShrink={0}
      height="100%"
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      width={width}
    >
      <SidebarSectionContext items={contextItems} tokenUsage={tokenUsage} />
      <SidebarSectionTodos items={todos} />
      <SidebarSectionFiles items={files} />
    </box>
  );
}

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

// biome-ignore lint/performance/noBarrelFile: intentional public API for sidebar
export { SidebarSectionContext } from "#routes/session/components/sidebar/components/section-context.js";
export { SidebarSectionFiles } from "#routes/session/components/sidebar/components/section-files.js";
export { SidebarSectionTodos } from "#routes/session/components/sidebar/components/section-todos.js";
