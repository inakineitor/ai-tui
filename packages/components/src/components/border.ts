/**
 * Custom border character definitions for OpenTUI boxes
 * Matches OpenCode's border.tsx structure
 */

/**
 * Empty border - all characters empty/space
 * Full BorderCharacters type for OpenTUI compatibility
 */
export const EmptyBorder = {
  topLeft: "",
  bottomLeft: "",
  vertical: "",
  topRight: "",
  bottomRight: "",
  horizontal: " ",
  bottomT: "",
  topT: "",
  cross: "",
  leftT: "",
  rightT: "",
  top: "",
  bottom: "",
  left: "",
  right: "",
} as const;

/**
 * Split border - used for panels with left/right borders
 */
export const SplitBorder = {
  border: ["left" as const, "right" as const],
  customBorderChars: {
    ...EmptyBorder,
    vertical: "\u2503", // ┃
  },
};
