import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  target: false,
  banner: {
    js: "'use client'",
  },
  external: ["react"],
});
