# Languages

The site is in English and French. English, the language it was first published in, stays at the root (`/calendar/`); every other language lives under its prefix (`/fr/calendar/`). It is the "default language at the root" mode of the WBLT site template: adding a language moves no address already online.

## How it works

- **Declaration**: `locales`, `defaultLocale` and `prefixDefaultLocale` in `src/site.config.ts`, the first two repeated in `project.inlang/settings.json`; `localeTags` gives each its BCP 47 tag (`og:locale`, `Intl`).
- **Copy**: one file per language, `messages/<language>.json`, compiled by Paraglide into `src/paraglide/` (generated, not committed: `npm run i18n:compile`, run by `build` and `test:calendar`). A component calls `m.key()`; the current language is `getLocale()`, set per page by `src/middleware.ts` from the URL. Code that also runs in the browser (`src/lib/calendar/render.mjs`) passes the language explicitly: `m.key(params, { locale })`. A key missing from a language fails nothing at compile time but falls back to the base language: check the page.
- **Pages**: `src/pages/[...locale]/`; the segment is the language, or empty for English. Every page declares the languages it is built in through `localePathsOf('<path>')` (`src/i18n/index.ts`).
- **Pages not translated yet**: `notYet` in `src/i18n/index.ts`. Such a page is not built in that language, links to it lead to English, and it carries no `hreflang` to that language.
- **Links**: `link(locale, 'pricing')` is the only way to link to a page. Links to the app go through `appUrl(locale, path)` (`src/lib/app.ts`), which knows which languages the app speaks.
- **Search engines**: each page has its canonical URL, `hreflang` links to the languages it exists in plus `x-default` (English), and `og:locale`. The sitemap has one file per language besides English (`sitemap-fr-0.xml`), all listed in `sitemap-index.xml`, each URL with its `xhtml:link` alternates. No redirect on the browser's language: every version is reachable and crawlable. `/en/…` answers a 301 to the root (`public/_redirects`).
- **AI search**: `public/llms.txt` (English) points to `public/<language>/llms.txt`.
- **Legal texts**: one file per text and language in `src/data/legal/`.
- **Guardrails** (`scripts/guardrails.mjs`) read `messages/` too, with French forms of the rules. Price figures may only sit in the pricing page's own keys (`pricing_…`).

## Adding a language (German, Italian…)

1. Add it to `locales` and `localeTags` in `src/site.config.ts` and to `project.inlang/settings.json`.
2. Copy `messages/en.json` to `messages/<language>.json` and write every value in that language: rewritten for what a team in that country searches, not translated word for word. Same keys.
3. Start `notYet.<language>` in `src/i18n/index.ts` with the pages not written yet, and empty it as they are done (the calendar first: it is the most searched part).
4. Write `public/<language>/llms.txt` and add its link to `public/llms.txt`.
5. Legal texts: add the language's files in `src/data/legal/`.
6. Add the language's forms to the copy rules of `scripts/guardrails.mjs` (withdrawn promises, conflict detection) and to the pricing gate (`scripts/pricing-push-gate.mjs`). Prices in a new language need Willi's yes like any price wording.
7. `npm run build`, then check a page of each kind in the new language (title, H1, `hreflang`, links stay in the language) and the new `sitemap-<language>-0.xml`.

Nothing else changes: the layout, the components and the calendar read the language from the URL.
