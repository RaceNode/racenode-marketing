/**
 * Browser entry point, loaded by `Analytics.astro` on every page.
 *
 * - No tool configured: nothing happens.
 * - Cookieless tool only (Cloudflare, Plausible): starts immediately, no banner.
 * - Tool subject to consent (GA4, GTM): the banner decides. The Google consent
 *   default (denied) was set inline in <head> before this file ran.
 * - Tool that measures without storage until consent (PostHog): starts once the
 *   stored choice is known, whatever it is; the banner only changes what it keeps.
 */
import { analytics } from './config';
import { getVisitorCountry } from './geo';
import { pageview, startAnalytics, stopAnalytics, tracker } from './index';

async function boot() {
  const { provider, services, consentRequired } = analytics;
  const providerService = services.find((service) => service.id === provider);

  if (!consentRequired) {
    if (provider) {
      await startAnalytics();
      pageview();
    }
    return;
  }

  // Exposed for a per-region regime later; no logic depends on it yet.
  void getVisitorCountry().then((country) => {
    if (country) document.documentElement.dataset.country = country;
  });

  const { initConsent } = await import('./consent');
  let firstDecision = true;
  const cookieless = providerService?.cookielessWithoutConsent === true;
  await initConsent(document.body.dataset.privacyHref, {
    onDecision(accepted) {
      tracker.setConsent({ analytics: accepted('analytics'), marketing: accepted('marketing') });
      if (cookieless) return;
      const allowed = providerService ? accepted(providerService.category) : false;
      if (allowed) {
        void startAnalytics().then(() => {
          if (firstDecision) pageview();
          firstDecision = false;
        });
      } else {
        stopAnalytics();
        firstDecision = false;
      }
    },
  });
  // A stored choice reached the tracker during initConsent, so the tool loads with it.
  if (cookieless) {
    await startAnalytics();
    pageview();
  }
}

void boot();
