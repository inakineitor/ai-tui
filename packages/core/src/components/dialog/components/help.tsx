import { useMemo, useState } from "react";

import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";

import type { KeybindAction } from "#context/keybind.tsx";
import { useKeybind } from "#context/keybind.tsx";
import { useTheme } from "#context/theme/index.tsx";

type KeybindCategory = {
  name: string;
  items: { action: KeybindAction; label: string }[];
};

const KEYBIND_CATEGORIES: KeybindCategory[] = [
  {
    name: "Global",
    items: [
      { action: "command_list", label: "Command palette" },
      { action: "help", label: "Show keybinds" },
      { action: "app_exit", label: "Quit" },
    ],
  },
  {
    name: "Prompt",
    items: [
      { action: "input_submit", label: "Submit" },
      { action: "input_newline", label: "New line" },
      { action: "session_interrupt", label: "Interrupt" },
      { action: "input_clear", label: "Clear input" },
      { action: "history_previous", label: "Previous history" },
      { action: "history_next", label: "Next history" },
    ],
  },
  {
    name: "Navigation",
    items: [
      { action: "agent_cycle", label: "Cycle agent" },
      { action: "session_list", label: "Switch session" },
      { action: "sidebar_toggle", label: "Toggle sidebar" },
    ],
  },
];

export function DialogHelp() {
  const { theme } = useTheme();
  const keybind = useKeybind();
  const [filter, setFilter] = useState("");

  const filteredCategories = useMemo(() => {
    if (!filter) {
      return KEYBIND_CATEGORIES;
    }
    const lower = filter.toLowerCase();
    return KEYBIND_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(lower) ||
          keybind.print(item.action).toLowerCase().includes(lower)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [filter, keybind]);

  useKeyboard((evt) => {
    if (evt.name === "backspace") {
      setFilter((f) => f.slice(0, -1));
    } else if (evt.sequence && evt.sequence.length === 1 && !evt.ctrl) {
      setFilter((f) => f + evt.sequence);
    }
  });

  return (
    <box flexDirection="column" gap={1} paddingLeft={2} paddingRight={2}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          Keyboard Shortcuts
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>

      <box paddingBottom={1}>
        <text fg={theme.textMuted}>&gt; </text>
        <text fg={filter ? theme.text : theme.textMuted}>
          {filter || "Filter..."}
        </text>
      </box>

      <box flexDirection="column" maxHeight={15}>
        {filteredCategories.map((category) => (
          <box flexDirection="column" key={category.name} paddingBottom={1}>
            <text attributes={TextAttributes.BOLD} fg={theme.accent}>
              {category.name}
            </text>
            {category.items.map((item) => (
              <box
                flexDirection="row"
                justifyContent="space-between"
                key={item.action}
                paddingLeft={2}
              >
                <text fg={theme.text}>{item.label}</text>
                <text fg={theme.textMuted}>{keybind.print(item.action)}</text>
              </box>
            ))}
          </box>
        ))}
        {filteredCategories.length === 0 && (
          <text fg={theme.textMuted}>No keybinds match "{filter}"</text>
        )}
      </box>
    </box>
  );
}
