import {
  type CliRenderer,
  type CliRendererConfig,
  createCliRenderer,
} from "@opentui/core";
import { createRoot } from "@opentui/react";

import { App } from "#app.tsx";
import { detectTerminalMode } from "#lib/detect-terminal-mode.ts";
import { type KVStore, createKV } from "#lib/kv.ts";
import { getConfigDir, getDataDir } from "#lib/paths.ts";
import type { ConfigInput } from "#types.ts";

export type { CliRendererConfig } from "@opentui/core";

const DEFAULT_RENDER_OPTIONS: CliRendererConfig = {
  targetFps: 60,
  exitOnCtrlC: false,
  useKittyKeyboard: {},
};

/**
 * TerminalUI encapsulates the initialization and lifecycle of an AI SDK TUI application.
 *
 * @example
 * ```typescript
 * import { TerminalUI } from "@ai-sdk-tui/core";
 * import { configValue } from "./config.tsx";
 *
 * const tui = new TerminalUI(configValue);
 * await tui.run();
 * ```
 */
export class TerminalUI {
  private readonly config: ConfigInput;
  private readonly renderOptions: CliRendererConfig;
  private kv: KVStore | null = null;
  private renderer: CliRenderer | null = null;

  /**
   * Create a new TerminalUI instance.
   *
   * @param config - Application configuration including agents, commands, and app metadata
   * @param renderOptions - Optional renderer configuration
   */
  constructor(config: ConfigInput, renderOptions?: CliRendererConfig) {
    this.config = config;
    this.renderOptions = {
      ...DEFAULT_RENDER_OPTIONS,
      ...renderOptions,
    };
  }

  /**
   * Initialize and run the TUI application.
   *
   * This method:
   * 1. Creates and loads the KV store for persistent settings
   * 2. Detects the terminal's color mode (dark/light)
   * 3. Creates the CLI renderer
   * 4. Renders the App component
   *
   * @throws Error if initialization fails
   */
  async run(): Promise<void> {
    // 1. Create KV store with paths derived from app ID
    this.kv = createKV(
      getConfigDir(this.config.id),
      getDataDir(this.config.id)
    );

    // 2. Load persisted KV data
    await this.kv.load();

    // 3. Detect terminal color mode
    const initialThemeMode = await detectTerminalMode();

    // 4. Create CLI renderer
    this.renderer = await createCliRenderer(this.renderOptions);

    // 5. Render the App
    createRoot(this.renderer).render(
      <App
        config={this.config}
        initialThemeMode={initialThemeMode}
        kv={this.kv}
      />
    );
  }

  /**
   * Clean up resources and destroy the renderer.
   *
   * Call this method when shutting down the application to ensure
   * proper terminal cleanup (restoring cursor, clearing alternate screen, etc.).
   */
  destroy(): void {
    this.renderer?.destroy();
    this.renderer = null;
    this.kv = null;
  }
}
