# Deployment and operations

The site follows the WBLT site template (`WBLT-Engineering/template-site`) where its bricks fit, with one big difference: it is hosted on **Cloudflare Pages** (Git integration), not on Workers + assets. What differs from the template and why: "Écarts au template WBLT" in [CLAUDE.md](../CLAUDE.md).

## How a change goes live

Cloudflare Pages project `racenode-marketing` (RaceNode account), connected to this GitHub repository.

| Event          | What happens                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------- |
| Push to `main` | Pages runs `npm run build` and publishes `dist/` on www.racenode.com                         |
| Push to a branch | Pages publishes a preview (`<branch>.racenode-marketing.pages.dev`), with the preview env   |
| Every day 06:45 UTC | n8n workflow `racenode-site-rebuild` asks the Pages API for a new production deployment, so the race calendar follows the catalog |

The "Cloudflare Pages" check on the commit turns green once the deployment is live. A failing build (guardrails, `store/listing.json`, calendar read) publishes nothing: the last good deployment stays online. Rollback: "Rollback to this deployment" on an earlier deployment in the Pages dashboard.

GitHub Actions (`.github/workflows/ci.yml`, the template's checks without its deployment block) checks every push to `main` and every pull request: tests, then the build on the calendar's sample data. It deploys nothing.

`npm run build` = `scripts/store/check.mjs` (store listing limits), `scripts/guardrails.mjs` (content rules), `astro build`, then `guardrails.mjs --dist` (the built pages). Node version: `.node-version`, read by the Pages build image (v3); no `NODE_VERSION` variable on the project, keep it that way so the file stays the only source.

## Variables (Pages project settings)

| Name                                          | Env                 | Role                                                                                       |
| --------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| `CATALOG_SUPABASE_URL`, `CATALOG_SUPABASE_KEY` | production, preview | Catalog read by the build and the relay. The key is a Supabase secret key, encrypted       |
| `CALENDAR_SAMPLE`                             | preview only        | `1`: sample calendar data when the views do not answer (pages flagged and noindex)         |
| `PUBLIC_POSTHOG_KEY`                          | production, preview | PostHog project key (public by design)                                                     |

The values live in the Pages project and in Infisical (`racenode`), never in this public repository.

## Request-time code

Only one: the Pages Function `functions/calendar/api/catalog.js` (the calendar relay, see "Race calendar" in CLAUDE.md). Headers and redirects are the static `public/_headers` and `public/_redirects`, served by Pages.

## Local

```sh
npm run dev                  # design work, http://localhost:4321
npm run build && npm run preview
npx wrangler pages dev dist  # with the relay; variables in .dev.vars (git-ignored)
```

Without the catalog variables, `CALENDAR_SAMPLE=1 npm run build` builds on the sample data.

## After a deploy that changed pages

`node scripts/seo/indexnow.mjs` pings IndexNow with the live sitemap.
