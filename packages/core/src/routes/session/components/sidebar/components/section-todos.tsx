import { useState } from "react";

import { useTheme } from "#context/theme/index.tsx";

import { SidebarSection } from "./section.tsx";

export type TodoItem = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "high" | "medium" | "low";
};

export type SidebarSectionTodosProps = {
  items?: TodoItem[];
};

export function SidebarSectionTodos({ items = [] }: SidebarSectionTodosProps) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const getStatusIcon = (status: TodoItem["status"]): string => {
    switch (status) {
      case "completed":
        return "[x]";
      case "in_progress":
        return "[~]";
      case "cancelled":
        return "[-]";
      default:
        return "[ ]";
    }
  };

  const getStatusColor = (status: TodoItem["status"]): string => {
    switch (status) {
      case "completed":
        return theme.success;
      case "in_progress":
        return theme.warning;
      case "cancelled":
        return theme.textMuted;
      default:
        return theme.text;
    }
  };

  const getPriorityColor = (priority: TodoItem["priority"]): string => {
    switch (priority) {
      case "high":
        return theme.error;
      case "medium":
        return theme.warning;
      default:
        return theme.textMuted;
    }
  };

  const activeTodos = items.filter((item) => item.status !== "cancelled");
  const completedCount = items.filter(
    (item) => item.status === "completed"
  ).length;

  return (
    <SidebarSection
      collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
      title={`Todos (${completedCount}/${activeTodos.length})`}
    >
      {items.length === 0 ? (
        <text fg={theme.textMuted}>No todos</text>
      ) : (
        items
          .filter((item) => item.status !== "cancelled")
          .map((item) => (
            <box flexDirection="row" gap={1} key={item.id}>
              <text fg={getStatusColor(item.status)}>
                {getStatusIcon(item.status)}
              </text>
              <text fg={getPriorityColor(item.priority)}>
                {item.priority === "high"
                  ? "!"
                  : item.priority === "medium"
                    ? "*"
                    : " "}
              </text>
              <text fg={getStatusColor(item.status)}>{item.content}</text>
            </box>
          ))
      )}
    </SidebarSection>
  );
}
