// The parts of the calendar pages that follow the catalog, as HTML strings. The same functions run at build time
// (the page Google indexes) and in the visitor's browser (refresh.mjs), so the browser can tell whether anything
// changed since the build by comparing a hash of its own render with the build's, and touch the page only then.
// Pure: no Intl at render time (country names come from `ctx.countries`, collected at build time), no clock (the
// featured year and the day the lists start from are the build's, `ctx.year` and `ctx.today`); the same data gives
// the same string in Node and in any browser.
import { DISCIPLINES, MONTHS, dateRange, longDate, monthOf, roundLabel, roundName } from './format.mjs';
import { buildCalendar, circuits, displayName, notPublished, upcomingRounds } from './model.mjs';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** FNV-1a, 32 bits: enough to tell two renders apart, small enough to sit in an attribute. */
export function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

/** Country names for every code in the catalog, in English, computed once at build time and shipped to the page. */
export function countriesOf(data) {
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  const codes = new Set([...data.series.map((s) => s.country_code), ...data.events.map((e) => e.venue_country_code)].filter(Boolean));
  return Object.fromEntries([...codes].sort().map((c) => [c, names.of(c) ?? c]));
}

// A code the build did not know (a venue added since) falls back to the browser's own name for it.
const country = (code, ctx) => (code ? ctx.countries[code] ?? new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code : '');

/** The calendar as the pages see it, for the build's featured year. */
export const calendarOf = (data, ctx) => buildCalendar(data, { today: new Date(Date.UTC(ctx.year, 0, 1)) });

// --- All championships (/calendar/) ---------------------------------------------------------------------------

/** "/calendar/circuits/<slug>/" when the round's circuit has its own page, else null. */
const circuitHref = (r, pages) => (pages.has(r.venue_slug) ? `/calendar/circuits/${pages.get(r.venue_slug)}/` : null);

/**
 * The circuits that have their own page, catalog `venue_slug` → URL slug, decided by the build
 * (`ctx.circuitPages`): a championship's page reads only its own rounds in the browser, so it could neither tell
 * which circuit has a page nor which names collide, and a circuit page only exists from the next build.
 */
export const circuitPageSlugs = (cal) => Object.fromEntries(circuits(cal).filter((c) => c.page).map((c) => [c.venue_slug, c.slug]));
const pagesOf = (ctx) => new Map(Object.entries(ctx.circuitPages ?? {}));

/** What the circuit filter matches a round on: its page's slug, or the catalog's for a circuit without a page. */
export const circuitKey = (venueSlug, pages) => pages.get(venueSlug) ?? venueSlug ?? '';

/** "Circuit de Spa-Francorchamps, Belgium", linked to the circuit's page when it has one. */
function placeOf(r, ctx, pages) {
  const where = `${esc(r.venue_name ?? '')}${r.venue_country_code ? `, ${esc(country(r.venue_country_code, ctx))}` : ''}`;
  const href = circuitHref(r, pages);
  return href ? `<a href="${href}">${where}</a>` : where;
}

// Styles: .calendar-row in src/styles/global.css (d = dates, c = championship, p = place): hundreds of rows, so
// their classes live there once. The data-* attributes are what CalendarFilters reads (end: hides a round the
// visitor's clock says is over, when the morning build is late).
export function roundRow(r, ctx, pages = new Map(), { place = true } = {}) {
  const c = r.championship;
  const sub = [roundLabel(r), DISCIPLINES[c.discipline]].filter(Boolean).join(' · ');
  const name = roundName(r);
  return (
    `<li class="calendar-row" data-discipline="${esc(c.discipline)}" data-region="${esc(c.region)}" data-circuit="${esc(circuitKey(r.venue_slug, pages))}" data-month="${r.start_date.slice(0, 7)}" data-end="${esc(r.end_date)}">` +
    `<div class="d">${esc(dateRange(r.start_date, r.end_date))}${r.status === 'cancelled' ? '<span>Cancelled</span>' : ''}</div>` +
    `<div class="c"><a href="/calendar/${esc(c.slug)}/">${esc(displayName(c))}</a><span>${esc(sub)}</span></div>` +
    (place ? `<div class="p">${name ? `<span>${esc(name)} · </span>` : ''}${placeOf(r, ctx, pages)}</div>` : name ? `<div class="p"><span>${esc(name)}</span></div>` : '') +
    '</li>'
  );
}

