// The parts of the calendar pages that follow the catalog, as HTML strings. The same functions run at build time
// (the page Google indexes) and in the visitor's browser (refresh.mjs), so the browser can tell whether anything
// changed since the build by comparing a hash of its own render with the build's, and touch the page only then.
// Pure: no Intl at render time (country names come from `ctx.countries`, collected at build time), no clock (the
// featured year and the day the lists start from are the build's, `ctx.year` and `ctx.today`); the same data gives
// the same string in Node and in any browser.
import {
  DISCIPLINES,
  MONTHS,
  dateRange,
  longDate,
  monthOf,
  roundLabel,
  roundName,
} from './format.mjs';
import {
  buildCalendar,
  circuits,
  displayName,
  meetingsOf,
  notPublished,
  upcomingRounds,
  venueName,
} from './model.mjs';

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
  const codes = new Set(
    [
      ...data.series.map((s) => s.country_code),
      ...data.events.map((e) => e.venue_country_code),
    ].filter(Boolean),
  );
  return Object.fromEntries([...codes].sort().map((c) => [c, names.of(c) ?? c]));
}

// A code the build did not know (a venue added since) falls back to the browser's own name for it.
const country = (code, ctx) =>
  code
    ? (ctx.countries[code] ?? new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code)
    : '';

/** The calendar as the pages see it, for the build's featured year. */
export const calendarOf = (data, ctx) =>
  buildCalendar(data, { today: new Date(Date.UTC(ctx.year, 0, 1)) });

/**
 * A championship's logo, when the build hosts one (`ctx.logos`: slug → tone, see logos.mjs): the file is the build's
 * (/calendar/logos/<slug>.webp), the path comes from the slug and nothing else. A fixed box and lazy loading: ~800
 * rows on the index, and the page must not jump when they arrive. alt is empty: the name is written next to it.
 * `large` is the one in a championship page's opening. '' for a championship without one: its row stays text.
 */
export function logoOf(slug, ctx, { large = false } = {}) {
  const tone = ctx.logos?.[slug];
  return tone ? logoImg(`/calendar/logos/${slug}.webp`, tone, large) : '';
}

/**
 * A circuit's logo, the same way (`ctx.circuitLogos`: catalog `venue_slug` → { slug, tone }, decided by the build):
 * /calendar/logos/circuits/<slug>.webp, the slug being the circuit's own (from its name, as its page's URL), never
 * the catalog's reference. '' without one: the meeting's heading stays text.
 */
export function circuitLogoOf(venueSlug, ctx) {
  const l = ctx.circuitLogos?.[venueSlug];
  return l ? logoImg(`/calendar/logos/circuits/${l.slug}.webp`, l.tone) : '';
}

function logoImg(src, tone, large = false) {
  const [w, h] = large ? [72, 48] : [48, 32];
  return `<img class="cal-logo${large ? ' cal-logo-lg' : ''}" data-tone="${esc(tone)}" src="${esc(src)}" alt="" width="${w}" height="${h}" loading="lazy" decoding="async">`;
}

// --- All championships (/calendar/) ---------------------------------------------------------------------------

/** "/calendar/circuits/<slug>/" when the round's circuit has its own page, else null. */
const circuitHref = (r, pages) =>
  pages.has(r.venue_slug) ? `/calendar/circuits/${pages.get(r.venue_slug)}/` : null;

/**
 * The circuits that have their own page, catalog `venue_slug` → URL slug, decided by the build
 * (`ctx.circuitPages`): a championship's page reads only its own rounds in the browser, so it could neither tell
 * which circuit has a page nor which names collide, and a circuit page only exists from the next build.
 */
export const circuitPageSlugs = (cal) =>
  Object.fromEntries(
    circuits(cal)
      .filter((c) => c.page)
      .map((c) => [c.venue_slug, c.slug]),
  );
const pagesOf = (ctx) => new Map(Object.entries(ctx.circuitPages ?? {}));

/** What the circuit filter matches a round on: its page's slug, or the catalog's for a circuit without a page. */
export const circuitKey = (venueSlug, pages) => pages.get(venueSlug) ?? venueSlug ?? '';

