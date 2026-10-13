export type EventProps = Record<string, string | number | boolean>;

/** What the site has agreed to, per category. */
export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

/**
 * One implementation per measurement tool. The tracker calls `load()` once,
 * only when the tool is allowed to run, then forwards page views and events.
 */
export interface Adapter {
  /** Inject the vendor script. Resolves when it is ready to receive calls. */
  load(id: string): Promise<void>;
  pageview(): void;
  track(event: string, props?: EventProps): void;
  /** Google Consent Mode and the like: forward a consent change. Optional. */
  setConsent?(state: ConsentState): void;
}

/** Append a `<script src>` to the document, once. */
export function loadScript(src: string, attributes: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(script);
  });
}
