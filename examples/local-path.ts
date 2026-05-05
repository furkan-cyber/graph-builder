import { fileURLToPath } from "node:url";
import { graphBuilder } from "../src/index.js";

const docsPath = fileURLToPath(new URL("./fixtures/docs", import.meta.url));
const result = await graphBuilder(docsPath, {
  artifacts: ["json", "report", "wiki"]
});

console.log("Graph stats:", result.graph.stats);
console.log("Documents:", result.graph.nodes.filter((node) => node.type === "document").map((node) => node.label));
console.log("Wiki files:", Object.keys(result.artifacts.wiki ?? {}));