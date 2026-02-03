import { useKeybind } from "#context/keybind.js";
import { useTheme } from "#context/theme/index.js";

export type FooterProps = {
  isLoading?: boolean;
  agentName?: string;
};

export function Footer({ isLoading = false, agentName }: FooterProps) {
  const { theme } = useTheme();
  const keybind = useKeybind();

  const shortcuts = [
    { label: "Help", keybind: keybind.print("help") },
    { label: "Commands", keybind: keybind.print("command_list") },
    { label: "Sessions", keybind: keybind.print("session_list") },
    { label: "Quit", keybind: keybind.print("app_exit") },
  ];

  return (
    <box
      borderColor={theme.border}
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexDirection="row" gap={2}>
        {shortcuts.map((shortcut) => (
          <box flexDirection="row" gap={1} key={shortcut.label}>
            <text fg={theme.textMuted}>{shortcut.keybind}</text>
            <text fg={theme.text}>{shortcut.label}</text>
          </box>
        ))}
      </box>
      <box flexDirection="row" gap={2}>
        {agentName && <text fg={theme.secondary}>{agentName}</text>}
        {isLoading && <text fg={theme.warning}>...</text>}
      </box>
    </box>
  );
}
