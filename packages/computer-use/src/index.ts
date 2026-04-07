// biome-ignore lint/performance/noBarrelFile: package entry point
export {
  type CaptureSource,
  type CaptureTarget,
  type ScalingInfo,
  computeScaling,
  listMonitors,
  listWindows,
} from "./capture.js";
export {
  type ComputerToolOptions,
  createComputerTool,
} from "./computer-tool.js";
export { parseKeys } from "./key-map.js";
