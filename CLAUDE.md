# CLAUDE.md

Public marketing site of RaceNode (www.racenode.com), separate from the app (`app.racenode.com`, repo `~/script/RaceNode/racenode`). Astro 7, static, Tailwind 4, on Cloudflare Pages.

## Ship

- Push to main = live (Cloudflare Pages deploys on push; [docs/deployment.md](docs/deployment.md)). CI "Check, build, test" runs on every push, Prettier included: run `npm run format` before committing.
- `npm run build` also runs the guardrails (`scripts/guardrails.mjs`: literal colors, pricing promises, banned SEO words, conflict detection, stable URLs, no `supabase.co` in `dist/`). A violation blocks the deploy: fix the copy; a rule only changes with Willi's agreement.
- Tests: `npm run test:unit` (Vitest: analytics, seo), `npm run test:calendar`, `npm run test:guardrails`.
- This repo is public: no strategy, roadmap, prospects or secret values here (secrets live in Cloudflare Pages env and Infisical `racenode`).

## Rules that bite

- **Design**: dark theme mirroring the app (`src/styles/tokens.css`, source of truth `docs/architecture/design-system.md` in the app repo). Color signals a state, never a category: no module colors, no gradients, accent only through tokens (`bg-accent hover:bg-accent-hover`), never a literal color class.
- **Brand files are generated**: never edit `public/logo_*.svg`, `public/email/logo-*.png` or `public/og-image.png` by hand; run `node scripts/brand/logo.mjs` then `node scripts/brand/generate.mjs`.
- **Single source**: name, URL, contact, social profiles and legal identity live in `src/site.config.ts`; JSON-LD in `src/lib/seo.ts`; store links in `src/data/stores.ts`.
- **Legal texts** are markdown in `src/data/legal/`: edit those, not the pages. Never bump `public/privacy-version.json` without Willi's yes: it emails every account.
- **Stable URLs** (`STABLE_URLS` in the guardrails, e.g. `/account-deletion`, declared in Google Play) must never disappear.
- **Copy**: pricing and features are hardcoded in components; keep `public/llms.txt` in line when modules or pricing change. Store listing copy is `store/listing.json` (checked by `scripts/store/check.mjs`, published by the app's mobile release).
- **WBLT template**: the site follows `~/script/wblt/templates/template-site`, brick by brick, both ways (whichever performs better). Its deliberate deviations are listed in [docs/template-wblt.md](docs/template-wblt.md): do not "fix" one back to the template.

## Race calendar

Detail: [docs/calendar.md](docs/calendar.md). What must hold:

- Data comes only from the motorsport-data API (`MOTORSPORT_DATA_API_KEY`, server-side only: it never reaches a page). A failing read fails the build, so the last good deploy stays online. Rebuilt every morning at 06:45 Paris by the systemd timer `racenode-site-rebuild` on wblt-server.
- A browser reaches the catalog only through the relay (`functions/calendar/api/catalog.js`): contract fields only, no caller-chosen filter or column. Free Cloudflare plan only (Willi, 2026-10-07).
- `src/lib/calendar/render.mjs` is the only place the refreshable parts and logos are written; never their markup in the `.astro` pages.
- Circuit URLs come from the venue's name, never from `venue_slug`. `circuits` is a reserved series slug.
- Content (Willi, 2026-10-07): dates and venues only, link to the official page; never organizer documents, team data, raw scrapes or logs. The CTA invites to sign up; it does not promise an import.

## Analytics

PostHog behind the consent banner (analytics brick of the WBLT template); nothing runs in dev. Detail: [docs/analytics.md](docs/analytics.md).
