# Querying

The returned result object exposes query helpers so you do not need a separate graph database just to inspect the extracted graph.

## Helpers

- `getNode(query)` finds the best-matching node by label or path clues.
- `query(question, { depth, maxSeeds })` expands from seed matches into a local subgraph.
- `path(source, target)` returns the shortest path between two matches.
- `neighbors(node)` returns incoming and outgoing relationships.
- `community(id)` returns the nodes assigned to a computed community.

## Example

```ts
const path = result.query.path("Overview", "Guide");
const neighbors = result.query.neighbors("Billing");
const slice = result.query.query("authentication gateway", { depth: 2, maxSeeds: 3 });
```

Use these helpers for product-side exploration, inspection UIs, and lightweight analysis tasks.
