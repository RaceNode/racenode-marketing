// The championship pages, rendered on request, are unknown to @astrojs/sitemap (it lists built pages only): this
// sitemap lists them from the live catalog, and the main sitemap index points to it (astro.config.mjs).
import type { APIRoute } from 'astro';
import { derived, liveCatalog } from '../../lib/calendar/live.mjs';
import { buildCalendar } from '../../lib/calendar/model.mjs';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const live = await liveCatalog((locals as any).cfContext);
  const cal = derived(live.data, 'calendar', () => buildCalendar(live.data));
  // A sample catalog (previews) is not indexed: no URL to offer.
  const urls = live.data.sample ? [] : cal.championships.map((c: any) => {
    const checked = c.shown.last_checked_at ? `<lastmod>${new Date(c.shown.last_checked_at).toISOString().slice(0, 10)}</lastmod>` : '';
    return `<url><loc>https://www.racenode.com/calendar/${c.slug}/</loc>${checked}</url>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
