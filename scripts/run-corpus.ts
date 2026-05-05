import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { graphBuilder } from "../src/index.js";

const targetPath = process.argv[2];
if (!targetPath) {
  console.error("Usage: npm run run:corpus -- <target-path> [output-dir]");
  process.exit(1);
}

const resolvedTarget = resolve(targetPath);
const outputDir = resolve(process.argv[3] ?? join(resolvedTarget, "graph-builder-out"));

const result = await graphBuilder(resolvedTarget, {
  artifacts: ["json", "report", "wiki", "html"]
});

await mkdir(outputDir, { recursive: true });

if (result.artifacts.json) {
  await writeFile(join(outputDir, "graph.json"), result.artifacts.json, "utf8");
}
if (result.artifacts.report) {
  await writeFile(join(outputDir, "GRAPH_REPORT.md"), result.artifacts.report, "utf8");
}
if (result.artifacts.html) {
  await writeFile(join(outputDir, "graph.html"), result.artifacts.html, "utf8");
}
if (result.artifacts.wiki) {
  const wikiDir = join(outputDir, "wiki");
  await mkdir(wikiDir, { recursive: true });
  await Promise.all(
    Object.entries(result.artifacts.wiki).map(([name, content]) => writeFile(join(wikiDir, name), content, "utf8"))
  );
}

await writeFile(join(outputDir, "result.json"), JSON.stringify(result.toJSON(), null, 2), "utf8");

console.log(`Saved Graph Builder outputs to ${outputDir}`);
console.log(JSON.stringify(result.graph.stats, null, 2));