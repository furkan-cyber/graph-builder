# Artifacts

Artifacts let you keep one graph pipeline while producing multiple output shapes.

## Supported artifact kinds

- `json` for serialization and programmatic consumption.
- `report` for a human-readable markdown summary.
- `wiki` for a small file-based knowledge pack grouped by communities.
- `html` for a quick interactive visualization.

## Requesting artifacts

```ts
const result = await graphBuilder.fromTexts(records, {
  artifacts: ["json", "report", "wiki", "html"]
});
```

Artifacts are returned in memory. Persisting them to disk or cloud storage stays the caller's responsibility.
