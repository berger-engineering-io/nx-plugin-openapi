// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Nx Plugin OpenAPI',
      description:
        'Nx Plugin for seamless integration of OpenAPI Generator Angular client',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/berger-engineering-io/nx-plugin-openapi',
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', slug: 'getting-started/overview' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
          ],
        },
        {
          label: 'Usage',
          items: [
            { label: 'Configuration', slug: 'usage/configuration' },
            { label: 'Examples', slug: 'usage/examples' },
            { label: 'Nx Integration', slug: 'usage/nx-integration' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'generate-api executor', slug: 'reference/generate-api' },
          ],
        },
        {
          label: 'Roadmap',
          items: [{ label: 'Roadmap', slug: 'roadmap/roadmap' }],
        },
      ],
    }),
  ],
});
