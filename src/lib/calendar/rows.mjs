// The all-championships calendar's rows as one HTML string. The page renders on request (live.mjs) and has hundreds
// of rows: an Astro component per row cost ~30 ms of CPU for 825 rows, over the Workers Free plan's 10 ms; a string
// costs a few. Same markup as before; the data-* attributes are what CalendarFilters reads.
import { DISCIPLINES, country, dateRange, monthOf, roundLabel, roundName } from './format.mjs';
import { displayName } from './model.mjs';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export function roundRow(r) {
  const c = r.championship;
  const sub = [roundLabel(r), DISCIPLINES[c.discipline]].filter(Boolean).join(' · ');
  const name = roundName(r);
  const place = `${r.venue_name ?? ''}${r.venue_country_code ? `, ${country(r.venue_country_code)}` : ''}`;
  return (
    `<li class="calendar-row grid grid-cols-[5.5rem_1fr] sm:grid-cols-[7rem_14rem_1fr] gap-x-4 gap-y-1 px-4 py-3 border-b border-gray-800 last:border-b-0"` +
    ` data-discipline="${esc(c.discipline)}" data-region="${esc(c.region)}" data-month="${monthOf(r.start_date)}" data-year="${esc(r.season_year)}">` +
    `<div class="text-sm font-mono text-gray-300 sm:row-span-1 row-span-2">${esc(dateRange(r.start_date, r.end_date))}` +
    (r.status === 'cancelled' ? '<span class="block text-xs text-blocking font-sans">Cancelled</span>' : '') +
    `</div><div class="min-w-0"><a href="/calendar/${esc(c.slug)}/" class="text-white font-medium hover:underline">${esc(displayName(c))}</a>` +
    `<span class="block text-xs text-gray-500">${esc(sub)}</span></div>` +
    `<div class="min-w-0 text-sm text-gray-400 sm:col-start-3">${name ? `<span class="text-gray-300">${esc(name)} · </span>` : ''}${esc(place)}</div></li>`
  );
}

export const roundRows = (rounds) => rounds.map(roundRow).join('');
