// Labels and dates as the calendar pages print them (day-month order). `locale` is 'en' or 'fr' (ctx.locale of
// render.mjs); pure tables and messages, no Intl, so the build and the browser print the same string.
import { m } from '../../paraglide/messages.js';

export const DISCIPLINES = {
  gt: 'GT',
  prototype: 'Prototype',
  touring: 'Touring car',
  single_seater: 'Single-seater',
  one_make: 'One-make cup',
  rally: 'Rally',
  hill_climb: 'Hill climb',
  historic: 'Historic',
  other: 'Other',
};

export const REGIONS = {
  world: 'World',
  europe: 'Europe',
  north_america: 'North America',
  south_america: 'South America',
  asia: 'Asia',
  oceania: 'Oceania',
  middle_east: 'Middle East',
  africa: 'Africa',
};

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const SHORT = MONTHS.map((m) => m.slice(0, 3));
const MONTHS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const SHORT_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
const fr = (locale) => locale === 'fr';

/** "November" / "novembre" for month number 1–12. */
export const monthName = (n, locale = 'en') => (fr(locale) ? MONTHS_FR : MONTHS)[n - 1];
const shortMonth = (n, locale) => (fr(locale) ? SHORT_FR : SHORT)[n - 1];
// French writes the first of the month "1er".
const day = (d, locale) => (fr(locale) && d === 1 ? '1er' : String(d));

/** A discipline's name in the page's language ('GT', 'Single-seater' / 'Monoplace'…); the key itself if unknown. */
export function disciplineName(key, locale = 'en') {
  const fn = m[`cal_discipline_${key}`];
  return fn ? fn({}, { locale }) : (DISCIPLINES[key] ?? key);
}

/** A region's name in the page's language; the key itself if unknown. */
export function regionName(key, locale = 'en') {
  const fn = m[`cal_region_${key}`];
  return fn ? fn({}, { locale }) : (REGIONS[key] ?? key);
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
export const country = (code) => (code ? (regionNames.of(code) ?? code) : '');

const parts = (d) => d.split('-').map(Number);

/** "15–17 Apr", "30 Apr – 2 May", "28 Dec 2026 – 3 Jan 2027"; `withYear` adds the year at the end. In French: "15–17 avr.", "1er–3 mai". */
export function dateRange(start, end, { withYear = false, locale = 'en' } = {}) {
  const [y1, m1, d1] = parts(start);
  const [y2, m2, d2] = parts(end);
  const tail = withYear ? ` ${y2}` : '';
  const a = day(d1, locale);
  const b = day(d2, locale);
  const s1 = shortMonth(m1, locale);
  const s2 = shortMonth(m2, locale);
  if (start === end) return `${a} ${s1}${tail}`;
  if (y1 !== y2) return `${a} ${s1} ${y1} – ${b} ${s2} ${y2}`;
  if (m1 === m2) return `${a}–${b} ${s2}${tail}`;
  return `${a} ${s1} – ${b} ${s2}${tail}`;
}

/** "7 October 2026" from a timestamp ("7 octobre 2026"). */
export function longDate(ts, locale = 'en') {
  const d = new Date(ts);
  return `${day(d.getUTCDate(), locale)} ${monthName(d.getUTCMonth() + 1, locale)} ${d.getUTCFullYear()}`;
}

export const monthOf = (date) => parts(date)[1];

/** The rounds an event holds: `round_numbers` (a double-header holds two), else `round_number`, else none. */
export const roundsOf = (r) =>
  r.round_numbers?.length ? r.round_numbers : r.round_number != null ? [r.round_number] : [];

/**
 * "Round 3", "Rounds 1–2" for a double-header, "Rounds 4, 6" when they do not follow.
 * French: "Manche 3", "Manches 1 et 2", "Manches 1 à 3", "Manches 4, 6".
 */
function numbered(n, locale) {
  const o = { locale };
  if (n.length === 0) return null;
  if (n.length === 1) return m.cal_round({ n: n[0] }, o);
  const run = n.every((x, i) => i === 0 || x === n[i - 1] + 1);
  if (!run) return m.cal_rounds_list({ list: n.join(', ') }, o);
  return n.length === 2
    ? m.cal_rounds_pair({ from: n[0], to: n.at(-1) }, o)
    : m.cal_rounds_run({ from: n[0], to: n.at(-1) }, o);
}

/** "Round 3 · Endurance Cup", "Rounds 1–2", or the kind for a test or media day without a label. */
export function roundLabel(r, locale = 'en') {
  // A bare "Round" (the source printed no number) says nothing: never guessed from the order.
  const raw = r.round_label?.trim() ?? '';
  // The catalog writes its labels in English: "Round 3" is rewritten in the page's language from the numbers.
  const given =
    /^rounds?$/i.test(raw) || (locale !== 'en' && /^rounds?\s+\d/i.test(raw) && roundsOf(r).length)
      ? null
      : r.round_label;
  const label =
    given ??
    numbered(roundsOf(r), locale) ??
    (r.kind === 'test' ? m.cal_test({}, { locale }) : null);
  return [label, r.sub_label].filter(Boolean).join(' · ');
}

/**
 * The round's name, unless it only repeats the venue ("Circuit de Magny-Cours" at "Circuit de Nevers Magny-Cours");
 * `short` also drops a name that repeats the venue's short name ("Portimao" under a "Portimão" heading).
 */
const GENERIC =
  /\b(?:circuit|circuito|autodromo|autódromo|international|internacional|raceway|speedway|motorsport|park|de|del|di|du|the|of)\b/g;
export function roundName(r, { short = false } = {}) {
  const n = (s) =>
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(GENERIC, '')
      .replace(/[^a-z0-9]+/g, '');
  const name = n(r.name);
  const repeats = (v) => {
    const venue = n(v ?? '');
    return (
      venue && (venue.includes(name) || name.includes(venue)) && name.length <= venue.length + 2
    );
  };
  return name && (repeats(r.venue_name) || (short && repeats(r.venue_short_name))) ? null : r.name;
}
