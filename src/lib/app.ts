/**
 * Links to the app (app.racenode.com) from a page in `locale`. The app speaks English only until its French version
 * is online (App RaceNode, WIL-535): until then every language links to the same address. When the app serves a
 * language, add it to `appLocales` and write here how the app is told (one place for every link of the site).
 */
import type { Locale } from '@/i18n';

export const APP_ORIGIN = 'https://app.racenode.com';

/** Languages the app is served in. */
export const appLocales: readonly Locale[] = ['en'];

export function appUrl(_locale: Locale, path = '/'): string {
  return `${APP_ORIGIN}${path}`;
}
