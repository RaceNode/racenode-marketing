import { loadScript, type Adapter } from './types';

/**
 * Cloudflare Web Analytics: cookieless, exempt from consent, page views only.
 * The beacon records the page view itself; there is no custom event API.
 */
export const cloudflare: Adapter = {
  async load(token) {
    await loadScript('https://static.cloudflareinsights.com/beacon.min.js', {
      'data-cf-beacon': JSON.stringify({ token }),
      defer: '',
    });
  },
  pageview() {
    // Recorded automatically by the beacon.
  },
  track() {
    // Not supported by the tool: events are dropped on purpose.
  },
};
