// Labels and dates as the calendar pages print them (English site, day-month order).

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

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
export const country = (code) => (code ? (regionNames.of(code) ?? code) : '');

const parts = (d) => d.split('-').map(Number);

/** "15–17 Apr", "30 Apr – 2 May", "28 Dec 2026 – 3 Jan 2027"; `withYear` adds the year at the end. */
export function dateRange(start, end, { withYear = false } = {}) {
  const [y1, m1, d1] = parts(start);
  const [y2, m2, d2] = parts(end);
  const tail = withYear ? ` ${y2}` : '';
  if (start === end) return `${d1} ${SHORT[m1 - 1]}${tail}`;
  if (y1 !== y2) return `${d1} ${SHORT[m1 - 1]} ${y1} – ${d2} ${SHORT[m2 - 1]} ${y2}`;
  if (m1 === m2) return `${d1}–${d2} ${SHORT[m2 - 1]}${tail}`;
  return `${d1} ${SHORT[m1 - 1]} – ${d2} ${SHORT[m2 - 1]}${tail}`;
}

/** "7 October 2026" from a timestamp. */
export function longDate(ts) {
  const d = new Date(ts);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export const monthOf = (date) => parts(date)[1];

/** The rounds an event holds: `round_numbers` (a double-header holds two), else `round_number`, else none. */
export const roundsOf = (r) =>
  r.round_numbers?.length ? r.round_numbers : r.round_number != null ? [r.round_number] : [];

/** "Round 3", "Rounds 1–2" for a double-header, "Rounds 4, 6" when they do not follow. */
function numbered(n) {
  if (n.length === 0) return null;
  if (n.length === 1) return `Round ${n[0]}`;
  const run = n.every((x, i) => i === 0 || x === n[i - 1] + 1);
  return `Rounds ${run ? `${n[0]}–${n.at(-1)}` : n.join(', ')}`;
}

/** "Round 3 · Endurance Cup", "Rounds 1–2", or the kind for a test or media day without a label. */
export function roundLabel(r) {
  // A bare "Round" (the source printed no number) says nothing: never guessed from the order.
  const given = /^rounds?$/i.test(r.round_label?.trim() ?? '') ? null : r.round_label;
  const label = given ?? numbered(roundsOf(r)) ?? (r.kind === 'test' ? 'Test' : null);
  return [label, r.sub_label].filter(Boolean).join(' · ');
}

/** The round's name, unless it only repeats the venue ("Circuit de Magny-Cours" at "Circuit de Nevers Magny-Cours"). */
const GENERIC =
  /\b(?:circuit|circuito|autodromo|autódromo|international|internacional|raceway|speedway|motorsport|park|de|del|di|du|the|of)\b/g;
export function roundName(r) {
  const n = (s) =>
    s
      .toLowerCase()
      .replace(GENERIC, '')
      .replace(/[^a-z0-9]+/g, '');
  const name = n(r.name);
  const venue = n(r.venue_name ?? '');
  return name &&
    venue &&
    (venue.includes(name) || name.includes(venue)) &&
    name.length <= venue.length + 2
    ? null
    : r.name;
}
