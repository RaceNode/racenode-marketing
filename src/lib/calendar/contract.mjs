// The public race calendar reads the app's championship catalog on request (live.mjs), through three views the app opens
// to `anon` (read-only, publishable key): series, seasons, rounds. Only the fields below are ever kept: if a view
// grows a column (raw scrape, logs, anything about a team), the site drops it before a page can show it.
//
// Rules (Willi, 2026-10-07): dates and venues are publishable facts; no organizer logo or document, we link to the
// organizer's own page; never team data, raw scrapes or logs.

export const VIEWS = {
  series: 'catalog_public_series',
  seasons: 'catalog_public_seasons',
  events: 'catalog_public_events',
};

export const FIELDS = {
  series: ['slug', 'name', 'short_name', 'discipline', 'region', 'country_code', 'website_url', 'organizer_name', 'organizer_website_url'],
  seasons: ['series_slug', 'label', 'year', 'calendar_status', 'source_url', 'last_checked_at', 'event_count'],
  events: ['series_slug', 'season_label', 'season_year', 'round_number', 'round_label', 'sub_label', 'name', 'kind', 'start_date', 'end_date', 'status', 'url', 'venue_slug', 'venue_name', 'venue_country_code', 'venue_timezone'],
};

const ORDER = {
  series: 'slug',
  seasons: 'series_slug,year',
  events: 'series_slug,start_date',
};

/** Keeps the contract's fields and nothing else; a removed round never reaches a page. */
export function sanitize(data) {
  const pick = (kind) => (row) => Object.fromEntries(FIELDS[kind].map((f) => [f, row[f] ?? null]));
  return {
    series: (data.series ?? []).map(pick('series')),
    seasons: (data.seasons ?? []).map(pick('seasons')),
    events: (data.events ?? []).filter((e) => e.status === 'scheduled' || e.status === 'cancelled').map(pick('events')),
  };
}

const PAGE = 1000;

async function fetchView(url, key, kind, signal) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const q = `${url}/rest/v1/${VIEWS[kind]}?select=${FIELDS[kind].join(',')}&order=${ORDER[kind]}&limit=${PAGE}&offset=${offset}`;
    const res = await fetch(q, { headers: { apikey: key, Accept: 'application/json' }, signal });
    if (!res.ok) throw new Error(`calendar: ${VIEWS[kind]} answered ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

/**
 * The catalog, from the live views when CATALOG_SUPABASE_URL + CATALOG_SUPABASE_KEY are set; a failure throws
 * (live.mjs then serves its last good copy). `allowSample` (previews only, CALENDAR_SAMPLE=1) falls back to sample
 * data, a real extract kept in the repo, flagged so pages say so and are not indexed: when the variables are missing,
 * or when the views do not answer (before the app's #197 reaches production, they answer PGRST205).
 */
export async function loadCatalog(env, { allowSample = false, signal } = {}) {
  const url = env.CATALOG_SUPABASE_URL;
  const key = env.CATALOG_SUPABASE_KEY;
  if (url && key) {
    try {
      const [series, seasons, events] = await Promise.all(['series', 'seasons', 'events'].map((k) => fetchView(url.replace(/\/$/, ''), key, k, signal)));
      return { sample: false, ...sanitize({ series, seasons, events }) };
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
