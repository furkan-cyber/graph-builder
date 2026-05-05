# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

### Added
- Added graph timelines, snapshots, latest change sets, and provider `changes(cursor)` incremental updates.
- Added structured JSON/YAML schema extraction and JS/TS structural call and heritage extraction.
- Added timeline, manifest, DOT, GraphML, and Cypher artifacts.
- Added Node output helpers for writing `graph-builder-out` style directories and rebuilding on file changes.

### Changed
- Added dual ESM and CJS outputs for root and subpath exports.
- Added VitePress documentation scaffolding, GitHub workflows, and open source project templates.

## [0.1.0] - 2026-05-05

### Added
- API-first graph building from text arrays, custom providers, and local filesystem paths.
- Query helpers for node lookup, path finding, neighbors, communities, and seeded graph queries.
- Optional semantic enrichment through an OpenAI-compatible chat-completions adapter.
- Incremental graph updates, graph loading, and JSON/report/wiki/HTML artifact generation.
- Memory-fact and to-markdown adapters for integrating non-file content into the graph pipeline.
