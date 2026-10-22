// Who RaceNode was used with through the 2026 season, shown under the home hero (LandingSeasonProof.astro).
// Championships only: no team is named without its agreement. Logos are the ones the calendar already serves
// (/calendar/logos/<slug>.webp, src/lib/calendar/logos.mjs); a partner team's entry can be added here later.
export type SeasonProofItem = { name: string; logo: string };

export const seasonProofLabel = 'Used through the 2026 season in';

export const seasonProof: SeasonProofItem[] = [
  { name: 'GT World Challenge Europe', logo: '/calendar/logos/gt-world-challenge-europe.webp' },
  { name: 'McLaren Trophy Europe', logo: '/calendar/logos/mclaren-trophy-europe.webp' },
  { name: 'Italian GT Endurance', logo: '/calendar/logos/italian-gt-endurance.webp' },
];
