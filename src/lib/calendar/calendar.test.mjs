// The calendar shows only the contract's fields, stays honest when a season is not out, and never ships sample
// data to production.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { SAMPLE_API, liveConfig, loadCatalog } from './build.mjs';
import { API_URL, VIEWS, catalogSource, sanitize } from './contract.mjs';
import { dateRange, roundLabel, roundName } from './format.mjs';
import { refresh } from './refresh.mjs';
import { LIVE_API, ipBudget, relay } from './relay.mjs';
import {
  calendarOf,
  championshipBody,
  circuitBody,
  circuitPageSlugs,
  countriesOf,
  hash,
  indexBody,
  indexSummary,
  roundRow,
} from './render.mjs';
import {
  buildCalendar,
  circuits,
  featuredYear,
  notPublished,
  upcomingRounds,
  sharedWeekends,
} from './model.mjs';

const series = (slug, extra = {}) => ({
  slug,
  name: slug.toUpperCase(),
  short_name: null,
  discipline: 'gt',
  region: 'europe',
  ...extra,
});
const season = (series_slug, year, label = String(year)) => ({
  series_slug,
  label,
  year,
  last_checked_at: `${year - 1}-10-07T03:00:00Z`,
});
const round = (series_slug, year, start_date, extra = {}) => ({
  series_slug,
  season_label: String(year),
  season_year: year,
  name: 'Round',
  kind: 'race',
  start_date,
  end_date: start_date,
  status: 'scheduled',
  venue_slug: 'spa',
  venue_name: 'Spa',
  ...extra,
});

test('only the contract fields reach the pages, and removed rounds never do', () => {
  const clean = sanitize({
    series: [{ ...series('a'), logo_dark_url: 'x', source: 'sro' }],
    seasons: [{ ...season('a', 2027), id: 'u' }],
    events: [
      { ...round('a', 2027, '2027-04-01'), raw: { team: 'secret' }, id: 'e1' },
      round('a', 2027, '2027-05-01', { status: 'removed' }),
      round('a', 2027, '2027-06-01', { status: 'cancelled' }),
    ],
  });
  assert.equal(clean.series[0].logo_dark_url, undefined);
  assert.equal(clean.series[0].source, undefined);
  assert.equal(clean.seasons[0].id, undefined);
  assert.equal(clean.events.length, 2);
  assert.equal(clean.events[0].raw, undefined);
  assert.equal(clean.events[0].id, undefined);
  assert.deepEqual(
    clean.events.map((e) => e.status),
    ['scheduled', 'cancelled'],
  );
});

test('the featured season is next year from July', () => {
  assert.equal(featuredYear(new Date('2026-10-07')), 2027);
  assert.equal(featuredYear(new Date('2027-03-01')), 2027);
  assert.equal(featuredYear(new Date('2027-07-01')), 2028);
});

test('a championship without its 2027 season leads with the last one and says so', () => {
  const cal = buildCalendar(
    {
      series: [series('published'), series('late'), series('empty')],
      seasons: [
        season('published', 2026),
        season('published', 2027),
        season('late', 2026),
        season('empty', 2026),
      ],
      events: [
        round('published', 2026, '2026-04-01'),
        round('published', 2027, '2027-04-01'),
        round('late', 2026, '2026-05-01'),
      ],
    },
    { today: new Date('2026-10-07') },
  );
  const bySlug = Object.fromEntries(cal.championships.map((c) => [c.slug, c]));
  assert.equal(cal.year, 2027);
  assert.equal(bySlug.published.shown.year, 2027);
  assert.equal(bySlug.late.featured, null);
  assert.equal(bySlug.late.shown.year, 2026);
  assert.equal(bySlug.empty, undefined, 'a series with no round has no page');
  assert.deepEqual(
    notPublished(cal).map((c) => c.slug),
    ['late'],
  );
});

test('a winter season counts for the year it ends in', () => {
  const cal = buildCalendar(
    {
      series: [series('fe')],
      seasons: [season('fe', 2027, '2026-2027')],
      events: [round('fe', 2027, '2026-12-05', { season_label: '2026-2027' })],
    },
    { today: new Date('2026-10-07') },
  );
  assert.equal(cal.championships[0].featured.label, '2026-2027');
});

