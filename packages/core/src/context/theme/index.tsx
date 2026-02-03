import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { RGBA, SyntaxStyle } from "@opentui/core";
import deepmerge from "deepmerge";

import { useKV } from "#context/kv.tsx";

// Internal imports for theme registry
import _oneDarkTheme from "./themes/one-dark.json" with { type: "json" };
import _openCodeTheme from "./themes/opencode.json" with { type: "json" };
import _vercelTheme from "./themes/vercel.json" with { type: "json" };

/**
 * Re-export theme definitions for public API.
 * These are the raw JSON structures that can be passed to resolveTheme().
 *
 * @example
 * ```typescript
 * import { openCodeTheme, resolveTheme } from 'ai-sdk-tui';
 * const theme = resolveTheme(openCodeTheme, 'dark');
 * ```
 */
// biome-ignore lint/performance/noBarrelFile: Intentional public API exports for theme definitions
export { default as oneDarkTheme } from "./themes/one-dark.json";
export { default as openCodeTheme } from "./themes/opencode.json";
export { default as vercelTheme } from "./themes/vercel.json";

// =============================================================================
// Types
// =============================================================================

export type ThemeMode = "dark" | "light";

/**
 * Theme colors - all resolved to hex strings
 */
export type ThemeColors = {
  // Semantic colors (7)
  primary: string;
  secondary: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
  info: string;

  // Text colors (2)
  text: string;
  textMuted: string;

  // Background colors (3)
  background: string;
  backgroundPanel: string;
  backgroundElement: string;

  // Border colors (3)
  border: string;
  borderActive: string;
  borderSubtle: string;

  // Diff colors (12)
  diffAdded: string;
  diffRemoved: string;
  diffContext: string;
  diffHunkHeader: string;
  diffHighlightAdded: string;
  diffHighlightRemoved: string;
  diffAddedBg: string;
  diffRemovedBg: string;
  diffContextBg: string;
  diffLineNumber: string;
  diffAddedLineNumberBg: string;
  diffRemovedLineNumberBg: string;

  // Markdown colors (14)
  markdownText: string;
  markdownHeading: string;
  markdownLink: string;
  markdownLinkText: string;
  markdownCode: string;
  markdownBlockQuote: string;
  markdownEmph: string;
  markdownStrong: string;
  markdownHorizontalRule: string;
  markdownListItem: string;
  markdownListEnumeration: string;
  markdownImage: string;
  markdownImageText: string;
  markdownCodeBlock: string;

  // Syntax highlighting colors (9)
  syntaxComment: string;
  syntaxKeyword: string;
  syntaxFunction: string;
  syntaxVariable: string;
  syntaxString: string;
  syntaxNumber: string;
  syntaxType: string;
  syntaxOperator: string;
  syntaxPunctuation: string;
};

/**
 * Full theme object with metadata
 */
export type Theme = ThemeColors & {
  name: string;
  displayName: string;
  variant: ThemeMode;
};

/**
 * Theme JSON definition structure (matches the JSON files).
 * This is the raw structure of theme JSON files before resolution.
 *
 * @example
 * ```typescript
 * const myDefinition: ThemeDefinition = {
 *   defs: { primary: "#ff0000", secondary: "#00ff00" },
 *   theme: {
 *     primary: "primary",
 *     secondary: { dark: "secondary", light: "#ffffff" }
 *   }
 * };
 * ```
 */
export type ThemeDefinition = {
  $schema?: string;
  defs: Record<string, string>;
  theme: Record<string, string | { dark: string; light: string }>;
};

/**
 * Theme context value - what useTheme() returns
 */
export type ThemeContextValue = {
  theme: Theme;
  syntax: SyntaxStyle;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  preset: string;
  setPreset: (name: string) => void;
  presets: string[];
  ready: boolean;
};

/**
 * Recursively makes all properties of T optional.
 * Used for theme overrides where users only specify the properties they want to change.
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Create a custom theme by extending a base theme with overrides.
 * Performs a deep merge using deepmerge, so you only need to specify the properties you want to change.
 * Does not mutate the base theme - returns a new object.
 *
 * Note: This function works on RESOLVED Theme objects, not raw ThemeDefinition objects.
 * Use resolveTheme() first to convert a ThemeDefinition to a Theme.
 *
 * @example
 * ```typescript
 * import { openCodeTheme, resolveTheme, extendTheme } from 'ai-sdk-tui';
 *
 * // First resolve the definition for your preferred mode
 * const baseTheme = resolveTheme(openCodeTheme, 'dark');
 *
 * // Then extend with your customizations
 * const myTheme = extendTheme(baseTheme, {
 *   primary: '#ff6b6b',
 *   secondary: '#4ecdc4',
 *   name: 'my-custom-theme',
 *   displayName: 'My Custom Theme',
 * });
 * ```
 *
 * @param base - The base theme to extend (a resolved Theme object)
 * @param overrides - Partial theme object with properties to override
 * @returns A complete Theme object with overrides applied
 */
