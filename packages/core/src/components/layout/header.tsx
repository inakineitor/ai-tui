import { useSession } from "#context/session.js";
import { useTheme } from "#context/theme/index.js";

export type HeaderProps = {
  showSessionInfo?: boolean;
};

export function Header({ showSessionInfo = true }: HeaderProps) {
  const { theme } = useTheme();
  const { currentSession } = useSession();

  return (
    <box
      borderColor={theme.border}
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexDirection="row" gap={1}>
        <text fg={theme.primary}>ai-sdk-tui</text>
        {showSessionInfo && currentSession && (
          <>
            <text fg={theme.textMuted}>|</text>
            <text fg={theme.text}>{currentSession.title}</text>
          </>
        )}
      </box>
      <box flexDirection="row" gap={1}>
        {currentSession && (
          <text fg={theme.textMuted}>
            {currentSession.messageCount} messages
          </text>
        )}
      </box>
    </box>
  );
}
