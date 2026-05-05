import { graphBuilder } from "../src/index.js";

const result = await graphBuilder.fromTexts([
  {
    id: "docs/overview.md",
    title: "Overview",
    path: "docs/overview.md",
    text: `---
tags: [intro, flow]
---
# Overview

Graph Builder builds graphs from text-first content.

See [Guide](guide.md) for more details.
`
  },
  {
    id: "docs/guide.md",
    title: "Guide",
    path: "guide.md",
    text: `# Guide

The guide explains how providers and path-based inputs work.
`
  }
]);

console.log("God nodes:", result.analysis.godNodes);
console.log("Path Overview -> Guide:", result.query.path("Overview", "Guide"));
console.log("Report:\n", result.artifacts.report);