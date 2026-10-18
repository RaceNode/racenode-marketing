// In the visitor's browser: asks the site's relay for the catalog again and updates what changed since the morning
// build. The page is complete without it (no JavaScript, relay or Supabase down: the build's version stays, nothing
// visible fails).
// The browser renders with the same functions as the build (render.mjs) and compares hashes, so on most visits it
// finds nothing new and does not touch the page at all; it only replaces a part whose render differs.
import { fetchLive } from './contract.mjs';
import { calendarOf, championshipBody, hash } from './render.mjs';

const TIMEOUT_MS = 8000;

/**
 * 'updated' | 'same' | 'empty' (the relay answered nothing usable). Throws on a network or HTTP error; the caller
 * swallows it. `cfg` is what the build wrote in #calendar-live-config: api, year, today, countries, slug (the
 * championship of the page; only championship pages refresh).
 */
export async function refresh(doc, cfg) {
  const data = await fetchLive(cfg.api, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    series: cfg.slug,
  });
  if (!data.series.length || !data.events.length) return 'empty';
  const html = championshipBody(calendarOf(data, cfg), cfg.slug, cfg);
  const el = doc.querySelector('[data-calendar-live="body"]');
  if (!el || !html) return 'same';
  const h = hash(html);
  if (el.dataset.hash === h) return 'same';
  el.innerHTML = html;
  el.dataset.hash = h;
  doc.dispatchEvent(new CustomEvent('calendar:updated'));
  return 'updated';
}
