# FAQ

## Is there a CLI?

Not yet. The package is intentionally API-first in the initial open source release.

## Do I need an LLM to use Graph Builder?

No. The base pipeline is deterministic. Semantic enrichment is optional.

## Does it support browser runtimes?

The root package is runtime-agnostic for in-memory records and providers. Local path traversal lives under the Node-only `./node` entry.

## Can I persist the graph?

Yes. Use `result.toJSON()` or `result.artifacts.json`, then restore it with `graphBuilder.loadGraph(...)`.

## Why are artifacts returned in memory instead of being written automatically?

Because persistence policy belongs to the caller. Different apps want different storage and retention behavior.
