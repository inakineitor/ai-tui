import type { ThemeMode } from "#context/theme/index.tsx";

// Regex to match OSC 11 response: ESC ] 11 ; <color> BEL
// biome-ignore lint/suspicious/noControlCharactersInRegex: Control characters are required to match terminal escape sequences
const OSC_11_RESPONSE_REGEX = /\x1b]11;([^\x07\x1b]+)/;

/**
 * Detects the terminal's background color and returns "dark" or "light" mode.
 *
 * This works by sending an OSC 11 escape sequence to query the terminal's
 * background color, then calculating luminance to determine if it's dark or light.
 *
 * Supported terminal response formats:
 * - `rgb:RRRR/GGGG/BBBB` - 16-bit per channel (most common)
 * - `#RRGGBB` - 8-bit hex
 * - `rgb(R,G,B)` - CSS-style
 *
 * @returns Promise that resolves to "dark" or "light"
 */
export function detectTerminalMode(): Promise<ThemeMode> {
  // Can't set raw mode if not a TTY
  if (!process.stdin.isTTY) {
    return Promise.resolve("dark");
  }

  return new Promise((resolve) => {
    let timeout: NodeJS.Timeout;

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.removeListener("data", handler);
      clearTimeout(timeout);
    };

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex terminal escape sequence parsing
    const handler = (data: Buffer) => {
      const str = data.toString();
      const match = str.match(OSC_11_RESPONSE_REGEX);

      if (match?.[1]) {
        cleanup();
        const color = match[1];

        // Parse RGB values from color string
        let r = 0;
        let g = 0;
        let b = 0;

        if (color.startsWith("rgb:")) {
          // Format: rgb:RRRR/GGGG/BBBB (16-bit per channel)
          const parts = color.substring(4).split("/");
          // biome-ignore lint/suspicious/noBitwiseOperators: Intentional 16-bit to 8-bit color conversion
          r = Number.parseInt(parts[0] ?? "0", 16) >> 8;
          // biome-ignore lint/suspicious/noBitwiseOperators: Intentional 16-bit to 8-bit color conversion
          g = Number.parseInt(parts[1] ?? "0", 16) >> 8;
          // biome-ignore lint/suspicious/noBitwiseOperators: Intentional 16-bit to 8-bit color conversion
          b = Number.parseInt(parts[2] ?? "0", 16) >> 8;
        } else if (color.startsWith("#")) {
          // Format: #RRGGBB
          r = Number.parseInt(color.substring(1, 3), 16);
          g = Number.parseInt(color.substring(3, 5), 16);
          b = Number.parseInt(color.substring(5, 7), 16);
        } else if (color.startsWith("rgb(")) {
          // Format: rgb(R,G,B)
          const parts = color.substring(4, color.length - 1).split(",");
          r = Number.parseInt(parts[0] ?? "0", 10);
          g = Number.parseInt(parts[1] ?? "0", 10);
          b = Number.parseInt(parts[2] ?? "0", 10);
        }

        // Calculate luminance using relative luminance formula
        // This formula weights green more heavily as human eyes are more sensitive to it
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Determine if dark or light based on luminance threshold
        resolve(luminance > 0.5 ? "light" : "dark");
      }
    };

    // Set raw mode to capture terminal response
    process.stdin.setRawMode(true);
    process.stdin.on("data", handler);

    // Send OSC 11 query to ask terminal for background color
    // ESC ] 11 ; ? BEL
    process.stdout.write("\x1b]11;?\x07");

    // Timeout fallback - if terminal doesn't respond within 1 second, default to dark
    timeout = setTimeout(() => {
      cleanup();
      resolve("dark");
    }, 1000);
  });
}
