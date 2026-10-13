/**
 * The site's analytics configuration, resolved once from the environment.
 * Read by the consent banner, the adapters and the privacy disclosure, so
 * the list of active tools is written in one place.
 */
import {
  ANALYTICS_PROVIDER,
  CF_ANALYTICS_TOKEN,
  GA_MEASUREMENT_ID,
  GTM_CONTAINER_ID,
  PLAUSIBLE_DOMAIN,
  PUBLIC_POSTHOG_KEY,
} from 'astro:env/client';

import { resolveAnalytics, type Service } from './resolve';

/**
 * Third-party content the site embeds, if any (video players, maps). Each
 * entry appears in the banner and the privacy page; the embed itself must be
 * gated with `acceptedCategory('thirdparty')` in the component that renders it.
 *
 * @example
 * { id: 'youtube', category: 'thirdparty', needsConsent: true, vendor: 'Google Ireland Ltd',
 *   privacyUrl: 'https://policies.google.com/privacy', cookies: ['VISITOR_INFO1_LIVE', 'YSC'], retention: '6 months' }
 */
const THIRD_PARTY_SERVICES: Service[] = [];

export const analytics = resolveAnalytics(
  {
    ANALYTICS_PROVIDER,
    GA_MEASUREMENT_ID,
    GTM_CONTAINER_ID,
    PLAUSIBLE_DOMAIN,
    CF_ANALYTICS_TOKEN,
    PUBLIC_POSTHOG_KEY,
  },
  THIRD_PARTY_SERVICES,
);

/**
 * Sites that read PostHog's visitor identifier from their links (`?ph=`), so a
 * sign-up joins the visit that led to it. Added only after consent.
 */
export const POSTHOG_HANDOFF_ORIGINS = ['https://app.racenode.com'];

export type { AnalyticsConfig, Category, Provider, Service } from './resolve';
