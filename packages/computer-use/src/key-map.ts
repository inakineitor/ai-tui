import { Key } from "@nut-tree-fork/nut-js";

const KEY_MAP: Record<string, Key> = {
  // Modifiers
  ctrl: Key.LeftControl,
  control: Key.LeftControl,
  alt: Key.LeftAlt,
  shift: Key.LeftShift,
  super: Key.LeftSuper,
  meta: Key.LeftSuper,
  cmd: Key.LeftSuper,
  command: Key.LeftSuper,
  win: Key.LeftSuper,

  // Navigation
  return: Key.Return,
  enter: Key.Return,
  tab: Key.Tab,
  escape: Key.Escape,
  esc: Key.Escape,
  space: Key.Space,
  backspace: Key.Backspace,
  delete: Key.Delete,
  home: Key.Home,
  end: Key.End,
  pageup: Key.PageUp,
  page_up: Key.PageUp,
  pagedown: Key.PageDown,
  page_down: Key.PageDown,

  // Arrow keys
  up: Key.Up,
  down: Key.Down,
  left: Key.Left,
  right: Key.Right,

  // Function keys
  f1: Key.F1,
  f2: Key.F2,
  f3: Key.F3,
  f4: Key.F4,
  f5: Key.F5,
  f6: Key.F6,
  f7: Key.F7,
  f8: Key.F8,
  f9: Key.F9,
  f10: Key.F10,
  f11: Key.F11,
  f12: Key.F12,

  // Letters
  a: Key.A,
  b: Key.B,
  c: Key.C,
  d: Key.D,
  e: Key.E,
  f: Key.F,
  g: Key.G,
  h: Key.H,
  i: Key.I,
  j: Key.J,
  k: Key.K,
  l: Key.L,
  m: Key.M,
  n: Key.N,
  o: Key.O,
  p: Key.P,
  q: Key.Q,
  r: Key.R,
  s: Key.S,
  t: Key.T,
  u: Key.U,
  v: Key.V,
  w: Key.W,
  x: Key.X,
  y: Key.Y,
  z: Key.Z,

  // Numbers
  "0": Key.Num0,
  "1": Key.Num1,
  "2": Key.Num2,
  "3": Key.Num3,
  "4": Key.Num4,
  "5": Key.Num5,
  "6": Key.Num6,
  "7": Key.Num7,
  "8": Key.Num8,
  "9": Key.Num9,
};

/**
 * Parse an Anthropic key string like "ctrl+s" or "Return"
 * into an array of nut.js Key values.
 *
 * Key names follow xdotool / X11 keysym format (the XK_ constants
 * with the prefix stripped): Return, space, BackSpace, Tab, ctrl+l,
 * super+e, etc., with + as the modifier separator.
 */
export function parseKeys(keyString: string): Key[] {
  const parts = keyString.split("+").map((k) => k.trim().toLowerCase());
  return parts.map((part) => {
    const mapped = KEY_MAP[part];
    if (mapped !== undefined) {
      return mapped;
    }
    // Single character fallback
    if (part.length === 1) {
      const upper = part.toUpperCase();
      const k = Key[upper as keyof typeof Key];
      if (k !== undefined) {
        return k;
      }
    }
    throw new Error(`Unknown key: "${part}" in key string "${keyString}"`);
  });
}