export function extendTheme(base: Theme, overrides: DeepPartial<Theme>): Theme {
  return deepmerge(base, overrides) as Theme;
}

// =============================================================================
// Theme Registry
// =============================================================================

const DEFAULT_PRESET = "opencode";
const DEFAULT_MODE: ThemeMode = "dark";

type ThemeEntry = {
  name: string;
  displayName: string;
  definition: ThemeDefinition;
  isCustom?: boolean;
};

function getCustomThemesDir(configPath: string): string {
  return join(configPath, "themes");
}

async function loadCustomThemes(
  configPath: string
): Promise<Map<string, ThemeEntry>> {
  const customThemes = new Map<string, ThemeEntry>();
  const themesDir = getCustomThemesDir(configPath);

  try {
    const files = await readdir(themesDir);

    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }

      try {
        const filePath = join(themesDir, file);
        const content = await readFile(filePath, "utf-8");
        const definition = JSON.parse(content) as ThemeDefinition & {
          displayName?: string;
        };

        if (!(definition.defs && definition.theme)) {
          continue;
        }

        const name = file.replace(".json", "");
        customThemes.set(name, {
          name,
          displayName: definition.displayName ?? name,
          definition,
          isCustom: true,
        });
      } catch {
        /* invalid theme file */
      }
    }
  } catch {
    /* themes dir doesn't exist */
  }

  return customThemes;
}

const themes: Map<string, ThemeEntry> = new Map([
  [
    "opencode",
    {
      name: "opencode",
      displayName: "OpenCode",
      definition: _openCodeTheme as ThemeDefinition,
    },
  ],
  [
    "vercel",
    {
      name: "vercel",
      displayName: "Vercel",
      definition: _vercelTheme as ThemeDefinition,
    },
  ],
  [
    "one-dark",
    {
      name: "one-dark",
      displayName: "One Dark",
      definition: _oneDarkTheme as ThemeDefinition,
    },
  ],
]);

export function getThemeNames(): string[] {
  return Array.from(themes.keys());
}

// =============================================================================
// Color Resolution Utilities
// =============================================================================

/**
 * Resolve a color value from the theme definition.
 * Handles:
 * - Direct hex colors (#ffffff)
 * - References to defs (colorName)
 * - Dark/light variants ({ dark: "...", light: "..." })
 */
function resolveColor(
  value: string | { dark: string; light: string },
  defs: Record<string, string>,
  mode: ThemeMode
): string {
  // Handle dark/light variant objects
  if (typeof value === "object" && value !== null) {
    const modeValue = value[mode];
    return resolveColor(modeValue, defs, mode);
  }

  // Direct hex color
  if (value.startsWith("#")) {
    return value;
  }

  // Reference to defs
  if (defs[value]) {
    return resolveColor(defs[value], defs, mode);
  }

  // Fallback - return as-is (shouldn't happen with valid themes)
  return value;
}

/**
 * Resolve a theme entry to a fully resolved Theme object (internal use)
 */
function resolveThemeEntry(entry: ThemeEntry, mode: ThemeMode): Theme {
  const { name, displayName, definition } = entry;
  const { defs, theme: themeColors } = definition;

  const colors: Record<string, string> = {};

  for (const [key, value] of Object.entries(themeColors)) {
    colors[key] = resolveColor(value, defs, mode);
  }

  return {
    ...(colors as ThemeColors),
    name,
    displayName,
    variant: mode,
  };
}

/**
 * Resolve a theme definition to a fully resolved Theme object for a specific mode.
 *
 * Theme definitions contain color references and dark/light variants.
 * This function resolves all references and selects the appropriate variant
 * based on the specified mode.
 *
 * @example
 * ```typescript
 * import { openCodeTheme, resolveTheme } from 'ai-sdk-tui';
 *
 * // Resolve for dark mode
 * const darkTheme = resolveTheme(openCodeTheme, 'dark');
 *
 * // Resolve for light mode
 * const lightTheme = resolveTheme(openCodeTheme, 'light');
 * ```
 *
 * @param definition - The raw theme definition (from JSON or custom)
 * @param mode - The theme mode to resolve for ('dark' or 'light')
 * @returns A fully resolved Theme object with all colors as hex strings
 */
