// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.racenode.com',
  // Every page is prerendered except the race calendar (src/pages/calendar/), rendered on request by a Cloudflare
  // worker that reads the catalog's public views: see src/lib/calendar/live.mjs and
  // scripts/pages/assemble.mjs (Cloudflare Pages: _worker.js + _routes.json).
  adapter: cloudflare({ imageService: 'compile' }),
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      // The championship pages are rendered on request: their own sitemap, from the live catalog.
      customSitemaps: ['https://www.racenode.com/calendar/sitemap.xml'],
    })
  ]
});