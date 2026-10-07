// The calendar shows only the contract's fields, stays honest when a season is not out, and never ships sample
// data to production.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCatalog, sanitize } from './contract.mjs';
import { dateRange, roundLabel, roundName } from './format.mjs';
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

test('a production build without the views fails instead of publishing sample data', async () => {
  await assert.rejects(loadCatalog({ CF_PAGES_BRANCH: 'main' }), /refusing to publish sample data/);
  const preview = await loadCatalog({ CF_PAGES_BRANCH: 'calendar' });
  assert.equal(preview.sample, true);
  assert.ok(preview.events.length > 0);
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