/** "Circuit de Spa-Francorchamps, Belgium", linked to the circuit's page when it has one. */
function placeOf(r, ctx, pages) {
  const where = `${esc(r.venue_name ?? '')}${r.venue_country_code ? `, ${esc(country(r.venue_country_code, ctx))}` : ''}`;
  const href = circuitHref(r, pages);
  return href ? `<a href="${href}">${where}</a>` : where;
}

/** All of a championship's disciplines, space-separated for the filter's word test (primary only if the list is absent). */
const disciplinesOf = (c) => (c.disciplines?.length ? c.disciplines : [c.discipline]).join(' ');

// Styles: .calendar-row in src/styles/global.css (d = dates, c = championship, p = place): hundreds of rows, so
// their classes live there once. The data-* attributes are what CalendarFilters reads (end: hides a round the
// visitor's clock says is over, when the morning build is late). Under a meeting's heading (`meeting`), a row drops
// what the heading says (circuit, country, dates) and the organizer's event name (Willi 20/10: unclear, sometimes a
// circuit, sometimes a sponsor), and keeps its own dates only when they differ from the meeting's.
export function roundRow(r, ctx, pages = new Map(), { place = true, meeting = null } = {}) {
  const c = r.championship;
  const own = dateRange(r.start_date, r.end_date);
  const sub = [
    roundLabel(r),
    DISCIPLINES[c.discipline],
    meeting && own !== dateRange(meeting.start_date, meeting.end_date) ? own : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const cancelled = r.status === 'cancelled';
  const provisional = c.seasons?.find((s) => s.label === r.season_label)?.calendar_provisional;
  const name = meeting ? null : roundName(r);
  return (
    `<li class="calendar-row" data-discipline="${esc(disciplinesOf(c))}" data-region="${esc(c.region)}" data-circuit="${esc(circuitKey(r.venue_slug, pages))}" data-month="${r.start_date.slice(0, 7)}" data-end="${esc(r.end_date)}">` +
    (meeting
      ? ''
      : `<div class="d">${esc(own)}${cancelled ? '<span>Cancelled</span>' : ''}</div>`) +
    `<div class="c${ctx.logoColumn ? ' has-logo' : ''}">${logoOf(c.slug, ctx)}<a href="/calendar/${esc(c.slug)}/">${esc(displayName(c))}</a><span>${esc(sub)}</span>` +
    `${meeting && cancelled ? '<span class="x">Cancelled</span>' : ''}` +
    `${provisional ? '<span class="prov">Provisional</span>' : ''}</div>` +
    (place && !meeting
      ? `<div class="p">${name ? `<span>${esc(name)} · </span>` : ''}${placeOf(r, ctx, pages)}</div>`
      : '') +
    '</li>'
  );
}

/** "19 of 82 championships have published their 2027 calendar." */
export function indexSummary(cal) {
  const late = notPublished(cal).length;
  return `${cal.championships.length - late} of ${cal.championships.length} championships have published their ${cal.year} calendar.`;
}

/** Things that have a start_date, by the month they start in ("November 2026"), in the order given. */
function monthsOf(list) {
  const months = new Map();
  for (const x of list) {
    const m = `${MONTHS[monthOf(x.start_date) - 1]} ${x.start_date.slice(0, 4)}`;
    if (!months.has(m)) months.set(m, []);
    months.get(m).push(x);
  }
  return months;
}

/** Rounds by the month they start in, in date order. */
function byMonth(rounds, ctx, pages, opts) {
  let html = '';
  for (const [m, list] of monthsOf(rounds))
    html +=
      `<div class="calendar-month mb-8"><h2 class="cal-month-title">${esc(m)}</h2>` +
      `<ul class="cal-sheet">${list.map((r) => roundRow(r, ctx, pages, opts)).join('')}</ul></div>`;
  return html;
}

/**
 * A meeting's heading: its circuit by the name a calendar line uses (never the event's name), linked to its page when
 * it has one, with its logo when the build hosts one; the meeting's dates and the country.
 */
function meetingHead(m, ctx, pages) {
  const name = esc(venueName(m));
  const href = circuitHref(m, pages);
  const logo = circuitLogoOf(m.venue_slug, ctx);
  const facts = [dateRange(m.start_date, m.end_date), country(m.venue_country_code, ctx)]
    .filter(Boolean)
    .join(' · ');
  return (
    `<div class="cal-meeting-head${logo ? ' has-logo' : ''}">${logo}` +
    `<h3>${href ? `<a href="${href}">${name}</a>` : name}</h3><p>${esc(facts)}</p></div>`
  );
}

/**
 * Rounds by month, then by meeting (meetingsOf): one section per circuit and weekend, its championships below. A
 * meeting sits in the month it starts in, a meeting of one round is a section all the same.
 */
function byMeeting(rounds, ctx, pages) {
  let html = '';
  for (const [m, list] of monthsOf(meetingsOf(rounds)))
    html +=
      `<div class="calendar-month mb-8"><h2 class="cal-month-title">${esc(m)}</h2><div class="cal-sheet">` +
      list
        .map(
          (meeting) =>
            `<section class="calendar-meeting">${meetingHead(meeting, ctx, pages)}<ul>` +
            meeting.rounds.map((r) => roundRow(r, ctx, pages, { meeting })).join('') +
            '</ul></section>',
        )
        .join('') +
      '</div></div>';
  return html;
}

/** "Last season known: 2026 · 8 rounds" cards of the championships whose featured season is not out. */
function lateList(late, ctx) {
  return (
    '<ul class="grid sm:grid-cols-2 gap-2">' +
    late
      .map(
        (c) =>
          `<li class="calendar-late" data-discipline="${esc(disciplinesOf(c))}" data-region="${esc(c.region)}">` +
          `<a href="/calendar/${esc(c.slug)}/" class="cal-card${ctx.logoColumn ? ' has-logo' : ''}">${logoOf(c.slug, ctx)}` +
          `<span>${esc(displayName(c))}</span>` +
          `<span>Last season known: ${esc(c.shown.label)} · ${c.shown.rounds.length} rounds</span></a></li>`,
      )
      .join('') +
    '</ul>'
  );
}

/**
 * One chronological list from the build's day (`ctx.today`), every season mixed, by month and meeting; then the
 * championships whose featured season is not out. Rounds already run are not listed: they are on each championship's
 * page.
 */
export function indexBody(cal, ctx) {
  const pages = pagesOf(ctx);
  let html = byMeeting(upcomingRounds(cal, ctx.today ?? ''), ctx, pages);
  html +=
    '<p id="calendar-empty" class="cal-note muted" hidden>No upcoming round matches these filters.</p>';

  const late = notPublished(cal);
  if (late.length > 0) {
    html +=
      `<section id="calendar-not-published" class="mt-12 mb-4">` +
      `<h2 class="subtitle mb-2">${cal.year} not published yet</h2>` +
      `<p class="muted mb-4">These organizers have not released their ${cal.year} dates. Each page shows their last season until they do.</p>` +
      lateList(late, ctx) +
      '</section>';
  }
  return html;
}

// --- One championship (/calendar/<slug>/) ---------------------------------------------------------------------

const external = (href, text, cls) =>
  `<a href="${esc(href)}" rel="noopener nofollow" target="_blank" class="${cls}">${text}</a>`;

/** A season's rounds: a table from sm up, stacked cards on a phone. */
export function seasonTable(season, ctx, pages = new Set()) {
  const rows = season.rounds.map((r) => {
    const label = roundLabel(r);
    const name = roundName(r);
    return (
      '<li class="cal-season-row">' +
      `<span class="text-xs sm:text-sm text-graphite col-span-2 sm:col-span-1">${esc(label)}</span>` +
      `<span class="font-mono text-sm text-ink sm:order-none">${esc(dateRange(r.start_date, r.end_date, { withYear: true }))}` +
      (r.status === 'cancelled'
        ? '<span class="ml-2 text-xs text-blocking font-sans font-semibold">Cancelled</span>'
        : '') +
      '</span>' +
      (r.url
        ? external(
            r.url,
            'Official page ↗',
            'text-xs font-semibold text-accent hover:text-accent-hover hover:underline whitespace-nowrap sm:col-start-4 sm:row-start-1',
          )
        : '<span></span>') +
      '<span class="text-sm text-graphite col-span-2 sm:col-span-1 sm:col-start-3 sm:row-start-1">' +
      (name
        ? `<span class="text-ink">${esc(name)}<br class="sm:hidden" /><span class="hidden sm:inline"> · </span></span>`
        : '') +
      (circuitHref(r, pages)
        ? `<a href="${circuitHref(r, pages)}" class="hover:text-accent hover:underline">${esc(r.venue_name)}</a>`
        : esc(r.venue_name)) +
      `${r.venue_country_code ? `<span>, ${esc(country(r.venue_country_code, ctx))}</span>` : ''}` +
      '</span></li>'
    );
  });
  return `<ol class="cal-sheet">${rows.join('')}</ol>`;
}

/** Whether its season is out, when it was checked, its rounds, and the season before. Empty if unknown. */
export function championshipBody(cal, slug, ctx) {
  const c = cal.championships.find((x) => x.slug === slug);
  if (!c) return '';
  const { shown } = c;
  const year = cal.year;
  const pages = pagesOf(ctx);
  const organizer = esc(c.organizer_name ?? 'The organizer');
  const checked = (lead) =>
    shown.last_checked_at
      ? ` ${lead} against the official calendar on ${longDate(shown.last_checked_at)}.`
      : '';
  const source = shown.source_url
    ? ` ${external(shown.source_url, 'Official calendar ↗', 'link')}`
    : '';
  // A flag from the organizer's source, never a guarantee the other way: no flag says nothing, not "confirmed".
  const provisional = shown.calendar_provisional
    ? '<p class="cal-prov-note"><strong>Provisional calendar</strong>' +
      (shown.calendar_source_date
        ? ` · ${esc(organizer)}'s calendar of ${longDate(shown.calendar_source_date)}`
        : '') +
      '. Dates and venues may change.</p>'
    : '';
  let html = c.featured
    ? provisional +
      `<p class="muted text-sm mb-8">${shown.rounds.length} rounds published by ${organizer}.${checked('Checked')}${source}</p>`
    : '<div class="cal-note" role="note">' +
      `<p class="font-semibold text-ink mb-1">The ${year} calendar is not published yet.</p>` +
      `<p class="muted text-sm">${organizer} has not released its ${year} dates. Below, the ${esc(shown.label)} season for reference.${checked('Last checked')}${source}</p></div>`;
  html += `<h2 class="subtitle mb-3">${esc(shown.label)} season</h2>${seasonTable(shown, ctx, pages)}`;
  const previous = c.featured ? c.seasons.find((s) => s.year < year) : null;
  if (previous)
    html +=
      '<details class="mt-8 group"><summary class="cal-summary">' +
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
    ? `<p class="muted text-sm mb-8">${upcoming.length} upcoming round${upcoming.length === 1 ? '' : 's'} of ${n} championship${n === 1 ? '' : 's'} at ${esc(c.name)}, as each organizer publishes them.</p>` +
      byMonth(upcoming, ctx, pages, { place: false })
    : `<div class="cal-note" role="note"><p class="font-semibold text-ink mb-1">No round scheduled at ${esc(c.name)} in the calendars published so far.</p>` +
      '<p class="muted text-sm">Below, the rounds already run here.</p></div>';

  const late = notPublished(cal).filter((x) => x.shown.rounds.some((r) => r.venue_slug === venue));
  if (late.length > 0)
    html +=
      '<section class="mt-12 mb-4">' +
      `<h2 class="subtitle mb-2">Raced here, ${cal.year} not published yet</h2>` +
      `<p class="muted mb-4">These championships came to ${esc(c.name)} in their last season and have not released their ${cal.year} dates.</p>` +
      lateList(late, ctx) +
      '</section>';

  if (past.length > 0)
    html +=
      '<details class="mt-10"><summary class="cal-summary mb-3">' +
      `Rounds already run at ${esc(c.name)} · ${past.length}</summary>${byMonth(past, ctx, pages, { place: false })}</details>`;
  return html;
}
