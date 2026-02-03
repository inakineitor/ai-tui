import { useState } from "react";

import { useKeyboard } from "@opentui/react";

import {
  DialogBox,
  type DialogContextValue,
  useDialog,
} from "#components/dialog/index.js";
import { useTheme } from "#context/theme/index.js";

type DialogConfirmProps = {
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function DialogConfirm({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: DialogConfirmProps) {
  const { clear } = useDialog();
  const { theme } = useTheme();
  const [selected, setSelected] = useState<"cancel" | "confirm">("confirm");

  const handleConfirm = () => {
    onConfirm?.();
    clear();
  };

  const handleCancel = () => {
    onCancel?.();
    clear();
  };

  useKeyboard((key) => {
    if (key.name === "return") {
      if (selected === "confirm") {
        handleConfirm();
      } else {
        handleCancel();
      }
    } else if (key.name === "left" || key.name === "h") {
      setSelected("cancel");
    } else if (key.name === "right" || key.name === "l") {
      setSelected("confirm");
    } else if (key.name === "tab") {
      setSelected((prev) => (prev === "cancel" ? "confirm" : "cancel"));
    }
  });

  return (
    <DialogBox title={title}>
      <text fg={theme.textMuted}>{message}</text>
      <box flexDirection="row" gap={1} justifyContent="flex-end" paddingTop={1}>
        <box
          backgroundColor={
            selected === "cancel" ? theme.textMuted : theme.background
          }
          border={
            selected === "cancel"
              ? undefined
              : ["top", "bottom", "left", "right"]
          }
          borderColor={theme.border}
          onMouseOver={() => setSelected("cancel")}
          onMouseUp={handleCancel}
          paddingLeft={2}
          paddingRight={2}
        >
          <text fg={selected === "cancel" ? theme.background : theme.textMuted}>
            {cancelLabel}
          </text>
        </box>
        <box
          backgroundColor={
            selected === "confirm" ? theme.primary : theme.background
          }
          border={
            selected === "confirm"
              ? undefined
              : ["top", "bottom", "left", "right"]
          }
          borderColor={theme.border}
          onMouseOver={() => setSelected("confirm")}
          onMouseUp={handleConfirm}
          paddingLeft={2}
          paddingRight={2}
        >
          <text fg={selected === "confirm" ? theme.background : theme.text}>
            {confirmLabel}
          </text>
        </box>
      </box>
      <text fg={theme.textMuted}>Use arrows to select, Enter to confirm</text>
    </DialogBox>
  );
}

DialogConfirm.show = (
  dialog: DialogContextValue,
  title: string,
  message: string
): Promise<boolean> =>
  new Promise((resolve) => {
    dialog.replace(
      <DialogConfirm
        message={message}
        onCancel={() => resolve(false)}
        onConfirm={() => resolve(true)}
        title={title}
      />,
      () => resolve(false)
    );
  });