test('one chronological list from today: a season starting the autumn before sits in its month, run rounds are gone', () => {
  const cal = buildCalendar(
    {
      series: [series('alms'), series('gt')],
      seasons: [season('alms', 2027, '2026-2027'), season('gt', 2026), season('gt', 2027)],
      events: [
        round('alms', 2027, '2026-11-20', { season_label: '2026-2027', end_date: '2026-11-22' }),
        round('alms', 2027, '2027-02-05', { season_label: '2026-2027' }),
        round('gt', 2026, '2026-09-01'),
        round('gt', 2026, '2026-10-07', { end_date: '2026-10-09' }),
        round('gt', 2027, '2027-04-01'),
      ],
    },
    { today: new Date('2026-10-08') },
  );
  assert.deepEqual(
    upcomingRounds(cal, '2026-10-08').map((r) => r.start_date),
    ['2026-10-07', '2026-11-20', '2027-02-05', '2027-04-01'],
    'a round under way stays until its last day',
  );
  const html = indexBody(cal, { year: 2027, today: '2026-10-08', countries: {} });
  assert.ok(html.indexOf('November 2026') < html.indexOf('February 2027'));
  assert.doesNotMatch(html, /September 2026/);
});

test('circuits: a URL from the name, never the catalog reference; the country only when two names collide', () => {
  const venue = (venue_slug, venue_name, venue_country_code) => ({
    venue_slug,
    venue_name,
    venue_country_code,
  });
  const cal = buildCalendar(
    {
      series: [series('a'), series('b')],
      seasons: [season('a', 2026), season('a', 2027), season('b', 2026)],
      events: [
        round('a', 2026, '2026-05-01'),
        round('a', 2027, '2027-05-01'),
        round('b', 2026, '2026-06-01'),
        round('b', 2026, '2026-07-01', venue('le-mans-fr-q174090', 'Circuit de la Sarthe', 'FR')),
        round('b', 2026, '2026-07-08', venue('zandvoort-xx', 'Circuit Zandvoort', 'NL')),
        round('b', 2026, '2026-07-15', venue('municipal-ar', 'Autódromo Municipal', 'AR')),
        round('b', 2026, '2026-07-22', venue('municipal-uy', 'Autódromo Municipal', 'UY')),
        round('b', 2026, '2026-07-29', venue('municipal-uy-q1', 'Autódromo Municipal', 'UY')),
      ],
    },
    { today: new Date('2026-10-08') },
  );
  const all = circuits(cal);
  assert.deepEqual(
    all.map((c) => [c.slug, c.rounds.length, c.page]),
    [
      ['autodromo-municipal-ar', 1, false],
      ['autodromo-municipal-municipal-uy', 1, false],
      ['autodromo-municipal-municipal-uy-q1', 1, false],
      ['circuit-de-la-sarthe', 1, false],
      ['circuit-zandvoort', 1, false],
      ['spa', 3, true],
    ],
  );
  // The catalog cleans its reference up: the URL does not move.
  const cleaned = buildCalendar(
    {
      series: [series('b')],
      seasons: [season('b', 2026)],
      events: [round('b', 2026, '2026-07-01', venue('le-mans-fr', 'Circuit de la Sarthe', 'FR'))],
    },
    { today: new Date('2026-10-08') },
  );
  assert.equal(circuits(cleaned)[0].slug, 'circuit-de-la-sarthe');

  const ctx = {
    year: 2027,
    today: '2026-10-08',
    countries: {},
    circuitPages: circuitPageSlugs(cal),
  };
  assert.deepEqual(ctx.circuitPages, { spa: 'spa' });
  const html = circuitBody(cal, 'spa', ctx);
  assert.match(html, /1 upcoming round of 1 championship/);
  assert.match(html, /Raced here, 2027 not published yet/);
  assert.match(html, /Rounds already run at Spa · 2/);
  assert.equal(circuitBody(cal, 'nowhere', ctx), '');
  // The index links a round to its circuit's page only when the circuit has one.
  const index = indexBody(cal, ctx);
  assert.match(index, /<a href="\/calendar\/circuits\/spa\/">Spa<\/a>/);
});

