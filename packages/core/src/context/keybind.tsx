import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Renderable } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";

import { useKV } from "./kv";

export type KeybindInfo = {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  leader: boolean;
};

export type KeybindAction =
  | "leader"
  | "app_exit"
  | "command_list"
  | "session_list"
  | "session_new"
  | "session_interrupt"
  | "session_timeline"
  | "session_fork"
  | "session_rename"
  | "session_delete"
  | "session_share"
  | "sidebar_toggle"
  | "agent_cycle"
  | "agent_cycle_reverse"
  | "input_submit"
  | "input_newline"
  | "input_clear"
  | "input_paste"
  | "history_previous"
  | "history_next"
  | "messages_page_up"
  | "messages_page_down"
  | "messages_first"
  | "messages_last"
  | "messages_next"
  | "messages_previous"
  | "messages_copy"
  | "messages_undo"
  | "messages_redo"
  | "tool_details"
  | "help";

export type KeybindConfig = Partial<Record<KeybindAction, string>>;

export type KeyEvent = {
  name?: string;
  sequence?: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
};

export type KeybindContextValue = {
  leader: boolean;
  all: Record<KeybindAction, KeybindInfo[]>;
  match: (action: KeybindAction, event: KeyEvent) => boolean;
  print: (action: KeybindAction) => string;
  parse: (event: KeyEvent) => KeybindInfo;
};

type KeybindProviderProps = {
  children: ReactNode;
};

const DEFAULT_KEYBINDS: Required<KeybindConfig> = {
  leader: "ctrl+x",
  app_exit: "ctrl+c,ctrl+d,<leader>q",
  command_list: "ctrl+p",
  session_list: "<leader>l",
  session_new: "<leader>n",
  session_interrupt: "escape",
  session_timeline: "<leader>t",
  session_fork: "<leader>f",
  session_rename: "<leader>r",
  session_delete: "<leader>x",
  session_share: "<leader>s",
  sidebar_toggle: "<leader>b",
  agent_cycle: "tab",
  agent_cycle_reverse: "shift+tab",
  input_submit: "return",
  input_newline: "shift+return,ctrl+return,alt+return,ctrl+j",
  input_clear: "ctrl+c",
  input_paste: "ctrl+v",
  history_previous: "up",
  history_next: "down",
  messages_page_up: "pageup,ctrl+u",
  messages_page_down: "pagedown,ctrl+d",
  messages_first: "ctrl+g,home",
  messages_last: "ctrl+alt+g,end",
  messages_next: "ctrl+n",
  messages_previous: "ctrl+p",
  messages_copy: "<leader>y",
  messages_undo: "<leader>u",
  messages_redo: "<leader>shift+u",
  tool_details: "<leader>d",
  help: "<leader>?",
};

const KV_KEY = "keybinds";

function parseKeybindString(key: string): KeybindInfo[] {
  if (key === "none") {
    return [];
  }

  return key.split(",").map((combo) => {
    const normalized = combo.trim().replace(/<leader>/g, "leader+");
    const parts = normalized.toLowerCase().split("+");
    const info: KeybindInfo = {
      ctrl: false,
      meta: false,
      shift: false,
      leader: false,
      name: "",
    };

    for (const part of parts) {
      switch (part) {
        case "ctrl":
          info.ctrl = true;
          break;
        case "alt":
        case "meta":
        case "option":
          info.meta = true;
          break;
        case "shift":
          info.shift = true;
          break;
        case "leader":
          info.leader = true;
          break;
        case "esc":
          info.name = "escape";
          break;
        default:
          info.name = part;
          break;
      }
    }

    return info;
  });
}

export function keybindInfoMatch(
  a: KeybindInfo | undefined,
  b: KeybindInfo
): boolean {
  if (!a) {
    return false;
  }
  return (
    a.name === b.name &&
    a.ctrl === b.ctrl &&
    a.meta === b.meta &&
    a.shift === b.shift &&
    a.leader === b.leader
  );
}

export function keybindInfoToString(info: KeybindInfo): string {
  const parts: string[] = [];

  if (info.leader) {
    parts.push("<leader>");
  }
  if (info.ctrl) {
    parts.push("ctrl");
  }
  if (info.meta) {
    parts.push("alt");
  }
  if (info.shift) {
    parts.push("shift");
  }
  if (info.name) {
    const displayName =
      info.name === "escape"
        ? "esc"
        : info.name === "return"
          ? "enter"
          : info.name;
    parts.push(displayName);
  }

  return parts.join("+");
}

