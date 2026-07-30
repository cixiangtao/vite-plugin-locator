import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    runtime: "src/runtime.ts",
  },
  format: ["esm", "cjs"],
  dts: {
    sourcemap: true,
  },
  fixedExtension: false,
  sourcemap: true,
  clean: true,
  target: "node18",
  outDir: "dist",
  outputOptions: {
    exports: "named",
  },
});
