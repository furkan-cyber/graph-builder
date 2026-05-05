# Documentation

The docs site is powered by VitePress and organized by workflow instead of internal source folders.

## Navigation cheat sheet

- `guide/` for onboarding, architecture, providers, semantic enrichment, artifacts, and operational guidance.
- `api/` for the public package surface: root entry points, types, adapters, query helpers, and node-specific exports.
- `examples/` for runnable patterns mapped to the repository's example scripts.
- `changelog.md` for release notes.
- `contributing.md` for development and pull request guidance.

If you want the rendered site locally, run:

```sh
npm run docs:dev
```
