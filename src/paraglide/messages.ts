/**
 * The site is English only and has no Paraglide: this module gives the
 * analytics brick of the WBLT site template (src/analytics, Analytics.astro,
 * AnalyticsDisclosure.astro) the message keys it reads, so those files stay
 * identical to the template's.
 */
const messages = {
  consent_title: 'Cookies',
  consent_description:
    'We count page views without storing anything on your device. With your agreement, PostHog keeps one cookie to link the pages you visit.',
  consent_accept_all: 'Accept',
  consent_accept_necessary: 'Reject',
  consent_show_preferences: 'Details',
  consent_footer_privacy: 'Privacy policy',
  consent_pref_title: 'Cookie settings',
  consent_pref_save: 'Save my choice',
  consent_pref_close: 'Close',
  consent_section_intro_title: 'How it works',
  consent_section_intro_text:
    'Your choice is kept for six months and can be changed at any time from "Cookie settings" at the bottom of every page.',
  consent_cat_necessary_title: 'Necessary',
  consent_cat_necessary_text:
    'Remembers your choice about cookies (cookie cc_cookie, six months). Always on, no tracking.',
  consent_cat_analytics_title: 'Audience measurement',
  consent_cat_analytics_text:
    'Links the pages you view on this site, and your sign-up if you create an account, to see which pages help and where visitors leave.',
  consent_cat_marketing_title: 'Marketing',
  consent_cat_marketing_text: 'Measures the effectiveness of our campaigns.',
  consent_cat_thirdparty_title: 'Third-party content',
  consent_cat_thirdparty_text: 'Videos, maps and other content hosted by external services.',
  consent_manage: 'Cookie settings',
  service_posthog_label: 'PostHog',
  service_posthog_text:
    'Pages viewed and clicks (clicked text masked). Without consent: nothing stored on your device. With consent: a visitor identifier kept in a cookie.',
  disclosure_none: 'This website uses no audience measurement or tracking tool.',
  disclosure_consent_note:
    'The cookie below is only set after your agreement, given through the banner shown on your first visit. You can change it at any time.',
  disclosure_exempt_note:
    'The services below set no cookie and do not track visitors across websites. They do not require consent.',
  disclosure_col_service: 'Service',
  disclosure_col_vendor: 'Provider',
  disclosure_col_purpose: 'Purpose',
  disclosure_col_cookies: 'Cookies (retention)',
  disclosure_no_cookies: 'None',
};

export const m = Object.fromEntries(
  Object.entries(messages).map(([key, text]) => [key, () => text]),
) as { [K in keyof typeof messages]: () => string };
