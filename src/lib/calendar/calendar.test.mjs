// The calendar shows only the contract's fields, stays honest when a season is not out, and never ships sample
// data to production.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { loadCatalog } from './build.mjs';
import { VIEWS, sanitize } from './contract.mjs';
import { dateRange, roundLabel, roundName } from './format.mjs';
import { refresh } from './refresh.mjs';
import { calendarOf, championshipBody, circuitBody, circuitPageSlugs, countriesOf, hash, indexBody, indexSummary, roundRow } from './render.mjs';
import { buildCalendar, circuits, featuredYear, notPublished, upcomingRounds, sharedWeekends } from './model.mjs';

const series = (slug, extra = {}) => ({ slug, name: slug.toUpperCase(), short_name: null, discipline: 'gt', region: 'europe', ...extra });
const season = (series_slug, year, label = String(year)) => ({ series_slug, label, year, last_checked_at: `${year - 1}-10-07T03:00:00Z` });
const round = (series_slug, year, start_date, extra = {}) => ({
  series_slug, season_label: String(year), season_year: year, name: 'Round', kind: 'race',
  start_date, end_date: start_date, status: 'scheduled', venue_slug: 'spa', venue_name: 'Spa', ...extra,
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
  assert.deepEqual(clean.events.map((e) => e.status), ['scheduled', 'cancelled']);
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
      seasons: [season('published', 2026), season('published', 2027), season('late', 2026), season('empty', 2026)],
      events: [round('published', 2026, '2026-04-01'), round('published', 2027, '2027-04-01'), round('late', 2026, '2026-05-01')],
    },
    { today: new Date('2026-10-07') },
  );
  const bySlug = Object.fromEntries(cal.championships.map((c) => [c.slug, c]));
  assert.equal(cal.year, 2027);
  assert.equal(bySlug.published.shown.year, 2027);
  assert.equal(bySlug.late.featured, null);
  assert.equal(bySlug.late.shown.year, 2026);
  assert.equal(bySlug.empty, undefined, 'a series with no round has no page');
  assert.deepEqual(notPublished(cal).map((c) => c.slug), ['late']);
});

