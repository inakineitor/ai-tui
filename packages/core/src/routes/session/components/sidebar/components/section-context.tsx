import { useState } from "react";

import { useTheme } from "#context/theme/index.tsx";

import { SidebarSection } from "./section.tsx";

export type ContextItem = {
  id: string;
  type: "file" | "url" | "text";
  label: string;
  preview?: string;
};

export type SidebarSectionContextProps = {
  items?: ContextItem[];
  tokenUsage?: { input: number; output: number };
};

function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function SidebarSectionContext({
  items = [],
  tokenUsage,
}: SidebarSectionContextProps) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const getTypeIcon = (type: ContextItem["type"]): string => {
    switch (type) {
      case "file":
        return "F";
      case "url":
        return "U";
      case "text":
        return "T";
      default:
        return "?";
    }
  };

  return (
    <SidebarSection
      collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
      title="Context"
    >
      {tokenUsage && (
        <box flexDirection="column" paddingBottom={1}>
          <box flexDirection="row" gap={1}>
            <text fg={theme.textMuted}>↑</text>
            <text fg={theme.text}>
              {formatTokenCount(tokenUsage.input)} tokens
            </text>
          </box>
          <box flexDirection="row" gap={1}>
            <text fg={theme.textMuted}>↓</text>
            <text fg={theme.text}>
              {formatTokenCount(tokenUsage.output)} tokens
            </text>
          </box>
        </box>
      )}
      {items.length === 0 && !tokenUsage ? (
        <text fg={theme.textMuted}>No context</text>
      ) : (
        items.map((item) => (
          <box flexDirection="row" gap={1} key={item.id}>
            <text fg={theme.textMuted}>[{getTypeIcon(item.type)}]</text>
            <text fg={theme.text}>{item.label}</text>
          </box>
        ))
      )}
    </SidebarSection>
  );
}
