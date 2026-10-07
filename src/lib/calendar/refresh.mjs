// In the visitor's browser: reads the catalog views again and updates what changed since the morning build. The
// page is complete without it (no JavaScript, Supabase down: the build's version stays, nothing visible fails).
// The browser renders with the same functions as the build (render.mjs) and compares hashes, so on most visits it
// finds nothing new and does not touch the page at all; it only replaces a part whose render differs.
import { fetchCatalog } from './contract.mjs';
import { calendarOf, championshipBody, circuitBody, hash, indexBody, indexSummary } from './render.mjs';

const TIMEOUT_MS = 8000;

/**
 * 'updated' | 'same' | 'empty' (the views answered nothing usable). Throws on a network or HTTP error; the caller
 * swallows it. `cfg` is what the build wrote in #calendar-live-config: url, key, year, today, countries, slug (pages of
 * one championship), circuit (pages of one circuit: they read the whole catalog, every championship may race there).
 */
export async function refresh(doc, cfg) {
  const data = await fetchCatalog(cfg.url, cfg.key, { signal: AbortSignal.timeout(TIMEOUT_MS), series: cfg.slug ?? undefined });
  if (!data.series.length || !data.events.length) return 'empty';
  const cal = calendarOf(data, cfg);
  const parts = cfg.slug
    ? { body: championshipBody(cal, cfg.slug, cfg) }
    : cfg.circuit
      ? { body: circuitBody(cal, cfg.circuit, cfg) }
      : { summary: indexSummary(cal), body: indexBody(cal, cfg) };
  let changed = false;
  for (const [name, html] of Object.entries(parts)) {
    const el = doc.querySelector(`[data-calendar-live="${name}"]`);
    if (!el || !html) continue;
    const h = hash(html);
    if (el.dataset.hash === h) continue;
    el.innerHTML = html;
    el.dataset.hash = h;
    changed = true;
  }
  if (changed) doc.dispatchEvent(new CustomEvent('calendar:updated'));
  return changed ? 'updated' : 'same';
}
