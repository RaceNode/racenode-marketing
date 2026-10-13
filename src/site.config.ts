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
 * - `cloudflare`: Cloudflare Workers with static assets, in the client's account.
 * - `static-php`: a shared web hosting with Apache and PHP (OVH, o2switch…).
 * - `cloudflare-pages`: Cloudflare Pages with Pages Functions (this site). Not
 *   in the template: it has no `/api/geo` endpoint, so `src/analytics/geo.ts`
 *   sends no request and the visitor's country stays unknown.
 */
export const hostings = ['cloudflare', 'static-php', 'cloudflare-pages'] as const;
export type Hosting = (typeof hostings)[number];

export const site = {
  hosting: 'cloudflare-pages' as Hosting,
};

export type SiteConfig = typeof site;
