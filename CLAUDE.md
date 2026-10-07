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

All pages wrap content in `BaseLayout.astro` (SEO meta, JSON-LD schemas) with shared `Header` and `Footer`.

## Key Directories

```
src/
├── assets/screenshots/  # Product screenshots (imported via Astro Image); `*-phone.png` = the app's phone layout, shown below sm by Shot.astro
├── components/          # Shared (Header, Footer) + feature subdirs
├── data/legal/          # Markdown legal documents (rendered by legal pages)
├── layouts/             # BaseLayout.astro (SEO, structured data), LegalLayout.astro
├── pages/               # index, module pages, crew-app, pricing, terms, privacy, account-deletion, legal-notice
└── styles/              # global.css (Tailwind entry + typography plugin, imported by BaseLayout)
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

Dark theme mirroring the app's design system. Tokens are defined in `src/styles/global.css` (mirror of the app's `src/index.css`; source of truth: `docs/architecture/design-system.md` in the app repo). **Color signals a state, never a category** — no module colors, no gradients.
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
- JSON-LD schemas (Organization, SoftwareApplication) in BaseLayout
- Open Graph and Twitter meta tags on all pages

## Race calendar

- Static like the rest of the site (no Worker: Willi, 2026-10-07, no Workers Paid plan). Built from the catalog at every deploy, and every morning by the n8n workflow `racenode-site-rebuild` (06:45 UTC): that is what Google indexes.
- Data: `src/lib/calendar/contract.mjs` reads three read-only views of the app's catalog (`catalog_public_series`, `catalog_public_seasons`, `catalog_public_events`) with `CATALOG_SUPABASE_URL` + `CATALOG_SUPABASE_KEY` (publishable key, Cloudflare Pages env; it ends up in the pages, that is what it is for). Only the contract's fields are kept; removed rounds never reach a page. Build side: `src/lib/calendar/build.mjs`; a failing read fails the build, so the last good deploy stays online.
- In the visitor's browser (`src/components/calendar/LiveRefresh.astro`, `src/lib/calendar/refresh.mjs`): the page reads the views again and replaces what changed since the build. The parts it may replace carry `data-calendar-live` and the hash of their build render; the browser renders with the same pure functions (`src/lib/calendar/render.mjs`: no clock, country names shipped by the build) and touches the page only if its hash differs. No JavaScript, or the views down: the morning's version stays, nothing visible. Index: summary + rounds (~50 KB of JSON); a championship page: its season part only (~3 KB). Same weekends and related championships wait for the next build.
- The index lists rounds not over on the build's day (`ctx.today`), every season mixed by month; rounds already run stay on the championship and circuit pages. Filters: discipline, region, circuit, month.
- Circuit pages: a venue with 3+ race or test rounds in the catalog (`CIRCUIT_PAGE_MIN_ROUNDS`, model.mjs); its URL comes from the venue's name (`circuit-de-la-sarthe`), never from the catalog's `venue_slug` (it carries references such as `le-mans-fr-q174090` that may be cleaned up), with the country only when two venues share a name. Renaming a venue in the catalog moves its URL. The build ships the circuit pages (`venue_slug` → URL slug) in `ctx.circuitPages` (a championship page only reads its own rounds in the browser). `circuits` is reserved: a series with that slug fails the build.
- `render.mjs` is the only place the refreshable parts are written: change their markup there, never in the `.astro` pages. The index rows' classes live in `src/styles/global.css` (`.calendar-row`), not in each of the ~800 rows.
- Sample data (`src/data/calendar/sample.json`, a real extract) only where `CALENDAR_SAMPLE=1` (preview env, never production) and the views do not answer: pages then say "sample data" and are noindex, and the browser re-reads static copies of the views (`/calendar/sample-api/`) through the same code.
- Tests: `npm run test:calendar` (contract, model, render, the browser refresh against the sample served as the views).
- Rules (Willi, 2026-10-07): dates and venues only; no organizer logo or document, link to the official page; never team data, raw scrapes or logs. A season not published yet says so and shows the last one known.
- The CTA invites to sign up; it does not promise an import until the app can adopt a catalog season.

## Content Notes

- Legal docs (terms, privacy, account-deletion, legal-notice) are markdown in `src/data/legal/`, rendered by their pages via `LegalLayout.astro` — edit the `.md` files, not the pages
- `/account-deletion` is declared in Google Play Console (Data Safety form) — keep the URL stable; it and the other stable URLs (`STABLE_URLS` in `scripts/guardrails.mjs`) fail the build if their page disappears
- Pricing and features are hardcoded in components (update manually if changed)
- Guardrails: `scripts/guardrails.mjs` (`npm run guardrails`, its test `npm run test:guardrails`; also run by `npm run build`, so a violation blocks the Cloudflare deploy) holds the rules that already drifted (literal colors, pricing promises, banned SEO words, conflict detection). If it fails, fix the copy; a rule only changes with Willi's agreement.
