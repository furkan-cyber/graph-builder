# Artifact API

Graph Builder can emit:

- JSON through `serializeGraph(...)` or `result.artifacts.json`
- Markdown report through `generateReport(...)`
- Wiki files through `generateWiki(...)`
- HTML visualization through `generateHtml(...)`

Use the raw helper functions when you already have a graph. Use `options.artifacts` when you want the package to build them as part of the run.
