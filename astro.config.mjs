// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { site } from './src/site.config';

// https://astro.build/config
export default defineConfig({
  site: site.url,
  // Analytics brick of the WBLT site template (src/analytics): the tool and its key.
  env: {
    schema: {
      /** Measurement tool. Absent: none (dev). PostHog makes the consent banner appear. */
      ANALYTICS_PROVIDER: envField.enum({
        context: 'client',
        access: 'public',
        values: ['cloudflare', 'ga4', 'gtm', 'plausible', 'posthog'],
        optional: true,
      }),
      /** Identifier of the chosen tool: exactly one of these is required. */
      GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      GTM_CONTAINER_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PLAUSIBLE_DOMAIN: envField.string({ context: 'client', access: 'public', optional: true }),
      CF_ANALYTICS_TOKEN: envField.string({ context: 'client', access: 'public', optional: true }),
      /** PostHog project key (publishable), the same project as the app. */
      PUBLIC_POSTHOG_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
});
