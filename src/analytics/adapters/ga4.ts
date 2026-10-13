import { gtag, updateGoogleConsent } from './google';
import { loadScript, type Adapter } from './types';

let measurementId: string | undefined;

/** Google Analytics 4 through gtag.js, loaded only after consent. */
export const ga4: Adapter = {
  async load(id) {
    measurementId = id;
    await loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
    gtag('js', new Date());
    // Page views are sent by `pageview()`, so the tracker keeps control of them.
    gtag('config', id, { send_page_view: false });
  },
  pageview() {
    gtag('event', 'page_view', { send_to: measurementId });
  },
  track(event, props) {
    gtag('event', event, props ?? {});
  },
  setConsent: updateGoogleConsent,
};
