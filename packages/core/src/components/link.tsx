import { exec } from "node:child_process";

import type { ReactNode } from "react";

import { useTheme } from "#context/theme/index.tsx";

type LinkProps = {
  href: string;
  children?: ReactNode;
  fg?: string;
};

/**
 * Opens URL in the default browser
 */
function openUrl(url: string): void {
  const platform = process.platform;

  let command: string;
  if (platform === "darwin") {
    command = `open "${url}"`;
  } else if (platform === "win32") {
    command = `start "" "${url}"`;
  } else {
    // Linux and others
    command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      // Silently fail - user can copy the URL manually
      console.error(`Failed to open URL: ${error.message}`);
    }
  });
}

/**
 * Clickable hyperlink that opens URL in default browser
 */
export function Link({ href, children, fg }: LinkProps) {
  const { theme } = useTheme();
  const color = fg ?? theme.primary;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Terminal hyperlink
    <text fg={color} onMouseUp={() => openUrl(href)}>
      {children ?? href}
    </text>
  );
}
