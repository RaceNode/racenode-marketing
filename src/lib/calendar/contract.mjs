// The public race calendar reads the championship catalog (series, seasons, rounds) from the motorsport-data API
// (MOTORSPORT_DATA_API_KEY: catalogSource below). Server-side only, with a key that never reaches a page: at build
// time for the pages Google indexes, and in the relay (relay.mjs) the visitor's browser asks for what changed since
// (refresh.mjs). Only the fields below are ever kept: if the API grows a field (raw scrape, logs, anything about a
// team), the site drops it before a page or the relay can show it.
//
// Rules (Willi, 2026-10-07): dates and venues are publishable facts; no organizer document, we link to the
// organizer's own page; never team data, raw scrapes or logs. Logos (Willi, 2026-10-08, once 80% of the championships
// had one): the official ones, hosted by us (the build downloads them, logos.mjs), never linked from the catalog's
// storage: the logo URLs are read by the build only (`logos`), the relay and the browser never see them.

export const FIELDS = {
  series: [
    'slug',
    'name',
    'short_name',
    'discipline',
    'disciplines',
    'region',
    'country_code',
    'website_url',
    'organizer_name',
    'organizer_website_url',
  ],
  seasons: [
    'series_slug',
    'label',
    'year',
    'calendar_status',
    'source_url',
    'last_checked_at',
    'event_count',
    'round_count',
  ],
  events: [
    'series_slug',
    'season_label',
    'season_year',
    'round_number',
    'round_numbers',
    'round_label',
    'sub_label',
    'name',
    'kind',
    'start_date',
    'end_date',
    'status',
    'url',
    'venue_slug',
    'venue_name',
    'venue_country_code',
    'venue_timezone',
  ],
};

/** The series columns only the build reads: where the catalog stores each championship's logo. */
export const LOGO_FIELDS = ['logo_url', 'logo_light_url', 'logo_dark_url'];

/** Keeps the contract's fields and nothing else; a removed round never reaches a page. */
export function sanitize(data, { logos = false } = {}) {
  const pick =
    (kind, extra = []) =>
    (row) =>
      Object.fromEntries([...FIELDS[kind], ...extra].map((f) => [f, row[f] ?? null]));
  return {
    series: (data.series ?? []).map((row) => {
      const s = pick('series', logos ? LOGO_FIELDS : [])(row);
      // Most important first; a source that does not send them files the championship under its one discipline.
      s.disciplines =
        Array.isArray(s.disciplines) && s.disciplines.length
          ? s.disciplines
          : s.discipline
            ? [s.discipline]
            : [];
      return s;
    }),
    seasons: (data.seasons ?? []).map(pick('seasons')),
    events: (data.events ?? [])
      .filter((e) => e.status === 'scheduled' || e.status === 'cancelled')
      .map(pick('events')),
  };
}

const PAGE = 1000;

/** One championship only (its page needs nothing else), or the whole catalog when `series` is not given. */
function only(data, series) {
  if (!series) return data;
  return {
    series: data.series.filter((x) => x.slug === series),
    seasons: data.seasons.filter((x) => x.series_slug === series),
    events: data.events.filter((x) => x.series_slug === series),
  };
}

/** The motorsport-data read API (WBLT Engineering), the catalog's home since it left the app. */
export const API_URL = 'https://api.wblt-engineering.com/motorsport/v1';

/**
 * The API's objects as the contract's flat rows: nested fields flattened (organizer, logo, venue), so that everything
 * after this point reads one shape.
 */
const FROM_API = {
  series: (a) => ({
    ...a,
    organizer_name: a.organizer?.name ?? null,
    organizer_website_url: a.organizer?.website_url ?? null,
    logo_url: a.logo?.url ?? null,
    logo_light_url: a.logo?.light ?? null,
    logo_dark_url: a.logo?.dark ?? null,
  }),
  seasons: (a) => a,
  events: (a) => ({
    ...a,
    venue_slug: a.venue?.slug ?? null,
    venue_name: a.venue?.name ?? null,
    venue_country_code: a.venue?.country_code ?? null,
    venue_timezone: a.venue?.timezone ?? null,
  }),
};

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
/** The order the pages expect, which the API does not share for events (it lists them by date first). */
const SORT = {
  series: (a, b) => cmp(a.slug, b.slug),
  seasons: (a, b) => cmp(a.series_slug, b.series_slug) || a.year - b.year,
  events: (a, b) => cmp(a.series_slug, b.series_slug) || cmp(a.start_date, b.start_date),
};

async function apiGet(url, key, path, signal) {
  const res = await fetch(`${url}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
    signal,
  });
  if (!res.ok) {
    const e = new Error(
      `calendar: ${path.split('?')[0]} answered ${res.status} ${await res.text()}`,
    );
    e.status = res.status;
    throw e;
  }
  return res.json();
}

async function fetchList(url, key, kind, { signal, series } = {}) {
  // One championship: its own record (a 404 = not in the catalog); its seasons and events, filtered by the API.
  if (series && kind === 'series') {
    try {
      return [(await apiGet(url, key, `/series/${encodeURIComponent(series)}`, signal)).data];
    } catch (e) {
      if (e.status === 404) return [];
      throw e;
    }
  }
  const rows = [];
  let cursor = null;
  do {
    const q = new URLSearchParams({ limit: String(PAGE) });
    if (series) q.set('series', series);
    if (cursor) q.set('cursor', cursor);
    const page = await apiGet(url, key, `/${kind}?${q}`, signal);
    rows.push(...page.data);
    cursor = page.next_cursor;
  } while (cursor);
  return rows;
}

/**
 * The catalog from the API, server-side (the build, the relay): `key` is the server's, it never reaches a page.
 * `series` keeps one championship only; `logos` adds the logo URLs (the build asks, the relay does not).
 */
export async function fetchCatalog(url, key, { signal, series, logos = false } = {}) {
  const base = url.replace(/\/$/, '');
  const [s, se, ev] = await Promise.all(
    ['series', 'seasons', 'events'].map(async (k) =>
      (await fetchList(base, key, k, { signal, series })).map(FROM_API[k]).sort(SORT[k]),
    ),
  );
  return only(sanitize({ series: s, seasons: se, events: ev }, { logos }), series);
}

/**
 * Where the server reads the catalog, from its environment: the motorsport-data API (MOTORSPORT_DATA_API_URL
 * overrides its address). Null without MOTORSPORT_DATA_API_KEY: the build fails, the relay answers 503.
 */
export function catalogSource(env) {
  if (!env.MOTORSPORT_DATA_API_KEY) return null;
  return {
    url: env.MOTORSPORT_DATA_API_URL || API_URL,
    key: env.MOTORSPORT_DATA_API_KEY,
    read: fetchCatalog,
  };
}

/**
 * The catalog in the visitor's browser, from the site's own relay (one same-origin request, no key) or, on a preview
 * built on sample data, from its static copy. The rows are filtered here too, so a source that ignores `series` (the
 * static copy) gives the same result.
 */
export async function fetchLive(api, { signal, series } = {}) {
  const res = await fetch(series ? `${api}?series=${encodeURIComponent(series)}` : api, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    const e = new Error(`calendar: ${api} answered ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return only(sanitize(await res.json()), series);
}
