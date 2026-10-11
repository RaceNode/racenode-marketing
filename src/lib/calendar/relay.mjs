// The relay between the visitor's browser and the catalog views (a Pages Function: functions/calendar/api/catalog.js).
// The browser never talks to the database: the relay reads the views with the server's key and answers the one
// question a calendar page asks (the whole catalog, or one championship), from the edge cache when it can. It is
// no more open than the pages themselves, and makes bulk downloads slow: same-origin requests only, a per-IP
// budget, fixed queries (no filter, column or ordering of the caller's choosing).
import { fetchCatalog } from './contract.mjs';

/** Where the browser asks (liveConfig in build.mjs). */
export const LIVE_API = '/calendar/api/catalog';

/** How long an answer is served from the edge cache (and the visitor's browser) before the views are read again. */
export const CACHE_SECONDS = 300;
/** Requests per IP and per minute. A visitor sends one per calendar page; a crawler of the relay soon waits. */
export const IP_BUDGET = 30;
const WINDOW_MS = 60_000;
const UPSTREAM_TIMEOUT_MS = 8000;
const SERIES = /^[a-z0-9][a-z0-9-]{0,79}$/;

/**
 * A per-IP budget over a fixed one-minute window. It lives in the isolate's memory (Pages Functions have no rate-limit
 * binding, and the free plan rules out Durable Objects): a burst from one address meets it, a crawler spread across
 * many addresses or data centres only partly.
 */
export function ipBudget({ limit = IP_BUDGET, windowMs = WINDOW_MS, now = Date.now } = {}) {
  const hits = new Map();
  return (ip) => {
    const t = now();
    let h = hits.get(ip);
    if (!h || t - h.start >= windowMs) {
      if (hits.size > 10_000) hits.clear();
      h = { start: t, count: 0 };
      hits.set(ip, h);
    }
    h.count += 1;
    return h.count <= limit;
  };
}

const json = (body, status, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-robots-tag': 'noindex', 'cache-control': 'no-store', ...headers },
  });

/**
 * Answers one browser request. `cache` is the edge cache (caches.default) or null, `allow` the IP budget, `waitUntil`
 * keeps the cache write alive after the answer, `read` the views (fetchCatalog; tests replace it).
 */
export async function relay(request, env, { cache = null, allow = () => true, waitUntil = () => {}, read = fetchCatalog } = {}) {
  // Browsers say where a request comes from; a script that does not bother to pretend is turned away here.
  if (request.headers.get('sec-fetch-site') !== 'same-origin') return json({ error: 'same-origin only' }, 403);

  const url = new URL(request.url);
  const series = url.searchParams.get('series');
  if ([...url.searchParams.keys()].some((k) => k !== 'series') || (series !== null && !SERIES.test(series))) {
    return json({ error: 'bad query' }, 400);
  }

  if (!allow(request.headers.get('cf-connecting-ip') ?? 'unknown')) {
    return json({ error: 'too many requests' }, 429, { 'retry-after': String(WINDOW_MS / 1000) });
  }

  // One cache entry per question, whatever else the request carried.
  const key = new Request(`${url.origin}${LIVE_API}${series ? `?series=${series}` : ''}`);
  const hit = cache && (await cache.match(key));
  if (hit) return hit;

  if (!env.CATALOG_SUPABASE_URL || !env.CATALOG_SUPABASE_KEY) return json({ error: 'not configured' }, 503);
  let data;
  try {
    data = await read(env.CATALOG_SUPABASE_URL, env.CATALOG_SUPABASE_KEY, {
      series: series ?? undefined,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    // The page keeps the build's version; nothing about the database reaches the caller.
    return json({ error: 'catalog unavailable' }, 502);
  }
  const res = json(data, 200, { 'cache-control': `public, max-age=${CACHE_SECONDS}` });
  if (cache) waitUntil(cache.put(key, res.clone()));
  return res;
}
