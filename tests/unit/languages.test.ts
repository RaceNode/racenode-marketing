// Every language has the same message keys, and the declaration of the languages agrees with Paraglide's
// (docs/languages.md). A key missing from a language would silently show the English text on its pages.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultLocale, locales } from '@/site.config';
import { exists, link, localePathsOf, notYet } from '@/i18n';

const read = (path: string) =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));
const keys = (locale: string) =>
  Object.keys(read(`messages/${locale}.json`))
    .filter((k) => k !== '$schema')
    .sort();

describe('languages', () => {
  it('matches project.inlang/settings.json', () => {
    const settings = read('project.inlang/settings.json');
    expect(settings.baseLocale).toBe(defaultLocale);
    expect([...settings.locales].sort()).toEqual([...locales].sort());
  });

  it.each(locales.filter((l) => l !== defaultLocale))(
    '%s has every key of the default language',
    (locale) => {
      expect(keys(locale)).toEqual(keys(defaultLocale));
    },
  );

  it('builds a page not written yet in the default language only, and links to it there', () => {
    for (const [locale, pages] of Object.entries(notYet))
      for (const page of pages ?? []) {
        if (page.endsWith('/')) continue;
        expect(exists(locale as never, page)).toBe(false);
        expect(link(locale as never, page)).toBe(page ? `/${page}/` : '/');
        expect(localePathsOf(page).map((p) => p.params.locale)).not.toContain(locale);
      }
  });
});
