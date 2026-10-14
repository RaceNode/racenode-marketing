import type { PostHog } from 'posthog-js';

import { POSTHOG_HANDOFF_ORIGINS } from '../config';
import type { Adapter } from './types';

/**
 * PostHog (EU cloud) through posthog-js, the npm package, so the site and an
 * app on the same project run the same version.
 *
 * Without consent it measures with nothing stored on the device: the visitor
 * lives in memory and only lasts as long as the page. Consent moves that
 * visitor to a first-party cookie (`ph_<key>_posthog`, this host only) so the
 * next pages and visits join it, and hands its identifier to the links of the
 * sites in `POSTHOG_HANDOFF_ORIGINS` (`?ph=<distinct_id>`). Withdrawal goes
 * back to memory under a new identifier; the cookie is erased.
 */
let client: PostHog | undefined;
let allowed = false;

const persistence = () => (allowed ? 'cookie' : 'memory');

/** Add (after consent) or remove the visitor's identifier on one link. */
function tagLink(link: HTMLAnchorElement): void {
  if (!POSTHOG_HANDOFF_ORIGINS.includes(link.origin)) return;
  const url = new URL(link.href);
  const id = allowed ? client?.get_distinct_id() : undefined;
  if (id) url.searchParams.set('ph', id);
  else url.searchParams.delete('ph');
  if (url.href !== link.href) link.href = url.href;
}

function tagLinks(): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href]')) tagLink(link);
}

export const posthog: Adapter = {
  async load(key) {
    const { default: ph } = await import('posthog-js');
    ph.init(key, {
      api_host: 'https://eu.i.posthog.com',
      defaults: '2026-08-30',
      persistence: persistence(),
      cross_subdomain_cookie: false,
      person_profiles: 'identified_only',
      disable_session_recording: true,
      mask_all_text: true,
      // Page views are sent by `pageview()`, so the tracker keeps control of them.
      capture_pageview: false,
      capture_pageleave: true,
    });
    ph.register({
      platform: 'web-marketing',
      // "preview" on Cloudflare preview deploys, so they can be filtered out
      environment: location.hostname === 'www.racenode.com' ? 'production' : 'preview',
    });
    client = ph;
    tagLinks();
    // Links written after load (live refresh) are tagged when followed.
    document.addEventListener(
      'pointerdown',
      (event) => {
        const link = (event.target as Element | null)?.closest?.('a[href]');
        if (link instanceof HTMLAnchorElement) tagLink(link);
      },
      true,
    );
  },
  pageview() {
    client?.capture('$pageview');
  },
  track(event, props) {
    client?.capture(event, props);
  },
  setConsent({ analytics }) {
    if (analytics === allowed) return;
    allowed = analytics;
    if (!client) return;
    // posthog-js moves what it holds to the new storage and clears the old one.
    client.set_config({ persistence: persistence() });
    if (!analytics) {
      client.reset();
      // The tab marker of cookie mode (`ph_<key>_primary_window_exists`) outlives the switch.
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith('ph_')) sessionStorage.removeItem(key);
      }
    }
    tagLinks();
  },
};
