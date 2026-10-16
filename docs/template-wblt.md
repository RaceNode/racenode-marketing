# Deviations from the WBLT template

The site follows the WBLT site template (`~/script/wblt/templates/template-site`, Willi 2026-10-13: "RaceNode, ça va être quand même un site WBLT"): a template brick is copied as is when it serves, adapted only where the site requires it. Every deviation is listed here on purpose, so do not "fix" one back to the template:

- **Cloudflare Pages, not Workers + assets**: no `wrangler.jsonc`, no `@astrojs/cloudflare`, no `src/hosting/`, no `npm run serve`, no `worker-configuration.d.ts` in `tsconfig.json`, no deployment in CI. Pages deploys on push; the relay is a Pages Function. See [deployment.md](deployment.md).
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
