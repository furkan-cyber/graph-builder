import { createOpenAICompatibleEnricher } from "../src/adapters/openai-compatible.js";
import { graphBuilder } from "../src/index.js";

const fakeFetch: typeof fetch = async () => {
  return new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            nodes: [
              {
                id: "concept_reliability_window",
                label: "Reliability Window",
                type: "concept",
                metadata: {
                  reason: "Both systems reduce duplicate or unsafe retries by constraining request windows."
                }
              }
            ],
            edges: [
              {
                source: "doc:docs/auth.md",
                target: "concept_reliability_window",
                relation: "supports",
                confidence: "INFERRED",
                confidenceScore: 0.82,
                context: "semantic_llm",
                metadata: {
                  reason: "Token rotation is a reliability and safety mechanism."
                }
              },
              {
                source: "doc:docs/billing.md",
                target: "concept_reliability_window",
                relation: "supports",
                confidence: "INFERRED",
                confidenceScore: 0.84,
                context: "semantic_llm",
                metadata: {
                  reason: "Idempotency windows make retries safe."
                }
              },
              {
                source: "doc:docs/auth.md",
                target: "doc:docs/billing.md",
                relation: "semantically_similar_to",
                confidence: "INFERRED",
                confidenceScore: 0.79,
                context: "semantic_llm",
                metadata: {
                  reason: "Both docs describe bounded retry safety patterns."
                }
              }
            ],
            hyperedges: []
          })
        }
      }
    ],
    usage: {
      prompt_tokens: 123,
      completion_tokens: 56
    }
  }), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
};

const result = await graphBuilder.fromTexts([
  {
    id: "docs/auth.md",
    title: "Authentication",
    path: "docs/auth.md",
    text: `# Authentication

Users sign in with short-lived tokens.

Session rotation reduces replay risk.`
  },
  {
    id: "docs/billing.md",
    title: "Billing",
    path: "docs/billing.md",
    text: `# Billing

The invoice pipeline retries failed payment intents.

The retry scheduler uses idempotency windows.`
  }
], {
  semantic: {
    enricher: createOpenAICompatibleEnricher({
      apiKey: "mock-key",
      model: "mock-model",
      fetchImpl: fakeFetch
    })
  },
  artifacts: ["report"]
});

console.log("Model usage:", result.diagnostics.modelUsage);
console.log(
  "Semantic edges:",
  result.graph.edges.filter((edge) => edge.context === "semantic_llm" || edge.confidence !== "EXTRACTED")
);
console.log("Report:\n", result.artifacts.report);