test('a winter season counts for the year it ends in', () => {
  const cal = buildCalendar(
    { series: [series('fe')], seasons: [season('fe', 2027, '2026-2027')], events: [round('fe', 2027, '2026-12-05', { season_label: '2026-2027' })] },
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
  const venue = (venue_slug, venue_name, venue_country_code) => ({ venue_slug, venue_name, venue_country_code });
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
  assert.deepEqual(all.map((c) => [c.slug, c.rounds.length, c.page]), [
    ['autodromo-municipal-ar', 1, false],
    ['autodromo-municipal-municipal-uy', 1, false],
    ['autodromo-municipal-municipal-uy-q1', 1, false],
    ['circuit-de-la-sarthe', 1, false],
    ['circuit-zandvoort', 1, false],
    ['spa', 3, true],
  ]);
  // The catalog cleans its reference up: the URL does not move.
  const cleaned = buildCalendar(
    { series: [series('b')], seasons: [season('b', 2026)], events: [round('b', 2026, '2026-07-01', venue('le-mans-fr', 'Circuit de la Sarthe', 'FR'))] },
    { today: new Date('2026-10-08') },
  );
  assert.equal(circuits(cleaned)[0].slug, 'circuit-de-la-sarthe');

  const ctx = { year: 2027, today: '2026-10-08', countries: {}, circuitPages: circuitPageSlugs(cal) };
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
  assert.deepEqual(sharedWeekends(cal, gtwc).map((x) => x.championship.slug), ['gt4']);
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
    const [status, body] = answer(view, hits[view]);
    res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const env = { CATALOG_SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, CATALOG_SUPABASE_KEY: 'k' };
  return { env, hits, close: () => new Promise((r) => server.close(r)) };
}
const PGRST002 = { code: 'PGRST002', message: 'Could not query the database for the schema cache. Retrying.' };
const rowsOf = (view) => (view === VIEWS.series ? [{ slug: 'gt4', name: 'GT4' }] : view === VIEWS.events ? [{ series_slug: 'gt4', status: 'scheduled', start_date: '2027-04-01' }] : []);

test('a passing 503 (PGRST002) is retried and the build gets the catalog', async () => {
  const api = await fakeViews((view, n) => (view === VIEWS.events && n <= 2 ? [503, PGRST002] : [200, rowsOf(view)]));
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
  const html = roundRow({ ...round('a', 2027, '2027-04-15'), name: 'Night & "Day"', venue_name: 'Spa', venue_country_code: 'BE', championship: c }, { countries: { BE: 'Belgium' } });
  assert.match(html, /data-discipline="gt" data-region="" data-circuit="spa" data-month="2027-04" data-end="2027-04-15"/);
  assert.match(html, /A &lt;b&gt;/);
  assert.match(html, /Night &amp; &quot;Day&quot; · /);
  assert.match(html, /Spa, Belgium/);
  assert.doesNotMatch(html, /<b>/);
});

// --- The browser's refresh (refresh.mjs), against the sample served as the views would serve it ---------------

const sampleData = async () => sanitize((await import('../../data/calendar/sample.json', { with: { type: 'json' } })).default);

/** A page as the build left it: its live parts with their render and hash; a fetch that serves `rows`. */
function page(parts) {
  const els = Object.fromEntries(Object.entries(parts).map(([name, html]) => [name, { innerHTML: html, dataset: { hash: hash(html) } }]));
  const events = [];
  return {
    els,
    events,
    doc: { querySelector: (sel) => els[/data-calendar-live="(\w+)"/.exec(sel)[1]] ?? null, dispatchEvent: (e) => events.push(e.type) },
  };
}
function serve(data, { status = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    const view = /rest\/v1\/(\w+)/.exec(url)[1];
    const kind = Object.entries(VIEWS).find(([, v]) => v === view)[0];
    return new Response(status === 200 ? JSON.stringify(data[kind]) : '{}', { status });
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
  assert.equal(await refresh(p.doc, { url: 'https://x.supabase.co', key: 'k', ...ctx }), 'same');
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
  assert.equal(await refresh(p.doc, { url: 'https://x.supabase.co', key: 'k', ...ctx }), 'updated');
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
  assert.match(p.els.body.innerHTML, /href="\/calendar\/circuits\//, 'its rounds link to their circuit pages');
  // The static sample API ignores the query: the browser filters too, and still finds nothing new.
  const calls = serve(data);
  assert.equal(await refresh(p.doc, { url: '/calendar/sample-api', key: 'sample', ...ctx, slug: 'british-gt' }), 'same');
  assert.ok(calls.every((u) => /=eq\.british-gt&/.test(u)));
});

test("a circuit's page reads the whole catalog and finds nothing new when nothing changed", async () => {
  const data = await sampleData();
  const ctx = { year: 2027, today: '2026-10-08', countries: countriesOf(data) };
  const cal = calendarOf(data, ctx);
  ctx.circuitPages = circuitPageSlugs(cal);
  const p = page({ body: circuitBody(cal, 'spa-francochamps-circuit', ctx) });
  assert.ok(p.els.body.innerHTML.length > 0);
  const calls = serve(data);
  assert.equal(await refresh(p.doc, { url: '/calendar/sample-api', key: 'sample', ...ctx, circuit: 'spa-francochamps-circuit' }), 'same');
  assert.ok(calls.every((u) => !/=eq\./.test(u)));
});

test('the build version stays when the views fail or answer nothing', async () => {
  const data = await sampleData();
  const ctx = { year: 2027, today: '2026-10-08', countries: countriesOf(data) };
  const cal = calendarOf(data, ctx);
  ctx.circuitPages = circuitPageSlugs(cal);
  const p = page({ body: indexBody(cal, ctx) });
  const before = p.els.body.innerHTML;
  serve(data, { status: 404 }); // PGRST205 until the app's #197 is in production
  await assert.rejects(refresh(p.doc, { url: 'https://x.supabase.co', key: 'k', ...ctx }));
  serve({ series: [], seasons: [], events: [] });
  assert.equal(await refresh(p.doc, { url: 'https://x.supabase.co', key: 'k', ...ctx }), 'empty');
  assert.equal(p.els.body.innerHTML, before);
});

test('dates and labels read the way a team writes them', () => {
  assert.equal(dateRange('2027-04-15', '2027-04-17'), '15–17 Apr');
  assert.equal(dateRange('2027-04-30', '2027-05-02'), '30 Apr – 2 May');
  assert.equal(dateRange('2026-12-30', '2027-01-02'), '30 Dec 2026 – 2 Jan 2027');
  assert.equal(dateRange('2027-04-15', '2027-04-15', { withYear: true }), '15 Apr 2027');
  assert.equal(roundLabel({ round_label: 'Round 1', sub_label: 'Endurance Cup' }), 'Round 1 · Endurance Cup');
  assert.equal(roundLabel({ round_number: 2, sub_label: null }), 'Round 2');
  assert.equal(roundName({ name: 'Imola', venue_name: 'Imola Circuit' }), null);
  assert.equal(roundName({ name: 'Circuit de Magny-Cours', venue_name: 'Circuit de Nevers Magny-Cours' }), null);
  assert.equal(roundName({ name: 'Budapest', venue_name: 'Hungaroring' }), 'Budapest');
  assert.equal(roundName({ name: 'CrowdStrike 24 Hours of Spa', venue_name: 'Spa' }), 'CrowdStrike 24 Hours of Spa');
});
