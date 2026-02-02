import { type ReactNode, useState } from "react";

import { useTheme } from "#context/theme/index.tsx";

type BlockToolProps = {
  title: string;
  children: ReactNode;
  onClick?: () => void;
  hasError?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

export function BlockTool({
  title,
  children,
  onClick,
  hasError,
  collapsible,
  defaultCollapsed = true,
}: BlockToolProps) {
  const { theme } = useTheme();
  const [hover, setHover] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleClick = () => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
    onClick?.();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithMouseEvents: TUI box component doesn't support keyboard focus
    // biome-ignore lint/a11y/noStaticElementInteractions: TUI box is inherently static without role support
    <box
      backgroundColor={hover ? theme.backgroundElement : theme.backgroundPanel}
      border={["left"]}
      borderColor={hasError ? theme.error : theme.backgroundElement}
      gap={1}
      marginTop={1}
      onMouseOut={() => setHover(false)}
      onMouseOver={() => onClick && setHover(true)}
      onMouseUp={handleClick}
      paddingBottom={1}
      paddingLeft={2}
      paddingTop={1}
    >
      <box flexDirection="row" gap={1} paddingLeft={1}>
        {collapsible && (
          <text fg={theme.textMuted}>{collapsed ? "+" : "-"}</text>
        )}
        <text fg={theme.textMuted}>{title}</text>
      </box>
      {!(collapsible && collapsed) && children}
    </box>
  );
}
