# Providers

Providers are the main extension surface when your content does not live on disk.

## Contract

A provider needs two capabilities:
- `list()` to enumerate source descriptors.
- `read(item)` to turn a descriptor into one or more `GraphBuilderTextItem` records.

## Minimal provider

```ts
import { graphBuilder, type GraphBuilderProvider } from "@cognipeer/graph-builder";

const provider: GraphBuilderProvider<{ id: string }> = {
  name: "db-provider",
  async *list() {
    yield { id: "1" };
  },
  async read(item) {
    return {
      id: item.id,
      title: `Record ${item.id}`,
      text: `# Record ${item.id}\n\nProvider-backed content.`
    };
  }
};

const result = await graphBuilder.fromProvider(provider);
```

## Provider guidance

- Keep descriptor IDs stable across runs.
- Populate `path`, `url`, or `storageRef` when possible.
- Use one source item per independently updateable unit of content.
- Reserve `changes()` for future incremental or sync-specific workflows.
