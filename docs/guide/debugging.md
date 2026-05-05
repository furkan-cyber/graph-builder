# Debugging

When a graph looks wrong, inspect diagnostics before changing the extractor.

## Inspect these surfaces first

- `result.diagnostics.warnings`
- `result.diagnostics.errors`
- `result.diagnostics.timings`
- `result.diagnostics.modelUsage`
- `result.artifacts.report`

## Useful questions

- Did the input items have stable IDs and meaningful titles?
- Did the local path scan include files you did not expect?
- Are semantic edges doing work that should actually be deterministic?
- Did the graph contain nodes but no meaningful cross-source relationships?

## Fast debugging loop

1. Start from `examples:from-texts` or `examples:llm-mock`.
2. Inspect `report` and `graph.stats`.
3. Run `query.path(...)` and `query.neighbors(...)` against the nodes you care about.
4. Only then modify extraction or semantic logic.
