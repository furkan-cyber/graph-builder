# Semantic Surface

Semantic enrichment uses two main types:

- `GraphBuilderSemanticEnricher`
- `GraphBuilderSemanticFragment`

The enricher receives items, extractions, the current graph, and runtime options, then returns additional nodes, edges, hyperedges, warnings, and optional model usage.

This keeps semantic behavior explicit and inspectable instead of hidden behind automatic heuristics.
