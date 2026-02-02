import { useMemo, useState } from "react";

import type { KeybindAction } from "#context/keybind.tsx";

import { useDialog } from "../context.tsx";
import { DialogSelect, type DialogSelectOption } from "./select.tsx";

export type CommandOption = DialogSelectOption<string> & {
  keybind?: KeybindAction;
  suggested?: boolean;
};

type DialogCommandProps = {
  options: CommandOption[];
  suggestedOptions: CommandOption[];
  onSelect: (value: string) => void;
};

export function DialogCommand({
  options,
  suggestedOptions,
  onSelect,
}: DialogCommandProps) {
  const dialog = useDialog();
  const [filter, setFilter] = useState("");

  const displayOptions = useMemo(() => {
    if (filter) {
      return options;
    }
    return [
      ...suggestedOptions.map((o) => ({ ...o, category: "Suggested" })),
      ...options.filter(
        (o) => !suggestedOptions.find((s) => s.value === o.value)
      ),
    ];
  }, [filter, options, suggestedOptions]);

  const handleSelect = (option: DialogSelectOption<string>) => {
    dialog.clear();
    onSelect(option.value);
  };

  return (
    <DialogSelect
      onFilter={setFilter}
      onSelect={handleSelect}
      options={displayOptions}
      title="Commands"
    />
  );
}
