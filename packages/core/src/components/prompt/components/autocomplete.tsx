/**
 * Autocomplete dropdown component for file/agent/command suggestions
 * Positioned above the prompt input
 *
 * Architecture matches OpenCode's implementation:
 * - Receives direct textarea access
 * - Handles text insertion using native textarea methods
 * - Creates extmarks after text insertion
 * - Updates parent state via callbacks
 */

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  BoxRenderable,
  KeyEvent,
  TextareaRenderable,
} from "@opentui/core";
import fuzzysort from "fuzzysort";

import { useCommand } from "#context/command.tsx";
import { useTheme } from "#context/theme/index.tsx";

import { SplitBorder } from "../../border.ts";
import type {
  AutocompleteOption,
  PromptInfo,
  PromptPart,
} from "../lib/types.ts";

const MAX_VISIBLE_ITEMS = 10;

const SLASH_COMMAND_COMPLETE_REGEX = /^\S+\s+\S+\s*$/;
const WHITESPACE_REGEX = /\s/;

type AutocompleteTrigger = "#" | "@" | "/";
type AutocompleteVisibility = false | AutocompleteTrigger;

export type AutocompleteRef = {
  visible: AutocompleteVisibility;
  triggerIndex: number;
  onInput: (value: string, cursorOffset: number) => void;
  onKeyDown: (e: KeyEvent) => boolean;
  show: (
    mode: AutocompleteTrigger,
    triggerIndex: number,
    onShow?: () => void
  ) => void;
  hide: () => void;
};

type AutocompleteProps = {
  // Direct textarea access (like OpenCode's input())
  textareaRef: React.RefObject<TextareaRenderable | null>;

  // Current prompt value for reactivity
  value: string;

  // Callbacks to update parent state (like OpenCode's setPrompt, setExtmark)
  setPrompt: (updater: (draft: PromptInfo) => void) => void;
  setExtmark: (partIndex: number, extmarkId: number) => void;

  // Style IDs for extmarks
  fileStyleId: number;
  agentStyleId: number;

  // Type ID getter (may change after textarea mount)
  promptPartTypeId: () => number;

  // Anchor for positioning
  anchorRef: React.RefObject<BoxRenderable | null>;

  onTrigger?: (mode: AutocompleteTrigger, filter: string) => void;

  // Options list
  options: AutocompleteOption[];

  // Ref for parent access
  ref?: React.Ref<AutocompleteRef>;
};

