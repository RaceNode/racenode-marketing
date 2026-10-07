// The parts of the calendar pages that follow the catalog, as HTML strings. The same functions run at build time
// (the page Google indexes) and in the visitor's browser (refresh.mjs), so the browser can tell whether anything
// changed since the build by comparing a hash of its own render with the build's, and touch the page only then.
// Pure: no Intl at render time (country names come from `ctx.countries`, collected at build time), no clock (the
// featured year is the build's, `ctx.year`); the same data gives the same string in Node and in any browser.
import { DISCIPLINES, MONTHS, dateRange, longDate, monthOf, roundLabel, roundName } from './format.mjs';
import { buildCalendar, displayName, notPublished, roundsOfYear, years } from './model.mjs';

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

// Styles: .calendar-row in src/styles/global.css (d = dates, c = championship, p = place): ~800 rows, so their
// classes live there once. The data-* attributes are what CalendarFilters reads.
export function roundRow(r, ctx) {
  const c = r.championship;
  const sub = [roundLabel(r), DISCIPLINES[c.discipline]].filter(Boolean).join(' · ');
  const name = roundName(r);
  const place = `${r.venue_name ?? ''}${r.venue_country_code ? `, ${country(r.venue_country_code, ctx)}` : ''}`;
  return (
    `<li class="calendar-row" data-discipline="${esc(c.discipline)}" data-region="${esc(c.region)}" data-month="${monthOf(r.start_date)}" data-year="${esc(r.season_year)}">` +
    `<div class="d">${esc(dateRange(r.start_date, r.end_date))}${r.status === 'cancelled' ? '<span>Cancelled</span>' : ''}</div>` +
    `<div class="c"><a href="/calendar/${esc(c.slug)}/">${esc(displayName(c))}</a><span>${esc(sub)}</span></div>` +
    `<div class="p">${name ? `<span>${esc(name)} · </span>` : ''}${esc(place)}</div></li>`
  );
}

/** "19 of 82 championships have published their 2027 calendar." */
export function indexSummary(cal) {
  const late = notPublished(cal).length;
  return `${cal.championships.length - late} of ${cal.championships.length} championships have published their ${cal.year} calendar.`;
}

/** Every round by year and month, then the championships whose featured season is not out. */
export function indexBody(cal, ctx) {
  const all = years(cal);
  const year = all.includes(cal.year) ? cal.year : all[0];
  let html = '';
  for (const y of [year, ...all.filter((x) => x !== year)]) {
    // By the month a round starts in, with its own year: a winter season (2026-2027) starts in the autumn before.
    const months = new Map();
    for (const r of roundsOfYear(cal, y)) {
      const m = `${MONTHS[monthOf(r.start_date) - 1]} ${r.start_date.slice(0, 4)}`;
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(r);
    }
    html += `<section data-year="${y}" aria-label="${y} season">`;
    for (const [m, rounds] of months)
      html +=
        `<div class="calendar-month mb-8"><h2 class="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-2">${esc(m)}</h2>` +
        `<ul class="bg-gray-900 border border-gray-800 rounded-lg">${rounds.map((r) => roundRow(r, ctx)).join('')}</ul></div>`;
    html += '</section>';
  }
  html += '<p id="calendar-empty" class="text-gray-400 bg-gray-900 border border-gray-800 rounded-lg px-4 py-6 mb-8" hidden>No round matches these filters.</p>';

  const late = notPublished(cal);
  if (late.length > 0) {
    html +=
      `<section id="calendar-not-published" data-year="${cal.year}" class="mt-12 mb-4">` +
      `<h2 class="text-xl md:text-2xl font-bold text-white mb-2">${cal.year} not published yet</h2>` +
      `<p class="text-gray-400 mb-4">These organizers have not released their ${cal.year} dates. Each page shows their last season until they do.</p>` +
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
      '</ul></section>';
  }
  return html;
}

// --- One championship (/calendar/<slug>/) ---------------------------------------------------------------------

const external = (href, text, cls) => `<a href="${esc(href)}" rel="noopener nofollow" target="_blank" class="${cls}">${text}</a>`;

/** A season's rounds: a table from sm up, stacked cards on a phone. */
export function seasonTable(season, ctx) {
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
      `${esc(r.venue_name)}${r.venue_country_code ? `<span class="text-gray-500">, ${esc(country(r.venue_country_code, ctx))}</span>` : ''}` +
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
  const organizer = esc(c.organizer_name ?? 'The organizer');
  const checked = (lead) => (shown.last_checked_at ? ` ${lead} against the official calendar on ${longDate(shown.last_checked_at)}.` : '');
  const source = shown.source_url ? ` ${external(shown.source_url, 'Official calendar ↗', 'underline hover:text-white')}` : '';
  let html = c.featured
    ? `<p class="text-sm text-gray-400 mb-8">${shown.rounds.length} rounds published by ${organizer}${shown.calendar_status === 'provisional' ? ' (provisional calendar)' : ''}.${checked('Checked')}${source}</p>`
    : '<div class="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 mb-8" role="note">' +
      `<p class="text-white font-medium mb-1">The ${year} calendar is not published yet.</p>` +
      `<p class="text-sm text-gray-400">${organizer} has not released its ${year} dates. Below, the ${esc(shown.label)} season for reference.${checked('Last checked')}${source}</p></div>`;
  html += `<h2 class="text-xl font-bold text-white mb-3">${esc(shown.label)} season</h2>${seasonTable(shown, ctx)}`;
  const previous = c.featured ? c.seasons.find((s) => s.year < year) : null;
  if (previous)
    html +=
      '<details class="mt-8 group"><summary class="cursor-pointer text-gray-300 hover:text-white font-medium">' +
      `${esc(previous.label)} season · ${previous.rounds.length} rounds</summary><div class="mt-3">${seasonTable(previous, ctx)}</div></details>`;
  return html;
}
