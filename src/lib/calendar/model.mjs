// From the catalog's three lists to what the calendar pages show. Pure functions, tested in calendar.test.mjs.

/**
 * The season teams are looking for: next year's from July (2027 calendars come out between September and
 * December), this year's before.
 */
export const featuredYear = (today) =>
  today.getUTCMonth() >= 6 ? today.getUTCFullYear() + 1 : today.getUTCFullYear();

const byDate = (a, b) =>
  a.start_date.localeCompare(b.start_date) || (a.round_number ?? 0) - (b.round_number ?? 0);

/**
 * One championship per series that has at least one round, with:
 * - `featured`: its season for the featured year, or null when the organizer has not published it yet;
 * - `shown`: what its page leads with, the featured season or else the latest season known;
 * - `seasons`: every season with rounds, latest first.
 */
export function buildCalendar(data, { today = new Date() } = {}) {
  const year = featuredYear(today);
  const rounds = new Map();
  for (const e of data.events) {
    const k = `${e.series_slug}|${e.season_label}`;
    if (!rounds.has(k)) rounds.set(k, []);
    rounds.get(k).push(e);
  }

  const championships = [];
  for (const s of data.series) {
    const seasons = data.seasons
      .filter((x) => x.series_slug === s.slug)
      .map((x) => ({ ...x, rounds: (rounds.get(`${s.slug}|${x.label}`) ?? []).sort(byDate) }))
      .filter((x) => x.rounds.length > 0)
      .sort((a, b) => b.year - a.year || b.label.localeCompare(a.label));
    if (seasons.length === 0) continue;
    const featured = seasons.find((x) => x.year === year) ?? null;
    championships.push({ ...s, seasons, featured, shown: featured ?? seasons[0] });
  }
  championships.sort((a, b) => displayName(a).localeCompare(displayName(b)));

  return { year, championships };
}

export const displayName = (s) => s.short_name || s.name;

/** Every round across championships and seasons, by date, each with its championship. */
export function allRounds(calendar) {
  const out = [];
  for (const c of calendar.championships)
    for (const season of c.seasons)
      for (const r of season.rounds) out.push({ ...r, championship: c });
  return out.sort(
    (a, b) =>
      byDate(a, b) || displayName(a.championship).localeCompare(displayName(b.championship)),
  );
}

/**
 * The calendar page's rows: every round not over by `today` ("YYYY-MM-DD"), whatever season it belongs to (Asian
 * Le Mans Series 2027 starts in November 2026: it sits in November 2026). Rounds already run stay on each
 * championship's and circuit's page.
 */
export const upcomingRounds = (calendar, today) =>
  allRounds(calendar).filter((r) => r.end_date >= today);

/** "Circuit de Spa-Francorchamps" → "circuit-de-spa-francorchamps", "Autódromo" → "autodromo". */
export const slugify = (name) =>
  String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Race or test rounds a circuit needs in the catalog (every season) to get its own page: below, a page would be
 * thin. A gala or a media day (kind 'other') does not make a venue a circuit. Rounds, not events: a double-header
 * (one event since the catalog folds a meeting, `round_numbers` {1,2}) counts two, so the fold moves no page away.
 */
export const CIRCUIT_PAGE_MIN_ROUNDS = 3;

/**
 * Every venue (keyed by the catalog's `venue_slug`) with its rounds (all seasons, by date), by name; `page` when it
 * has its own page. `slug`, its URL at /calendar/circuits/<slug>/, comes from its name, not from the catalog's slug
 * (which carries references such as "le-mans-fr-q174090" and may be cleaned up): the country is added only when two
 * venues share a name, and the catalog's slug only if they share the country too.
 */
export function circuits(calendar) {
  const out = new Map();
  for (const r of allRounds(calendar)) {
    if (!r.venue_slug) continue;
    if (!out.has(r.venue_slug)) out.set(r.venue_slug, { venue_slug: r.venue_slug, rounds: [] });
    const c = out.get(r.venue_slug);
    c.rounds.push(r);
    // The latest name and country the catalog gives.
    c.name = r.venue_name ?? c.name ?? r.venue_slug;
    c.country_code = r.venue_country_code ?? c.country_code ?? null;
  }
  const list = [...out.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.venue_slug.localeCompare(b.venue_slug),
  );
  const named = (c) => slugify(c.name) || slugify(c.venue_slug);
  const country = (c) => (c.country_code ? `${named(c)}-${c.country_code.toLowerCase()}` : null);
  const tally = (key) => list.reduce((m, c) => m.set(key(c), (m.get(key(c)) ?? 0) + 1), new Map());
  const byName = tally(named);
  const byCountry = tally(country);
  return list.map((c) => ({
    ...c,
    slug:
      byName.get(named(c)) === 1
        ? named(c)
        : country(c) && byCountry.get(country(c)) === 1
          ? country(c)
          : `${named(c)}-${slugify(c.venue_slug)}`,
    page:
      c.rounds
        .filter((r) => r.kind !== 'other')
        .reduce((n, r) => n + Math.max(1, r.round_numbers?.length ?? 0), 0) >=
      CIRCUIT_PAGE_MIN_ROUNDS,
  }));
}

/** Championships with no season for the featured year yet, with the latest season they do have. */
export const notPublished = (calendar) => calendar.championships.filter((c) => !c.featured);

/** Other championships at the same meeting (the catalog's `meeting_id`) as one of this season's rounds. */
export function sharedWeekends(calendar, championship) {
  const ids = new Set(championship.shown.rounds.map((r) => r.meeting_id).filter(Boolean));
  const out = new Map();
  for (const c of calendar.championships) {
    if (c.slug === championship.slug) continue;
    for (const season of c.seasons) {
      for (const o of season.rounds) {
        if (!ids.has(o.meeting_id)) continue;
        if (!out.has(c.slug)) out.set(c.slug, { championship: c, count: 0 });
        out.get(c.slug).count += 1;
      }
    }
  }
  return [...out.values()].sort(
    (a, b) =>
      b.count - a.count || displayName(a.championship).localeCompare(displayName(b.championship)),
  );
}

/** The name a calendar line gives a circuit ("Portimão"), never the event's name ("Portimao" at SRO). */
export const venueName = (r) => r.venue_short_name || r.venue_name || '';

/**
 * Rounds grouped by meeting: the events of every championship at one circuit on the same days share the catalog's
 * `meeting_id`; a round without one is a meeting of its own. Each meeting has its circuit (from its first round), its
 * dates (first start, last end of the rounds given) and its rounds in the order given; meetings by date, then name.
 */
export function meetingsOf(rounds) {
  const out = new Map();
  rounds.forEach((r, i) => {
    const k = r.meeting_id ?? `#${i}`;
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(r);
  });
  return [...out.values()]
    .map((list) => ({
      id: list[0].meeting_id ?? null,
      venue_slug: list[0].venue_slug,
      venue_name: list[0].venue_name,
      venue_short_name: list[0].venue_short_name,
      venue_country_code: list[0].venue_country_code,
      start_date: list.reduce((d, r) => (r.start_date < d ? r.start_date : d), list[0].start_date),
      end_date: list.reduce((d, r) => (r.end_date > d ? r.end_date : d), list[0].end_date),
      rounds: list,
    }))
    .sort(
      (a, b) =>
        a.start_date.localeCompare(b.start_date) || venueName(a).localeCompare(venueName(b)),
    );
}
