import { type DialogContextValue, useDialog, useTheme } from "@ai-tui/core";
import { useKeyboard } from "@opentui/react";

import { DialogBox } from "./dialog-box.js";

type DialogAlertProps = {
  title: string;
  message: string;
  onConfirm?: () => void;
};

/**
 * Alert dialog component - displays a message with an OK button
 */
export function DialogAlert({ title, message, onConfirm }: DialogAlertProps) {
  const { clear } = useDialog();
  const { theme } = useTheme();

  const handleConfirm = () => {
    onConfirm?.();
    clear();
  };

  // Enter to confirm
  useKeyboard((key) => {
    if (key.name === "return") {
      handleConfirm();
    }
  });

  return (
    <DialogBox title={title}>
      <text fg={theme.textMuted}>{message}</text>
      <box flexDirection="row" justifyContent="flex-end" paddingTop={1}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: TUI component */}
        <box
          backgroundColor={theme.primary}
          onMouseUp={handleConfirm}
          paddingLeft={2}
          paddingRight={2}
        >
          <text fg={theme.background}>OK</text>
        </box>
      </box>
      <text fg={theme.textMuted}>Press Enter to confirm</text>
    </DialogBox>
  );
}

/**
 * Static helper to show an alert dialog
 */
DialogAlert.show = (
  dialog: DialogContextValue,
  title: string,
  message: string
): void => {
  dialog.replace(<DialogAlert message={message} title={title} />);
};
