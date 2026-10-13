import { updateGoogleConsent } from './google';
import { loadScript, type Adapter } from './types';

/**
 * Google Tag Manager. The container is loaded only after consent; inside it,
 * Consent Mode tells each tag what it may do. Marketing tags added by an
 * agency live in the container, never in this repository.
 */
export const gtm: Adapter = {
  async load(id) {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    await loadScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`);
  },
  pageview() {
    window.dataLayer?.push({ event: 'page_view' });
  },
  track(event, props) {
    window.dataLayer?.push({ event, ...props });
  },
  setConsent: updateGoogleConsent,
};
