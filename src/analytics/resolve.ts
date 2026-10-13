/**
 * Analytics configuration model, pure TypeScript (unit-tested).
 *
 * One provider at a time, chosen by `ANALYTICS_PROVIDER`. Each provider is a
 * service in a consent category; services that need consent make the banner
 * appear. Third-party content (video, maps) is declared the same way in
 * `config.ts` when a project embeds some.
 */

export const PROVIDERS = ['cloudflare', 'ga4', 'gtm', 'plausible', 'posthog'] as const;
export type Provider = (typeof PROVIDERS)[number];

export const CATEGORIES = ['necessary', 'analytics', 'marketing', 'thirdparty'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Service {
  /** Stable identifier, also the message key suffix (`service_<id>_label`, `service_<id>_text`). */
  id: string;
  category: Category;
  /** False for cookieless tools that qualify for the audience-measurement exemption. */
  needsConsent: boolean;
  /** Who receives the data. */
  vendor: string;
  /** Link to the vendor's privacy policy. */
  privacyUrl: string;
  /** Cookie names (or prefixes) the service may set; used for the disclosure and for auto-clearing on withdrawal. */
  cookies: string[];
  /** Retention shown in the disclosure. */
  retention: string;
  /**
   * Measures without storing anything on the device until consent, which only
   * lets it keep a cookie (PostHog): it runs from the first page whatever the
   * choice, instead of waiting for a "yes".
   */
  cookielessWithoutConsent?: boolean;
}

export interface AnalyticsEnv {
  ANALYTICS_PROVIDER?: string;
  GA_MEASUREMENT_ID?: string;
  GTM_CONTAINER_ID?: string;
  PLAUSIBLE_DOMAIN?: string;
  CF_ANALYTICS_TOKEN?: string;
  PUBLIC_POSTHOG_KEY?: string;
}

export interface AnalyticsConfig {
  provider?: Provider;
  /** Measurement ID, container ID, domain or token, depending on the provider. */
  id?: string;
  services: Service[];
  /** True when at least one configured service needs consent: the banner is shown. */
  consentRequired: boolean;
}

const CATALOGUE: Record<Provider, Omit<Service, 'id'>> = {
  cloudflare: {
    category: 'analytics',
    needsConsent: false,
    vendor: 'Cloudflare, Inc.',
    privacyUrl: 'https://www.cloudflare.com/privacypolicy/',
    cookies: [],
    retention: '—',
  },
  plausible: {
    category: 'analytics',
    needsConsent: false,
    vendor: 'Plausible Insights OÜ',
    privacyUrl: 'https://plausible.io/privacy',
    cookies: [],
    retention: '—',
  },
  ga4: {
    category: 'analytics',
    needsConsent: true,
    vendor: 'Google Ireland Ltd',
    privacyUrl: 'https://policies.google.com/privacy',
    cookies: ['_ga', '_ga_*', '_gid'],
    retention: '13 months',
  },
  gtm: {
    category: 'marketing',
    needsConsent: true,
    vendor: 'Google Ireland Ltd',
    privacyUrl: 'https://policies.google.com/privacy',
    cookies: ['_ga', '_ga_*', '_gid', '_gcl_*'],
    retention: '13 months',
  },
  posthog: {
    category: 'analytics',
    needsConsent: true,
    vendor: 'PostHog Inc. (EU hosting)',
    privacyUrl: 'https://posthog.com/privacy',
    cookies: ['ph_*'],
    retention: '1 year',
    cookielessWithoutConsent: true,
  },
};

const ID_VARIABLE: Record<Provider, keyof AnalyticsEnv> = {
  cloudflare: 'CF_ANALYTICS_TOKEN',
  ga4: 'GA_MEASUREMENT_ID',
  gtm: 'GTM_CONTAINER_ID',
  plausible: 'PLAUSIBLE_DOMAIN',
  posthog: 'PUBLIC_POSTHOG_KEY',
};

export function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && (PROVIDERS as readonly string[]).includes(value);
}

/**
 * Build the configuration from environment values. Throws when the provider
 * is set without its identifier: a half-configured tool must fail the build,
 * not silently ship nothing.
 */
export function resolveAnalytics(
  env: AnalyticsEnv,
  extraServices: Service[] = [],
): AnalyticsConfig {
  const services = [...extraServices];
  let provider: Provider | undefined;
  let id: string | undefined;

  if (env.ANALYTICS_PROVIDER) {
    if (!isProvider(env.ANALYTICS_PROVIDER)) {
      throw new Error(
        `ANALYTICS_PROVIDER must be one of ${PROVIDERS.join(', ')}, got "${env.ANALYTICS_PROVIDER}"`,
      );
    }
    provider = env.ANALYTICS_PROVIDER;
    id = env[ID_VARIABLE[provider]]?.trim() || undefined;
    if (!id) {
      throw new Error(`ANALYTICS_PROVIDER=${provider} requires ${ID_VARIABLE[provider]}`);
    }
    services.push({ id: provider, ...CATALOGUE[provider] });
  }

  return {
    provider,
    id,
    services,
    consentRequired: services.some((service) => service.needsConsent),
  };
}

/** Services grouped by category, in the canonical order, empty categories omitted. */
export function servicesByCategory(services: Service[]): Array<[Category, Service[]]> {
  return CATEGORIES.flatMap((category) => {
    const inCategory = services.filter((service) => service.category === category);
    return inCategory.length > 0 ? [[category, inCategory] as [Category, Service[]]] : [];
  });
}
