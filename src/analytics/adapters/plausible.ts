import { loadScript, type Adapter } from './types';

declare global {
  interface Window {
    plausible?: ((event: string, options?: { props?: Record<string, unknown> }) => void) & {
      q?: unknown[];
    };
  }
}

/** Plausible: cookieless, exempt from consent, custom events supported. */
export const plausible: Adapter = {
  async load(domain) {
    window.plausible =
      window.plausible ??
      Object.assign(
        function (this: unknown, ...args: unknown[]) {
          (window.plausible!.q = window.plausible!.q ?? []).push(args);
        },
        { q: [] as unknown[] },
      );
    // `manual` mode: page views are sent by `pageview()`, not by the script.
    await loadScript('https://plausible.io/js/script.manual.js', {
      'data-domain': domain,
      defer: '',
    });
  },
  pageview() {
    window.plausible?.('pageview');
  },
  track(event, props) {
    window.plausible?.(event, props ? { props } : undefined);
  },
};
