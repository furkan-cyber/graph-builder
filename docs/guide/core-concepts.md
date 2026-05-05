# Core Concepts

Graph Builder has a deliberately small model surface.

## Input

The main input types are:
- `GraphBuilderTextItem` for text you already have.
- `GraphBuilderProvider` for pulling records from another system.
- A Node.js path string for local-file ingestion.

Every item should have a stable `id` and text body. Optional metadata like `path`, `url`, and `storageRef` make the resulting graph easier to query and trace back to source.

## Graph

`result.graph` contains:
- `nodes` for documents, headings, chunks, symbols, tags, packages, resources, and semantic concepts.
- `edges` for structural and inferred relationships.
- `hyperedges` for higher-order semantic groupings when an enricher returns them.
- `stats` for node, edge, source, and community counts.

## Result object

`result` is more than raw graph data:
- `query` exposes search, path, neighbor, and community helpers.
- `analysis` holds god nodes, isolated nodes, confidence counts, and surprising connections.
- `artifacts` holds serialized output formats.
- `diagnostics` records warnings, timings, skipped items, errors, and model usage.

## Deterministic vs semantic stages

The default pipeline is deterministic. Graph Builder parses markdown and code, normalizes nodes and edges, and analyzes the graph. If you supply `semantic.enricher`, the semantic fragment is merged after deterministic extraction.
