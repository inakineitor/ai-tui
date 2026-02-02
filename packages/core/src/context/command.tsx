import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { useKeyboard } from "@opentui/react";

import {
  type CommandOption,
  DialogCommand,
  type DialogContextValue,
  useDialog,
} from "#components/dialog/index.ts";

import { type KeybindAction, useKeybind } from "./keybind";

export type CommandCategory =
  | "Session"
  | "Navigation"
  | "View"
  | "Edit"
  | "Help"
  | "Agent";

export type Command = {
  id: string;
  title: string;
  description?: string;
  category: CommandCategory;
  keybind?: KeybindAction;
  slash?: {
    name: string;
    aliases?: string[];
  };
  when?: () => boolean;
  hidden?: boolean;
  onSelect: (dialog: DialogContextValue) => void | Promise<void>;
};

export type CommandContextValue = {
  register: (commands: Command[] | (() => Command[])) => () => void;
  execute: (id: string) => Promise<void>;
  getCommands: (options?: {
    category?: CommandCategory;
    search?: string;
  }) => Command[];
  getBySlash: (name: string) => Command | undefined;
  getById: (id: string) => Command | undefined;
  keybinds: (enabled: boolean) => void;
  suspended: () => boolean;
  show: () => void;
  slashes: () => Array<{
    display: string;
    description?: string;
    aliases?: string[];
    onSelect: () => void;
  }>;
};

type CommandProviderProps = {
  children: ReactNode;
};

const CommandContext = createContext<CommandContextValue | null>(null);

export function CommandProvider({ children }: CommandProviderProps) {
  const commandsRef = useRef<Map<string, Command>>(new Map());
  const dynamicSourcesRef = useRef<Set<() => Command[]>>(new Set());
  const [suspendCount, setSuspendCount] = useState(0);

  const dialog = useDialog();
  const keybind = useKeybind();

  const suspended = useCallback(() => suspendCount > 0, [suspendCount]);

  const keybindsControl = useCallback((enabled: boolean) => {
    setSuspendCount((count) => count + (enabled ? -1 : 1));
  }, []);

  const getAllCommands = useCallback((): Command[] => {
    const staticCommands = Array.from(commandsRef.current.values());
    const dynamicCommands = Array.from(dynamicSourcesRef.current).flatMap(
      (fn) => fn()
    );
    return [...staticCommands, ...dynamicCommands];
  }, []);

  const register = useCallback(
    (commands: Command[] | (() => Command[])): (() => void) => {
      if (typeof commands === "function") {
        dynamicSourcesRef.current.add(commands);
        return () => {
          dynamicSourcesRef.current.delete(commands);
        };
      }

      for (const cmd of commands) {
        commandsRef.current.set(cmd.id, cmd);
      }
      return () => {
        for (const cmd of commands) {
          commandsRef.current.delete(cmd.id);
        }
      };
    },
    []
  );

  const execute = useCallback(
    async (id: string) => {
      const cmd =
        commandsRef.current.get(id) ??
        getAllCommands().find((c) => c.id === id);
      if (cmd) {
        await cmd.onSelect(dialog);
      }
    },
    [getAllCommands, dialog]
  );

  const getCommands = useCallback(
    (options?: { category?: CommandCategory; search?: string }): Command[] => {
      let commands = getAllCommands().filter(
        (cmd) => !cmd.hidden && (!cmd.when || cmd.when())
      );

      if (options?.category) {
        commands = commands.filter((cmd) => cmd.category === options.category);
      }

      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        commands = commands.filter(
          (cmd) =>
            cmd.title.toLowerCase().includes(searchLower) ||
            cmd.description?.toLowerCase().includes(searchLower) ||
            cmd.slash?.name.toLowerCase().includes(searchLower) ||
            cmd.slash?.aliases?.some((a) =>
              a.toLowerCase().includes(searchLower)
            )
        );
      }

      return commands;
    },
    [getAllCommands]
  );

  const getBySlash = useCallback(
    (name: string): Command | undefined => {
      const nameLower = name.toLowerCase();
      return getAllCommands().find(
        (cmd) =>
          cmd.slash?.name.toLowerCase() === nameLower ||
          cmd.slash?.aliases?.some((a) => a.toLowerCase() === nameLower)
      );
    },
    [getAllCommands]
  );

  const getById = useCallback(
    (id: string): Command | undefined =>
      commandsRef.current.get(id) ?? getAllCommands().find((c) => c.id === id),
    [getAllCommands]
  );

  const slashes = useCallback(() => {
    const commands = getAllCommands().filter((cmd) => !cmd.when || cmd.when());
    return commands.flatMap((cmd) => {
      const slash = cmd.slash;
      if (!slash) {
        return [];
      }
      return {
        display: `/${slash.name}`,
        description: cmd.description ?? cmd.title,
        aliases: slash.aliases?.map((alias) => `/${alias}`),
        onSelect: () => execute(cmd.id),
      };
    });
  }, [getAllCommands, execute]);

  const show = useCallback(() => {
    const commands = getAllCommands().filter(
      (cmd) => !cmd.hidden && (!cmd.when || cmd.when())
    );
    const options: CommandOption[] = commands.map((cmd) => ({
      value: cmd.id,
      title: cmd.title,
      description: cmd.description,
      category: cmd.category,
      footer: cmd.keybind ? keybind.print(cmd.keybind) : undefined,
      keybind: cmd.keybind,
    }));
    const suggestedOptions: CommandOption[] = options
      .filter((o) => o.keybind)
      .slice(0, 5)
      .map((o) => ({ ...o, category: "Suggested" }));

    dialog.replace(
      <DialogCommand
        onSelect={(commandId) => {
          execute(commandId);
        }}
        options={options}
        suggestedOptions={suggestedOptions}
      />
    );
  }, [getAllCommands, keybind.print, dialog, execute]);

  useKeyboard((evt) => {
    if (suspended()) {
      return;
    }
    if (dialog.stack.length > 0) {
      return;
    }
    // Skip if event was already handled (matches OpenCode's pattern)
    if (evt.defaultPrevented) {
      return;
    }

    if (keybind.match("command_list", evt)) {
      evt.preventDefault?.();
      show();
      return;
    }

    const commands = getAllCommands();
    for (const cmd of commands) {
      if (!cmd.keybind) {
        continue;
      }
      if (cmd.when && !cmd.when()) {
        continue;
      }
      if (keybind.match(cmd.keybind, evt)) {
        evt.preventDefault?.();
        cmd.onSelect(dialog);
        return;
      }
    }
  });

  const value = useMemo<CommandContextValue>(
    () => ({
      register,
      execute,
      getCommands,
      getBySlash,
      getById,
      keybinds: keybindsControl,
      suspended,
      show,
      slashes,
    }),
    [
      register,
      execute,
      getCommands,
      getBySlash,
      getById,
      keybindsControl,
      suspended,
      show,
      slashes,
    ]
  );

  return (
    <CommandContext.Provider value={value}>{children}</CommandContext.Provider>
  );
}

export function useCommand(): CommandContextValue {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error("useCommand must be used within a CommandProvider");
  }
  return context;
}
