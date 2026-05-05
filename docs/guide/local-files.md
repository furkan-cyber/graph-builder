# Local Files

Use the Node.js entry point when your graph starts from a directory on disk.

## Fast path

```ts
import { graphBuilder } from "@cognipeer/graph-builder";

const result = await graphBuilder("./docs");
```

## What the local provider does

- Walks the target directory.
- Skips common generated directories and lockfiles.
- Reads text-like extensions such as markdown, code, JSON, YAML, and plain text.
- Produces stable source descriptors with `path`, `hash`, and `storageRef` metadata.

## Ignore rules

By default the local provider looks for `.graph-builderignore` in the root path. Use it to exclude generated content, large snapshots, or private source files from the graph input set.
