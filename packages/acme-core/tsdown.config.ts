import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    ".": "src/index.tsx",
  },
  banner: {
    js: "'use client'",
  },
  format: ["cjs", "esm"],
  external: ["react"],
  dts: true,
  clean: false,
  target: false,
});
