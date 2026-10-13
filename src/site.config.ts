/**
 * The few site settings the analytics brick of the WBLT site template reads
 * (src/analytics/geo.ts). Not the template's Workers hosting: this site is on
 * Cloudflare Pages without the `/api/geo` endpoint, so the visitor's country
 * stays unknown (no request, nothing stored).
 */
export const site = {
  hosting: 'cloudflare-pages' as string,
};
