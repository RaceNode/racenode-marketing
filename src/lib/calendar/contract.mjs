// The public race calendar reads the app's championship catalog at build time, through three views the app opens
// to `anon` (read-only, publishable key): series, seasons, rounds. Only the fields below are ever kept: if a view
// grows a column (raw scrape, logs, anything about a team), the site drops it before a page can show it.
//
// Rules (Willi, 2026-10-07): dates and venues are publishable facts; no organizer logo or document, we link to the
// organizer's own page; never team data, raw scrapes or logs.
import fs from 'node:fs';
import sample from '../../data/calendar/sample.json' with { type: 'json' };

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

async function fetchView(url, key, kind) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const q = `${url}/rest/v1/${VIEWS[kind]}?select=${FIELDS[kind].join(',')}&order=${ORDER[kind]}&limit=${PAGE}&offset=${offset}`;
    const res = await fetch(q, { headers: { apikey: key, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`calendar: ${VIEWS[kind]} answered ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

/**
 * The catalog for this build.
 * - CATALOG_SUPABASE_URL + CATALOG_SUPABASE_KEY set: the live views. Any failure fails the build, so Cloudflare
 *   keeps the last good deploy online instead of publishing an empty calendar.
 * - Otherwise: sample data (a real extract, kept in the repo), flagged so pages say so and are not indexed.
 *   A production build (Cloudflare Pages, branch main) never falls back to it.
 */
export async function loadCatalog(env = process.env) {
  const url = env.CATALOG_SUPABASE_URL;
  const key = env.CATALOG_SUPABASE_KEY;
  if (url && key) {
    const [series, seasons, events] = await Promise.all(['series', 'seasons', 'events'].map((k) => fetchView(url.replace(/\/$/, ''), key, k)));
    return { sample: false, ...sanitize({ series, seasons, events }) };
  }
  if (env.CF_PAGES_BRANCH === 'main')
    throw new Error('calendar: CATALOG_SUPABASE_URL and CATALOG_SUPABASE_KEY are missing on the production build; refusing to publish sample data');
  const fixture = env.CATALOG_FIXTURE ? JSON.parse(fs.readFileSync(env.CATALOG_FIXTURE, 'utf8')) : sample;
  return { sample: true, ...sanitize(fixture) };
}

let cached;
/** One load per build, shared by every calendar page. */
export const catalog = () => (cached ??= loadCatalog());
