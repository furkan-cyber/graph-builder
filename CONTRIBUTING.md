# Contributing

Thanks for contributing to Graph Builder.

## Development setup

Requirements:
- Node.js 18.17+
- npm 10+

Install dependencies:

```sh
npm ci
```

Useful commands:

```sh
npm run test
npm run build
npm run docs:dev
npm run docs:build
npm run examples:from-texts
npm run examples:provider
npm run examples:path
npm run examples:llm-mock
```

## What to include in a pull request

- A focused change with a clear user-facing reason.
- Tests or examples updated when public behavior changes.
- Documentation updates when the API, docs site, or workflow changes.
- Changelog updates for meaningful user-facing additions or breaking changes.

## Coding guidelines

- Keep the deterministic extraction pipeline predictable by default.
- Treat semantic enrichment as optional and additive.
- Preserve narrow package exports and avoid leaking internal-only helpers.
- Prefer small, reviewable patches over broad refactors.

## Before opening a pull request

Run this checklist locally:

```sh
npm run test
npm run build
npm run docs:build
```

If your change touches examples, run the relevant example script as well.

## Reporting issues

Use GitHub Issues for bugs, regressions, documentation gaps, and feature requests.
For security problems, follow the private disclosure guidance in SECURITY.md instead of opening a public issue.
