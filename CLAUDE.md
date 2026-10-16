# CLAUDE.md

Public marketing site of RaceNode (www.racenode.com), separate from the app (`app.racenode.com`, repo `~/script/RaceNode/racenode`). Static Astro on Cloudflare Pages, free plan only (Willi, 2026-10-07).

## Ship

- Push to main = live ([docs/deployment.md](docs/deployment.md)). CI checks Prettier: run `npm run format` before committing.
- `npm run build` runs the guardrails (`scripts/guardrails.mjs`); a violation blocks the deploy. Fix the copy; a rule only changes with Willi's agreement.
- This repo is public: no strategy, roadmap, prospects or secret values (secrets: Cloudflare Pages env, Infisical `racenode`).

## Rules that bite

- **Design**: mirrors the app (`src/styles/tokens.css`; source of truth `docs/architecture/design-system.md` in the app repo). Color signals a state, never a category: no module colors, no gradients, accent through tokens only (`bg-accent`), never a literal color class.
- **Generated brand files**: never edit `public/logo_*.svg`, `public/email/logo-*.png`, `public/og-image.png` by hand; run `node scripts/brand/logo.mjs` then `node scripts/brand/generate.mjs`.
- **Single source**: identity, contact and legal entity in `src/site.config.ts`.
- **Legal texts**: edit `src/data/legal/`, not the pages. Never bump `public/privacy-version.json` without Willi's yes: it emails every account.
- **Copy**: keep `public/llms.txt` in line when modules or pricing change. Store listing copy is `store/listing.json`, published by the app's mobile release.
- **WBLT template** (`~/script/wblt/templates/template-site`): aligned both ways, whichever performs better. Deliberate deviations in [docs/template-wblt.md](docs/template-wblt.md): do not "fix" one back.

## Race calendar

Detail: [docs/calendar.md](docs/calendar.md). What must hold:

- Data from the motorsport-data API only; its key stays server-side, and a browser reaches the catalog only through the relay (`functions/calendar/api/catalog.js`). Rebuilt daily at 06:45 Paris by the systemd timer `racenode-site-rebuild` on wblt-server.
- `src/lib/calendar/render.mjs` is the only place the refreshable parts and logos are written, never the `.astro` pages.
- Circuit URLs come from the venue's name, never from `venue_slug`.
- Content (Willi, 2026-10-07): dates and venues only, link to the official page; never organizer documents, team data or raw scrapes. The CTA does not promise an import.

## Analytics

PostHog behind the consent banner; nothing runs in dev. Detail: [docs/analytics.md](docs/analytics.md).
