/**
 * Public API for the site's scripts: `track()` and `pageview()`.
 * Nothing in the site imports a provider directly.
 *
 * @example
 * import { track } from '@/analytics';
 * track('contact_sent', { locale: 'fr' });
 */
import { adapters } from './adapters';
import { analytics } from './config';
import { createTracker } from './tracker';

export const tracker = createTracker();

export const track = tracker.track.bind(tracker);
export const pageview = tracker.pageview.bind(tracker);

/** Start the configured tool. Called by the boot script once consent allows it. */
export function startAnalytics(): Promise<void> {
  if (!analytics.provider || !analytics.id) return Promise.resolve();
  return tracker.enable(adapters[analytics.provider], analytics.id);
}

export function stopAnalytics(): void {
  tracker.disable();
}
