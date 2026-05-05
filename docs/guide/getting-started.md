# Getting Started

Graph Builder is for teams that want a queryable graph from existing text without adopting a framework-heavy orchestration layer.

## Install

```sh
npm install @cognipeer/graph-builder
```

Requirements:
- Node.js 18.17+
- Text records, a provider, or a local directory to ingest
- A decision about whether semantic enrichment should stay off or be explicitly enabled

## Choose your input path

| Path | Use when | Entry point |
| --- | --- | --- |
| Text array | You already have records in memory | `graphBuilder.fromTexts(...)` |
| Custom provider | Content lives behind a DB, API, or service boundary | `graphBuilder.fromProvider(...)` |
| Local path | You want to scan files directly in Node | `graphBuilder("./docs")` |

## First graph

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
    text: "# Guide\n\nThis document explains the flow."
  }
]);
```

## What to inspect after the run

- `result.graph.stats` for counts and community totals.
- `result.query.path(...)` to verify cross-document links are usable.
- `result.artifacts.report` for a human-readable summary.
- `result.diagnostics` for timings, warnings, and model usage.

## Recommended next steps

1. Read [Core Concepts](/guide/core-concepts).
2. Read [Providers](/guide/providers) if your content is not already an in-memory array.
3. Read [Semantic Enrichment](/guide/semantic-enrichment) only if deterministic extraction is not enough.
