# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RaceNode Marketing is the public-facing marketing website for RaceNode, a multi-tenant management platform for racing teams. This site is separate from the main app (`app.racenode.com`) for SEO and performance optimization.

## Tech Stack

- **Framework**: Astro 7 (static site generation)
- **Styling**: Tailwind CSS 4
- **Content**: MDX support for markdown pages

## Commands

```bash
npm run dev      # Start dev server (localhost:4321)
npm run build    # Build to ./dist/
npm run preview  # Preview production build
```

## Architecture

Pages compose section components from feature-specific subdirectories:

- `src/pages/index.astro` → uses `src/components/landing/*.astro`
- `src/pages/logistics.astro` → uses `src/components/logistics/*.astro`
- `src/pages/management.astro` → uses `src/components/management/*.astro`
- `src/pages/pricing.astro` → self-contained (no section components)
- `src/pages/calendar/` → public race calendar (upcoming rounds of all championships in date order + one page per championship at `/calendar/<series slug>/` + one page per circuit at `/calendar/circuits/<venue slug>/`, stable URLs), built from the app's championship catalog; see below

All pages wrap content in `BaseLayout.astro` (SEO meta, JSON-LD schemas) with shared `Header` and `Footer`. Name, URL, contact, social profiles and the legal identity live once in `src/site.config.ts` (as in the WBLT template).

## Key Directories

```
src/
├── assets/screenshots/  # Product screenshots (imported via Astro Image); `*-phone.png` = the app's phone layout, shown below sm by Shot.astro
├── analytics/           # Analytics brick of the WBLT site template (see "Analytics and consent")
├── components/          # Shared (Header, Footer) + feature subdirs
├── data/legal/          # Markdown legal documents (rendered by legal pages); legal-notice.mdx reads site.legal
├── lib/seo.ts           # JSON-LD builders (pure, tested by tests/unit/seo.test.ts, npm run test:unit)
├── site.config.ts       # Name, URL, contact, social, legal identity: the single place
├── layouts/             # BaseLayout.astro (SEO, structured data), LegalLayout.astro
├── pages/               # index, module pages, crew-app, pricing, terms, privacy, account-deletion, legal-notice
└── styles/              # tokens.css (brand tokens: fonts, colours, as in the WBLT template), global.css (Tailwind entry, fonts, typography plugin, base and recipes, imported by BaseLayout)
public/
└── *.svg, *.png         # Logos, favicons, PWA icons (generated, see below)
scripts/brand/
├── logo.mjs             # Builds the logo lockups (public/logo_*.svg, public/email/logo-*.png) from favicon.svg + IBM Plex
├── generate.mjs         # Brand kit (brand/social/: avatars, LinkedIn banners) + public/og-image.png
├── carousel.mjs         # LinkedIn/Instagram carousels (PNG slides + PDF) from a JSON kept outside this public repo
scripts/screenshots/
├── capture.mjs          # Product screenshots (desktop 3840×2160 + phone 1170×2532) taken in the live app on the demo org, read-only; run through infisical run (see its header)
└── files/               # Made-up documents the import screenshots drop (agency confirmation, organizer timetable)
scripts/seo/
└── indexnow.mjs         # Pings IndexNow (Bing…) with the live sitemap after a deploy; key file = public/<key>.txt
scripts/store/
└── check.mjs            # Checks store/listing.json against App Store / Play limits (also runs in npm run build)
store/
└── listing.json         # App Store + Play listing copy per locale; the app repo's mobile release workflow publishes it
```

## Brand

The logo is the store icon mark (the R node, `public/favicon.svg`) plus "RaceNode" in IBM Plex Sans 600. The old italic wordmark with the red streak is retired. Never edit `public/logo_*.svg`, `public/email/logo-*.png` or `public/og-image.png` by hand: run `node scripts/brand/logo.mjs` then `node scripts/brand/generate.mjs`.

## Design System

