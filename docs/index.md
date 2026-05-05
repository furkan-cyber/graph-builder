---
layout: home

hero:
  name: Graph Builder
  text: Build Queryable Text Graphs
  tagline: Turn documents, code, and provider-backed records into a typed graph with deterministic extraction first and optional semantic enrichment after.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Study Architecture
      link: /guide/architecture

features:
  - title: API-first graph building
    details: Start from arrays, async iterables, custom providers, or local filesystem paths without committing to a CLI-first workflow.
  - title: Deterministic extraction, optional semantic pass
    details: The default pipeline extracts structure from markdown and code. LLM enrichment is additive, explicit, and tracked in diagnostics.
  - title: Query helpers you can use immediately
    details: Query nodes, shortest paths, neighbors, communities, and seeded graph slices directly from the returned result object.
  - title: Output artifacts for analysis and visualization
    details: Emit JSON, report, wiki, and HTML outputs from the same graph so apps and humans can inspect the same model.
  - title: Provider and adapter friendly
    details: Bring your own provider, memory facts, or markdown converter without changing the core graph pipeline.
  - title: Incremental update path
    details: Update existing graphs by source item instead of rebuilding the full corpus every time your content changes.
---

## Start Here

If this is your first integration, use the docs in this order:

1. Read [Getting Started](/guide/getting-started) for the fastest path to a working graph.
2. Read [Core Concepts](/guide/core-concepts) to understand what the graph, result, and artifacts actually contain.
3. Read [Architecture](/guide/architecture) to understand where deterministic extraction stops and semantic enrichment begins.
4. Jump to [Examples](/examples/) when you want a concrete integration pattern.

## Quick Start

```ts
import { graphBuilder } from "@cognipeer/graph-builder";

const result = await graphBuilder.fromTexts([
  {
    id: "docs/overview.md",
    title: "Overview",
    path: "docs/overview.md",
    text: "# Overview\n\nSee [Guide](guide.md)."
  },
  {
    id: "docs/guide.md",
    title: "Guide",
    path: "docs/guide.md",
    text: "# Guide\n\nThe guide explains how providers and path-based inputs work."
  }
]);

console.log(result.graph.stats);
console.log(result.query.path("Overview", "Guide"));
console.log(result.artifacts.report);
```

## What this site optimizes for

- Fast product onboarding without hiding the underlying graph model.
- Clear documentation for the API-first path before any CLI or hosted wrapper exists.
- A predictable explanation of deterministic extraction, semantic enrichment, diagnostics, and artifacts.
- Task-oriented documentation rather than a flat export dump.