const KeybindContext = createContext<KeybindContextValue | null>(null);

export function KeybindProvider({ children }: KeybindProviderProps) {
  const kv = useKV();
  const renderer = useRenderer();
  const customKeybinds = kv.get<KeybindConfig>(KV_KEY, {});
  const [leaderActive, setLeaderActive] = useState(false);
  const focusRef = useRef<Renderable | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keybindStrings = useMemo<Required<KeybindConfig>>(
    () => ({ ...DEFAULT_KEYBINDS, ...customKeybinds }),
    [customKeybinds]
  );

  const parsedKeybinds = useMemo(() => {
    const result: Record<string, KeybindInfo[]> = {};
    for (const [action, str] of Object.entries(keybindStrings)) {
      result[action] = parseKeybindString(str);
    }
    return result as Record<KeybindAction, KeybindInfo[]>;
  }, [keybindStrings]);

  const activateLeader = useCallback(() => {
    setLeaderActive(true);
    focusRef.current = renderer.currentFocusedRenderable;
    focusRef.current?.blur();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setLeaderActive(false);
      if (focusRef.current && !focusRef.current.isDestroyed) {
        focusRef.current.focus();
      }
    }, 2000);
  }, [renderer]);

  const deactivateLeader = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (focusRef.current && !renderer.currentFocusedRenderable) {
      focusRef.current.focus();
    }
    setLeaderActive(false);
  }, [renderer]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const parse = useCallback(
    (event: KeyEvent): KeybindInfo => {
      const name = event.name ?? event.sequence ?? "";
      return {
        name: name.toLowerCase(),
        ctrl: !!event.ctrl,
        meta: !!event.meta,
        shift: !!event.shift,
        leader: leaderActive,
      };
    },
    [leaderActive]
  );

  const match = useCallback(
    (action: KeybindAction, event: KeyEvent): boolean => {
      const keybinds = parsedKeybinds[action];
      if (!keybinds) {
        return false;
      }

      const parsed = parse(event);

      for (const keybind of keybinds) {
        if (keybindInfoMatch(keybind, parsed)) {
          return true;
        }
      }
      return false;
    },
    [parsedKeybinds, parse]
  );

  const print = useCallback(
    (action: KeybindAction): string => {
      const keybinds = parsedKeybinds[action];
      if (!keybinds || keybinds.length === 0) {
        return "";
      }

      const first = keybinds[0];
      if (!first) {
        return "";
      }
      let result = keybindInfoToString(first);

      const leaderKeybind = parsedKeybinds.leader?.[0];
      if (leaderKeybind && result.includes("<leader>")) {
        const leaderStr = keybindInfoToString({
          ...leaderKeybind,
          leader: false,
        });
        result = result.replace("<leader>", leaderStr);
      }

      return result;
    },
    [parsedKeybinds]
  );

  useKeyboard((evt) => {
    const parsed = parse(evt);

    if (!leaderActive) {
      const leaderKeybinds = parsedKeybinds.leader;
      if (leaderKeybinds) {
        for (const keybind of leaderKeybinds) {
          const nonLeaderKeybind = { ...keybind, leader: false };
          if (
            keybindInfoMatch(nonLeaderKeybind, { ...parsed, leader: false })
          ) {
            activateLeader();
            evt.preventDefault?.();
            evt.stopPropagation?.();
            return;
          }
        }
      }
    }

    if (leaderActive && evt.name) {
      setImmediate(() => {
        if (
          focusRef.current &&
          renderer.currentFocusedRenderable === focusRef.current
        ) {
          focusRef.current.focus();
        }
        deactivateLeader();
      });
    }
  });

  const value = useMemo<KeybindContextValue>(
    () => ({ leader: leaderActive, all: parsedKeybinds, match, print, parse }),
    [leaderActive, parsedKeybinds, match, print, parse]
  );

  return (
    <KeybindContext.Provider value={value}>{children}</KeybindContext.Provider>
  );
}

export function useKeybind(): KeybindContextValue {
  const context = useContext(KeybindContext);
  if (!context) {
    throw new Error("useKeybind must be used within a KeybindProvider");
  }
  return context;
}