test('a folded double-header counts its rounds: a circuit with two meetings, one a double-header, keeps its page', () => {
  const old = {
    series: [series('fe')],
    seasons: [season('fe', 2027)],
    events: [
      round('fe', 2027, '2027-01-10', { round_number: 1, name: 'R01 Jeddah E-Prix' }),
      round('fe', 2027, '2027-01-11', { round_number: 2, name: 'R02 Jeddah E-Prix' }),
      round('fe', 2027, '2027-05-10', { round_number: 7 }),
    ],
  };
  const folded = {
    ...old,
    seasons: [{ ...season('fe', 2027), round_count: 3 }],
    events: [
      round('fe', 2027, '2027-01-10', {
        end_date: '2027-01-11',
        round_number: 1,
        round_numbers: [1, 2],
        round_label: 'Rounds 1–2',
        name: 'Jeddah E-Prix',
      }),
      round('fe', 2027, '2027-05-10', { round_number: 7, round_numbers: [7] }),
    ],
  };
  const today = { today: new Date('2026-10-08') };
  for (const data of [old, folded]) {
    const [spa] = circuits(buildCalendar(sanitize(data), today));
    assert.equal(spa.page, true);
  }
  const clean = sanitize(folded);
  assert.deepEqual(clean.events[0].round_numbers, [1, 2]);
  assert.equal(clean.seasons[0].round_count, 3);
  // The catalog of today has no round_numbers: null, read as one round per event.
  assert.equal(sanitize(old).events[0].round_numbers, null);
  const html = championshipBody(buildCalendar(clean, today), 'fe', {
    year: 2027,
    today: '2026-10-08',
    countries: {},
    circuitPages: {},
  });
  assert.match(html, /Rounds 1–2/);
});

test('views from before round_numbers: the read asks again without the new columns', async () => {
  const seen = [];
  const api = await fakeViews((view, n, url) => {
    seen.push(url);
    return /round_count|round_numbers/.test(url)
      ? [400, { code: '42703', message: 'column does not exist' }]
      : [200, []];
  });
  try {
    await loadCatalog(api.env, { delays: [] });
    assert.ok(seen.some((u) => /catalog_public_events\?select=(?!.*round_numbers)/.test(u)));
  } finally {
    await api.close();
  }
});

test('championships sharing a weekend at the same venue are found', () => {
  const cal = buildCalendar(
    {
      series: [series('gtwc'), series('gt4'), series('elsewhere')],
      seasons: [season('gtwc', 2027), season('gt4', 2027), season('elsewhere', 2027)],
      events: [
        round('gtwc', 2027, '2027-04-15', { end_date: '2027-04-17' }),
        round('gt4', 2027, '2027-04-16', { end_date: '2027-04-17' }),
        round('elsewhere', 2027, '2027-04-16', { venue_slug: 'monza' }),
      ],
    },
    { today: new Date('2026-10-07') },
  );
  const gtwc = cal.championships.find((c) => c.slug === 'gtwc');
  assert.deepEqual(
    sharedWeekends(cal, gtwc).map((x) => x.championship.slug),
    ['gt4'],
  );
});

test('production never publishes sample data: without the views the build fails', async () => {
  await assert.rejects(loadCatalog({}), /refusing to publish sample data/);
  const down = { CATALOG_SUPABASE_URL: 'http://127.0.0.1:9', CATALOG_SUPABASE_KEY: 'k' };
  await assert.rejects(loadCatalog(down, { delays: [] }));
  // A preview (CALENDAR_SAMPLE=1) falls back to the sample, flagged so the pages say so and are not indexed.
  for (const env of [{}, down]) {
    const preview = await loadCatalog({ ...env, CALENDAR_SAMPLE: '1' }, { delays: [] });
    assert.equal(preview.sample, true);
    assert.ok(preview.events.length > 0);
  }
});

