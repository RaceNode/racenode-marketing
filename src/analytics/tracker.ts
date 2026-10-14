/**
 * The abstraction the site talks to. Pure logic, unit-tested; the browser
 * entry point (`index.ts`) wires it to the configured adapter.
 *
 * Calls made before the tool is allowed to run are queued, then flushed
 * when it is enabled; they are dropped if it is disabled. The last consent
 * state is remembered and handed to the adapter before it loads, so a
 * Google tag always sees the visitor's choice before its first hit.
 */
import type { Adapter, ConsentState, EventProps } from './adapters/types';

export interface Tracker {
  track(event: string, props?: EventProps): void;
  pageview(): void;
  /** Load the adapter and replay queued calls. Idempotent. */
  enable(adapter: Adapter, id: string): Promise<void>;
  /** Stop forwarding calls and drop the queue. */
  disable(): void;
  /** Record a consent change and forward it to the adapter, now or when it loads. */
  setConsent(state: ConsentState): void;
  readonly enabled: boolean;
}

export function createTracker(): Tracker {
  let active: Adapter | undefined;
  let pending: Adapter | undefined;
  let consent: ConsentState | undefined;
  let queue: Array<(adapter: Adapter) => void> = [];

  const run = (call: (adapter: Adapter) => void) => {
    if (active) call(active);
    else queue.push(call);
  };

  return {
    get enabled() {
      return active !== undefined;
    },
    track(event, props) {
      run((adapter) => adapter.track(event, props));
    },
    pageview() {
      run((adapter) => adapter.pageview());
    },
    async enable(adapter, id) {
      if (active === adapter || pending === adapter) return;
      pending = adapter;
      if (consent) adapter.setConsent?.(consent);
      try {
        await adapter.load(id);
      } catch (error) {
        console.warn('analytics: adapter failed to load', error);
        pending = undefined;
        return;
      }
      active = adapter;
      pending = undefined;
      const calls = queue;
      queue = [];
      for (const call of calls) call(adapter);
    },
    disable() {
      active = undefined;
      pending = undefined;
      queue = [];
    },
    setConsent(state) {
      consent = state;
      (active ?? pending)?.setConsent?.(state);
    },
  };
}
