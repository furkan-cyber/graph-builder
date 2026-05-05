# Core API

## `graphBuilder(input, options?)`

Build a graph from any supported input type.

## `graphBuilder.build(input, options?)`

Named equivalent of the callable root export.

## `graphBuilder.fromTexts(items, options?)`

Use this when you already hold normalized text records in memory.

## `graphBuilder.fromProvider(provider, options?)`

Use this when content must be loaded lazily from another system.

## `graphBuilder.updateGraph(previous, update, options?)`

Apply source-item upserts and deletes to an existing graph.

## `graphBuilder.loadGraph(value)`

Restore a graph or serialized result into a fully queryable result object.

## `createGraphBuilder(config?)`

Create an instance with package-level defaults such as default artifact kinds.
