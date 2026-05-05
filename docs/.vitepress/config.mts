import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Graph Builder',
  description: 'API-first text graph builder for turning documents, code, and provider-backed records into a queryable graph.',
  base: '/graph-builder/',
  ignoreDeadLinks: true,
  appearance: false,
  themeConfig: {
    logo: '/graph-builder-logo.svg',
    siteTitle: 'graph-builder',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Architecture', link: '/guide/architecture' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
      {
        text: 'v0.1.0',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'Contributing', link: '/contributing' },
        ],
      },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/core-concepts' },
            { text: 'Architecture', link: '/guide/architecture' },
          ],
        },
        {
          text: 'Features',
          items: [
            { text: 'Local Files', link: '/guide/local-files' },
            { text: 'Providers', link: '/guide/providers' },
            { text: 'Semantic Enrichment', link: '/guide/semantic-enrichment' },
            { text: 'Querying', link: '/guide/querying' },
            { text: 'Artifacts', link: '/guide/artifacts' },
            { text: 'Incremental Updates', link: '/guide/incremental-updates' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Security & Permissions', link: '/guide/security-permissions' },
            { text: 'Debugging', link: '/guide/debugging' },
            { text: 'FAQ', link: '/guide/faq' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Core API', link: '/api/core' },
            { text: 'Types', link: '/api/types' },
            { text: 'Node Entry', link: '/api/node' },
            { text: 'Adapters', link: '/api/adapters' },
            { text: 'Query Helpers', link: '/api/query' },
            { text: 'Artifacts', link: '/api/artifacts' },
            { text: 'Semantic Surface', link: '/api/semantic' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'From Texts', link: '/examples/from-texts' },
            { text: 'Custom Provider', link: '/examples/custom-provider' },
            { text: 'Local Path', link: '/examples/local-path' },
            { text: 'LLM Semantic', link: '/examples/llm-semantic' },
            { text: 'LLM Mock', link: '/examples/llm-mock' },
            { text: 'Memory Facts', link: '/examples/memory' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Cognipeer/graph-builder' },
    ],
    footer: {
      message: 'Graph Builder is part of the Cognipeer platform.',
      copyright: 'Copyright © 2026 Cognipeer',
    },
    search: {
      provider: 'local',
    },
  },
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@400;500;600;700;800&display=swap' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/graph-builder/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#10755f' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'Graph Builder Documentation' }],
  ],
});
