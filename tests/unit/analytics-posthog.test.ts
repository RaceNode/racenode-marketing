import { describe, expect, it } from 'vitest';

import { resolveAnalytics } from '@/analytics/resolve';

// PostHog is not in the WBLT template yet; analytics.test.ts stays the template's.
describe('resolveAnalytics with PostHog', () => {
  it('shows the banner and runs without consent, without storage', () => {
    const config = resolveAnalytics({
      ANALYTICS_PROVIDER: 'posthog',
      PUBLIC_POSTHOG_KEY: 'phc_test',
    });
    expect(config.provider).toBe('posthog');
    expect(config.id).toBe('phc_test');
    expect(config.consentRequired).toBe(true);
    expect(config.services).toMatchObject([
      { id: 'posthog', category: 'analytics', cookies: ['ph_*'], cookielessWithoutConsent: true },
    ]);
  });

  it('fails the build without the project key', () => {
    expect(() => resolveAnalytics({ ANALYTICS_PROVIDER: 'posthog' })).toThrow(/PUBLIC_POSTHOG_KEY/);
  });
});
