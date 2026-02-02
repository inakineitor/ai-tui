import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.tsx",
  },
  format: ["cjs", "esm"],
  external: ["react"],
  dts: true,
  clean: false,
  target: false,
});