export function resolveTheme(
  definition: ThemeDefinition & { name?: string; displayName?: string },
  mode: ThemeMode
): Theme {
  const { defs, theme: themeColors } = definition;

  // Extract name from definition or use a default
  const name = definition.name ?? "custom";
  const displayName = definition.displayName ?? name;

  const colors: Record<string, string> = {};

  for (const [key, value] of Object.entries(themeColors)) {
    colors[key] = resolveColor(value, defs, mode);
  }

  return {
    ...(colors as ThemeColors),
    name,
    displayName,
    variant: mode,
  };
}

// =============================================================================
// Syntax Style Generation
// =============================================================================

/**
 * Create a SyntaxStyle instance from theme colors for markdown/code rendering.
 * Maps tree-sitter capture names to theme colors.
 */
function createSyntaxStyle(theme: ThemeColors): SyntaxStyle {
  const toRGBA = (hex: string) => RGBA.fromHex(hex);

  return SyntaxStyle.fromTheme([
    // Default text
    { scope: ["default"], style: { foreground: toRGBA(theme.text) } },

    // Markdown headings
    {
      scope: [
        "markup.heading",
        "markup.heading.1",
        "markup.heading.2",
        "markup.heading.3",
        "markup.heading.4",
        "markup.heading.5",
        "markup.heading.6",
      ],
      style: { foreground: toRGBA(theme.markdownHeading), bold: true },
    },

    // Bold/strong text
    {
      scope: ["markup.bold", "markup.strong"],
      style: { foreground: toRGBA(theme.markdownStrong), bold: true },
    },

    // Italic/emphasis text
    {
      scope: ["markup.italic"],
      style: { foreground: toRGBA(theme.markdownEmph), italic: true },
    },

    // Code (inline and block)
    {
      scope: ["markup.raw", "markup.raw.block", "markup.raw.inline"],
      style: { foreground: toRGBA(theme.markdownCode) },
    },

    // Links
    {
      scope: ["markup.link"],
      style: { foreground: toRGBA(theme.markdownLink), underline: true },
    },
    {
      scope: ["markup.link.label"],
      style: { foreground: toRGBA(theme.markdownLinkText), underline: true },
    },
    {
      scope: ["markup.link.url"],
      style: { foreground: toRGBA(theme.markdownLink), underline: true },
    },
    { scope: ["label"], style: { foreground: toRGBA(theme.markdownLinkText) } },

    // Block quotes
    {
      scope: ["markup.quote"],
      style: { foreground: toRGBA(theme.markdownBlockQuote), italic: true },
    },

    // Lists
    {
      scope: ["markup.list"],
      style: { foreground: toRGBA(theme.markdownListItem) },
    },
    {
      scope: ["markup.list.checked"],
      style: { foreground: toRGBA(theme.success) },
    },
    {
      scope: ["markup.list.unchecked"],
      style: { foreground: toRGBA(theme.textMuted) },
    },

    // Strikethrough and underline
    {
      scope: ["markup.strikethrough"],
      style: { foreground: toRGBA(theme.textMuted) },
    },
    {
      scope: ["markup.underline"],
      style: { foreground: toRGBA(theme.text), underline: true },
    },

    // Syntax highlighting for code blocks
    {
      scope: ["comment", "comment.documentation"],
      style: { foreground: toRGBA(theme.syntaxComment), italic: true },
    },
    {
      scope: ["string", "symbol"],
      style: { foreground: toRGBA(theme.syntaxString) },
    },
    {
      scope: ["number", "boolean", "float"],
      style: { foreground: toRGBA(theme.syntaxNumber) },
    },
    {
      scope: [
        "keyword",
        "keyword.return",
        "keyword.conditional",
        "keyword.repeat",
        "keyword.import",
        "keyword.export",
        "keyword.modifier",
        "keyword.exception",
      ],
      style: { foreground: toRGBA(theme.syntaxKeyword), italic: true },
    },
    {
      scope: ["keyword.function", "function.method", "function", "constructor"],
      style: { foreground: toRGBA(theme.syntaxFunction) },
    },
    {
      scope: [
        "variable",
        "variable.parameter",
        "property",
        "field",
        "parameter",
      ],
      style: { foreground: toRGBA(theme.syntaxVariable) },
    },
    {
      scope: ["type", "module", "namespace", "class"],
      style: { foreground: toRGBA(theme.syntaxType) },
    },
    {
      scope: ["operator", "keyword.operator", "punctuation.delimiter"],
      style: { foreground: toRGBA(theme.syntaxOperator) },
    },
    {
      scope: ["punctuation", "punctuation.bracket"],
      style: { foreground: toRGBA(theme.syntaxPunctuation) },
    },
    {
      scope: ["constant"],
      style: { foreground: toRGBA(theme.syntaxNumber) },
    },
    {
      scope: [
        "variable.builtin",
        "type.builtin",
        "function.builtin",
        "module.builtin",
        "constant.builtin",
      ],
      style: { foreground: toRGBA(theme.error) },
    },

    // Diff colors
    {
      scope: ["diff.plus"],
      style: {
        foreground: toRGBA(theme.diffAdded),
        background: toRGBA(theme.diffAddedBg),
      },
    },
    {
      scope: ["diff.minus"],
      style: {
        foreground: toRGBA(theme.diffRemoved),
        background: toRGBA(theme.diffRemovedBg),
      },
    },
    {
      scope: ["diff.delta"],
      style: {
        foreground: toRGBA(theme.diffContext),
        background: toRGBA(theme.diffContextBg),
      },
    },

    // Error/warning/info
    {
      scope: ["error"],
      style: { foreground: toRGBA(theme.error), bold: true },
    },
    {
      scope: ["warning"],
      style: { foreground: toRGBA(theme.warning), bold: true },
    },
    { scope: ["info"], style: { foreground: toRGBA(theme.info) } },

    // Conceal (hidden markdown syntax)
    { scope: ["conceal"], style: { foreground: toRGBA(theme.textMuted) } },
    { scope: ["spell", "nospell"], style: { foreground: toRGBA(theme.text) } },

    {
      scope: ["extmark.file"],
      style: { foreground: toRGBA(theme.warning), bold: true },
    },
    {
      scope: ["extmark.agent"],
      style: { foreground: toRGBA(theme.secondary), bold: true },
    },
    {
      scope: ["extmark.paste"],
      style: {
        foreground: toRGBA(theme.background),
        background: toRGBA(theme.warning),
        bold: true,
      },
    },
    {
      scope: ["extmark.image"],
      style: {
        foreground: toRGBA(theme.background),
        background: toRGBA(theme.accent),
        bold: true,
      },
    },
  ]);
}

