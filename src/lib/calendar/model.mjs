// From the catalog's three lists to what the calendar pages show. Pure functions, tested in calendar.test.mjs.

/**
 * The season teams are looking for: next year's from July (2027 calendars come out between September and
 * December), this year's before.
 */
export const featuredYear = (today) => (today.getUTCMonth() >= 6 ? today.getUTCFullYear() + 1 : today.getUTCFullYear());

const byDate = (a, b) => a.start_date.localeCompare(b.start_date) || (a.round_number ?? 0) - (b.round_number ?? 0);

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

/** Every round of a year across championships, by date: the calendar page's rows. */
export function roundsOfYear(calendar, year) {
  const out = [];
  for (const c of calendar.championships)
    for (const season of c.seasons)
      if (season.year === year) for (const r of season.rounds) out.push({ ...r, championship: c });
  return out.sort((a, b) => byDate(a, b) || displayName(a.championship).localeCompare(displayName(b.championship)));
}

/** Years that have at least one round, latest first. */
export const years = (calendar) => [...new Set(calendar.championships.flatMap((c) => c.seasons.map((s) => s.year)))].sort((a, b) => b - a);

/** Championships with no season for the featured year yet, with the latest season they do have. */
export const notPublished = (calendar) => calendar.championships.filter((c) => !c.featured);

/** Other championships racing at the same venue within a day of one of this season's rounds. */
export function sharedWeekends(calendar, championship) {
  const out = new Map();
  for (const r of championship.shown.rounds) {
    for (const c of calendar.championships) {
      if (c.slug === championship.slug) continue;
      for (const season of c.seasons) {
        for (const o of season.rounds) {
          if (o.venue_slug !== r.venue_slug || !overlaps(r, o)) continue;
          if (!out.has(c.slug)) out.set(c.slug, { championship: c, count: 0 });
          out.get(c.slug).count += 1;
        }
      }
    }
  }
  return [...out.values()].sort((a, b) => b.count - a.count || displayName(a.championship).localeCompare(displayName(b.championship)));
}

const DAY = 86400000;
function overlaps(a, b) {
  const t = (d) => Date.parse(`${d}T00:00:00Z`);
  return t(a.start_date) <= t(b.end_date) + DAY && t(b.start_date) <= t(a.end_date) + DAY;
}
