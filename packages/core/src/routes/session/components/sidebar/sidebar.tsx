import { useTheme } from "#context/theme/index.tsx";

import {
  type ContextItem,
  SidebarSectionContext,
} from "./components/section-context.tsx";
import {
  type FileItem,
  SidebarSectionFiles,
} from "./components/section-files.tsx";
import {
  SidebarSectionTodos,
  type TodoItem,
} from "./components/section-todos.tsx";

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