// =============================================================================
// React Context
// =============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  initialMode?: ThemeMode;
  initialPreset?: string;
};

export function ThemeProvider({
  children,
  initialMode = DEFAULT_MODE,
  initialPreset = DEFAULT_PRESET,
}: ThemeProviderProps) {
  const kv = useKV();
  const [allThemes, setAllThemes] = useState<Map<string, ThemeEntry>>(themes);
  const [themesLoaded, setThemesLoaded] = useState(false);

  const [mode, setModeState] = useState<ThemeMode>(() => {
    const persisted = kv.get<ThemeMode | undefined>("theme.mode", undefined);
    return persisted ?? initialMode;
  });

  const [presetName, setPresetName] = useState<string>(() => {
    const persisted = kv.get<string | undefined>("theme.preset", undefined);
    return persisted ?? initialPreset;
  });

  useEffect(() => {
    loadCustomThemes(kv.getConfigPath())
      .then((custom) => {
        setAllThemes((prev) => {
          const merged = new Map(prev);
          for (const [name, entry] of custom) {
            merged.set(name, entry);
          }
          return merged;
        });
        setThemesLoaded(true);
      })
      .catch(() => {
        setThemesLoaded(true);
      });
  }, [kv]);

  const getThemeEntryFromAll = useCallback(
    (name: string): ThemeEntry => {
      const entry = allThemes.get(name) ?? allThemes.get(DEFAULT_PRESET);
      if (!entry) {
        throw new Error(`Theme "${name}" not found`);
      }
      return entry;
    },
    [allThemes]
  );

  const theme = useMemo<Theme>(() => {
    const entry = getThemeEntryFromAll(presetName);
    return resolveThemeEntry(entry, mode);
  }, [presetName, mode, getThemeEntryFromAll]);

  const syntax = useMemo<SyntaxStyle>(() => createSyntaxStyle(theme), [theme]);

  const setMode = useCallback(
    (newMode: ThemeMode) => {
      setModeState(newMode);
      kv.set("theme.mode", newMode).catch(() => {
        // fire-and-forget persistence
      });
    },
    [kv.set]
  );

  const setPreset = useCallback(
    (name: string) => {
      if (allThemes.has(name)) {
        setPresetName(name);
        kv.set("theme.preset", name).catch(() => {
          // fire-and-forget persistence
        });
      }
    },
    [allThemes, kv.set]
  );

  const presets = useMemo(() => Array.from(allThemes.keys()), [allThemes]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      syntax,
      mode,
      setMode,
      preset: presetName,
      setPreset,
      presets,
      ready: themesLoaded,
    }),
    [theme, syntax, mode, setMode, presetName, setPreset, presets, themesLoaded]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
