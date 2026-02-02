import { resolve } from "node:path";

import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  outDir: "dist",
  dts: {
    eager: true,
  },
  clean: true,
  treeshake: true,
  platform: "node",
  target: "node18",
  // Don't bundle peer dependencies
  external: [
    "react",
    "@opentui/core",
    "@opentui/react",
    "ai",
    "@ai-sdk/react",
    // Node built-ins
    /^node:/,
  ],
  // Resolve configuration for path aliases
  inputOptions: {
    resolve: {
      alias: {
        // Handle #* path aliases from package.json imports
        "#": resolve(process.cwd(), "src"),
      },
    },
  },
  // JSX handled via tsconfig.json
});
