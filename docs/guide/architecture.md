# Architecture

Graph Builder is a pipeline, not a black box.

## Pipeline stages

1. **Collect**: gather `GraphBuilderTextItem` records from arrays, iterables, providers, or local files.
2. **Extract**: parse markdown or code into document, chunk, symbol, resource, and package nodes.
3. **Build**: normalize nodes and edges, infer reference edges from markdown links and imports, and calculate graph stats.
4. **Semantic merge**: optionally merge an enricher-provided fragment into the graph.
5. **Analyze**: compute communities, god nodes, isolated nodes, and surprising connections.
6. **Artifact generation**: emit JSON, report, wiki, and HTML outputs.

## Deterministic-first design

The semantic stage is intentionally late and optional. This keeps the default package usable in offline, reproducible, and low-cost paths.

## Node runtime split

The root package stays API-first. The Node-only `./node` subpath owns local filesystem traversal so browser and edge consumers do not need file-system dependencies.

## Incremental path

`graphBuilder.updateGraph(...)` updates an existing graph by source item. That makes it practical to refresh a subset of records without rebuilding the whole corpus.
