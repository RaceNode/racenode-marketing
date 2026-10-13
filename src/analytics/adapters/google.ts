/**
 * Shared Google plumbing: the `dataLayer`, `gtag()` and Consent Mode v2.
 *
 * The consent *default* (everything denied) is set by an inline script in
 * `<head>` before any of this runs — see `Analytics.astro`. Here we only
 * forward updates. Nothing from Google is requested before `load()`.
 */
import type { ConsentState } from './types';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function gtag(..._args: unknown[]): void {
  window.dataLayer = window.dataLayer ?? [];
  // gtag.js only processes `arguments` objects pushed to the dataLayer, not arrays.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

export function updateGoogleConsent({ analytics, marketing }: ConsentState): void {
  const granted = (allowed: boolean) => (allowed ? 'granted' : 'denied');
  gtag('consent', 'update', {
    analytics_storage: granted(analytics),
    ad_storage: granted(marketing),
    ad_user_data: granted(marketing),
    ad_personalization: granted(marketing),
  });
}

/** The inline snippet rendered in `<head>`: default denied, before any tag. */
export const CONSENT_DEFAULT_SNIPPET = [
  'window.dataLayer=window.dataLayer||[];',
  'function gtag(){dataLayer.push(arguments)}',
  "gtag('consent','default',{",
  "ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',",
  "analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',",
  "security_storage:'granted',wait_for_update:500});",
].join('');
