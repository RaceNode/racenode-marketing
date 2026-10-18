// The catalog for the build (Node), kept apart from contract.mjs, which the visitor's browser loads too.
import { catalogSource, sanitize } from './contract.mjs';
import { circuits, featuredYear } from './model.mjs';
import { loadLogos, venueLogos } from './logos.mjs';
import { LIVE_API } from './relay.mjs';
import { calendarOf, circuitPageSlugs, countriesOf } from './render.mjs';

/**
 * Waits between attempts at the catalog: a passing 5xx or timeout (PGRST002 while PostgREST reloads its schema cache,
 * a slow cold start) costs a few seconds instead of the deploy; about a minute of waiting in all, then the build fails.
 */
export const RETRY_DELAYS_MS = [3000, 8000, 15000, 30000];
const ATTEMPT_TIMEOUT_MS = 20000;

/** Worth another try: a 5xx, a 408/429, a timeout or a network error. A 4xx (missing view, bad key) is not. */
export function transient(e) {
  if (e?.status) return e.status >= 500 || e.status === 408 || e.status === 429;
  return true;
}

async function fetchWithRetry({ read, url, key }, delays) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await read(url, key, {
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        logos: true,
      });
    } catch (e) {
      if (attempt >= delays.length || !transient(e)) throw e;
      console.warn(
        `${String(e).slice(0, 200)}; retrying in ${delays[attempt] / 1000}s (${attempt + 1}/${delays.length})`,
      );
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
}

/**
 * The catalog for this build, from the motorsport-data API (MOTORSPORT_DATA_API_KEY: catalogSource in contract.mjs).
 * The server's key never reaches a page. A failure that outlasts
 * the retries fails the build, so Cloudflare keeps the last good deploy online. `CALENDAR_SAMPLE=1` (preview env, never production) falls
 * back to sample data, a real extract kept in the repo, flagged so pages say so and are not indexed: when the
 * variables are missing, or when the catalog does not answer.
 */
export async function loadCatalog(env, { delays = RETRY_DELAYS_MS } = {}) {
  const source = catalogSource(env);
  const allowSample = env.CALENDAR_SAMPLE === '1';
  if (source) {
    try {
      return { sample: false, ...(await fetchWithRetry(source, delays)) };
    } catch (e) {
      if (!allowSample) throw e;
      console.warn(`${String(e).slice(0, 200)}; sample data instead (preview)`);
    }
  } else if (!allowSample) {
    throw new Error(
      'calendar: MOTORSPORT_DATA_API_KEY missing (the motorsport-data API is the only catalog source); refusing to publish sample data',
    );
  }
  const { default: sample } = await import('../../data/calendar/sample.json', {
    with: { type: 'json' },
  });
  return { sample: true, ...sanitize(sample) };
}

/** Where a preview's browser reads the sample (src/pages/calendar/sample-api/): the relay's answer, as a static file. */
export const SAMPLE_API = '/calendar/sample-api/catalog.json';

let cached;
/**
 * One load per build, shared by every calendar page: the catalog, the calendar for the build's featured year, and
 * the render context (ctx) of render.mjs (featured year, the build's day, country names, circuits with a page, which
 * championships and circuits have a logo), the same the browser gets
 * back through liveConfig().
 */
export const catalog = () =>
  (cached ??= loadCatalog(process.env).then(async (data) => {
    const now = new Date();
    // Logos the site hosts (logos.mjs): the pages know which championships have one (ctx.logos: slug → tone, the
    // browser's render reads the same), the files are served by src/pages/calendar/logos/[slug].webp.ts.
    const logoFiles = await loadLogos(data.series);
    const ctx = {
      year: featuredYear(now),
      today: now.toISOString().slice(0, 10),
      countries: countriesOf(data),
      logos: Object.fromEntries([...logoFiles].map(([slug, l]) => [slug, l.tone])),
      // The rows keep a column for the logo (the few without one stay aligned with the others) once any exists.
      logoColumn: logoFiles.size > 0,
    };
    const cal = calendarOf(data, ctx);
    ctx.circuitPages = circuitPageSlugs(cal);
    // /calendar/circuits/ is the circuits' index: a championship with that slug would take its URL.
    if (cal.championships.some((c) => c.slug === 'circuits'))
      throw new Error(
        'calendar: a series has the slug "circuits", reserved for /calendar/circuits/',
      );
    // The circuits' logos, the same way (served by src/pages/calendar/logos/circuits/[slug].webp.ts): ctx.circuitLogos
    // maps the catalog's venue_slug to the circuit's own slug, the only thing a path is built from, and its tone.
    const all = circuits(cal);
    const circuitLogoFiles = await loadLogos(venueLogos(all));
    ctx.circuitLogos = Object.fromEntries(
      all
        .filter((c) => circuitLogoFiles.has(c.slug))
        .map((c) => [c.venue_slug, { slug: c.slug, tone: circuitLogoFiles.get(c.slug).tone }]),
    );
    return { data, ctx, cal, logoFiles, circuitLogoFiles };
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
