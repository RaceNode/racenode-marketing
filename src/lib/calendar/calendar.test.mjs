// The calendar shows only the contract's fields, stays honest when a season is not out, and never ships sample
// data to production.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCatalog } from './build.mjs';
import { VIEWS, sanitize } from './contract.mjs';
import { dateRange, roundLabel, roundName } from './format.mjs';
import { refresh } from './refresh.mjs';
import { calendarOf, championshipBody, countriesOf, hash, indexBody, indexSummary, roundRow } from './render.mjs';
import { buildCalendar, featuredYear, notPublished, roundsOfYear, sharedWeekends } from './model.mjs';

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
  assert.deepEqual(roundsOfYear(cal, 2027).map((r) => r.series_slug), ['published']);
});

test('a winter season counts for the year it ends in', () => {
  const cal = buildCalendar(
    { series: [series('fe')], seasons: [season('fe', 2027, '2026-2027')], events: [round('fe', 2027, '2026-12-05', { season_label: '2026-2027' })] },
    { today: new Date('2026-10-07') },
  );
  assert.equal(cal.championships[0].featured.label, '2026-2027');
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
  await assert.rejects(loadCatalog(down));
  // A preview (CALENDAR_SAMPLE=1) falls back to the sample, flagged so the pages say so and are not indexed.
  for (const env of [{}, down]) {
    const preview = await loadCatalog({ ...env, CALENDAR_SAMPLE: '1' });
    assert.equal(preview.sample, true);
    assert.ok(preview.events.length > 0);
  }
});

test('the rows of the all-championships calendar escape what the catalog says', () => {
  const c = { slug: 'a', name: 'A <b>', short_name: null, discipline: 'gt', region: null };
  const html = roundRow({ ...round('a', 2027, '2027-04-15'), name: 'Night & "Day"', venue_name: 'Spa', venue_country_code: 'BE', championship: c }, { countries: { BE: 'Belgium' } });
  assert.match(html, /data-discipline="gt" data-region="" data-month="4" data-year="2027"/);
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
  const ctx = { year: 2027, countries: countriesOf(data) };
  const cal = calendarOf(data, ctx);
  const p = page({ summary: indexSummary(cal), body: indexBody(cal, ctx) });
  const before = p.els.body.innerHTML;
  serve(data);
  assert.equal(await refresh(p.doc, { url: 'https://x.supabase.co', key: 'k', ...ctx }), 'same');
  assert.equal(p.els.body.innerHTML, before);
  assert.deepEqual(p.events, []);
});

test('the browser updates what changed since the build, and only that', async () => {
  const data = await sampleData();
  const ctx = { year: 2027, countries: countriesOf(data) };
  const cal = calendarOf(data, ctx);
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
  const ctx = { year: 2027, countries: countriesOf(data) };
  const cal = calendarOf(data, ctx);
  const p = page({ body: championshipBody(cal, 'british-gt', ctx) });
  // The static sample API ignores the query: the browser filters too, and still finds nothing new.
  const calls = serve(data);
  assert.equal(await refresh(p.doc, { url: '/calendar/sample-api', key: 'sample', ...ctx, slug: 'british-gt' }), 'same');
  assert.ok(calls.every((u) => /=eq\.british-gt&/.test(u)));
});

test('the build version stays when the views fail or answer nothing', async () => {
  const data = await sampleData();
  const ctx = { year: 2027, countries: countriesOf(data) };
  const cal = calendarOf(data, ctx);
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
