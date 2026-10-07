// The all-championships calendar's rows as one HTML string. The page renders on request (live.mjs) and has hundreds
// of rows: an Astro component per row cost ~30 ms of CPU for 825 rows, over the Workers Free plan's 10 ms; a string
// costs a few. The data-* attributes are what CalendarFilters reads.
import { DISCIPLINES, country, dateRange, monthOf, roundLabel, roundName } from './format.mjs';
import { displayName } from './model.mjs';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export function roundRow(r) {
  const c = r.championship;
  const sub = [roundLabel(r), DISCIPLINES[c.discipline]].filter(Boolean).join(' · ');
  const name = roundName(r);
  const place = `${r.venue_name ?? ''}${r.venue_country_code ? `, ${country(r.venue_country_code)}` : ''}`;
  // Styles: .calendar-row in src/styles/global.css (d = dates, c = championship, p = place).
  return (
    `<li class="calendar-row" data-discipline="${esc(c.discipline)}" data-region="${esc(c.region)}" data-month="${monthOf(r.start_date)}" data-year="${esc(r.season_year)}">` +
    `<div class="d">${esc(dateRange(r.start_date, r.end_date))}${r.status === 'cancelled' ? '<span>Cancelled</span>' : ''}</div>` +
    `<div class="c"><a href="/calendar/${esc(c.slug)}/">${esc(displayName(c))}</a><span>${esc(sub)}</span></div>` +
    `<div class="p">${name ? `<span>${esc(name)} · </span>` : ''}${esc(place)}</div></li>`
  );
}

export const roundRows = (rounds) => rounds.map(roundRow).join('');
