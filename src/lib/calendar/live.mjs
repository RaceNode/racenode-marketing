// The catalog for a request, on the Cloudflare worker that renders /calendar/*. Four layers, so a visitor almost
// never waits for Supabase and never gets an error page because Supabase is down:
// 1. the isolate's memory (one worker instance serves many requests);
// 2. the Cache API of the data centre, holding the last good copy for a week;
// 3. the live views (contract.mjs), read when the copy is older than FRESH_MS;
// 4. a copy taken at build time, for a data centre with no copy at all while the views do not answer.
// A stale copy is served at once and refreshed in the background (stale-while-revalidate). If the refresh fails,
// the stale copy keeps being served; only a deploy built without the views, in a data centre with no copy, while Supabase is down, returns an error.
import { env } from 'cloudflare:workers';
import { loadCatalog } from './contract.mjs';
// Last resort, taken at build time (scripts/calendar/snapshot.mjs); null when the build could not read the views.
import snapshot from '../../data/calendar/snapshot.json';

// CALENDAR_FRESH_S overrides it, for tests of the refresh and of an outage.
const FRESH_MS = Number(env.CALENDAR_FRESH_S ?? 900) * 1000;
const KEEP_S = 7 * 24 * 3600;
const TIMEOUT_MS = 5000;
// Not a public URL: the Cache API key of the copy. Bump the version when the contract's shape changes.
const KEY = 'https://calendar-cache.racenode.internal/catalog/v1';

let memory; // { data, fetchedAt }

async function fromCache() {
  try {
    const res = await caches.default.match(KEY);
    if (!res) return null;
    return { data: await res.json(), fetchedAt: Number(res.headers.get('x-fetched-at')) };
  } catch {
    return null;
  }
}

async function refresh() {
  // A real abort, not a race: a request left hanging would keep the refresh pending.
  const data = await loadCatalog(env, { allowSample: env.CALENDAR_SAMPLE === '1', signal: AbortSignal.timeout(TIMEOUT_MS) });
  const copy = { data, fetchedAt: Date.now() };
  memory = copy;
  try {
    await caches.default.put(
      KEY,
      new Response(JSON.stringify(data), {
        headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${KEEP_S}`, 'x-fetched-at': String(copy.fetchedAt) },
      }),
    );
  } catch {
    // No Cache API here (local dev): memory still holds the copy.
  }
  return copy;
}

// One background refresh at a time per isolate. A timestamp, not a shared promise: a promise started by one request
// can stay pending forever once that request is over, and would block every refresh after it (seen in testing).
let refreshingSince = 0;

/**
 * { data, fetchedAt, source }: source is memory | cache | live | stale, sent back in a response header so the
 * cache can be watched from outside.
 */
export async function liveCatalog(ctx) {
  const now = Date.now();
  if (memory && now - memory.fetchedAt < FRESH_MS) return { ...memory, source: 'memory' };

  // Another isolate of this data centre may have refreshed the shared copy already.
  const shared = await fromCache();
  const cached = shared && (!memory || shared.fetchedAt > memory.fetchedAt) ? shared : memory;
  if (cached && now - cached.fetchedAt < FRESH_MS) {
    memory = cached;
    return { ...cached, source: 'cache' };
  }
  if (cached) {
    memory = cached;
    if (now - refreshingSince > TIMEOUT_MS * 2) {
      refreshingSince = now;
      ctx?.waitUntil?.(refresh().catch((e) => console.error(String(e))));
    }
    return { ...cached, source: 'stale' };
  }
  try {
    return { ...(await refresh()), source: 'live' };
  } catch (e) {
    if (!snapshot) throw e;
    console.error(String(e));
    memory = snapshot; // stale by now: the next requests retry the views in the background
    return { ...snapshot, source: 'snapshot' };
  }
}

const derivedCache = new WeakMap();
/**
 * What a page computes from the catalog, computed once per copy of it: the isolate keeps it until the next refresh,
 * so most renders skip the model and the hundreds of rows (CPU is what the Workers Free plan counts, 10 ms a request).
 */
export function derived(data, key, compute) {
  if (!derivedCache.has(data)) derivedCache.set(data, new Map());
  const m = derivedCache.get(data);
  if (!m.has(key)) m.set(key, compute());
  return m.get(key);
}
