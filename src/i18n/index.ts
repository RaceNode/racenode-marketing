/**
 * Locale helpers used by pages and components.
 *
 * Reading the current locale: `getLocale()` from `@/paraglide/runtime`,
 * set per request by the middleware. These helpers only build URLs and
 * static paths from the site configuration.
 *
 * Three routing modes, decided by `locales` and `prefixDefaultLocale` in
 * `src/site.config.ts`:
 * - several languages, all prefixed: every page lives under `/<locale>/`,
 *   the root redirects to the visitor's language;
 * - several languages, default at the root: the default language at the
 *   root (`/`, `/contact/`), the others under `/<locale>/`;
 * - one language: pages live at the root, no prefix.
 * Whenever the default language is at the root, `/<default>/…` redirects
 * there (`localeRedirects` in `src/hosting/rules.ts`).
 */
import {
  defaultLocale,
  hasPrefix,
  isLocale,
  locales,
  multilingual,
  prefixed,
  site,
  type Locale,
} from '@/site.config';

export { defaultLocale, hasPrefix, isLocale, locales, multilingual, prefixed, type Locale };

/**
 * Value of the `[...locale]` route segment for a locale: the locale itself,
 * or `undefined` for the language served at the root.
 */
export function localeParam(locale: Locale): Locale | undefined {
  return hasPrefix(locale) ? locale : undefined;
}

/**
 * `getStaticPaths` for the fixed pages under `src/pages/[...locale]/`.
 * Usage: `export const getStaticPaths = localePaths;`
 */
export function localePaths() {
  return locales.map((locale) => ({ params: { locale: localeParam(locale) } }));
}

/**
 * Path of a page with a trailing slash: `href('fr', 'contact')` → `/fr/contact/`,
 * or `/contact/` for the language served at the root. `path` is relative to
 * the locale root; an empty path is the home page. The only way to build a link.
 */
export function href(locale: Locale, path = ''): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const root = hasPrefix(locale) ? `/${locale}/` : '/';
  return clean ? `${root}${clean}/` : root;
}

/** Path relative to its locale root: `/en/contact/` → `contact/`, `/contact/` → `contact/`. */
export function localeRelative(pathname: string): string {
  const [, first, rest = ''] = pathname.match(/^\/([^/]+)(?:\/(.*))?$/) ?? [];
  if (isLocale(first) && hasPrefix(first)) return rest;
  return pathname.replace(/^\/+/, '');
}

/** Absolute URL on the canonical origin. */
export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}

/** Same path in every locale: the default alternates for a non-content page. */
export function samePathAlternates(path = ''): Record<Locale, string> {
  return Object.fromEntries(locales.map((locale) => [locale, href(locale, path)])) as Record<
    Locale,
    string
  >;
}

/** BCP 47 tag for `Intl` and `og:locale`. */
export function localeTag(locale: Locale): string {
  return site.localeTags[locale];
}

/** Date formatting through `Intl`, never by hand. */
export function formatDate(
  date: Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: 'long',
    timeZone: site.timeZone,
    ...options,
  }).format(date);
}

/**
 * Pages not written yet in a language, by their path relative to the locale root (`pricing`, `terms`), or a whole
 * section (`calendar/`, its trailing slash meaning every page under it). They are not built in that language, its
 * links to them lead to the default language, and they carry no hreflang to it. A language is complete when its
 * list is empty; a new language starts with the pages it does not have yet (docs/languages.md).
 */
export const notYet: Partial<Record<Locale, string[]>> = {
  fr: [],
};

const clean = (path: string) => path.replace(/^\/+|\/+$/g, '');

/** Whether the page at `path` (relative to the locale root) exists in `locale`. */
export function exists(locale: Locale, path = ''): boolean {
  const page = clean(path);
  return !(notYet[locale] ?? []).some((entry) =>
    entry.endsWith('/') ? `${page}/`.startsWith(entry) : clean(entry) === page,
  );
}

/** The languages a page exists in. */
export const localesOf = (path = ''): Locale[] => locales.filter((locale) => exists(locale, path));

/** Link to a page from a page in `locale`: in that language when it exists there, in the default one otherwise. */
export function link(locale: Locale, path = ''): string {
  return href(exists(locale, path) ? locale : defaultLocale, path);
}

/** hreflang targets of a page: its path in every language it exists in. */
export function alternatesOf(path = ''): Partial<Record<Locale, string>> {
  return Object.fromEntries(localesOf(path).map((locale) => [locale, href(locale, path)]));
}

/**
 * `getStaticPaths` of a fixed page, in the languages it exists in: `localePathsOf('pricing')`. `params` adds the
 * page's own parameters to each (a calendar page: one entry per championship and language).
 */
export function localePathsOf(path = '', params: Array<Record<string, string>> = [{}]) {
  return localesOf(path).flatMap((locale) =>
    params.map((own) => ({ params: { locale: localeParam(locale), ...own } })),
  );
}