/** A fake PostgREST: `answer(view, n)` gives [status, body] for the n-th request (from 1) to a view. */
async function fakeViews(answer) {
  const hits = {};
  const server = createServer((req, res) => {
    const view = new URL(req.url, 'http://x').pathname.split('/').pop();
    hits[view] = (hits[view] ?? 0) + 1;
    const [status, body] = answer(view, hits[view], decodeURIComponent(req.url));
    res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const env = {
    CATALOG_SUPABASE_URL: `http://127.0.0.1:${server.address().port}`,
    CATALOG_SUPABASE_KEY: 'k',
  };
  return { env, hits, close: () => new Promise((r) => server.close(r)) };
}
const PGRST002 = {
  code: 'PGRST002',
  message: 'Could not query the database for the schema cache. Retrying.',
};
const rowsOf = (view) =>
  view === VIEWS.series
    ? [{ slug: 'gt4', name: 'GT4' }]
    : view === VIEWS.events
      ? [{ series_slug: 'gt4', status: 'scheduled', start_date: '2027-04-01' }]
      : [];

test('a passing 503 (PGRST002) is retried and the build gets the catalog', async () => {
  const api = await fakeViews((view, n) =>
    view === VIEWS.events && n <= 2 ? [503, PGRST002] : [200, rowsOf(view)],
  );
  try {
    const data = await loadCatalog(api.env, { delays: [1, 1, 1] });
    assert.equal(data.sample, false);
    assert.equal(data.events.length, 1);
    assert.equal(api.hits[VIEWS.events], 3);
  } finally {
    await api.close();
  }
});

test('a database that stays down fails the build after the retries, never an empty calendar', async () => {
  const api = await fakeViews(() => [503, PGRST002]);
  try {
    await assert.rejects(loadCatalog(api.env, { delays: [1, 1] }), /answered 503 .*PGRST002/);
    assert.equal(api.hits[VIEWS.events], 3);
  } finally {
    await api.close();
  }
});

test('a 4xx (missing view, bad key) is not retried', async () => {
  const api = await fakeViews(() => [404, { code: 'PGRST205' }]);
  try {
    await assert.rejects(loadCatalog(api.env, { delays: [1, 1] }), /answered 404/);
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(Object.values(api.hits).every((n) => n === 1));
  } finally {
    await api.close();
  }
});

test('the rows of the all-championships calendar escape what the catalog says', () => {
  const c = { slug: 'a', name: 'A <b>', short_name: null, discipline: 'gt', region: null };
  const html = roundRow(
    {
      ...round('a', 2027, '2027-04-15'),
      name: 'Night & "Day"',
      venue_name: 'Spa',
      venue_country_code: 'BE',
      championship: c,
    },
    { countries: { BE: 'Belgium' } },
  );
  assert.match(
    html,
    /data-discipline="gt" data-region="" data-circuit="spa" data-month="2027-04" data-end="2027-04-15"/,
  );
  assert.match(html, /A &lt;b&gt;/);
  assert.match(html, /Night &amp; &quot;Day&quot; · /);
  assert.match(html, /Spa, Belgium/);
  assert.doesNotMatch(html, /<b>/);
});

// --- The browser's refresh (refresh.mjs), against the sample served as the relay would serve it ---------------

const sampleData = async () =>
  sanitize((await import('../../data/calendar/sample.json', { with: { type: 'json' } })).default);

/** A page as the build left it: its live parts with their render and hash; a fetch that serves `rows`. */
function page(parts) {
  const els = Object.fromEntries(
    Object.entries(parts).map(([name, html]) => [
      name,
      { innerHTML: html, dataset: { hash: hash(html) } },
    ]),
  );
  const events = [];
  return {
    els,
    events,
    doc: {
      querySelector: (sel) => els[/data-calendar-live="(\w+)"/.exec(sel)[1]] ?? null,
      dispatchEvent: (e) => events.push(e.type),
    },
  };
}
function serve(data, { status = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return new Response(status === 200 ? JSON.stringify(data) : '{}', { status });
  };
  return calls;
}

test('the browser leaves the page alone when nothing changed since the build', async () => {
  const data = await sampleData();
  const ctx = { year: 2027, today: '2026-10-08', countries: countriesOf(data) };
  const cal = calendarOf(data, ctx);
  ctx.circuitPages = circuitPageSlugs(cal);
  const p = page({ summary: indexSummary(cal), body: indexBody(cal, ctx) });
  const before = p.els.body.innerHTML;
  serve(data);
  assert.equal(await refresh(p.doc, { api: LIVE_API, ...ctx }), 'same');
  assert.equal(p.els.body.innerHTML, before);
  assert.deepEqual(p.events, []);
});

test('the browser updates what changed since the build, and only that', async () => {
  const data = await sampleData();
  const ctx = { year: 2027, today: '2026-10-08', countries: countriesOf(data) };
  const cal = calendarOf(data, ctx);
  ctx.circuitPages = circuitPageSlugs(cal);
  const p = page({ summary: indexSummary(cal), body: indexBody(cal, ctx) });
  const summary = p.els.summary.innerHTML;
  // During the day an organizer moves a round.
  const moved = structuredClone(data);
  const r = moved.events.find((e) => e.season_year === 2027 && e.series_slug === 'british-gt');
  r.start_date = '2027-04-24';
  r.end_date = '2027-04-25';
  serve(moved);
  assert.equal(await refresh(p.doc, { api: LIVE_API, ...ctx }), 'updated');
  assert.match(p.els.body.innerHTML, /24–25 Apr/);
  assert.equal(p.els.summary.innerHTML, summary);
  assert.deepEqual(p.events, ['calendar:updated']);
});

test("a championship's page asks the views for that championship only", async () => {
  const data = await sampleData();
  const ctx = { year: 2027, today: '2026-10-08', countries: countriesOf(data) };
  const cal = calendarOf(data, ctx);
  ctx.circuitPages = circuitPageSlugs(cal);
  const p = page({ body: championshipBody(cal, 'british-gt', ctx) });
  assert.match(
    p.els.body.innerHTML,
    /href="\/calendar\/circuits\//,
    'its rounds link to their circuit pages',
  );
  // The static sample copy ignores the query: the browser filters too, and still finds nothing new.
  const calls = serve(data);
  assert.equal(await refresh(p.doc, { api: SAMPLE_API, ...ctx, slug: 'british-gt' }), 'same');
  assert.deepEqual(calls, [`${SAMPLE_API}?series=british-gt`]);
});

test("a circuit's page reads the whole catalog and finds nothing new when nothing changed", async () => {
  const data = await sampleData();
  const ctx = { year: 2027, today: '2026-10-08', countries: countriesOf(data) };
  const cal = calendarOf(data, ctx);
  ctx.circuitPages = circuitPageSlugs(cal);
  const p = page({ body: circuitBody(cal, 'spa-francochamps-circuit', ctx) });
  assert.ok(p.els.body.innerHTML.length > 0);
  const calls = serve(data);
  assert.equal(
    await refresh(p.doc, { api: SAMPLE_API, ...ctx, circuit: 'spa-francochamps-circuit' }),
    'same',
  );
  assert.deepEqual(calls, [SAMPLE_API]);
});

test('the build version stays when the views fail or answer nothing', async () => {
  const data = await sampleData();
  const ctx = { year: 2027, today: '2026-10-08', countries: countriesOf(data) };
  const cal = calendarOf(data, ctx);
  ctx.circuitPages = circuitPageSlugs(cal);
  const p = page({ body: indexBody(cal, ctx) });
  const before = p.els.body.innerHTML;
  serve(data, { status: 502 }); // the relay could not read the views
  await assert.rejects(refresh(p.doc, { api: LIVE_API, ...ctx }));
  serve({ series: [], seasons: [], events: [] });
  assert.equal(await refresh(p.doc, { api: LIVE_API, ...ctx }), 'empty');
  assert.equal(p.els.body.innerHTML, before);
});

test('dates and labels read the way a team writes them', () => {
  assert.equal(dateRange('2027-04-15', '2027-04-17'), '15–17 Apr');
  assert.equal(dateRange('2027-04-30', '2027-05-02'), '30 Apr – 2 May');
  assert.equal(dateRange('2026-12-30', '2027-01-02'), '30 Dec 2026 – 2 Jan 2027');
  assert.equal(dateRange('2027-04-15', '2027-04-15', { withYear: true }), '15 Apr 2027');
  assert.equal(
    roundLabel({ round_label: 'Round 1', sub_label: 'Endurance Cup' }),
    'Round 1 · Endurance Cup',
  );
  assert.equal(roundLabel({ round_number: 2, sub_label: null }), 'Round 2');
  // The catalog folds a double-header into one event (round_numbers), from the app's "one meeting, one event".
  assert.equal(roundLabel({ round_number: 1, round_numbers: [1, 2] }), 'Rounds 1–2');
  assert.equal(roundLabel({ round_number: 4, round_numbers: [4, 6] }), 'Rounds 4, 6');
  assert.equal(roundLabel({ round_number: 3, round_numbers: [] }), 'Round 3');
  assert.equal(roundLabel({ round_label: 'Rounds 1–2', round_numbers: [1, 2] }), 'Rounds 1–2');
  // Names lose their "R01" / "Round 3" prefix: a name that is just the place reads as the venue, the label keeps the round.
  assert.equal(roundName({ name: 'Autopolis', venue_name: 'Autopolis' }), null);
  assert.equal(
    roundName({ name: 'Jeddah E-Prix', venue_name: 'Jeddah Corniche Circuit' }),
    'Jeddah E-Prix',
  );
  assert.equal(roundName({ name: 'Imola', venue_name: 'Imola Circuit' }), null);
  assert.equal(
    roundName({ name: 'Circuit de Magny-Cours', venue_name: 'Circuit de Nevers Magny-Cours' }),
    null,
  );
  assert.equal(roundName({ name: 'Budapest', venue_name: 'Hungaroring' }), 'Budapest');
  assert.equal(
    roundName({ name: 'CrowdStrike 24 Hours of Spa', venue_name: 'Spa' }),
    'CrowdStrike 24 Hours of Spa',
  );
});

// --- The relay (relay.mjs): what the browser may ask, and what never leaves the server -------------------------

const ask = (
  query = '',
  headers = { 'sec-fetch-site': 'same-origin', 'cf-connecting-ip': '1.2.3.4' },
) => new Request(`https://www.racenode.com${LIVE_API}${query}`, { headers });
const relayEnv = { CATALOG_SUPABASE_URL: 'https://db.test', CATALOG_SUPABASE_KEY: 'server-secret' };
const nodeFetch = globalThis.fetch; // the refresh tests above replace it

/** An edge cache in memory, keyed like caches.default (by URL). */
function memoryCache() {
  const store = new Map();
  return {
    store,
    match: async (req) => store.get(req.url)?.clone(),
    put: async (req, res) => void store.set(req.url, res),
  };
}

test('a page never carries a database URL or key, only where to ask', () => {
  const ctx = { year: 2027, today: '2026-10-08', countries: {} };
  const apiEnv = {
    MOTORSPORT_DATA_API_KEY: 'api-secret',
    MOTORSPORT_DATA_API_URL: 'https://api.test/motorsport/v1',
  };
  const before = Object.fromEntries(
    Object.keys({ ...relayEnv, ...apiEnv }).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, relayEnv, apiEnv);
  try {
    const live = JSON.stringify(liveConfig({ data: { sample: false }, ctx }, { slug: 'gt4' }));
    assert.doesNotMatch(live, /server-secret|db\.test|api-secret|api\.test|wblt-engineering/);
    assert.equal(JSON.parse(live).api, LIVE_API);
    assert.equal(liveConfig({ data: { sample: true }, ctx }).api, SAMPLE_API);
  } finally {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test('the server key travels in a header, never in a URL', async () => {
  const seen = [];
  const server = createServer((req, res) => {
    seen.push({ url: req.url, apikey: req.headers.apikey });
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('[]');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  globalThis.fetch = nodeFetch;
  try {
    await loadCatalog(
      {
        CATALOG_SUPABASE_URL: `http://127.0.0.1:${server.address().port}`,
        CATALOG_SUPABASE_KEY: 'server-secret',
      },
      { delays: [] },
    );
    assert.equal(seen.length, 3);
    assert.ok(seen.every((r) => r.apikey === 'server-secret' && !r.url.includes('server-secret')));
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('the relay answers a page with the contract fields, from the views once, then from the cache', async () => {
  const data = await sampleData();
  const reads = [];
  const read = async (url, key, { series }) => {
    reads.push({ url, key, series });
    return data;
  };
  const cache = memoryCache();
  const pending = [];
  const opts = { cache, read, waitUntil: (p) => pending.push(p) };
  const res = await relay(ask('?series=british-gt'), relayEnv, opts);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /max-age=300/);
  const body = await res.json();
  assert.ok(body.events.length > 0);
  assert.doesNotMatch(JSON.stringify(body), /server-secret|db\.test/);
  assert.deepEqual(reads, [{ url: 'https://db.test', key: 'server-secret', series: 'british-gt' }]);
  await Promise.all(pending);
  // Another visitor, the same question: the cache answers, the views are not read again.
  const again = await relay(
    ask('?series=british-gt', { 'sec-fetch-site': 'same-origin', 'cf-connecting-ip': '5.6.7.8' }),
    relayEnv,
    opts,
  );
  assert.equal(again.status, 200);
  assert.equal(reads.length, 1);
});

test('the relay turns away other sites, scripts, odd queries and greedy addresses', async () => {
  const read = async () => ({ series: [], seasons: [], events: [] });
  // No browser same-origin header: a script, or another site's page.
  assert.equal((await relay(ask('', {}), relayEnv, { read })).status, 403);
  assert.equal(
    (await relay(ask('', { 'sec-fetch-site': 'cross-site' }), relayEnv, { read })).status,
    403,
  );
  // Only `series`, and only a slug: no PostgREST filter, column or ordering goes through.
  for (const q of [
    '?select=*',
    '?series=eq.x',
    '?series=x&order=start_date',
    '?offset=1000',
    '?series=../x',
  ]) {
    assert.equal((await relay(ask(q), relayEnv, { read })).status, 400, q);
  }
  // A per-IP budget per minute.
  let t = 0;
  const allow = ipBudget({ limit: 2, now: () => t });
  const statuses = [];
  for (let i = 0; i < 3; i++) statuses.push((await relay(ask(), relayEnv, { read, allow })).status);
  assert.deepEqual(statuses, [200, 200, 429]);
  const other = await relay(
    ask('', { 'sec-fetch-site': 'same-origin', 'cf-connecting-ip': '9.9.9.9' }),
    relayEnv,
    { read, allow },
  );
  assert.equal(other.status, 200, 'another address has its own budget');
  t = 60_000;
  assert.equal(
    (await relay(ask(), relayEnv, { read, allow })).status,
    200,
    'the budget comes back the next minute',
  );
});

test('the relay says nothing about the database when the views fail, and caches no failure', async () => {
  const cache = memoryCache();
  const res = await relay(ask(), relayEnv, {
    cache,
    read: async () => {
      throw new Error('calendar: catalog_public_events answered 401 {"message":"Invalid API key"}');
    },
  });
  assert.equal(res.status, 502);
  assert.doesNotMatch(await res.text(), /API key|catalog_public/);
  assert.equal(cache.store.size, 0);
  assert.equal((await relay(ask(), {}, {})).status, 503, 'not configured');
});

// The motorsport-data API (catalogSource): with MOTORSPORT_DATA_API_KEY set, the build and the relay read it instead
// of the views, and get the very same rows.

/** The views' rows as the API serves them: organizer, logo and venue nested, extra fields the site must drop. */
function asApi(views) {
  return {
    series: views.series.map(({ organizer_name, organizer_website_url, logo_url, ...s }) => ({
      id: `id-${s.slug}`,
      ...s,
      organizer: organizer_name
        ? { name: organizer_name, website_url: organizer_website_url }
        : null,
      aliases: ['alias'],
      logo: { url: logo_url ?? null, light: null, dark: null },
      updated_at: '2026-10-13T00:00:00Z',
    })),
    seasons: views.seasons.map((s) => ({
      id: `id-${s.series_slug}-${s.label}`,
      ...s,
      updated_at: 'x',
    })),
    // The API lists events by date first; the views by championship, then date.
    events: views.events
      .map(({ venue_slug, venue_name, venue_country_code, venue_timezone, ...e }) => ({
        id: `id-${e.series_slug}-${e.start_date}-${e.name}`,
        ...e,
        tickets_url: 'https://tickets.test',
        venue: {
          id: 'v',
          slug: venue_slug,
          name: venue_name,
          country_code: venue_country_code,
          timezone: venue_timezone,
        },
      }))
      .sort((a, b) => a.start_date.localeCompare(b.start_date)),
  };
}

/**
 * A fake motorsport-data API: pages of `pageSize` rows whatever the `limit` (the cursor is the offset), the key in the
 * Authorization header, unknown parameters refused like the real one.
 */
async function fakeApi(data, { pageSize = 37, key = 'site-key' } = {}) {
  const seen = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    seen.push({ url: req.url, authorization: req.headers.authorization });
    const send = (status, body) =>
      res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
    if (req.headers.authorization !== `Bearer ${key}`)
      return send(401, { error: { code: 'unauthorized', message: 'bad key' } });
    if ([...url.searchParams.keys()].some((k) => !['limit', 'cursor', 'series'].includes(k)))
      return send(400, { error: { code: 'bad_request', message: 'unknown parameter' } });
    const [, kind, ref] = url.pathname.replace(/^\/v1/, '').split('/');
    if (ref) {
      const one = data.series.find((s) => s.slug === ref);
      return one
        ? send(200, { data: one })
        : send(404, { error: { code: 'not_found', message: '' } });
    }
    const series = url.searchParams.get('series');
    const rows = data[kind].filter((r) => !series || (r.series_slug ?? r.slug) === series);
    const from = Number(url.searchParams.get('cursor') ?? 0);
    const next = from + pageSize < rows.length ? String(from + pageSize) : null;
    send(200, { data: rows.slice(from, from + pageSize), next_cursor: next });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const env = {
    MOTORSPORT_DATA_API_KEY: key,
    MOTORSPORT_DATA_API_URL: `http://127.0.0.1:${server.address().port}/v1`,
  };
  return {
    env,
    seen,
    close: () => new Promise((r) => (server.close(r), server.closeAllConnections())),
  };
}

const rawSample = async () => {
  const { default: s } = await import('../../data/calendar/sample.json', {
    with: { type: 'json' },
  });
  const series = s.series.map((x, i) =>
    i % 3 ? x : { ...x, logo_url: `https://logos.test/${x.slug}.svg` },
  );
  return { series, seasons: s.seasons, events: s.events };
};

test('the API gives the build the very rows the views give, across pages, in the same order', async () => {
  const views = await rawSample();
  const fromViews = await fakeViews((view) => [
    200,
    { [VIEWS.series]: views.series, [VIEWS.seasons]: views.seasons, [VIEWS.events]: views.events }[
      view
    ],
  ]);
  const api = await fakeApi(asApi(views));
  globalThis.fetch = nodeFetch;
  try {
    const a = await loadCatalog(api.env, { delays: [] });
    const b = await loadCatalog(fromViews.env, { delays: [] });
    assert.ok(a.events.length > 800 && a.series.some((s) => s.logo_url));
    assert.deepEqual(a, b);
    // 825 events in pages of 37: every page was read, each with the cursor of the one before.
    assert.equal(
      api.seen.filter((r) => r.url.startsWith('/v1/events')).length,
      Math.ceil(825 / 37),
    );
    assert.ok(
      api.seen.every((r) => r.authorization === 'Bearer site-key' && !r.url.includes('site-key')),
    );
  } finally {
    await api.close();
    await fromViews.close();
  }
});

test("a championship's relay answer from the API: that championship only, no logo, unknown slugs empty", async () => {
  const views = await rawSample();
  const api = await fakeApi(asApi(views));
  globalThis.fetch = nodeFetch;
  try {
    const res = await relay(ask('?series=british-gt'), api.env, {});
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(new Set(body.events.map((e) => e.series_slug)), new Set(['british-gt']));
    assert.deepEqual(
      body.series.map((s) => s.slug),
      ['british-gt'],
    );
    assert.ok(!('logo_url' in body.series[0]) && !('venue' in body.events[0]));
    assert.doesNotMatch(JSON.stringify(body), /site-key|127\.0\.0\.1|tickets|alias/);
    const none = await (await relay(ask('?series=no-such-series'), api.env, {})).json();
    assert.deepEqual(none, { series: [], seasons: [], events: [] });
  } finally {
    await api.close();
  }
});

test('the API key picks the API; without it, the views (the way back); a bad key fails the build, unretried', async () => {
  const views = { CATALOG_SUPABASE_URL: 'https://db.test', CATALOG_SUPABASE_KEY: 'k' };
  assert.equal(catalogSource({ ...views, MOTORSPORT_DATA_API_KEY: 'a' }).name, 'api');
  assert.equal(catalogSource({ MOTORSPORT_DATA_API_KEY: 'a' }).url, API_URL);
  assert.equal(catalogSource(views).name, 'views');
  assert.equal(catalogSource({ ...views, MOTORSPORT_DATA_API_KEY: '' }).name, 'views');
  assert.equal(catalogSource({}), null);

  const api = await fakeApi(asApi(await rawSample()), { key: 'another-key' });
  globalThis.fetch = nodeFetch;
  try {
    await assert.rejects(
      loadCatalog({ ...api.env, MOTORSPORT_DATA_API_KEY: 'site-key' }, { delays: [1, 1] }),
      /answered 401/,
    );
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(api.seen.length <= 3, 'one try per list at most, no retry on a 4xx');
    const res = await relay(ask(), { ...api.env, MOTORSPORT_DATA_API_KEY: 'site-key' }, {});
    assert.equal(res.status, 502);
    assert.doesNotMatch(await res.text(), /401|bad key|127\.0\.0\.1/);
  } finally {
    await api.close();
  }
});
