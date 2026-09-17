# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RaceNode Marketing is the public-facing marketing website for RaceNode, a multi-tenant ERP platform for racing teams. This site is separate from the main app (`app.racenode.com`) for SEO and performance optimization.

## Tech Stack

- **Framework**: Astro 5 (static site generation)
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
- `src/pages/pricing.astro` → uses `src/components/pricing/*.astro`

All pages wrap content in `BaseLayout.astro` (SEO meta, JSON-LD schemas) with shared `Header` and `Footer`.

## Key Directories

```
src/
├── assets/screenshots/  # Product screenshots (imported via Astro Image)
├── components/          # Shared (Header, Footer) + feature subdirs
├── data/legal/          # Markdown legal documents (rendered by legal pages)
├── layouts/             # BaseLayout.astro (SEO, structured data), LegalLayout.astro
├── pages/               # index, logistics, management, pricing, terms, privacy, account-deletion
└── styles/              # global.css (Tailwind entry + typography plugin, imported by BaseLayout)
public/
└── *.svg, *.png         # Logos, favicons, PWA icons (generated, see below)
scripts/brand/
├── logo.mjs             # Builds the logo lockups (public/logo_*.svg, public/email/logo-*.png) from favicon.svg + IBM Plex
└── generate.mjs         # Social media kit (brand/social/) + public/og-image.png; post copy in posts.json
```

## Brand

The logo is the store icon mark (the R node, `public/favicon.svg`) plus "RaceNode" in IBM Plex Sans 600. The old italic wordmark with the red streak is retired. Never edit `public/logo_*.svg`, `public/email/logo-*.png` or `public/og-image.png` by hand: run `node scripts/brand/logo.mjs` then `node scripts/brand/generate.mjs`.

## Design System

Dark theme mirroring the app's design system. Tokens are defined in `src/styles/global.css` (mirror of the app's `src/index.css`; source of truth: `docs/architecture/design-system.md` in the app repo). **Color signals a state, never a category** — no module colors, no gradients.
- **Background**: `bg-gray-950` (main), `bg-gray-900` (cards), `border-gray-800`
- **Text**: `text-white` (primary), `text-gray-400` (secondary)
- **Accent**: indigo, via tokens only — `bg-accent hover:bg-accent-hover` for CTAs; never a literal color class

## Related Project

- **App**: `C:\script\RaceNode` - Main React app at `app.racenode.com`
- **Links**: Header links point to `https://app.racenode.com/login` and `/signup`
- **Site URL**: `https://www.racenode.com` (configured in astro.config.mjs)

## SEO Features

- Sitemap auto-generated via `@astrojs/sitemap`
- JSON-LD schemas (Organization, SoftwareApplication) in BaseLayout
- Open Graph and Twitter meta tags on all pages

## Content Notes

- Legal docs (terms, privacy, account-deletion) are markdown in `src/data/legal/`, rendered by their pages via `LegalLayout.astro` — edit the `.md` files, not the pages
- `/account-deletion` is declared in Google Play Console (Data Safety form) — keep the URL stable
- Pricing and features are hardcoded in components (update manually if changed)
- Module list in FeaturesSection.astro matches app modules
