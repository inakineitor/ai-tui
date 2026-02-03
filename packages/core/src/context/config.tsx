// apps/ai-sdk-tui/src/context/config.tsx
import { type ReactNode, createContext, useContext } from "react";

import type {
  Agent,
  AppName,
  CommandDefinition,
  Config,
  ConfigInput,
  SubagentDefinition,
} from "#types.js";

const DEFAULT_APP_NAME: AppName = {
  sections: [{ text: "AI SDK", style: "muted" }, { text: "Agent" }],
};

const ConfigContext = createContext<ConfigInput | null>(null);

type ConfigProviderProps = {
  children: ReactNode;
  value: ConfigInput;
};

/**
 * Provider component for application configuration.
 * Should wrap the entire app at the root level in index.tsx.
 */
export function ConfigProvider({ children, value }: ConfigProviderProps) {
  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

/**
 * Hook to access the full config context with defaults applied.
 * @throws Error if used outside of ConfigProvider
 */
export function useConfig(): Config {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return {
    ...ctx,
    subagents: ctx.subagents ?? [],
    appName: ctx.appName ?? DEFAULT_APP_NAME,
    commands: ctx.commands ?? [],
    tips: ctx.tips ?? [],
  };
}

/**
 * Convenience hook to access just the agents array.
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic return type - actual types determined at runtime
export function useAgents(): Agent<any, any, any, any>[] {
  return useConfig().agents;
}

/**
 * Convenience hook to access just the subagents array.
 */
export function useSubagents(): SubagentDefinition[] {
  return useConfig().subagents;
}

/**
 * Convenience hook to access just the app name config.
 */
export function useAppName(): AppName {
  return useConfig().appName;
}

/**
 * Convenience hook to access just the commands array.
 */
export function useCommands(): CommandDefinition[] {
  return useConfig().commands;
}

/**
 * Convenience hook to access just the tips array.
 */
export function useTips(): string[] {
  return useConfig().tips;
}

/**
 * Convenience hook to access just the app ID.
 */
export function useAppId(): string {
  return useConfig().id;
}
