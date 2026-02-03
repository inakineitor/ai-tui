import { useCallback, useEffect, useState } from "react";

import { useTerminalDimensions } from "@opentui/react";

import { Prompt } from "#components/prompt/index.js";
import { useAgents, useTips } from "#context/config.js";
import { useKV } from "#context/kv.js";
import { useTheme } from "#context/theme/index.js";
import type { FileUIPart } from "#hooks/use-message-queue.js";

import { Logo } from "./components/logo/index.js";
import { Tips } from "./components/tips.js";

type HomeProps = {
  isInitializing: boolean;
  isLoading: boolean;
  initError: Error | null;
  directory: string;
  onSubmit?: (content: string, files?: FileUIPart[]) => void;
  onShellCommand?: (command: string) => void;
};

export function Home({
  isInitializing,
  isLoading,
  initError,
  directory,
  onSubmit,
  onShellCommand,
}: HomeProps) {
  const { theme } = useTheme();
  const dimensions = useTerminalDimensions();
  const agents = useAgents();
  const tips = useTips();
  const kv = useKV();
  const [tipsHidden, setTipsHidden] = useState(false);
  const [kvLoaded, setKvLoaded] = useState(false);

  useEffect(() => {
    kv.load().then(() => {
      setTipsHidden(kv.get("tips_hidden", false));
      setKvLoaded(true);
    });
  }, [kv]);

  const handleSubmit = useCallback(
    (content: string, files?: FileUIPart[]) => {
      if (content.trim() === "/tips") {
        const newValue = !tipsHidden;
        setTipsHidden(newValue);
        kv.set("tips_hidden", newValue);
        return;
      }
      onSubmit?.(content, files);
    },
    [onSubmit, tipsHidden, kv]
  );

  return (
    <box
      backgroundColor={theme.background}
      flexDirection="column"
      height={dimensions.height}
      width={dimensions.width}
    >
      <box
        alignItems="center"
        flexGrow={1}
        gap={1}
        justifyContent="center"
        paddingLeft={2}
        paddingRight={2}
      >
        <box height={3} />
        <Logo />
        <box maxWidth={75} paddingTop={1} width="100%">
          <Prompt
            disabled={isInitializing}
            isStreaming={isLoading}
            onShellCommand={onShellCommand}
            onSubmit={handleSubmit}
            placeholder={
              isInitializing
                ? "Connecting to agent..."
                : "What would you like to do?"
            }
            showShortcuts
          />
        </box>
        {kvLoaded && !tipsHidden && tips.length > 0 && (
          <box
            alignItems="center"
            height={3}
            maxWidth={75}
            paddingTop={2}
            width="100%"
          >
            <Tips />
          </box>
        )}
        {/* Error display only (no streaming indicator on home) */}
        {initError && (
          <box maxWidth={75} paddingTop={1} width="100%">
            <text fg={theme.error}>Error: {initError.message}</text>
          </box>
        )}
      </box>
      {/* Footer - simplified */}
      <box
        flexDirection="row"
        flexShrink={0}
        gap={2}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
      >
        <text fg={theme.textMuted}>{directory}</text>
        <box flexGrow={1} />
        <box flexDirection="row">
          {agents.map((agent, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static list, index is stable
            <box flexDirection="row" key={index}>
              {index > 0 && <text fg={theme.textMuted}> · </text>}
              <text fg={agent.color}>{agent.name}</text>
            </box>
          ))}
        </box>
      </box>
    </box>
  );
}
