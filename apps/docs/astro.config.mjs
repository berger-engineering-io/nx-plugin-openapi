// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  outDir: '../../dist/apps/docs',
  integrations: [
    starlight({
      title: 'Nx Plugin OpenAPI',
      description:
        'Generate type-safe API clients from OpenAPI specs in your Nx workspace',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/berger-engineering-io/nx-plugin-openapi',
        },
      ],
      sidebar: [
        { label: 'Getting Started', slug: 'getting-started' },
        {
          label: 'Plugins',
          items: [
            { label: 'OpenAPI Generator', slug: 'plugins/plugin-openapi' },
            { label: 'hey-api', slug: 'plugins/plugin-hey-api' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Configuration', slug: 'reference/configuration' },
          ],
        },
        {
          label: 'Guides',
          items: [
            {
              label: 'Creating Custom Plugins',
              slug: 'guides/creating-plugins',
            },
          ],
        },
        {
          label: 'Legacy Plugin',
          items: [
            { label: 'Overview', slug: 'legacy-nx-plugin/overview' },
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
