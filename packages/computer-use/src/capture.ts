import type { Image } from "node-screenshots";
import { Monitor, Window } from "node-screenshots";

/* ===== Capture Target Types ===== */

/**
 * "desktop" — Captures the primary monitor (default behavior).
 * "monitor" — Captures a specific monitor by index, id, or coordinates.
 * "window"  — Captures a specific window by id or title substring.
 */
export type CaptureTarget =
  | { mode: "desktop" }
  | { mode: "monitor"; by: "index"; index: number }
  | { mode: "monitor"; by: "id"; id: number }
  | { mode: "monitor"; by: "point"; x: number; y: number }
  | { mode: "window"; by: "id"; id: number }
  | { mode: "window"; by: "title"; title: string };

/* ===== Monitor Resolution ===== */

function getPrimaryMonitor(): Monitor {
  const monitors = Monitor.all();
  const primary = monitors.find((m) => m.isPrimary());
  if (primary === undefined) {
    throw new Error("No primary monitor found");
  }
  return primary;
}

function resolveMonitor(target: CaptureTarget): Monitor {
  if (target.mode === "desktop") {
    return getPrimaryMonitor();
  }

  if (target.mode !== "monitor") {
    throw new Error(`resolveMonitor called with mode "${target.mode}"`);
  }

  const monitors = Monitor.all();

  switch (target.by) {
    case "index": {
      const m = monitors[target.index];
      if (m === undefined) {
        throw new Error(
          `No monitor at index ${target.index} (found ${monitors.length})`
        );
      }
      return m;
    }
    case "id": {
      const m = monitors.find((mon) => mon.id() === target.id);
      if (m === undefined) {
        throw new Error(`No monitor with id ${target.id}`);
      }
      return m;
    }
    case "point": {
      const m = Monitor.fromPoint(target.x, target.y);
      if (m === null) {
        throw new Error(`No monitor at point (${target.x}, ${target.y})`);
      }
      return m;
    }
    default:
      throw new Error(
        `Unknown monitor selector: ${(target as { by: string }).by}`
      );
  }
}

/* ===== Window Resolution ===== */

function resolveWindow(target: CaptureTarget): Window {
  if (target.mode !== "window") {
    throw new Error(`resolveWindow called with mode "${target.mode}"`);
  }

  const windows = Window.all();
  if (windows.length === 0) {
    throw new Error("No windows found");
  }

  switch (target.by) {
    case "id": {
      const w = windows.find((win) => win.id() === target.id);
      if (w === undefined) {
        throw new Error(`No window with id ${target.id}`);
      }
      return w;
    }
    case "title": {
      const needle = target.title.toLowerCase();

      for (const w of windows) {
        if (w.title().toLowerCase().includes(needle)) {
          return w;
        }
      }

      const available = windows.map((w) => w.title()).join(", ");
      throw new Error(
        `No window matching title "${target.title}". Available: ${available}`
      );
    }
    default:
      throw new Error(
        `Unknown window selector: ${(target as { by: string }).by}`
      );
  }
}

/* ===== Screenshot Scaling ===== */

type Resolution = { width: number; height: number };

/**
 * Standard resolutions that Anthropic recommends for computer use.
 * Screenshots larger than these are scaled down to reduce token usage
 * and improve model accuracy (models were trained at these resolutions).
 */
const MAX_SCALING_TARGETS: Resolution[] = [
  { width: 1024, height: 768 }, // XGA (4:3)
  { width: 1280, height: 800 }, // WXGA (16:10)
  { width: 1366, height: 768 }, // FWXGA (~16:9)
];

/**
 * Find a scaling target for the given dimensions.
 * Returns the target resolution if scaling is needed, or null if the
 * display is already at or below the target size.
 */
function findScalingTarget(width: number, height: number): Resolution | null {
  const ratio = width / height;
  for (const target of MAX_SCALING_TARGETS) {
    // Allow some error in aspect ratio (~2%)
    if (Math.abs(target.width / target.height - ratio) < 0.02) {
      if (target.width < width) {
        return target;
      }
      return null;
    }
  }
  return null;
}

export type ScalingInfo = {
  /** Whether scaling is active */
  enabled: boolean;
  /** The dimensions reported to the model */
  scaledWidth: number;
  scaledHeight: number;
  /** The actual native dimensions */
  nativeWidth: number;
  nativeHeight: number;
  /** Scale API coordinates → native coordinates */
  toNative(x: number, y: number): { x: number; y: number };
  /** Scale native coordinates → API coordinates */
  toApi(x: number, y: number): { x: number; y: number };
};

export function computeScaling(
  nativeWidth: number,
  nativeHeight: number
): ScalingInfo {
  const target = findScalingTarget(nativeWidth, nativeHeight);
  if (target === null) {
    return {
      enabled: false,
      scaledWidth: nativeWidth,
      scaledHeight: nativeHeight,
      nativeWidth,
      nativeHeight,
      toNative: (x, y) => ({ x, y }),
      toApi: (x, y) => ({ x, y }),
    };
  }
  const xFactor = target.width / nativeWidth;
  const yFactor = target.height / nativeHeight;
  return {
    enabled: true,
    scaledWidth: target.width,
    scaledHeight: target.height,
    nativeWidth,
    nativeHeight,
    toNative: (x, y) => ({
      x: Math.round(x / xFactor),
      y: Math.round(y / yFactor),
    }),
    toApi: (x, y) => ({
      x: Math.round(x * xFactor),
      y: Math.round(y * yFactor),
    }),
  };
}

/* ===== Unified Capture Interface ===== */

export type CaptureSource = {
  captureImage(): Promise<Image>;
  width: number;
  height: number;
  /** Offset from the origin of the virtual desktop (for coordinate translation) */
  offsetX: number;
  offsetY: number;
};

export function resolveCaptureSource(target: CaptureTarget): CaptureSource {
  if (target.mode === "desktop" || target.mode === "monitor") {
    const monitor = resolveMonitor(target);
    return {
      captureImage: () => monitor.captureImage(),
      width: monitor.width(),
      height: monitor.height(),
      offsetX: monitor.x(),
      offsetY: monitor.y(),
    };
  }

  const window = resolveWindow(target);
  return {
    captureImage: () => window.captureImage(),
    width: window.width(),
    height: window.height(),
    offsetX: window.x(),
    offsetY: window.y(),
  };
}

/* ===== Discovery Helpers ===== */

/** List all available monitors for configuration/debugging. */
export function listMonitors(): Array<{
  index: number;
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
  isPrimary: boolean;
}> {
  return Monitor.all().map((m, i) => ({
    index: i,
    id: m.id(),
    x: m.x(),
    y: m.y(),
    width: m.width(),
    height: m.height(),
    scaleFactor: m.scaleFactor(),
    isPrimary: m.isPrimary(),
  }));
}

/** List all available windows for configuration/debugging. */
export function listWindows(): Array<{
  id: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
}> {
  return Window.all().map((w) => ({
    id: w.id(),
    title: w.title(),
    x: w.x(),
    y: w.y(),
    width: w.width(),
    height: w.height(),
    z: w.z(),
  }));
}
