/**
 * Structured data (JSON-LD) built from the site configuration.
 * Pure functions, tested by seo.test.mjs (node --test); rendered by
 * `BaseLayout.astro` (site-wide entities) and by the pages (their own entities).
 *
 * From the WBLT site template's `src/lib/seo.ts`: `compact`, `absolute`,
 * `websiteJsonLd`, `faqJsonLd` and `breadcrumbJsonLd` as they are there; the
 * organisation keeps what RaceNode already published (description, founder,
 * contact point, store listings) and the app gets its SoftwareApplication. No
 * local business, phone or services: the company has none to publish.
 *
 * No runtime import here, so node --test can load this file as is.
 */
import type { SiteConfig } from '../site.config';

type JsonLd = Record<string, unknown>;

const compact = (object: JsonLd): JsonLd =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) =>
        value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0),
    ),
  );

const absolute = (site: SiteConfig, path: string) => new URL(path, site.url).toString();

/** `@id` of the company entity, for references from other entities. */
export function companyId(site: SiteConfig): string {
  return `${site.url}/#organization`;
}

/** The organisation behind the site. `profiles`: its listings elsewhere (the app stores). */
export function organizationJsonLd(site: SiteConfig, profiles: string[] = []): JsonLd {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': companyId(site),
    name: site.name,
    legalName: site.legal.companyName,
    url: site.url,
    logo: absolute(site, site.business.logo),
    description: site.business.description,
    founder: { '@type': 'Person', name: site.business.founder, jobTitle: 'Founder' },
    sameAs: [...Object.values(site.social), ...profiles].filter(Boolean),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: site.contact.email,
      url: site.url,
    },
  });
}

/** The site itself, published by the company. */
export function websiteJsonLd(site: SiteConfig, language: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    name: site.name,
    url: site.url,
    inLanguage: language,
    publisher: { '@id': companyId(site) },
  };
}

/** The app: web and the two stores. The offer is the one the pricing page states. */
export function softwareApplicationJsonLd(
  site: SiteConfig,
  { description, installUrl }: { description: string; installUrl: string[] },
): JsonLd {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    description,
    url: site.url,
    installUrl,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free until 31 December 2026',
      validThrough: '2026-12-31',
    },
    publisher: { '@id': companyId(site) },
  });
}

/** Questions and answers shown on a page. https://schema.org/FAQPage */
export function faqJsonLd(
  site: SiteConfig,
  url: string,
  faq: Array<{ question: string; answer: string }>,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${absolute(site, url)}#faq`,
    mainEntity: faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

/** Breadcrumb trail, from the home page to the current page. */
export function breadcrumbJsonLd(
  site: SiteConfig,
  items: Array<{ name: string; url: string }>,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absolute(site, item.url),
    })),
  };
}