/** "19 of 82 championships have published their 2027 calendar." */
export function indexSummary(cal) {
  const late = notPublished(cal).length;
  return `${cal.championships.length - late} of ${cal.championships.length} championships have published their ${cal.year} calendar.`;
}

/** Rounds by the month they start in ("November 2026"), in date order. */
function byMonth(rounds, ctx, pages, opts) {
  const months = new Map();
  for (const r of rounds) {
    const m = `${MONTHS[monthOf(r.start_date) - 1]} ${r.start_date.slice(0, 4)}`;
    if (!months.has(m)) months.set(m, []);
    months.get(m).push(r);
  }
  let html = '';
  for (const [m, list] of months)
    html +=
      `<div class="calendar-month mb-8"><h2 class="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">${esc(m)}</h2>` +
      `<ul class="bg-gray-900 border border-gray-800 rounded-lg">${list.map((r) => roundRow(r, ctx, pages, opts)).join('')}</ul></div>`;
  return html;
}

/** "Last season known: 2026 · 8 rounds" cards of the championships whose featured season is not out. */
function lateList(late) {
  return (
    '<ul class="grid sm:grid-cols-2 gap-2">' +
    late
      .map(
        (c) =>
          `<li class="calendar-late" data-discipline="${esc(c.discipline)}" data-region="${esc(c.region)}">` +
          `<a href="/calendar/${esc(c.slug)}/" class="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg px-4 py-3 transition-colors">` +
          `<span class="text-white font-medium">${esc(displayName(c))}</span>` +
          `<span class="block text-xs text-gray-500">Last season known: ${esc(c.shown.label)} · ${c.shown.rounds.length} rounds</span></a></li>`,
      )
      .join('') +
    '</ul>'
  );
}

/**
 * One chronological list from the build's day (`ctx.today`), every season mixed, by month; then the championships
 * whose featured season is not out. Rounds already run are not listed: they are on each championship's page.
 */
export function indexBody(cal, ctx) {
  const pages = pagesOf(ctx);
  let html = byMonth(upcomingRounds(cal, ctx.today ?? ''), ctx, pages);
  html += '<p id="calendar-empty" class="text-gray-400 bg-gray-900 border border-gray-800 rounded-lg px-4 py-6 mb-8" hidden>No upcoming round matches these filters.</p>';

  const late = notPublished(cal);
  if (late.length > 0) {
    html +=
      `<section id="calendar-not-published" class="mt-12 mb-4">` +
      `<h2 class="text-xl md:text-2xl font-bold text-white mb-2">${cal.year} not published yet</h2>` +
      `<p class="text-gray-400 mb-4">These organizers have not released their ${cal.year} dates. Each page shows their last season until they do.</p>` +
      lateList(late) +
      '</section>';
  }
  return html;
}

// --- One championship (/calendar/<slug>/) ---------------------------------------------------------------------

const external = (href, text, cls) => `<a href="${esc(href)}" rel="noopener nofollow" target="_blank" class="${cls}">${text}</a>`;

/** A season's rounds: a table from sm up, stacked cards on a phone. */
export function seasonTable(season, ctx, pages = new Set()) {
  const rows = season.rounds.map((r, i) => {
    const label = roundLabel(r) || `Round ${i + 1}`;
    const name = roundName(r);
    return (
      '<li class="grid grid-cols-[1fr_auto] sm:grid-cols-[9rem_10.5rem_1fr_auto] gap-x-4 gap-y-1 items-baseline px-4 py-3 border-b border-gray-800 last:border-b-0">' +
      `<span class="text-xs sm:text-sm text-gray-500 col-span-2 sm:col-span-1">${esc(label)}</span>` +
      `<span class="font-mono text-sm text-white sm:order-none">${esc(dateRange(r.start_date, r.end_date, { withYear: true }))}` +
      (r.status === 'cancelled' ? '<span class="ml-2 text-xs text-blocking font-sans">Cancelled</span>' : '') +
      '</span>' +
      (r.url ? external(r.url, 'Official page ↗', 'text-xs text-gray-400 hover:text-white whitespace-nowrap sm:col-start-4 sm:row-start-1') : '<span></span>') +
      '<span class="text-sm text-gray-300 col-span-2 sm:col-span-1 sm:col-start-3 sm:row-start-1">' +
      (name ? `<span class="text-white">${esc(name)}<br class="sm:hidden" /><span class="hidden sm:inline"> · </span></span>` : '') +
      (circuitHref(r, pages) ? `<a href="${circuitHref(r, pages)}" class="hover:text-white hover:underline">${esc(r.venue_name)}</a>` : esc(r.venue_name)) +
      `${r.venue_country_code ? `<span class="text-gray-500">, ${esc(country(r.venue_country_code, ctx))}</span>` : ''}` +
      '</span></li>'
    );
  });
  return `<ol class="bg-gray-900 border border-gray-800 rounded-lg">${rows.join('')}</ol>`;
}

