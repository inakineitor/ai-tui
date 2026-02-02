import { useState } from "react";

import { useTheme } from "#context/theme/index.tsx";

import { SidebarSection } from "./section.tsx";

export type FileItem = {
  id: string;
  path: string;
  status: "added" | "modified" | "deleted" | "unchanged";
};

export type SidebarSectionFilesProps = {
  items?: FileItem[];
};

export function SidebarSectionFiles({ items = [] }: SidebarSectionFilesProps) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const getStatusIcon = (status: FileItem["status"]): string => {
    switch (status) {
      case "added":
        return "+";
      case "modified":
        return "~";
      case "deleted":
        return "-";
      default:
        return " ";
    }
  };

  const getStatusColor = (status: FileItem["status"]): string => {
    switch (status) {
      case "added":
        return theme.success;
      case "modified":
        return theme.warning;
      case "deleted":
        return theme.error;
      default:
        return theme.textMuted;
    }
  };

  const getFileName = (path: string): string => {
    const parts = path.split("/");
    return parts.at(-1) ?? path;
  };

  return (
    <SidebarSection
      collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
      title={`Files (${items.length})`}
    >
      {items.length === 0 ? (
        <text fg={theme.textMuted}>No files changed</text>
      ) : (
        items.map((item) => (
          <box flexDirection="row" gap={1} key={item.id}>
            <text fg={getStatusColor(item.status)}>
              {getStatusIcon(item.status)}
            </text>
            <text fg={theme.text}>{getFileName(item.path)}</text>
          </box>
        ))
      )}
    </SidebarSection>
  );
}
