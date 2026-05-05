# Incremental Updates

Rebuilding the whole corpus is not always necessary.

## Update an existing graph

```ts
const updated = await graphBuilder.updateGraph(previousResult, {
  upsert: [nextItem],
  deleteSourceItemIds: ["docs/old.md"]
});
```

## Load a serialized graph

```ts
const restored = graphBuilder.loadGraph(serializedResult);
```

## When incremental mode helps

- Source systems emit changed records one at a time.
- You want short feedback loops in background sync jobs.
- A user edits a subset of documents and you only need to refresh those source items.
