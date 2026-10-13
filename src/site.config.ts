/**
 * Site configuration — the single place to describe the client.
 *
 * Everything here is project-specific. Keep this file free of secrets: it is
 * bundled into the public site. Only the settings the site reads so far are
 * taken from the WBLT site template's file of the same name.
 */

/**
 * Where the site is served from. See the template's docs/deployment.md.
 *
 * - `cloudflare`: Cloudflare (here Pages, without the template's `/api/geo`
 *   endpoint: `src/analytics/geo.ts` gets a 404 and the country stays unknown).
 * - `static-php`: a shared web hosting with Apache and PHP (OVH, o2switch…).
 */
export const hostings = ['cloudflare', 'static-php'] as const;
export type Hosting = (typeof hostings)[number];

export const site = {
  hosting: 'cloudflare' as Hosting,
};

export type SiteConfig = typeof site;
