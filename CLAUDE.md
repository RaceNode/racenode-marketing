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

## Project Structure

```
src/
├── components/     # Astro components (Header, Footer, sections)
├── layouts/        # BaseLayout.astro
├── pages/          # index, terms, privacy
└── styles/         # global.css (Tailwind import)
public/
├── docs/legal/     # Markdown legal documents
├── logo_*.svg      # Logo variants
└── pwa-*.png       # PWA/favicon icons
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

## Content Notes

- Legal docs (terms, privacy) are in `/public/docs/legal/` as markdown
- Pricing and features are hardcoded in components (update manually if changed)
- Module list in FeaturesSection.astro matches app modules
