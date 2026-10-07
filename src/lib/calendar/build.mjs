// The catalog for the build (Node), kept apart from contract.mjs, which the visitor's browser loads too.
import { fetchCatalog, sanitize } from './contract.mjs';
import { featuredYear } from './model.mjs';
import { calendarOf, circuitPageSlugs, countriesOf } from './render.mjs';

/**
 * The catalog for this build, from the views (CATALOG_SUPABASE_URL + CATALOG_SUPABASE_KEY). A failure fails the
 * build, so Cloudflare keeps the last good deploy online. `CALENDAR_SAMPLE=1` (preview env, never production) falls
 * back to sample data, a real extract kept in the repo, flagged so pages say so and are not indexed: when the
 * variables are missing, or when the views do not answer (before the app's #197 reaches production: PGRST205).
 */
export async function loadCatalog(env) {
  const url = env.CATALOG_SUPABASE_URL;
  const key = env.CATALOG_SUPABASE_KEY;
  const allowSample = env.CALENDAR_SAMPLE === '1';
  if (url && key) {
    try {
      return { sample: false, ...(await fetchCatalog(url, key, { signal: AbortSignal.timeout(30000) })) };
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

/** Where a preview's browser reads the sample (src/pages/calendar/sample-api/): the views' paths, as static files. */
export const SAMPLE_API = '/calendar/sample-api';

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
    ctx.circuitPages = [...circuitPageSlugs(cal)].sort();
    // /calendar/circuits/ is the circuits' index: a championship with that slug would take its URL.
    if (cal.championships.some((c) => c.slug === 'circuits')) throw new Error('calendar: a series has the slug "circuits", reserved for /calendar/circuits/');
    return { data, ctx, cal };
  }));

/**
 * What a page hands its browser to read the views again (LiveRefresh.astro): the publishable URL and key the build
 * used (a preview on sample data gets the static sample API instead), and the render context.
 */
export function liveConfig({ data, ctx }, { slug = null, circuit = null } = {}) {
  return {
    url: data.sample ? SAMPLE_API : process.env.CATALOG_SUPABASE_URL,
    key: data.sample ? 'sample' : process.env.CATALOG_SUPABASE_KEY,
    ...ctx,
    slug,
    circuit,
  };
}
