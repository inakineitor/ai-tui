/**
 * Default gradient colors (teen gradient from gradient-string).
 * Used when a gradient style is specified without custom colors.
 */
export const DEFAULT_GRADIENT_COLORS = ["#77a1d3", "#79cbca", "#e684ae"];

/**
 * Interpolate between two hex colors.
 * @param hex1 - Starting color in #RRGGBB format
 * @param hex2 - Ending color in #RRGGBB format
 * @param t - Interpolation factor (0 = hex1, 1 = hex2)
 * @returns Interpolated color in #RRGGBB format
 */
export function interpolateColor(
  hex1: string,
  hex2: string,
  t: number
): string {
  const r1 = Number.parseInt(hex1.slice(1, 3), 16);
  const g1 = Number.parseInt(hex1.slice(3, 5), 16);
  const b1 = Number.parseInt(hex1.slice(5, 7), 16);
  const r2 = Number.parseInt(hex2.slice(1, 3), 16);
  const g2 = Number.parseInt(hex2.slice(3, 5), 16);
  const b2 = Number.parseInt(hex2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Get the gradient color at a specific position.
 * @param position - Position in the gradient (0 to 1)
 * @param colors - Array of hex colors defining the gradient stops
 * @returns The interpolated color at the given position
 */
export function getGradientColor(position: number, colors: string[]): string {
  if (colors.length === 0) {
    return "#ffffff";
  }
  if (colors.length === 1) {
    return colors[0] ?? "#ffffff";
  }
  const segmentCount = colors.length - 1;
  const segment = Math.min(
    Math.floor(position * segmentCount),
    segmentCount - 1
  );
  const segmentPosition = position * segmentCount - segment;
  const color1 = colors[segment] ?? "#ffffff";
  const color2 = colors[segment + 1] ?? "#ffffff";
  return interpolateColor(color1, color2, segmentPosition);
}
