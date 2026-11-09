import { defineConfig } from '@inlang/paraglide-js';

import { defaultLocale, hasPrefix, locales, prefixed, site, type Locale } from '../src/site.config';

/**
 * Paraglide compiler options, shared by the Vite plugin and the CLI.
 *
 * Routing model, with several languages all prefixed: every page lives
 * under `/<locale>/…`, including the default language. The URL is the source of
 * truth for the current locale; a request without a locale prefix (the root)
 * is redirected according to the visitor's `Accept-Language`, then to the
 * base locale: by the Worker on Cloudflare, by `.htaccess` on a static
 * hosting. Pages are prerendered, so apart from that redirect only the URL
 * decides; a static hosting has no runtime, its strategy is the URL alone.
 *
 * With the default language at the root (`prefixDefaultLocale: false`, or
 * one language), the root is its home page and nothing redirects to a
 * language: a URL without a prefix is in the default language. The prefixed
 * patterns come first, the root one last, as it matches every path.
 */
export default defineConfig({
  strategy:
    prefixed && site.hosting === 'cloudflare'
      ? ['url', 'preferredLanguage', 'baseLocale']
      : ['url', 'baseLocale'],
  urlPatterns: [
    {
      pattern: '/:path(.*)?',
      localized: [
        ...locales
          .filter(hasPrefix)
          .map((locale): [Locale, string] => [locale, `/${locale}/:path(.*)?`]),
        ...(prefixed ? [] : [[defaultLocale, '/:path(.*)?'] satisfies [Locale, string]]),
      ],
    },
  ],
  trailingSlash: 'always',
  // Routes that are not pages: never redirect them to a localized URL.
  routeStrategies: [
    { match: '/api/:path(.*)?', exclude: true },
    { match: '/_astro/:path(.*)?', exclude: true },
    { match: '/_image', exclude: true },
    { match: '/:file(.*\\.[a-zA-Z0-9]+)', exclude: true },
  ],
  emitTsDeclarations: true,
  emitGitIgnore: false,
  emitPrettierIgnore: false,
});
