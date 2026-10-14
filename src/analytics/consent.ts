/**
 * Consent banner: CookieConsent by Orest Bida (vanilla-cookieconsent).
 * Categories and services come from `analytics.services`; texts come from
 * the Paraglide messages, so the banner speaks the page's language.
 *
 * Opt-in everywhere: nothing subject to consent runs before a "yes".
 */
import * as CookieConsent from 'vanilla-cookieconsent';
// The banner's stylesheet as a URL, not a CSS import: an import would be
// hoisted into every page and block its first render, banner or not.
import consentStylesheet from 'vanilla-cookieconsent/dist/cookieconsent.css?url';

import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';

import { analytics, type Category, type Service } from './config';
import { CATEGORIES, servicesByCategory } from './resolve';

export interface ConsentCallbacks {
  /** Called on load when consent is already known, and after every choice. */
  onDecision(accepted: (category: Category) => boolean): void;
}

const messages = m as unknown as Record<string, (params?: Record<string, string>) => string>;
const text = (key: string, params?: Record<string, string>) => messages[key]?.(params) ?? key;

/** Cookie name patterns to clear when a category is withdrawn. */
function autoClearFor(services: Service[]) {
  const cookies = services.flatMap((service) => service.cookies);
  return cookies.length > 0
    ? {
        cookies: cookies.map((name) => ({
          name: name.endsWith('*') ? new RegExp(`^${name.slice(0, -1)}`) : name,
        })),
      }
    : undefined;
}

/**
 * Load the banner's stylesheet, once, only on pages that show the banner.
 * Resolves when it applies (or fails), so the banner never shows unstyled.
 */
function loadStylesheet(): Promise<void> {
  if (document.querySelector(`link[href="${consentStylesheet}"]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = consentStylesheet;
    link.onload = link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

export async function initConsent(privacyHref: string | undefined, callbacks: ConsentCallbacks) {
  await loadStylesheet();
  const grouped = servicesByCategory(analytics.services);
  const categories: Record<string, CookieConsent.Category> = {
    necessary: { enabled: true, readOnly: true },
  };
  for (const [category, services] of grouped) {
    if (category === 'necessary') continue;
    categories[category] = {
      autoClear: autoClearFor(services),
      services: Object.fromEntries(
        services.map((s) => [s.id, { label: text(`service_${s.id}_label`) }]),
      ),
    };
  }

  const locale = getLocale();
  const sections: CookieConsent.Section[] = [
    { title: text('consent_section_intro_title'), description: text('consent_section_intro_text') },
    ...CATEGORIES.filter((category) => category in categories).map((category) => ({
      title: text(`consent_cat_${category}_title`),
      description: text(`consent_cat_${category}_text`),
      linkedCategory: category,
    })),
  ];
  const footer = privacyHref
    ? `<a href="${privacyHref}">${text('consent_footer_privacy')}</a>`
    : undefined;

  const decide = () => callbacks.onDecision((category) => CookieConsent.acceptedCategory(category));

  await CookieConsent.run({
    // The banner is part of the page for everyone, automated browsers included.
    hideFromBots: false,
    guiOptions: {
      consentModal: { layout: 'box', position: 'bottom right', equalWeightButtons: true },
      preferencesModal: { layout: 'box', equalWeightButtons: true },
    },
    categories,
    language: {
      default: locale,
      translations: {
        [locale]: {
          consentModal: {
            title: text('consent_title'),
            description: text('consent_description'),
            acceptAllBtn: text('consent_accept_all'),
            acceptNecessaryBtn: text('consent_accept_necessary'),
            showPreferencesBtn: text('consent_show_preferences'),
            footer,
          },
          preferencesModal: {
            title: text('consent_pref_title'),
            acceptAllBtn: text('consent_accept_all'),
            acceptNecessaryBtn: text('consent_accept_necessary'),
            savePreferencesBtn: text('consent_pref_save'),
            closeIconLabel: text('consent_pref_close'),
            sections,
          },
        },
      },
    },
    onConsent: decide,
    onChange: decide,
  });
}

export const showPreferences = CookieConsent.showPreferences;
