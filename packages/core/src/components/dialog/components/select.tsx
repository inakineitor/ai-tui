import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { InputRenderable, ScrollBoxRenderable } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";

import type { KeybindInfo } from "#context/keybind.tsx";
import {
  keybindInfoMatch,
  keybindInfoToString,
  useKeybind,
} from "#context/keybind.tsx";
import { useTheme } from "#context/theme/index.tsx";

import { type DialogContextValue, useDialog } from "../context.tsx";

export type DialogSelectOption<T> = {
  value: T;
  title: string;
  description?: string;
  category?: string;
  footer?: ReactNode | string;
  gutter?: ReactNode;
  bg?: string;
  onSelect?: (dialog: DialogContextValue) => void;
};

export type DialogSelectKeybind<T> = {
  keybind?: KeybindInfo;
  title: string;
  disabled?: boolean;
  onTrigger: (option: DialogSelectOption<T>) => void;
};

export type DialogSelectRef<T> = {
  filter: string;
  filtered: DialogSelectOption<T>[];
};

type DialogSelectProps<T> = {
  title: string;
  options: DialogSelectOption<T>[];
  current?: T;
  placeholder?: string;
  keybinds?: DialogSelectKeybind<T>[];
  onSelect?: (option: DialogSelectOption<T>) => void;
  onMove?: (option: DialogSelectOption<T>) => void;
  onFilter?: (filter: string) => void;
  refCallback?: (ref: DialogSelectRef<T>) => void;
};

function isDeepEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength - 1)}…`;
}

export function DialogSelect<T>({
  title,
  options,
  current,
  placeholder = "Search",
  keybinds = [],
  onSelect,
  onMove,
  onFilter,
  refCallback,
}: DialogSelectProps<T>) {
  const dialog = useDialog();
  const { theme } = useTheme();
  const keybind = useKeybind();
  const dimensions = useTerminalDimensions();

  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState("");
  const [inputMode, setInputMode] = useState<"keyboard" | "mouse">("keyboard");

  const inputRef = useRef<InputRenderable | null>(null);
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

  const filtered = useMemo(() => {
    if (!filter) {
      return options;
    }
    const lower = filter.toLowerCase();
    return options.filter(
      (opt) =>
        opt.title.toLowerCase().includes(lower) ||
        opt.description?.toLowerCase().includes(lower) ||
        opt.category?.toLowerCase().includes(lower)
    );
  }, [options, filter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, DialogSelectOption<T>[]>();
    for (const opt of filtered) {
      const category = opt.category ?? "";
      const existing = groups.get(category) ?? [];
      groups.set(category, [...existing, opt]);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const flat = useMemo(
    () => grouped.flatMap(([, categoryOptions]) => categoryOptions),
    [grouped]
  );

  useEffect(() => {
    setInputMode("keyboard");
  }, []);

  const selectedOption = useMemo(() => flat[selected], [flat, selected]);

  const height = useMemo(() => {
    const contentHeight = flat.length + grouped.length * 2 - 1;
    const maxHeight = Math.floor(dimensions.height / 2) - 6;
    return Math.max(Math.min(contentHeight, maxHeight), 5);
  }, [flat.length, grouped.length, dimensions.height]);

  const moveTo = useCallback(
    (index: number, center = false) => {
      const clamped = Math.max(0, Math.min(index, flat.length - 1));
      setSelected(clamped);

      const newSelectedOption = flat[clamped];
      if (newSelectedOption) {
        onMove?.(newSelectedOption);
      }

      const scroll = scrollRef.current;
      if (!scroll) {
        return;
      }

      const target = scroll
        .getChildren()
        .find((child) => child.id === JSON.stringify(newSelectedOption?.value));
      if (!target) {
        return;
      }

      const y = target.y - scroll.y;

      if (center) {
        const centerOffset = Math.floor(scroll.height / 2);
        scroll.scrollBy(y - centerOffset);
      } else {
        if (y >= scroll.height) {
          scroll.scrollBy(y - scroll.height + 1);
        }
        if (y < 0) {
          scroll.scrollBy(y);
          const firstOption = flat[0];
          if (
            firstOption &&
            newSelectedOption &&
            isDeepEqual(firstOption.value, newSelectedOption.value)
          ) {
            scroll.scrollTo(0);
          }
        }
      }
    },
    [flat, onMove]
  );

  useEffect(() => {
    refCallback?.({ filter, filtered: flat });
  }, [filter, flat, refCallback]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 1);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (filter.length > 0) {
        moveTo(0, true);
      } else if (current !== undefined) {
        const currentIndex = flat.findIndex((opt) =>
          isDeepEqual(opt.value, current)
        );
        if (currentIndex >= 0) {
          moveTo(currentIndex, true);
        }
      }
    }, 0);
  }, [filter, current, flat, moveTo]);

  const move = useCallback(
    (direction: number) => {
      if (flat.length === 0) {
        return;
      }
      let next = selected + direction;
      if (next < 0) {
        next = flat.length - 1;
      }
      if (next >= flat.length) {
        next = 0;
      }
      moveTo(next);
    },
    [flat.length, selected, moveTo]
  );

  const handleSelect = useCallback(
    (option: DialogSelectOption<T>) => {
      option.onSelect?.(dialog);
      onSelect?.(option);
    },
    [dialog, onSelect]
  );

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex keyboard navigation logic
  useKeyboard((evt) => {
    if (evt.name === "up" || (evt.ctrl && evt.name === "p")) {
      evt.preventDefault?.();
      setInputMode("keyboard");
      move(-1);
    } else if (evt.name === "down" || (evt.ctrl && evt.name === "n")) {
      evt.preventDefault?.();
      setInputMode("keyboard");
      move(1);
    } else if (evt.name === "pageup") {
      evt.preventDefault?.();
      setInputMode("keyboard");
      move(-10);
    } else if (evt.name === "pagedown") {
      evt.preventDefault?.();
      setInputMode("keyboard");
      move(10);
    } else if (evt.name === "home") {
      evt.preventDefault?.();
      setInputMode("keyboard");
      moveTo(0);
    } else if (evt.name === "end") {
      evt.preventDefault?.();
      setInputMode("keyboard");
      moveTo(flat.length - 1);
    } else if (evt.name === "return" && selectedOption) {
      evt.preventDefault?.();
      handleSelect(selectedOption);
    }

    // Execute custom keybinds
    for (const item of keybinds ?? []) {
      if (item.disabled || !item.keybind) {
        continue;
      }
      if (
        keybindInfoMatch(item.keybind, keybind.parse(evt)) &&
        selectedOption
      ) {
        evt.preventDefault?.();
        item.onTrigger(selectedOption);
      }
    }
  });

  const handleInput = useCallback(
    (value: string) => {
      setFilter(value);
      setSelected(0);
      onFilter?.(value);
    },
    [onFilter]
  );

  return (
    <box flexDirection="column" gap={1} paddingBottom={1}>
      <box flexDirection="column" paddingLeft={4} paddingRight={4}>
        <box flexDirection="row" justifyContent="space-between">
          <text attributes={TextAttributes.BOLD} fg={theme.text}>
            {title}
          </text>
          <text fg={theme.textMuted}>esc</text>
        </box>

        <box paddingBottom={1} paddingTop={1}>
          <input
            cursorColor={theme.primary}
            focusedBackgroundColor={theme.backgroundPanel}
            focusedTextColor={theme.textMuted}
            onInput={handleInput}
            placeholder={placeholder}
            ref={(r) => {
              inputRef.current = r;
            }}
          />
        </box>
      </box>

      {grouped.length > 0 ? (
        <scrollbox
          maxHeight={height}
          paddingLeft={1}
          paddingRight={1}
          ref={(r) => {
            scrollRef.current = r;
          }}
          scrollbarOptions={{ visible: false }}
        >
          {grouped.map(([category, categoryOptions], groupIndex) => (
            <box flexDirection="column" key={category || `group-${groupIndex}`}>
              {category && (
                <box paddingLeft={3} paddingTop={groupIndex > 0 ? 1 : 0}>
                  <text attributes={TextAttributes.BOLD} fg={theme.accent}>
                    {category}
                  </text>
                </box>
              )}
              {categoryOptions.map((option) => {
                const active = isDeepEqual(option.value, selectedOption?.value);
                const isCurrent = isDeepEqual(option.value, current);

                return (
                  <box
                    backgroundColor={
                      active ? (option.bg ?? theme.primary) : undefined
                    }
                    flexDirection="row"
                    gap={1}
                    id={JSON.stringify(option.value)}
                    key={JSON.stringify(option.value)}
                    onMouseMove={() => setInputMode("mouse")}
                    onMouseOver={() => {
                      if (inputMode !== "mouse") {
                        return;
                      }
                      const index = flat.findIndex((x) =>
                        isDeepEqual(x.value, option.value)
                      );
                      if (index !== -1) {
                        moveTo(index);
                      }
                    }}
                    onMouseUp={() => handleSelect(option)}
                    paddingLeft={isCurrent || option.gutter ? 1 : 3}
                    paddingRight={3}
                  >
                    <Option
                      active={active}
                      current={isCurrent}
                      description={
                        option.description !== category
                          ? option.description
                          : undefined
                      }
                      footer={option.footer}
                      gutter={option.gutter}
                      title={option.title}
                    />
                  </box>
                );
              })}
            </box>
          ))}
        </scrollbox>
      ) : (
        <box paddingLeft={4} paddingRight={4} paddingTop={1}>
          <text fg={theme.textMuted}>No results found</text>
        </box>
      )}

      {keybinds.length > 0 && (
        <box
          flexDirection="row"
          flexShrink={0}
          gap={2}
          paddingLeft={4}
          paddingRight={2}
          paddingTop={1}
        >
          {keybinds
            .filter((item) => !item.disabled && item.keybind)
            .map((item) => (
              <box flexDirection="row" key={item.title}>
                <text attributes={TextAttributes.BOLD} fg={theme.text}>
                  {item.title}{" "}
                </text>
                <text fg={theme.textMuted}>
                  {item.keybind ? keybindInfoToString(item.keybind) : ""}
                </text>
              </box>
            ))}
        </box>
      )}
    </box>
  );
}

type OptionProps = {
  title: string;
  description?: string;
  active?: boolean;
  current?: boolean;
  footer?: ReactNode | string;
  gutter?: ReactNode;
};

function Option({
  title,
  description,
  active,
  current,
  footer,
  gutter,
}: OptionProps) {
  const { theme } = useTheme();
  const fg = active ? theme.background : theme.text;
  const mutedFg = active ? theme.background : theme.textMuted;

  return (
    <>
      {current && (
        <text
          fg={active ? fg : current ? theme.primary : theme.text}
          flexShrink={0}
          marginRight={0}
        >
          ●
        </text>
      )}
      {!current && gutter && (
        <box flexShrink={0} marginRight={0}>
          {gutter}
        </box>
      )}
      <text
        attributes={active ? TextAttributes.BOLD : undefined}
        fg={active ? fg : current ? theme.primary : theme.text}
        flexGrow={1}
        overflow="hidden"
        paddingLeft={3}
        wrapMode="none"
      >
        {truncate(title, 61)}
        {description && <text fg={mutedFg}> {description}</text>}
      </text>
      {footer && (
        <box flexShrink={0}>
          <text fg={mutedFg}>{footer}</text>
        </box>
      )}
    </>
  );
}
