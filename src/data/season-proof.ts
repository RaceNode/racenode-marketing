// Who RaceNode was used with through the 2026 season, shown in the home hero's dark band (LandingSeasonProof.astro).
// Championships only: no team is named without its agreement. Logos in their own colors, in the version made for a
// dark background: the calendar's (/calendar/logos/<slug>.webp, src/lib/calendar/logos.mjs) when it is that version,
// otherwise the championship's own, kept in public/season/ with its source below. `plate`: no dark-background version
// found, the logo sits on a light plate so it stays legible. A partner team's entry can be added here later.
export type SeasonProofItem = { name: string; logo: string; plate?: boolean };

export const seasonProofLabel =
  'Used through the 2026 GT World Challenge Europe and McLaren Trophy seasons, part of Italian GT, and a Formula 2 race weekend.';

export const seasonProof: SeasonProofItem[] = [
  // The calendar's logo is the dark-background version (white lettering).
  { name: 'GT World Challenge Europe', logo: '/calendar/logos/gt-world-challenge-europe.webp' },
  // White version from the cover of McLaren's 2026 championship brochure:
  // https://website-images.mclaren.com/5290/McLaren-Trophy-Europe-2026---Championship-Brochure.pdf
  { name: 'McLaren Trophy', logo: '/season/mclaren-trophy-europe-on-dark.webp' },
  // Only a light-background version exists (catalog, ACI Sport): navy lettering, on a plate.
  { name: 'Italian GT', logo: '/calendar/logos/italian-gt-endurance.webp', plate: true },
  // The version fiaformula2.com shows on its dark header (blue F2, white FIA lettering): https://www.fiaformula2.com/
  { name: 'Formula 2', logo: '/season/fia-formula-2-on-dark.webp' },
];
