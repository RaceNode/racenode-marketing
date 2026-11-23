/**
 * Links to the app (app.racenode.com) from a page in `locale`: one place for every link of the site.
 *
 * The app is told the language with `?lang=<locale>`: it remembers it on the device, and the language chosen in the
 * account comes first. English, the app's default, gets no parameter (a visitor whose browser is in French still
 * gets the app in French). A language the app is not served in links to the plain address.
 */
import { defaultLocale, type Locale } from '@/i18n';

export const APP_ORIGIN = 'https://app.racenode.com';

/** Languages the app is served in. */
export const appLocales: readonly Locale[] = ['en', 'fr'];

export function appUrl(locale: Locale, path = '/'): string {
  const url = new URL(path, APP_ORIGIN);
  if (locale !== defaultLocale && appLocales.includes(locale)) url.searchParams.set('lang', locale);
  return url.href;
}
