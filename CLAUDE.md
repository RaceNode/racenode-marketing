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
├── layouts/             # BaseLayout.astro (SEO, structured data)
├── pages/               # index, logistics, management, pricing, terms, privacy
└── styles/              # global.css (Tailwind import)
public/
├── docs/legal/          # Markdown legal documents
└── *.svg, *.png         # Logos, favicons, PWA icons
```

## Design System

Dark theme matching the app:
- **Background**: `bg-gray-950` (main), `bg-gray-900` (cards)
- **Text**: `text-white` (primary), `text-gray-400` (secondary)
- **Borders**: `border-gray-800`
- **Accent**: `green-600` (CTAs), module colors for features

## Related Project

- **App**: `C:\script\RaceNode` - Main React app at `app.racenode.com`
- **Links**: Header links point to `https://app.racenode.com/login` and `/signup`
- **Site URL**: `https://www.racenode.com` (configured in astro.config.mjs)

## SEO Features

- Sitemap auto-generated via `@astrojs/sitemap`
- JSON-LD schemas (Organization, SoftwareApplication) in BaseLayout
- Open Graph and Twitter meta tags on all pages

## Content Notes

- Legal docs (terms, privacy) are in `/public/docs/legal/` as markdown
- Pricing and features are hardcoded in components (update manually if changed)
- Module list in FeaturesSection.astro matches app modules