Dark theme mirroring the app's design system. Tokens are defined in `src/styles/tokens.css` (mirror of the app's `src/index.css`; source of truth: `docs/architecture/design-system.md` in the app repo). **Color signals a state, never a category** — no module colors, no gradients.

- **Background**: `bg-gray-950` (main), `bg-gray-900` (cards), `border-gray-800`
- **Text**: `text-white` (primary), `text-gray-400` (secondary)
- **Accent**: indigo, via tokens only — `bg-accent hover:bg-accent-hover` for CTAs; never a literal color class

## Related Project

- **App**: `C:\script\RaceNode\racenode` - Main React app at `app.racenode.com`
- **Links**: Header links point to `https://app.racenode.com/login` and `/signup`
- **Site URL**: `https://www.racenode.com` (configured in astro.config.mjs)

## SEO Features

- Sitemap auto-generated via `@astrojs/sitemap`; `src/pages/404.astro` makes unknown URLs return a real 404 (Pages would otherwise serve the home page with a 200)
- `public/llms.txt`: plain summary of the product for AI assistants; keep it in line with the pages when modules or pricing change
- JSON-LD from `src/lib/seo.ts`: Organization, WebSite, SoftwareApplication in BaseLayout (one Organization `@id`, referenced by the others); BreadcrumbList and FAQPage on the pages that show them. The calendar pages still write their own
- Open Graph and Twitter meta tags on all pages

## Analytics and consent

- `src/analytics/`, `Analytics.astro`, `AnalyticsDisclosure.astro` and `vitest.config.ts` are the analytics brick of the WBLT site template (`~/script/wblt/templates/template-site`), kept as close to it as possible so changes can travel both ways; the deviations are listed in the PR that brought it (consent-banner). `src/paraglide/` is a stub that gives the brick its English messages (banner texts live there), `src/site.config.ts` its `hosting`.
- Tool: PostHog (`ANALYTICS_PROVIDER=posthog` + `PUBLIC_POSTHOG_KEY` in the Cloudflare Pages env; absent in dev, so nothing runs locally). Before a choice or after "Reject", it measures with nothing stored (memory persistence); after "Accept", a first-party cookie `ph_<key>_posthog` on www only, and links to `https://app.racenode.com` carry `?ph=<distinct_id>` (the app reads it; `POSTHOG_HANDOFF_ORIGINS` in `config.ts`). "Cookie settings" in the footer reopens the choice; withdrawing erases the cookie.
- Banner styling: `#cc-main` variables in `src/styles/global.css`, tokens only. Tests: `npm run test:unit`.
- One deviation from the brick: `boot.ts` starts after the `load` event, in an idle moment (banner and PostHog, ~100 KB, out of the first render). Candidate for the template.

## Race calendar

