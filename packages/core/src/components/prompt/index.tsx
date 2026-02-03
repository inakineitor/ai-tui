/**
 * Enhanced Prompt Component
 *
 * Features:
 * - Command history with persistence (up/down navigation)
 * - Autocomplete for files (#), agents (@), and commands (/)
 * - Shell mode (! prefix)
 * - Paste handling with summarization
 * - Frecency-based file suggestions
 * - Prompt stashing
 */

import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  BoxRenderable,
  KeyEvent,
  PasteEvent,
  TextareaRenderable,
} from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import { lookup as lookupMimeType } from "mime-types";

import { useAgent } from "#context/agent.js";
import { useCommand } from "#context/command.js";
import { useSubagents } from "#context/config.js";
import { useKeybind } from "#context/keybind.js";
import { useFrecency, useHistory, useStash } from "#context/prompt.js";
import { useTheme } from "#context/theme/index.js";
import type { FileUIPart } from "#hooks/use-message-queue.js";
import { Clipboard } from "#lib/clipboard.js";

import { EmptyBorder } from "../border.js";
import {
  Autocomplete,
  type AutocompleteRef,
} from "./components/autocomplete.js";
import { StreamingIndicator } from "./components/spinner/index.js";
import {
  buildFileUrl,
  extractLineRange,
  searchFiles,
  truncateMiddle,
} from "./lib/file-search.js";
import type {
  AgentPart,
  AutocompleteOption,
  FilePart,
  PromptInfo,
  PromptPart,
  Segment,
} from "./lib/types.js";
import { isImageMime } from "./lib/types.js";

const URL_REGEX = /^https?:\/\//;
const WHITESPACE_SPLIT_REGEX = /\s+/;

const PROMPT_KEY_BINDINGS = [
  { name: "return", action: "submit" as const },
  { name: "return", shift: true, action: "newline" as const },
];

function extractAbsolutePath(url: string): string {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    const startLine = parsed.searchParams.get("start");
    const endLine = parsed.searchParams.get("end");
    if (startLine) {
      path += `#${startLine}${endLine ? `-${endLine}` : ""}`;
    }
    return path;
  } catch {
    return url;
  }
}

function deriveSegments(input: string, parts: PromptPart[]): Segment[] {
  const ranges = parts
    .filter(
      (
        p
      ): p is PromptPart & {
        source: { text: { start: number; end: number } };
      } => p.source?.text !== undefined
    )
    .map((p) => ({
      part: p,
      start: p.source.text.start,
      end: p.source.text.end,
    }))
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const { part, start, end } of ranges) {
    if (start > cursor) {
      segments.push({ type: "text", text: input.slice(cursor, start) });
    }

    const displayText = input.slice(start, end);

    if (part.type === "file" && isImageMime(part.mime)) {
      segments.push({
        type: "image",
        mime: part.mime,
        filename: part.filename,
        url: part.url,
        displayText,
      });
    } else if (part.type === "file") {
      segments.push({ type: "fileRef", url: part.url, displayText });
    } else if (part.type === "agent") {
      segments.push({ type: "agent", id: part.id, displayText });
    }

    cursor = end;
  }

  if (cursor < input.length) {
    segments.push({ type: "text", text: input.slice(cursor) });
  }

  return segments;
}

function prepareMessageForSubmit(
  input: string,
  parts: PromptPart[]
): { text: string; files: FileUIPart[] } {
  return deriveSegments(input, parts).reduce(
    (acc, seg) => {
      switch (seg.type) {
        case "text":
          acc.text += seg.text;
          break;
        case "image":
          acc.text += seg.displayText;
          acc.files.push({
            type: "file",
            mediaType: seg.mime,
            filename: seg.filename,
            url: seg.url,
          });
          break;
        case "fileRef":
          acc.text += extractAbsolutePath(seg.url);
          break;
        case "agent":
          acc.text += seg.displayText;
          break;
        default:
          break;
      }
      return acc;
    },
    { text: "", files: [] as FileUIPart[] }
  );
}

