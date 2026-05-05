import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    node: "src/node.ts",
    "adapters/to-markdown": "src/adapters/to-markdown.ts",
    "adapters/openai-compatible": "src/adapters/openai-compatible.ts",
    "adapters/memory": "src/adapters/memory.ts"
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: "es2022",
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".mjs"
    };
  },
  external: [
    "fast-glob",
    "gray-matter",
    "ignore",
    "mdast-util-to-string",
    "remark",
    "remark-gfm",
    "remark-parse",
    "typescript",
    "unist-util-visit"
  ]
});