- Static like the rest of the site, plus one Pages Function (the relay below; free plan only, no Workers Paid plan: Willi, 2026-10-07, so no Durable Objects and no rate-limit binding). Built from the catalog at every deploy, and every morning by the systemd timer `racenode-site-rebuild` on wblt-server (06:45 Paris time; by hand: `sudo systemctl start racenode-site-rebuild.service`, log: `journalctl -u racenode-site-rebuild`): that is what Google indexes.
- Source and data (`catalogSource` in `src/lib/calendar/contract.mjs`): the motorsport-data API only (`https://api.wblt-engineering.com/motorsport/v1`, WBLT-Engineering/motorsport-data), with `MOTORSPORT_DATA_API_KEY` (Cloudflare Pages env, production and preview, encrypted; Infisical racenode `prod/main` `MOTORSPORT_DATA_API_KEY_SITE`), read by the build and the relay. The app's old catalog views are gone (2026-10-14): without the key the build fails. Server-side only: the key travels in an `Authorization` header and never reaches a page (Willi, 2026-10-11: the pages stay public, bulk downloads must not be one request away). The contract keeps its fields only, the API's nested fields flattened to its columns; removed rounds never reach a page. Build side: `src/lib/calendar/build.mjs`; a failing read fails the build, so the last good deploy stays online.
- The relay (`functions/calendar/api/catalog.js` → `src/lib/calendar/relay.mjs`, `GET /calendar/api/catalog[?series=<slug>]`): the only door to the catalog for a browser. It answers the whole catalog or one championship (the contract's fields, nothing else), from the edge cache for 5 minutes, to same-origin browser requests only (`Sec-Fetch-Site`), within a budget of 30 requests per IP and minute (kept in the isolate's memory: it stops a burst from one address, not a crawler spread over many). No PostgREST filter, column or ordering of the caller's choosing goes through; a database error says nothing about the database. One request per page view, against the free plan's 100,000 a day.
- In the visitor's browser (`src/components/calendar/LiveRefresh.astro`, `src/lib/calendar/refresh.mjs`): the page asks the relay again and replaces what changed since the build. The parts it may replace carry `data-calendar-live` and the hash of their build render; the browser renders with the same pure functions (`src/lib/calendar/render.mjs`: no clock, country names shipped by the build) and touches the page only if its hash differs. No JavaScript, or the relay or the API down: the morning's version stays, nothing visible. Index: summary + rounds (~50 KB of JSON); a championship page: its championship only (~3 KB). Same weekends and related championships wait for the next build.
- The index lists rounds not over on the build's day (`ctx.today`), every season mixed by month; rounds already run stay on the championship and circuit pages. Filters: discipline, region, circuit, month.
- Circuit pages: a venue with 3+ race or test rounds in the catalog (rounds, not events: a double-header folded into one event counts its `round_numbers`) (`CIRCUIT_PAGE_MIN_ROUNDS`, model.mjs); its URL comes from the venue's name (`circuit-de-la-sarthe`), never from the catalog's `venue_slug` (it carries references such as `le-mans-fr-q174090` that may be cleaned up), with the country only when two venues share a name. Renaming a venue in the catalog moves its URL. The build ships the circuit pages (`venue_slug` → URL slug) in `ctx.circuitPages` (a championship page only reads its own rounds in the browser). `circuits` is reserved: a series with that slug fails the build.
- `render.mjs` is the only place the refreshable parts are written: change their markup there, never in the `.astro` pages. The index rows' classes live in `src/styles/global.css` (`.calendar-row`), not in each of the ~800 rows.
- Sample data (`src/data/calendar/sample.json`, a real extract) only where `CALENDAR_SAMPLE=1` (preview env, never production) and the API key is missing or the API does not answer: pages then say "sample data" and are noindex, and the browser re-reads a static copy of the relay's answer (`/calendar/sample-api/catalog.json`) through the same code.
- Tests: `npm run test:calendar` (contract, model, render, the browser refresh against the sample served as the relay, the relay's refusals, budget and cache, no key in a page).
- Logos (Willi, 2026-10-08, on condition that 80% of the championships have one; 114 of 126 on 2026-10-12): the championships' official logos, hosted by us, never linked directly. The build reads `logo_url` / `logo_light_url` / `logo_dark_url` from the API's series (`fetchCatalog(..., { logos: true })`: the relay does not ask, so the browser never sees them), `src/lib/calendar/logos.mjs` downloads each one and turns it into a small webp, and `src/pages/calendar/logos/[slug].webp.ts` serves it at `/calendar/logos/<slug>.webp`. The light variant is shown on paper; a logo made for a dark background sits on an ink chip. A logo missing or failing to download: the row stays text, the build goes on. `ctx.logos` (slug → tone) tells render.mjs which championships have one, so the browser's re-render finds the same markup and never builds a path from anything but the slug; `render.mjs` stays the only place that writes them (fixed 48×32 box, lazy, to keep ~800 rows from jumping). Guardrail: `node scripts/guardrails.mjs --dist` (run by `npm run build` after `astro build`) fails if anything in `dist/` mentions `supabase.co`.
- Rules (Willi, 2026-10-07): dates and venues only; no organizer document, link to the official page; never team data, raw scrapes or logs. A season not published yet says so and shows the last one known.
- The CTA invites to sign up; it does not promise an import until the app can adopt a catalog season.

## Écarts au template WBLT

The site follows the WBLT site template (`~/script/wblt/templates/template-site`, Willi 2026-10-13: "RaceNode, ça va être quand même un site WBLT"): a template brick is copied as is when it serves, adapted only where the site requires it. Every deviation is listed here on purpose, so do not "fix" one back to the template:

- **Cloudflare Pages, not Workers + assets**: no `wrangler.jsonc`, no `@astrojs/cloudflare`, no `src/hosting/`, no `npm run serve`, no `worker-configuration.d.ts` in `tsconfig.json`, no deployment in CI. Pages deploys on push; the relay is a Pages Function. See [docs/deployment.md](docs/deployment.md).
- **One language, no Paraglide**: pages at the root (the template's single-language layout), texts in the components; no `messages/`, `project.inlang/`, `middleware.ts`.
- **No contact form**: contact by `mailto:`, the journey is the app signup.
- **Two test runners**: Vitest for the TypeScript units, as in the template (`npm run test:unit`: analytics, seo); the calendar and guardrail tests stay on `node --test` (`test:calendar`, `test:guardrails`), not converted.
- **Lighthouse** (`tests/lighthouse.mjs`, `npm run test:lighthouse`, also in CI): the template's script and targets, on `astro preview` or the live site (`LIGHTHOUSE_BASE`), information only (`LIGHTHOUSE_STRICT=1` fails as in the template). Scores depend on the machine's CPU: compare before/after on the same machine, ideally a quiet one (a GitHub runner), never against a number taken elsewhere.
- **Performance settings from the template**: `build.inlineStylesheets: 'always'`, first-screen fonts preloaded (`src/styles/fonts.ts`, three files). The calendar refresh (`LiveRefresh.astro`) also waits for the load event.
- **`src/site.config.ts` is reduced**: no `hosting`, `locales`, `contactForm`, `sections`, `nav`, `profiles` or local business; `business` keeps only description, logo, founder. `src/lib/seo.ts` keeps the template's helpers as they are, with RaceNode's own Organization (founder, contact point, store listings passed by the caller, `data/stores.ts` staying their single source) and SoftwareApplication; `hosting: 'cloudflare-pages'`, a value the template does not have (no `/api/geo`).
- **Prettier**: the template's config; `.prettierignore` also leaves out the legal texts (`src/data/legal`: their exact markdown is the published document), `store/listing.json`, the calendar sample and `public/`.
- **ESLint**: the template's config plus one override, `no-explicit-any` off in `src/pages/calendar/**` (its data comes from the untyped `.mjs` of `src/lib/calendar`).
- **The site's components and token names** (`concrete`, `asphalt`…) stay, in the template's `tokens.css`; the web fonts are imported in `global.css` (the template uses the system stack); the template's `Hero`/`Cta`/… examples are not used.
- **Ahead of the template**: guardrails in the build, `STABLE_URLS`, the calendar relay; candidates to bring up to it.
- `renovate.json` extends the private preset `WBLT-Engineering/renovate-config`: Renovate needs access to both organizations.

## Content Notes

- Legal docs (terms, privacy, account-deletion, legal-notice) are markdown in `src/data/legal/`, rendered by their pages via `LegalLayout.astro` — edit the `.md`/`.mdx` files, not the pages. The legal notice's company, address, registration, publisher and host come from `site.legal` in `src/site.config.ts`
- `/account-deletion` is declared in Google Play Console (Data Safety form) — keep the URL stable; it and the other stable URLs (`STABLE_URLS` in `scripts/guardrails.mjs`) fail the build if their page disappears
- Pricing and features are hardcoded in components (update manually if changed)
- Guardrails: `scripts/guardrails.mjs` (`npm run guardrails`, its test `npm run test:guardrails`; also run by `npm run build`, so a violation blocks the Cloudflare deploy) holds the rules that already drifted (literal colors, pricing promises, banned SEO words, conflict detection). If it fails, fix the copy; a rule only changes with Willi's agreement.
