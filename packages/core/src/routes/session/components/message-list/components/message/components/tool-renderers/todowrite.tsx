import { BlockTool } from "../../block-tool.tsx";
import { InlineTool } from "../../inline-tool.tsx";
import type { ToolRendererProps } from "../../types.ts";

type TodoItem = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "high" | "medium" | "low";
};

export function TodoWriteTool({ tool, isComplete, theme }: ToolRendererProps) {
  const { input, error } = tool.state;

  const todos = input?.todos as TodoItem[] | undefined;
  const todoCount = todos?.length ?? 0;

  if (error) {
    return (
      <InlineTool
        complete={isComplete}
        hasError
        icon={"\u2610"}
        pending="Updating todos..."
      >
        todowrite [error]
      </InlineTool>
    );
  }

  if (todoCount <= 2) {
    return (
      <InlineTool
        complete={isComplete}
        icon={"\u2610"}
        pending="Updating todos..."
      >
        todowrite
        <span fg={theme.textMuted}> [{todoCount} items]</span>
      </InlineTool>
    );
  }

  return (
    <BlockTool
      collapsible
      defaultCollapsed={false}
      title={`Todos [${todoCount} items]`}
    >
      <box paddingLeft={1}>
        {todos?.slice(0, 5).map((todo) => {
          const icon =
            todo.status === "completed"
              ? "\u2713"
              : todo.status === "in_progress"
                ? "\u2022"
                : " ";
          const color =
            todo.status === "in_progress"
              ? theme.warning
              : todo.status === "completed"
                ? theme.success
                : theme.textMuted;
          return (
            <box flexDirection="row" gap={0} key={todo.id}>
              <text fg={color}>[{icon}] </text>
              <text fg={color} wrapMode="word">
                {todo.content}
              </text>
            </box>
          );
        })}
        {todoCount > 5 && (
          <text fg={theme.textMuted}>... and {todoCount - 5} more</text>
        )}
      </box>
    </BlockTool>
  );
}
