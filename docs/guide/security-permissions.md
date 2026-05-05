# Security & Permissions

Graph Builder should not silently ingest everything you can technically read.

## Permission filtering

Use `permissionFilter` when a caller needs to exclude items from the graph before extraction.

```ts
const result = await graphBuilder.fromProvider(provider, {
  permissionFilter(item) {
    return item.storageRef?.permissionKey !== 'restricted';
  }
});
```

## Source hygiene

- Prefer stable IDs over opaque hashes when possible.
- Use `.graph-builderignore` for local scans.
- Avoid feeding secrets, credentials, or private operational text into semantic enrichment providers unless that is an explicit product decision.
- Keep file output explicit; Graph Builder does not write artifacts unless you do.
