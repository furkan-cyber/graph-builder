# Query Helpers

The result query helpers are designed for lightweight graph exploration in app code.

- `getNode(query)`
- `query(question, { depth, maxSeeds })`
- `path(source, target)`
- `neighbors(node)`
- `community(id)`

These helpers operate on the in-memory graph returned by the package. They are not a substitute for a separate graph database when you need persistent multi-tenant query infrastructure.
