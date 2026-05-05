# Semantic Enrichment

Semantic enrichment is optional and additive.

## When to use it

Use an enricher when deterministic links are not enough and you want higher-level semantic concepts or cross-document relationships.

## Current adapter

The package includes `createOpenAICompatibleEnricher(...)` for chat-completions style APIs.

```ts
import { graphBuilder } from "@cognipeer/graph-builder";
import { createOpenAICompatibleEnricher } from "@cognipeer/graph-builder/adapters/openai-compatible";

const result = await graphBuilder.fromTexts(records, {
  semantic: {
    enricher: createOpenAICompatibleEnricher({
      apiKey: process.env.OPENAI_API_KEY!,
      model: "gpt-4.1-mini"
    })
  }
});
```

## Operational expectations

- Semantic edges are merged after deterministic extraction.
- Model usage is recorded on `result.diagnostics.modelUsage`.
- Low-value or invalid fragments should be filtered by the enricher before merge.
- Keep semantic enrichment explicit in production; do not hide it behind implicit defaults.
