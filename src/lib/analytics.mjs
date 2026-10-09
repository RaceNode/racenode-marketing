/**
 * Visitor analytics (PostHog, EU cloud), same project and same settings as the
 * app (src/lib/analytics.ts there): the path from this site to the sign-up
 * reads in one place. Nothing is stored on the device (no cookie, no
 * localStorage), so a visitor is only known for the life of the page.
 *
 * Runs only in a build that carries PUBLIC_POSTHOG_KEY (publishable key, set in
 * the Cloudflare Pages environment), never in dev; the SDK is imported after the
 * page is up so it stays out of the critical path.
 */
const posthogKey = import.meta.env.PUBLIC_POSTHOG_KEY;

if (posthogKey && !import.meta.env.DEV) {
  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(posthogKey, {
      api_host: 'https://eu.i.posthog.com',
      defaults: '2026-08-30',
      persistence: 'memory',
      person_profiles: 'identified_only',
      disable_session_recording: true,
      mask_all_text: true,
    });
    posthog.register({
      platform: 'web-marketing',
      // "preview" on Cloudflare preview deploys, so they can be filtered out
      environment: location.hostname === 'www.racenode.com' ? 'production' : 'preview',
    });
  });
}
