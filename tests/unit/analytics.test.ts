import { describe, expect, it, vi } from 'vitest';

import type { Adapter } from '@/analytics/adapters/types';
import { resolveAnalytics, servicesByCategory } from '@/analytics/resolve';
import { createTracker } from '@/analytics/tracker';

describe('resolveAnalytics', () => {
  it('configures nothing without a provider', () => {
    expect(resolveAnalytics({})).toEqual({ services: [], consentRequired: false });
  });

  it('requires consent for Google Analytics', () => {
    const config = resolveAnalytics({ ANALYTICS_PROVIDER: 'ga4', GA_MEASUREMENT_ID: 'G-TEST' });
    expect(config.provider).toBe('ga4');
    expect(config.id).toBe('G-TEST');
    expect(config.consentRequired).toBe(true);
    expect(config.services.map((s) => s.id)).toEqual(['ga4']);
  });

  it('needs no consent for cookieless tools', () => {
    expect(
      resolveAnalytics({ ANALYTICS_PROVIDER: 'cloudflare', CF_ANALYTICS_TOKEN: 'tok' })
        .consentRequired,
    ).toBe(false);
    expect(
      resolveAnalytics({ ANALYTICS_PROVIDER: 'plausible', PLAUSIBLE_DOMAIN: 'example.com' })
        .consentRequired,
    ).toBe(false);
  });

  it('fails the build when the identifier is missing or the provider unknown', () => {
    expect(() => resolveAnalytics({ ANALYTICS_PROVIDER: 'ga4' })).toThrow(/GA_MEASUREMENT_ID/);
    expect(() => resolveAnalytics({ ANALYTICS_PROVIDER: 'matomo' })).toThrow(/ANALYTICS_PROVIDER/);
  });

  it('counts declared third-party content in the consent decision', () => {
    const config = resolveAnalytics({}, [
      {
        id: 'youtube',
        category: 'thirdparty',
        needsConsent: true,
        vendor: 'Google',
        privacyUrl: '',
        cookies: [],
        retention: '',
      },
    ]);
    expect(config.consentRequired).toBe(true);
    expect(servicesByCategory(config.services).map(([category]) => category)).toEqual([
      'thirdparty',
    ]);
  });
});

function fakeAdapter(): Adapter & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    load: vi.fn(async () => {
      calls.push('load');
    }),
    pageview: () => calls.push('pageview'),
    track: (event) => calls.push(`track:${event}`),
    setConsent: (state) => calls.push(`consent:${state.analytics}`),
  };
}

describe('tracker', () => {
  it('queues calls until the adapter is enabled, then replays them in order', async () => {
    const tracker = createTracker();
    const adapter = fakeAdapter();
    tracker.pageview();
    tracker.track('cta_click');
    expect(adapter.calls).toEqual([]);

    await tracker.enable(adapter, 'G-TEST');
    expect(adapter.calls).toEqual(['load', 'pageview', 'track:cta_click']);
    expect(adapter.load).toHaveBeenCalledWith('G-TEST');

    tracker.track('later');
    expect(adapter.calls.at(-1)).toBe('track:later');
  });

  it('drops queued calls when disabled and loads an adapter only once', async () => {
    const tracker = createTracker();
    const adapter = fakeAdapter();
    tracker.track('lost');
    tracker.disable();
    await tracker.enable(adapter, 'id');
    await tracker.enable(adapter, 'id');
    expect(adapter.calls).toEqual(['load']);
  });

  it('forwards consent changes to the adapter', async () => {
    const tracker = createTracker();
    const adapter = fakeAdapter();
    await tracker.enable(adapter, 'id');
    tracker.setConsent({ analytics: false, marketing: false });
    expect(adapter.calls.at(-1)).toBe('consent:false');
  });

  it('hands the consent given before enabling to the adapter before it loads', async () => {
    const tracker = createTracker();
    const adapter = fakeAdapter();
    tracker.setConsent({ analytics: true, marketing: false });
    await tracker.enable(adapter, 'id');
    expect(adapter.calls).toEqual(['consent:true', 'load']);
  });

  it('stays disabled when the vendor script fails to load', async () => {
    const tracker = createTracker();
    const adapter: Adapter = {
      load: async () => {
        throw new Error('blocked');
      },
      pageview() {},
      track() {},
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await tracker.enable(adapter, 'id');
    expect(tracker.enabled).toBe(false);
    warn.mockRestore();
  });
});
