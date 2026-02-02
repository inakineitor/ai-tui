import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Get the XDG config home directory.
 * Falls back to ~/.config if XDG_CONFIG_HOME is not set.
 */
export function getXdgConfigHome(): string {
  return process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
}

/**
 * Get the XDG data home directory.
 * Falls back to ~/.local/share if XDG_DATA_HOME is not set.
 */
export function getXdgDataHome(): string {
  return process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
}

/**
 * Get the config directory for a specific app.
 * @param appId - The application identifier (kebab-case)
 * @returns Full path to the app's config directory
 */
export function getConfigDir(appId: string): string {
  return join(getXdgConfigHome(), appId);
}

/**
 * Get the data directory for a specific app.
 * @param appId - The application identifier (kebab-case)
 * @returns Full path to the app's data directory
 */
export function getDataDir(appId: string): string {
  return join(getXdgDataHome(), appId);
}