export function Autocomplete({
  textareaRef,
  value,
  setPrompt,
  setExtmark,
  fileStyleId,
  agentStyleId,
  promptPartTypeId,
  anchorRef,
  onTrigger,
  options,
  ref,
}: AutocompleteProps) {
  const command = useCommand();
  const { theme } = useTheme();
  const scrollRef = useRef<BoxRenderable | null>(null);

  const [state, setState] = useState<{
    visible: AutocompleteVisibility;
    triggerIndex: number;
    selectedIndex: number;
  }>({
    visible: false,
    triggerIndex: 0,
    selectedIndex: 0,
  });

  // Extract filter text from input based on trigger position
  const filter = useMemo(() => {
    if (!state.visible) {
      return "";
    }
    const input = textareaRef.current;
    if (!input) {
      return value.slice(state.triggerIndex + 1);
    }
    // Use textarea's getTextRange if available, otherwise fall back to value slice
    const cursorOffset = input.cursorOffset;
    return value.slice(state.triggerIndex + 1, cursorOffset);
  }, [state.visible, state.triggerIndex, value, textareaRef]);

  // Filter and sort options using fuzzy search, then pad display for alignment
  const filteredOptions = useMemo(() => {
    if (!state.visible) {
      return [];
    }

    let results: AutocompleteOption[];
    if (filter) {
      const fuzzyResults = fuzzysort.go(filter, options, {
        keys: [(obj) => (obj.value ?? obj.display).trim(), "description"],
        limit: MAX_VISIBLE_ITEMS * 2,
      });
      results = fuzzyResults.map((result) => result.obj);
    } else {
      results = options.slice(0, MAX_VISIBLE_ITEMS * 2);
    }

    // Pad display strings for alignment (like OpenCode reference)
    const max = Math.max(...results.map((opt) => opt.display.length), 0);
    if (max === 0) {
      return results;
    }

    return results.map((item) => ({
      ...item,
      display: item.display.padEnd(max + 2),
    }));
  }, [state.visible, filter, options]);

  // Reset selected index when filter changes
  useEffect(() => {
    setState((prev) => ({ ...prev, selectedIndex: 0 }));
  }, []);

  const insertPart = useCallback(
    (text: string, part: PromptPart) => {
      const input = textareaRef.current;
      if (!input) {
        return;
      }

      const prefix = part.type === "file" ? "#" : "@";
      const currentCursorOffset = input.cursorOffset;

      const charAfterCursor = value.charAt(currentCursorOffset);
      const needsSpace = charAfterCursor !== " ";
      const append = `${prefix}${text}${needsSpace ? " " : ""}`;

      input.cursorOffset = state.triggerIndex;
      const startCursor = input.logicalCursor;
      input.cursorOffset = currentCursorOffset;
      const endCursor = input.logicalCursor;

      input.deleteRange(
        startCursor.row,
        startCursor.col,
        endCursor.row,
        endCursor.col
      );
      input.insertText(append);

      const virtualText = `${prefix}${text}`;
      const extmarkStart = state.triggerIndex;
      const extmarkEnd = extmarkStart + virtualText.length;

      const styleId =
        part.type === "file"
          ? fileStyleId
          : part.type === "agent"
            ? agentStyleId
            : undefined;

      const typeId = promptPartTypeId();
      let extmarkId: number | undefined;
      if (input.extmarks && typeId) {
        extmarkId = input.extmarks.create({
          start: extmarkStart,
          end: extmarkEnd,
          virtual: true,
          styleId,
          typeId,
        });
      }

      setPrompt((draft) => {
        if (part.type === "file" && part.source?.text) {
          part.source.text.start = extmarkStart;
          part.source.text.end = extmarkEnd;
          part.source.text.value = virtualText;
        } else if (part.type === "agent" && part.source?.text) {
          part.source.text.start = extmarkStart;
          part.source.text.end = extmarkEnd;
          part.source.text.value = virtualText;
        }

        const partIndex = draft.parts.length;
        draft.parts.push(part);

        draft.input = input.plainText;

        if (extmarkId !== undefined) {
          setExtmark(partIndex, extmarkId);
        }
      });
    },
    [
      textareaRef,
      value,
      state.triggerIndex,
      fileStyleId,
      agentStyleId,
      promptPartTypeId,
      setPrompt,
      setExtmark,
    ]
  );

  const show = useCallback(
    (mode: AutocompleteTrigger, triggerIndex: number, onShow?: () => void) => {
      // Suspend global keybinds while autocomplete is visible (matches OpenCode's pattern)
      command.keybinds(false);

      setState({
        visible: mode,
        triggerIndex,
        selectedIndex: 0,
      });
      if (onShow) {
        setTimeout(onShow, 0);
      }
    },
    [command]
  );

  const hide = useCallback(() => {
    const input = textareaRef.current;

    // If slash command mode and no space after command, clear it
    if (input && state.visible === "/" && value.startsWith("/")) {
      const hasSpace = value.includes(" ");
      if (!hasSpace) {
        const cursor = input.logicalCursor;
        input.deleteRange(0, 0, cursor.row, cursor.col);
        setPrompt((draft) => {
          draft.input = input.plainText;
        });
      }
    }

    // Resume global keybinds when autocomplete closes (matches OpenCode's pattern)
    command.keybinds(true);

    setState((prev) => ({
      ...prev,
      visible: false,
    }));
  }, [textareaRef, state.visible, value, setPrompt, command]);

  const moveTo = useCallback((index: number) => {
    setState((prev) => ({ ...prev, selectedIndex: index }));
  }, []);

  const move = useCallback(
    (direction: -1 | 1) => {
      if (!state.visible || filteredOptions.length === 0) {
        return;
      }

      setState((prev) => {
        let next = prev.selectedIndex + direction;
        if (next < 0) {
          next = filteredOptions.length - 1;
        }
        if (next >= filteredOptions.length) {
          next = 0;
        }
        return { ...prev, selectedIndex: next };
      });
    },
    [state.visible, filteredOptions.length]
  );

  const select = useCallback(() => {
    const selected = filteredOptions[state.selectedIndex];
    if (!selected) {
      return;
    }

    hide();

    // If option has a part, use insertPart
    if (selected.part) {
      const displayText = (selected.value ?? selected.display).trimEnd();
      insertPart(displayText, selected.part);
    } else if (selected.onSelect) {
      // Custom onSelect handler
      selected.onSelect();
    }
  }, [filteredOptions, state.selectedIndex, hide, insertPart]);

  const expandDirectory = useCallback(() => {
    const selected = filteredOptions[state.selectedIndex];
    if (!selected) {
      return;
    }

    if (!selected.isDirectory) {
      select();
      return;
    }

    const input = textareaRef.current;
    if (!input) {
      return;
    }

    const currentCursorOffset = input.cursorOffset;
    const displayText = (selected.value ?? selected.display).trimEnd();
    const path = displayText.startsWith("#")
      ? displayText.slice(1)
      : displayText;

    input.cursorOffset = state.triggerIndex;
    const startCursor = input.logicalCursor;
    input.cursorOffset = currentCursorOffset;
    const endCursor = input.logicalCursor;

    input.deleteRange(
      startCursor.row,
      startCursor.col,
      endCursor.row,
      endCursor.col
    );
    input.insertText(`#${path}`);

    setPrompt((draft) => {
      draft.input = input.plainText;
    });

    setState((prev) => ({ ...prev, selectedIndex: 0 }));
  }, [
    filteredOptions,
    state.selectedIndex,
    state.triggerIndex,
    textareaRef,
    setPrompt,
    select,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      get visible() {
        return state.visible;
      },
      get triggerIndex() {
        return state.triggerIndex;
      },
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex autocomplete input handling
      onInput(inputValue: string, offset: number) {
        if (state.visible) {
          if (
            offset <= state.triggerIndex ||
            inputValue.slice(state.triggerIndex, offset).includes(" ") ||
            (state.visible === "/" &&
              SLASH_COMMAND_COMPLETE_REGEX.test(inputValue))
          ) {
            hide();
            return;
          }
        } else {
          if (offset === 0) {
            return;
          }

          if (
            inputValue.startsWith("/") &&
            !inputValue.slice(0, offset).includes(" ")
          ) {
            const slashFilter = inputValue.slice(1, offset);
            show("/", 0, () => onTrigger?.("/", slashFilter));
            return;
          }

          const text = inputValue.slice(0, offset);

          const hashIdx = text.lastIndexOf("#");
          if (hashIdx !== -1) {
            const between = text.slice(hashIdx);
            const before = hashIdx === 0 ? undefined : inputValue[hashIdx - 1];
            if (
              (before === undefined || WHITESPACE_REGEX.test(before)) &&
              !between.includes(" ")
            ) {
              const hashFilter = inputValue.slice(hashIdx + 1, offset);
              show("#", hashIdx, () => onTrigger?.("#", hashFilter));
              return;
            }
          }

          const atIdx = text.lastIndexOf("@");
          if (atIdx !== -1) {
            const between = text.slice(atIdx);
            const before = atIdx === 0 ? undefined : inputValue[atIdx - 1];
            if (
              (before === undefined || WHITESPACE_REGEX.test(before)) &&
              !between.includes(" ")
            ) {
              const atFilter = inputValue.slice(atIdx + 1, offset);
              show("@", atIdx, () => onTrigger?.("@", atFilter));
              return;
            }
          }
        }
      },
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex keyboard event handling for autocomplete
      onKeyDown(e: KeyEvent): boolean {
        if (!state.visible) {
          const input = textareaRef.current;
          const cursorOffset = input?.cursorOffset ?? 0;

          if (e.name === "#" || e.name === "@") {
            const charBefore =
              cursorOffset === 0 ? undefined : value[cursorOffset - 1];
            if (charBefore === undefined || WHITESPACE_REGEX.test(charBefore)) {
              return false;
            }
          }
          if (e.name === "/" && cursorOffset === 0) {
            return false;
          }
          return false;
        }

        const name = e.name?.toLowerCase();
        const ctrlOnly = e.ctrl && !e.meta && !e.shift;
        const isNavUp = name === "up" || (ctrlOnly && name === "p");
        const isNavDown = name === "down" || (ctrlOnly && name === "n");

        if (isNavUp) {
          move(-1);
          return true;
        }
        if (isNavDown) {
          move(1);
          return true;
        }
        if (name === "escape") {
          hide();
          return true;
        }
        if (name === "return") {
          select();
          return true;
        }
        if (name === "tab") {
          expandDirectory();
          return true;
        }

        return false;
      },
      show,
      hide,
    }),
    [
      state.visible,
      state.triggerIndex,
      textareaRef,
      value,
      show,
      hide,
      move,
      select,
      expandDirectory,
      onTrigger,
    ]
  );

  // Calculate position relative to anchor
  const position = useMemo(() => {
    const anchor = anchorRef.current;
    if (!(anchor && state.visible)) {
      return { x: 0, y: 0, width: 0, absoluteY: 0 };
    }

    const parent = anchor.parent;
    const parentX = parent?.x ?? 0;
    const parentY = parent?.y ?? 0;

    return {
      x: anchor.x - parentX,
      y: anchor.y - parentY,
      width: anchor.width,
      // Store absolute Y for height calculation (space available above anchor)
      absoluteY: anchor.y,
    };
  }, [anchorRef, state.visible]);

  // Height calculation - account for available space above anchor
  const height = useMemo(() => {
    const count = filteredOptions.length || 1;
    if (!state.visible) {
      return Math.min(MAX_VISIBLE_ITEMS, count);
    }
    // Use absolute Y position to determine available space above the anchor
    const availableSpace = Math.max(1, position.absoluteY);
    return Math.min(MAX_VISIBLE_ITEMS, count, availableSpace);
  }, [state.visible, filteredOptions.length, position.absoluteY]);

  return (
    <box
      {...SplitBorder}
      borderColor={theme.border}
      left={position.x}
      position="absolute"
      top={position.y - height}
      visible={state.visible !== false}
      width={position.width}
      zIndex={100}
    >
      <scrollbox
        backgroundColor={theme.backgroundPanel}
        height={height}
        ref={(r) => {
          scrollRef.current = r;
        }}
        scrollbarOptions={{ visible: false }}
      >
        {filteredOptions.length === 0 ? (
          <box paddingLeft={1} paddingRight={1}>
            <text fg={theme.textMuted}>No matching items</text>
          </box>
        ) : (
          filteredOptions
            .slice(0, MAX_VISIBLE_ITEMS * 2)
            .map((option, index) => (
              <box
                backgroundColor={
                  index === state.selectedIndex ? theme.primary : undefined
                }
                flexDirection="row"
                key={option.value ?? option.display}
                onMouseOver={() => moveTo(index)}
                onMouseUp={() => select()}
                paddingLeft={1}
                paddingRight={1}
              >
                <text
                  fg={
                    index === state.selectedIndex
                      ? theme.background
                      : theme.text
                  }
                  flexShrink={0}
                >
                  {option.display}
                </text>
                {option.description && (
                  <text
                    fg={
                      index === state.selectedIndex
                        ? theme.background
                        : theme.textMuted
                    }
                    wrapMode="none"
                  >
                    {option.description}
                  </text>
                )}
              </box>
            ))
        )}
      </scrollbox>
    </box>
  );
}
