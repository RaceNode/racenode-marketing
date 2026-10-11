// The catalog for the build (Node), kept apart from contract.mjs, which the visitor's browser loads too.
import { fetchCatalog, sanitize } from './contract.mjs';
import { featuredYear } from './model.mjs';
import { LIVE_API } from './relay.mjs';
import { calendarOf, circuitPageSlugs, countriesOf } from './render.mjs';

/**
 * Waits between attempts at the views: a passing 5xx or timeout (PGRST002 while PostgREST reloads its schema cache,
 * a slow cold start) costs a few seconds instead of the deploy; about a minute of waiting in all, then the build fails.
 */
export const RETRY_DELAYS_MS = [3000, 8000, 15000, 30000];
const ATTEMPT_TIMEOUT_MS = 20000;

/** Worth another try: a 5xx, a 408/429, a timeout or a network error. A 4xx (missing view, bad key) is not. */
export function transient(e) {
  if (e?.status) return e.status >= 500 || e.status === 408 || e.status === 429;
  return true;
}

async function fetchWithRetry(url, key, delays) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchCatalog(url, key, { signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
    } catch (e) {
      if (attempt >= delays.length || !transient(e)) throw e;
      console.warn(`${String(e).slice(0, 200)}; retrying in ${delays[attempt] / 1000}s (${attempt + 1}/${delays.length})`);
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
}

/**
 * The catalog for this build, from the views (CATALOG_SUPABASE_URL + CATALOG_SUPABASE_KEY, the server's key: it
 * never reaches a page). A failure that outlasts
 * the retries fails the build, so Cloudflare keeps the last good deploy online. `CALENDAR_SAMPLE=1` (preview env, never production) falls
 * back to sample data, a real extract kept in the repo, flagged so pages say so and are not indexed: when the
 * variables are missing, or when the views do not answer (before the app's #197 reaches production: PGRST205).
 */
export async function loadCatalog(env, { delays = RETRY_DELAYS_MS } = {}) {
  const url = env.CATALOG_SUPABASE_URL;
  const key = env.CATALOG_SUPABASE_KEY;
  const allowSample = env.CALENDAR_SAMPLE === '1';
  if (url && key) {
    try {
      return { sample: false, ...(await fetchWithRetry(url, key, delays)) };
    } catch (e) {
      if (!allowSample) throw e;
      console.warn(`${String(e).slice(0, 200)}; sample data instead (preview)`);
    }
  } else if (!allowSample) {
    throw new Error('calendar: CATALOG_SUPABASE_URL and CATALOG_SUPABASE_KEY are missing; refusing to publish sample data');
  }
  const { default: sample } = await import('../../data/calendar/sample.json', { with: { type: 'json' } });
  return { sample: true, ...sanitize(sample) };
}

/** Where a preview's browser reads the sample (src/pages/calendar/sample-api/): the relay's answer, as a static file. */
export const SAMPLE_API = '/calendar/sample-api/catalog.json';

let cached;
/**
 * One load per build, shared by every calendar page: the catalog, the calendar for the build's featured year, and
 * the render context (ctx) of render.mjs (featured year, the build's day, country names, circuits with a page), the same the browser gets
 * back through liveConfig().
 */
export const catalog = () =>
  (cached ??= loadCatalog(process.env).then((data) => {
    const now = new Date();
    const ctx = { year: featuredYear(now), today: now.toISOString().slice(0, 10), countries: countriesOf(data) };
    const cal = calendarOf(data, ctx);
    ctx.circuitPages = circuitPageSlugs(cal);
    // /calendar/circuits/ is the circuits' index: a championship with that slug would take its URL.
    if (cal.championships.some((c) => c.slug === 'circuits')) throw new Error('calendar: a series has the slug "circuits", reserved for /calendar/circuits/');
    return { data, ctx, cal };
  }));

/**
 * What a page hands its browser to read the catalog again (LiveRefresh.astro): where to ask (the site's relay; a
 * preview on sample data gets the static sample copy instead) and the render context. Never a database URL or key.
 */
export function liveConfig({ data, ctx }, { slug = null, circuit = null } = {}) {
  return {
    api: data.sample ? SAMPLE_API : LIVE_API,
    ...ctx,
    slug,
    circuit,
  };
}