/** Whether its season is out, when it was checked, its rounds, and the season before. Empty if unknown. */
export function championshipBody(cal, slug, ctx) {
  const c = cal.championships.find((x) => x.slug === slug);
  if (!c) return '';
  const { shown } = c;
  const year = cal.year;
  const pages = pagesOf(ctx);
  const organizer = esc(c.organizer_name ?? 'The organizer');
  const checked = (lead) => (shown.last_checked_at ? ` ${lead} against the official calendar on ${longDate(shown.last_checked_at)}.` : '');
  const source = shown.source_url ? ` ${external(shown.source_url, 'Official calendar ↗', 'underline hover:text-white')}` : '';
  let html = c.featured
    ? `<p class="text-sm text-gray-400 mb-8">${shown.rounds.length} rounds published by ${organizer}${shown.calendar_status === 'provisional' ? ' (provisional calendar)' : ''}.${checked('Checked')}${source}</p>`
    : '<div class="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 mb-8" role="note">' +
      `<p class="text-white font-medium mb-1">The ${year} calendar is not published yet.</p>` +
      `<p class="text-sm text-gray-400">${organizer} has not released its ${year} dates. Below, the ${esc(shown.label)} season for reference.${checked('Last checked')}${source}</p></div>`;
  html += `<h2 class="text-xl font-bold text-white mb-3">${esc(shown.label)} season</h2>${seasonTable(shown, ctx, pages)}`;
  const previous = c.featured ? c.seasons.find((s) => s.year < year) : null;
  if (previous)
    html +=
      '<details class="mt-8 group"><summary class="cursor-pointer text-gray-300 hover:text-white font-medium">' +
      `${esc(previous.label)} season · ${previous.rounds.length} rounds</summary><div class="mt-3">${seasonTable(previous, ctx, pages)}</div></details>`;
  return html;
}

// --- One circuit (/calendar/circuits/<slug>/) -----------------------------------------------------------------

/**
 * Every championship's upcoming rounds at one circuit, by month; the championships that raced there in their last
 * season and have not published the featured one; the rounds already run there. Empty if the circuit is unknown.
 */
export function circuitBody(cal, slug, ctx) {
  // The venue behind the URL as the build named it (ctx.circuitPages), whatever names the catalog has since.
  const pages = pagesOf(ctx);
  const venue = [...pages].find(([, s]) => s === slug)?.[0];
  const c = circuits(cal).find((x) => x.venue_slug === venue);
  if (!c) return '';
  const today = ctx.today ?? '';
  const upcoming = c.rounds.filter((r) => r.end_date >= today);
  const past = c.rounds.filter((r) => r.end_date < today).reverse();
  const n = new Set(upcoming.map((r) => r.championship.slug)).size;
  let html = upcoming.length
    ? `<p class="text-sm text-gray-400 mb-8">${upcoming.length} upcoming round${upcoming.length === 1 ? '' : 's'} of ${n} championship${n === 1 ? '' : 's'} at ${esc(c.name)}, as each organizer publishes them.</p>` +
      byMonth(upcoming, ctx, pages, { place: false })
    : `<div class="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 mb-8" role="note"><p class="text-white font-medium mb-1">No round scheduled at ${esc(c.name)} in the calendars published so far.</p>` +
      '<p class="text-sm text-gray-400">Below, the rounds already run here.</p></div>';

  const late = notPublished(cal).filter((x) => x.shown.rounds.some((r) => r.venue_slug === venue));
  if (late.length > 0)
    html +=
      '<section class="mt-12 mb-4">' +
      `<h2 class="text-xl font-bold text-white mb-2">Raced here, ${cal.year} not published yet</h2>` +
      `<p class="text-gray-400 mb-4">These championships came to ${esc(c.name)} in their last season and have not released their ${cal.year} dates.</p>` +
      lateList(late) +
      '</section>';

  if (past.length > 0)
    html +=
      '<details class="mt-10"><summary class="cursor-pointer text-gray-300 hover:text-white font-medium mb-3">' +
      `Rounds already run at ${esc(c.name)} · ${past.length}</summary>${byMonth(past, ctx, pages, { place: false })}</details>`;
  return html;
}