type PromptProps = {
  onSubmit: (message: string, files?: FileUIPart[]) => void;
  onShellCommand?: (command: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  showShortcuts?: boolean;
  showSpinner?: boolean;
  onInterrupt?: () => void;
  hasQueuedMessages?: boolean;
};

export function Prompt({
  onSubmit,
  onShellCommand,
  disabled = false,
  isStreaming = false,
  placeholder,
  showShortcuts = false,
  showSpinner = false,
  onInterrupt,
  hasQueuedMessages = false,
}: PromptProps) {
  const { theme, syntax } = useTheme();
  const { selectedAgent } = useAgent();
  const commandContext = useCommand();
  const keybind = useKeybind();
  const renderer = useRenderer();
  const subagents = useSubagents();

  // Use shared context instances
  const { history, isLoaded: historyLoaded } = useHistory();
  const { frecency, isLoaded: frecencyLoaded } = useFrecency();
  const { isLoaded: stashLoaded } = useStash();

  const textareaRef = useRef<TextareaRenderable | null>(null);
  const anchorRef = useRef<BoxRenderable | null>(null);
  const autocompleteRef = useRef<AutocompleteRef | null>(null);

  // Extmark style IDs - obtained from syntax style
  const fileStyleId = useMemo(
    () => syntax.getStyleId("extmark.file") ?? 0,
    [syntax]
  );
  const agentStyleId = useMemo(
    () => syntax.getStyleId("extmark.agent") ?? 0,
    [syntax]
  );
  const pasteStyleId = useMemo(
    () => syntax.getStyleId("extmark.paste") ?? 0,
    [syntax]
  );

  const imageStyleId = useMemo(
    () => syntax.getStyleId("extmark.image") ?? 0,
    [syntax]
  );

  // Track the extmark type ID (registered once per textarea)
  const promptPartTypeIdRef = useRef<number>(0);

  // Map extmark IDs to part indices for syncing
  const extmarkToPartIndexRef = useRef<Map<number, number>>(new Map());

  // Callback for Autocomplete to update prompt state (matches OpenCode's setPrompt)
  const setPrompt = useCallback((updater: (draft: PromptInfo) => void) => {
    setPromptInfo((prev) => {
      const draft: PromptInfo = { ...prev, parts: [...prev.parts] };
      updater(draft);
      return draft;
    });
  }, []);

  // Callback for Autocomplete to track extmark-to-part mapping (matches OpenCode's setExtmark)
  const setExtmarkMapping = useCallback(
    (partIndex: number, extmarkId: number) => {
      extmarkToPartIndexRef.current.set(extmarkId, partIndex);
    },
    []
  );

  // Getter for prompt part type ID (may change after textarea mount)
  const getPromptPartTypeId = useCallback(
    () => promptPartTypeIdRef.current,
    []
  );

  // State
  const [promptInfo, setPromptInfo] = useState<PromptInfo>({
    input: "",
    parts: [],
  });
  const [mode, setMode] = useState<"normal" | "shell">("normal");
  const [cursorOffset, setCursorOffset] = useState(0);
  const [interruptCount, setInterruptCount] = useState(0);
  const [autocompleteOptions, setAutocompleteOptions] = useState<
    AutocompleteOption[]
  >([]);

  // Random index for placeholder selection (computed once per mount)
  const placeholderIndex = useMemo(
    () =>
      selectedAgent.placeholders?.length
        ? Math.floor(Math.random() * selectedAgent.placeholders.length)
        : 0,
    [selectedAgent.placeholders]
  );

  // Derive isLoaded from context states
  const isLoaded = historyLoaded && frecencyLoaded && stashLoaded;

  // Reset interrupt count after timeout
  useEffect(() => {
    if (interruptCount > 0) {
      const timer = setTimeout(() => setInterruptCount(0), 5000);
      return () => clearTimeout(timer);
    }
  }, [interruptCount]);

  // Helper to clear all extmarks and reset mapping
  const clearExtmarks = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea && promptPartTypeIdRef.current) {
      textarea.extmarks?.clear?.();
    }
    extmarkToPartIndexRef.current.clear();
  }, []);

  const createExtmark = useCallback(
    (
      start: number,
      end: number,
      styleId: number,
      partIndex: number
    ): number | null => {
      const textarea = textareaRef.current;
      if (!(textarea?.extmarks && promptPartTypeIdRef.current)) {
        return null;
      }

      const extmarkId = textarea.extmarks.create({
        start,
        end,
        virtual: true,
        styleId,
        typeId: promptPartTypeIdRef.current,
      });

      extmarkToPartIndexRef.current.set(extmarkId, partIndex);
      return extmarkId;
    },
    []
  );

  const pasteImage = useCallback(
    (file: { filename?: string; content: string; mime: string }) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      const currentOffset = textarea.cursorOffset;

      const existingImages = promptInfo.parts.filter(
        (p) => p.type === "file" && isImageMime(p.mime)
      ).length;

      const virtualText = `[Image ${existingImages + 1}]`;
      const extmarkStart = currentOffset;
      const extmarkEnd = extmarkStart + virtualText.length;

      const part: FilePart = {
        type: "file",
        mime: file.mime,
        filename: file.filename ?? `image-${existingImages + 1}`,
        url: `data:${file.mime};base64,${file.content}`,
        source: {
          type: "file",
          path: file.filename ?? "clipboard",
          text: {
            start: extmarkStart,
            end: extmarkEnd,
            value: virtualText,
          },
        },
      };

      const textToInsert = `${virtualText} `;
      textarea.insertText(textToInsert);

      const partIndex = promptInfo.parts.length;
      createExtmark(extmarkStart, extmarkEnd, imageStyleId, partIndex);

      setPromptInfo((prev) => ({
        ...prev,
        input:
          prev.input.slice(0, currentOffset) +
          textToInsert +
          prev.input.slice(currentOffset),
        parts: [...prev.parts, part],
      }));

      textarea.cursorOffset = extmarkEnd + 1;
      setCursorOffset(extmarkEnd + 1);
    },
    [promptInfo, imageStyleId, createExtmark]
  );

  const pasteTextWithBadge = useCallback(
    (text: string, virtualText: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      const currentOffset = textarea.cursorOffset;
      const extmarkStart = currentOffset;
      const extmarkEnd = extmarkStart + virtualText.length;

      textarea.insertText(`${virtualText} `);

      const textPart: PromptPart = {
        type: "text",
        text,
        source: {
          text: {
            start: extmarkStart,
            end: extmarkEnd,
            value: virtualText,
          },
        },
      };

      const partIndex = promptInfo.parts.length;
      createExtmark(extmarkStart, extmarkEnd, pasteStyleId, partIndex);

      setPromptInfo((prev) => ({
        ...prev,
        input:
          prev.input.slice(0, currentOffset) +
          `${virtualText} ` +
          prev.input.slice(currentOffset),
        parts: [...prev.parts, textPart],
      }));

      textarea.cursorOffset = extmarkEnd + 1;
      setCursorOffset(extmarkEnd + 1);
    },
    [promptInfo, pasteStyleId, createExtmark]
  );

  // Build autocomplete options based on current mode
  // Options include part data for the Autocomplete component to use when inserting
  const updateAutocompleteOptions = useCallback(
    async (autocompleteMode: "#" | "@" | "/", filter: string) => {
      if (autocompleteMode === "#") {
        // File autocomplete (# trigger)
        const { baseQuery, lineRange } = extractLineRange(filter);
        const files = await searchFiles(baseQuery, process.cwd());

        // Sort by frecency
        const sortedFiles = frecency.sortByFrecency(files, (f) => f);

        const maxWidth = (anchorRef.current?.width ?? 60) - 4;
        const options: AutocompleteOption[] = sortedFiles.map((file) => {
          const isDir = file.endsWith("/");
          let displayName = file;
          const url = buildFileUrl(file, process.cwd(), lineRange);

          if (lineRange && !isDir) {
            displayName = `${file}#${lineRange.startLine}${lineRange.endLine ? `-${lineRange.endLine}` : ""}`;
          }

          // Include part data for Autocomplete's insertPart function
          const part: FilePart = {
            type: "file",
            mime: "text/plain",
            filename: displayName,
            url,
            source: {
              type: "file",
              path: file,
              text: { start: 0, end: 0, value: "" }, // Will be updated by insertPart
            },
          };

          return {
            display: truncateMiddle(displayName, maxWidth),
            value: displayName,
            isDirectory: isDir,
            path: file,
            part, // Autocomplete will use this to insert
            onSelect: () => {
              // Update frecency when file is selected
              frecency.updateFrecency(file);
            },
          };
        });

        setAutocompleteOptions(options);
      } else if (autocompleteMode === "@") {
        // Subagent autocomplete (@ trigger)
        const options: AutocompleteOption[] = subagents.map((agent) => {
          const part: AgentPart = {
            type: "agent",
            id: agent.id,
            source: {
              text: { start: 0, end: 0, value: "" }, // Will be updated by insertPart
            },
          };

          return {
            display: agent.id,
            description: agent.description,
            part,
          };
        });

        setAutocompleteOptions(options);
      } else {
        // Slash command autocomplete (/ trigger)
        // Use slashes() which returns options with onSelect already wired
        const options: AutocompleteOption[] = commandContext.slashes();
        setAutocompleteOptions(options);
      }
    },
    [commandContext, subagents, frecency]
  );

  // Submit handler
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex form submission logic
  const handleSubmit = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) {
      return;
    }
    if (autocompleteRef.current?.visible) {
      return;
    }

    const trimmed = promptInfo.input.trim();
    if (!trimmed) {
      return;
    }

    // Check for exit commands
    if (trimmed === "exit" || trimmed === "quit" || trimmed === ":q") {
      // Could trigger app exit here
      return;
    }

    // Check for slash commands (e.g., /thinking, /compact)
    if (trimmed.startsWith("/")) {
      const parts = trimmed.slice(1).split(WHITESPACE_SPLIT_REGEX);
      const commandName = parts[0];
      const cmd = commandName ? commandContext.getBySlash(commandName) : null;
      if (cmd) {
        commandContext.execute(cmd.id);
        // Clear prompt after executing command
        setPromptInfo({ input: "", parts: [] });
        clearExtmarks();
        textarea.clear();
        setCursorOffset(0);
        return;
      }
      // If no matching command, fall through to normal message submission
      // This allows messages like "/me does something" to be sent as-is
    }

    if (mode === "shell") {
      // Shell mode - execute command directly
      onShellCommand?.(trimmed);
      setMode("normal");
    } else {
      const { text, files } = prepareMessageForSubmit(
        promptInfo.input,
        promptInfo.parts
      );
      onSubmit(text.trim(), files.length > 0 ? files : undefined);
    }

    // Add to history
    history.append({
      input: promptInfo.input,
      parts: promptInfo.parts,
    });

    // Clear prompt and extmarks
    setPromptInfo({ input: "", parts: [] });
    clearExtmarks();
    textarea.clear();
    setCursorOffset(0);
  }, [
    promptInfo,
    mode,
    disabled,
    onSubmit,
    onShellCommand,
    clearExtmarks,
    history,
    commandContext,
  ]);

  const handleKeyDown = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex keyboard event handling
    async (e: KeyEvent) => {
      if (disabled) {
        e.preventDefault?.();
        return;
      }

      const textarea = textareaRef.current;
      const autocomplete = autocompleteRef.current;
      if (!textarea) {
        return;
      }

      // Let autocomplete handle keys first
      if (autocomplete?.onKeyDown(e)) {
        e.preventDefault?.();
        return;
      }

      const name = e.name?.toLowerCase();

      // Handle clipboard paste (Ctrl+V) - check for images first
      // This is needed because Windows terminal doesn't properly send image data
      // through bracketed paste, so we need to intercept the keypress and
      // directly read from clipboard before the terminal handles it
      if (keybind.match("input_paste", e)) {
        try {
          const content = await Clipboard.read();
          if (content?.mime.startsWith("image/")) {
            e.preventDefault?.();
            pasteImage({
              filename: "clipboard",
              mime: content.mime,
              content: content.data,
            });
            return;
          }
        } catch {
          // If no image, let the default paste behavior continue
        }
      }

      if (name === "!" && cursorOffset === 0 && mode === "normal") {
        setMode("shell");
        e.preventDefault?.();
        return;
      }

      // Exit shell mode
      if (
        mode === "shell" &&
        ((name === "backspace" && cursorOffset === 0) || name === "escape")
      ) {
        setMode("normal");
        e.preventDefault?.();
        return;
      }

      // Interrupt handling (escape during streaming)
      // Skip if there are queued messages - escape will clear the queue instead (handled in app.tsx)
      if (
        name === "escape" &&
        isStreaming &&
        !autocomplete?.visible &&
        !hasQueuedMessages
      ) {
        setInterruptCount((prev) => prev + 1);
        if (interruptCount >= 1) {
          onInterrupt?.();
          setInterruptCount(0);
        }
        e.preventDefault?.();
        return;
      }

      // Clear prompt (Ctrl+U or Ctrl+C with content)
      if (e.ctrl && (name === "u" || (name === "c" && promptInfo.input))) {
        setPromptInfo({ input: "", parts: [] });
        clearExtmarks();
        textarea.clear();
        setCursorOffset(0);
        e.preventDefault?.();
        return;
      }

      // History navigation
      if (!autocomplete?.visible) {
        if (name === "up" && cursorOffset === 0) {
          const entry = history.move(-1, promptInfo.input);
          if (entry) {
            setPromptInfo(entry);
            setMode(entry.mode ?? "normal");
            textarea.setText(entry.input);
            textarea.cursorOffset = 0;
            setCursorOffset(0);
            e.preventDefault?.();
          }
          return;
        }

        if (name === "down" && cursorOffset === promptInfo.input.length) {
          const entry = history.move(1, promptInfo.input);
          if (entry) {
            setPromptInfo(entry);
            setMode(entry.mode ?? "normal");
            textarea.setText(entry.input);
            textarea.cursorOffset = entry.input.length;
            setCursorOffset(entry.input.length);
            e.preventDefault?.();
          }
          return;
        }
      }
    },
    [
      disabled,
      cursorOffset,
      mode,
      isStreaming,
      interruptCount,
      promptInfo,
      onInterrupt,
      hasQueuedMessages,
      clearExtmarks,
      pasteImage,
      history,
      keybind,
    ]
  );

  // Handle content changes
  const handleContentChange = useCallback(() => {
    const textarea = textareaRef.current;
    const autocomplete = autocompleteRef.current;
    if (!textarea) {
      return;
    }

    const value = textarea.plainText;
    const offset = textarea.cursorOffset;

    setPromptInfo((prev) => ({ ...prev, input: value }));
    setCursorOffset(offset);

    // Update autocomplete
    autocomplete?.onInput(value, offset);

    if (autocomplete?.visible === "#") {
      const triggerIndex = value.lastIndexOf("#", offset);
      if (triggerIndex !== -1) {
        const filter = value.slice(triggerIndex + 1, offset);
        updateAutocompleteOptions("#", filter);
      }
    } else if (autocomplete?.visible === "@") {
      const triggerIndex = value.lastIndexOf("@", offset);
      if (triggerIndex !== -1) {
        const filter = value.slice(triggerIndex + 1, offset);
        updateAutocompleteOptions("@", filter);
      }
    } else if (autocomplete?.visible === "/") {
      const filter = value.slice(1, offset);
      updateAutocompleteOptions("/", filter);
    }
  }, [updateAutocompleteOptions]);

  const handlePaste = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex paste event handling with file detection
    async (event: PasteEvent) => {
      const textarea = textareaRef.current;
      if (disabled) {
        event.preventDefault?.();
        return;
      }

      // Normalize line endings at the boundary
      // Windows ConPTY/Terminal often sends CR-only newlines in bracketed paste
      // Replace CRLF first, then any remaining CR
      const normalizedText = event.text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
      const pastedContent = normalizedText.trim();

      if (!pastedContent) {
        // Trigger prompt.paste command for empty paste (e.g., image from clipboard)
        commandContext.execute("prompt.paste");
        return;
      }

      // Trim single quotes from the beginning and end of the pasted content
      const filepath = pastedContent
        .replace(/^'+|'+$/g, "")
        .replace(/\\ /g, " ");
      const isUrl = URL_REGEX.test(filepath);

      if (!isUrl) {
        try {
          // Check if file exists
          await stat(filepath);
          const mimeType =
            lookupMimeType(filepath) || "application/octet-stream";
          const fileName = basename(filepath);

          // Handle SVG as raw text content, not as base64 image
          if (mimeType === "image/svg+xml") {
            event.preventDefault?.();
            const content = await readFile(filepath, "utf-8").catch(() => {
              /* file read failed */
            });
            if (content) {
              pasteTextWithBadge(content, `[SVG: ${fileName}]`);
              return;
            }
          }

          if (mimeType.startsWith("image/")) {
            event.preventDefault?.();
            const content = await readFile(filepath)
              .then((buffer) => buffer.toString("base64"))
              .catch(() => {
                /* file read failed */
              });
            if (content) {
              await pasteImage({
                filename: fileName,
                mime: mimeType,
                content,
              });
              return;
            }
          }
        } catch {
          /* not a valid file path */
        }
      }

      const lineCount = (pastedContent.match(/\n/g)?.length ?? 0) + 1;
      if (lineCount >= 3 || pastedContent.length > 150) {
        event.preventDefault?.();
        pasteTextWithBadge(pastedContent, `[Pasted ~${lineCount} lines]`);
        return;
      }

      // Force layout update and render for short pasted content
      setTimeout(() => {
        textarea?.getLayoutNode?.().markDirty?.();
        renderer.requestRender();
      }, 0);
    },
    [disabled, pasteImage, pasteTextWithBadge, commandContext, renderer]
  );

  // Register prompt commands (matches OpenCode pattern)
  // NOTE: prompt.paste does NOT have a keybind because:
  // 1. handleKeyDown already intercepts Ctrl+V for image paste
  // 2. Having keybind: "input_paste" causes the global command system to
  //    preventDefault on Ctrl+V, blocking bracketed paste for text
  // 3. This command is only called via commandContext.execute() for empty pastes
  useEffect(
    () =>
      commandContext.register([
        {
          id: "prompt.paste",
          title: "Paste",
          category: "Edit",
          hidden: true,
          onSelect: async () => {
            const content = await Clipboard.read();
            if (content?.mime.startsWith("image/")) {
              await pasteImage({
                filename: "clipboard",
                mime: content.mime,
                content: content.data,
              });
            }
          },
        },
      ]),
    [commandContext, pasteImage]
  );

  // Auto-focus when enabled (only on mount/enable, not on every handleSubmit change)
  // Note: Keybind suspension is handled by Autocomplete component directly via useCommand()
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!disabled && textarea && isLoaded) {
      textarea.focus();
      textarea.keyBindings = PROMPT_KEY_BINDINGS;
    }
  }, [disabled, isLoaded]);

  // Separate effect to update onSubmit without triggering focus
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.onSubmit = handleSubmit;
    }
  }, [handleSubmit]);

  // Ref callback - also registers extmark type on first mount
  const setTextareaRef = useCallback(
    (el: TextareaRenderable | null) => {
      textareaRef.current = el;
      if (el) {
        // Register the extmark type ID if not already registered
        if (promptPartTypeIdRef.current === 0 && el.extmarks?.registerType) {
          promptPartTypeIdRef.current = el.extmarks.registerType("prompt-part");
        }

        if (!disabled && isLoaded) {
          el.focus();
          el.keyBindings = PROMPT_KEY_BINDINGS;
        }
      }
    },
    [disabled, isLoaded]
  );

  // Computed values
  const accentColor = useMemo(() => {
    if (disabled) {
      return theme.border;
    }
    if (mode === "shell") {
      return theme.primary;
    }
    return selectedAgent.color;
  }, [disabled, mode, theme, selectedAgent]);

  const displayPlaceholder = useMemo(() => {
    if (disabled) {
      return "Initializing...";
    }
    if (isStreaming) {
      return "Type to queue message...";
    }
    return (
      placeholder ??
      selectedAgent.placeholders?.[placeholderIndex] ??
      "Ask anything..."
    );
  }, [
    disabled,
    isStreaming,
    placeholder,
    placeholderIndex,
    selectedAgent.placeholders,
  ]);

  const modeLabel = useMemo(() => {
    if (mode === "shell") {
      return "Shell";
    }
    return selectedAgent.name;
  }, [mode, selectedAgent]);

  return (
    <>
      {/* Autocomplete dropdown */}
      <Autocomplete
        agentStyleId={agentStyleId}
        anchorRef={anchorRef}
        fileStyleId={fileStyleId}
        onTrigger={updateAutocompleteOptions}
        options={autocompleteOptions}
        promptPartTypeId={getPromptPartTypeId}
        ref={autocompleteRef}
        setExtmark={setExtmarkMapping}
        setPrompt={setPrompt}
        textareaRef={textareaRef}
        value={promptInfo.input}
      />

      {/* Main prompt container */}
      <box ref={anchorRef}>
        <box
          border={["left"]}
          borderColor={accentColor}
          customBorderChars={{
            ...EmptyBorder,
            vertical: "\u2503",
            bottomLeft: "\u2579",
          }}
        >
          <box
            backgroundColor={theme.backgroundElement}
            flexDirection="column"
            flexGrow={1}
            flexShrink={0}
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
          >
            <textarea
              backgroundColor={theme.backgroundElement}
              cursorColor={accentColor}
              flexGrow={1}
              keyBindings={PROMPT_KEY_BINDINGS}
              maxHeight={6}
              minHeight={1}
              onContentChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onSubmit={handleSubmit}
              placeholder={displayPlaceholder}
              ref={setTextareaRef}
              syntaxStyle={syntax}
              textColor={theme.text}
            />
            {/* Agent/Model info row */}
            <box flexDirection="row" flexShrink={0} gap={1} paddingTop={1}>
              <text fg={accentColor}>{modeLabel} </text>
              {mode === "normal" && (
                <>
                  <text fg={theme.text}>{selectedAgent.model.name}</text>
                  <text fg={theme.textMuted}>
                    {selectedAgent.model.providerName}
                  </text>
                </>
              )}
            </box>
          </box>
        </box>

        {/* Bottom decoration line */}
        <box
          border={["left"]}
          borderColor={accentColor}
          customBorderChars={{
            ...EmptyBorder,
            vertical: "\u2579",
          }}
          height={1}
        >
          <box
            border={["bottom"]}
            borderColor={theme.backgroundElement}
            customBorderChars={{
              ...EmptyBorder,
              horizontal: "\u2580",
            }}
            height={1}
          />
        </box>

        {/* Footer row - spinner and shortcuts */}
        <box flexDirection="row" justifyContent="space-between">
          {/* Left side - spinner or interrupt status */}
          {isStreaming ? (
            <box flexDirection="row" flexShrink={0} gap={1}>
              {showSpinner && (
                <StreamingIndicator
                  agentColor={selectedAgent.color ?? theme.accent}
                  isLoading={isStreaming}
                />
              )}
              <box flexDirection="row">
                <text fg={interruptCount > 0 ? theme.secondary : theme.text}>
                  esc{" "}
                </text>
                <text
                  fg={interruptCount > 0 ? theme.secondary : theme.textMuted}
                >
                  {interruptCount > 0 ? "again to interrupt" : "interrupt"}
                </text>
              </box>
            </box>
          ) : (
            <box />
          )}

          {/* Right side - shortcuts */}
          {showShortcuts && (
            <box flexDirection="row" gap={2}>
              {mode === "normal" ? (
                <>
                  <box flexDirection="row">
                    <text fg={theme.text}>tab</text>
                    <text fg={theme.textMuted}> agents</text>
                  </box>
                  <box flexDirection="row">
                    <text fg={theme.text}>ctrl+p</text>
                    <text fg={theme.textMuted}> commands</text>
                  </box>
                </>
              ) : (
                <box flexDirection="row">
                  <text fg={theme.text}>esc</text>
                  <text fg={theme.textMuted}> exit shell mode</text>
                </box>
              )}
            </box>
          )}
        </box>
      </box>
    </>
  );
}

// Re-export utilities
// biome-ignore lint/performance/noBarrelFile: Intentional barrel export for module organization
export { createFrecencyTracker } from "./lib/frecency.js";
export { createHistory } from "./lib/history.js";
export { createStash } from "./lib/stash.js";
// Re-export types
export type {
  AutocompleteOption,
  FilePart,
  PromptInfo,
  PromptPart,
} from "./lib/types.js";
