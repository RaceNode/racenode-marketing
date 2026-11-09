// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defaultLocale, locales, site } from './src/site.config';

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
  // As in the WBLT template: the CSS travels in each page, no render-blocking request before the first paint.
  build: {
    inlineStylesheets: 'always',
  },
  // Astro's i18n helpers with routing left to the `[...locale]/` pages and the Paraglide middleware (WBLT template).
  i18n: {
    locales: [...locales],
    defaultLocale,
    routing: 'manual',
  },
  vite: {
    // Compiler options live in `project.inlang/paraglide.config.ts`.
    plugins: [
      tailwindcss(),
      paraglideVitePlugin({ project: './project.inlang', outdir: './src/paraglide' }),
    ],
    optimizeDeps: { include: ['@inlang/paraglide-js/urlpattern-polyfill'] },
  },
  integrations: [
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      // Every page lists its translations (xhtml:link), the same path under each language's prefix.
      // One sitemap per language besides the default one (sitemap-fr-0.xml…), all listed in sitemap-index.xml:
      // Search Console then reports the indexing of each language apart.
      chunks: Object.fromEntries(
        locales
          .filter((locale) => locale !== defaultLocale)
          .map((locale) => [
            locale,
            (item) => (new URL(item.url).pathname.startsWith(`/${locale}/`) ? item : undefined),
          ]),
      ),
      i18n: {
        defaultLocale,
        locales: Object.fromEntries(locales.map((locale) => [locale, locale])),
      },
    }),
  ],
});
