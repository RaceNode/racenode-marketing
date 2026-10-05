# RaceNode Marketing

Public website of RaceNode, racing team management software: https://www.racenode.com. The app itself lives in a separate repository (`app.racenode.com`).

Astro (static output) + Tailwind CSS. Pushing to `main` deploys through Cloudflare Pages; the "Cloudflare Pages" check on the commit turns green once the site is live.

```sh
npm ci
npm run dev      # http://localhost:4321
npm run build    # checks store/listing.json, then builds to ./dist/
npm run preview  # serves ./dist/
```

Where things are, brand and design rules: [CLAUDE.md](CLAUDE.md).

- `src/` — pages, section components, legal texts (`src/data/legal/`)
- `scripts/brand/` — logo lockups, social kit, carousels (generated files, never edited by hand)
- `scripts/seo/indexnow.mjs` — IndexNow ping after a deploy
- `store/listing.json` — App Store and Google Play listing copy, published by the app's release workflow
- `docs/` — SEO reference, screenshots guide, store listing notes, email signatures
