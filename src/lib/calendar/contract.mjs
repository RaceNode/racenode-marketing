// The public race calendar reads the app's championship catalog through three read-only views: series, seasons,
// rounds. Server-side only, with a key that never reaches a page: at build time for the pages Google indexes, and in
// the relay (relay.mjs) the visitor's browser asks for what changed since (refresh.mjs). Only the fields below are
// ever kept: if a view grows a column (raw scrape, logs, anything about a team), the site drops it before a page or
// the relay can show it.
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

async function fetchView(url, key, kind, { signal, series } = {}) {
  const only = series ? `&${kind === 'series' ? 'slug' : 'series_slug'}=eq.${encodeURIComponent(series)}` : '';
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const q = `${url}/rest/v1/${VIEWS[kind]}?select=${FIELDS[kind].join(',')}${only}&order=${ORDER[kind]}&limit=${PAGE}&offset=${offset}`;
    const res = await fetch(q, { headers: { Accept: 'application/json', apikey: key }, signal });
    if (!res.ok) {
      const e = new Error(`calendar: ${VIEWS[kind]} answered ${res.status} ${await res.text()}`);
      e.status = res.status;
      throw e;
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

/** One championship only (its page needs nothing else), or the whole catalog when `series` is not given. */
function only(data, series) {
  if (!series) return data;
  return {
    series: data.series.filter((x) => x.slug === series),
    seasons: data.seasons.filter((x) => x.series_slug === series),
    events: data.events.filter((x) => x.series_slug === series),
  };
}

/**
 * The catalog from the views, server-side (the build, the relay): `key` is the server's, it never reaches a page.
 * `series` keeps one championship only.
 */
export async function fetchCatalog(url, key, { signal, series } = {}) {
  const base = url.replace(/\/$/, '');
  const [s, se, ev] = await Promise.all(['series', 'seasons', 'events'].map((k) => fetchView(base, key, k, { signal, series })));
  return only(sanitize({ series: s, seasons: se, events: ev }), series);
}

/**
 * The catalog in the visitor's browser, from the site's own relay (one same-origin request, no key) or, on a preview
 * built on sample data, from its static copy. The rows are filtered here too, so a source that ignores `series` (the
 * static copy) gives the same result.
 */
export async function fetchLive(api, { signal, series } = {}) {
  const res = await fetch(series ? `${api}?series=${encodeURIComponent(series)}` : api, { headers: { Accept: 'application/json' }, signal });
  if (!res.ok) {
    const e = new Error(`calendar: ${api} answered ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return only(sanitize(await res.json()), series);
}
