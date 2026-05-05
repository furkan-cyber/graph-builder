import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createOpenAICompatibleEnricher } from "../src/adapters/openai-compatible.js";
import { graphBuilder } from "../src/index.js";

const apiKey = process.env.OPENAI_API_KEY ?? process.env.GRAPH_BUILDER_OPENAI_API_KEY;
if (!apiKey) {
  console.error("Set OPENAI_API_KEY or GRAPH_BUILDER_OPENAI_API_KEY before running this example.");
  process.exit(1);
}

const model = process.env.GRAPH_BUILDER_OPENAI_MODEL ?? "gpt-4.1-mini";
const baseUrl = process.env.GRAPH_BUILDER_OPENAI_BASE_URL;

const result = await graphBuilder.fromTexts([
  {
    id: "docs/auth.md",
    title: "Authentication",
    path: "docs/auth.md",
    text: `# Authentication

Users sign in with short-lived tokens.

Session rotation reduces replay risk and keeps the gateway stateless.`
  },
  {
    id: "docs/billing.md",
    title: "Billing",
    path: "docs/billing.md",
    text: `# Billing

The invoice pipeline retries failed payment intents.

The retry scheduler also uses short-lived idempotency windows to avoid duplicated charges.`
  },
  {
    id: "docs/gateway.md",
    title: "Gateway",
    path: "docs/gateway.md",
    text: `# Gateway

The API gateway validates bearer tokens and routes each request to downstream workers.

It uses idempotency keys for some write paths.`
  }
], {
  artifacts: ["json", "report", "html"],
  semantic: {
    enricher: createOpenAICompatibleEnricher({
      apiKey,
      model,
      baseUrl,
      maxItems: 6,
      maxCharsPerItem: 1800,
      maxContextNodes: 80
    })
  }
});

const semanticEdges = result.graph.edges.filter((edge) => edge.context === "semantic_llm" || edge.confidence !== "EXTRACTED");

console.log("Model usage:", result.diagnostics.modelUsage);
console.log("Semantic edges:", semanticEdges);
console.log("Report:\n", result.artifacts.report);

if (result.artifacts.html) {
  const outputPath = join(process.cwd(), "examples", "llm-semantic-output.html");
  await writeFile(outputPath, result.artifacts.html, "utf8");
  console.log(`Saved visualization to ${outputPath}`);
}