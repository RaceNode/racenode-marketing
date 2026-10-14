import { describe, expect, it } from 'vitest';

import {
  breadcrumbJsonLd,
  companyId,
  faqJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import { site, type SiteConfig } from '@/site.config';

const stores = [
  'https://apps.apple.com/app/id1',
  'https://play.google.com/store/apps/details?id=x',
];

describe('company entity', () => {
  it('is one entity, referenced by @id from the site and the app', () => {
    const org = organizationJsonLd(site, stores);
    expect(org['@id']).toBe('https://www.racenode.com/#organization');
    expect(org['@id']).toBe(companyId(site));
    expect(websiteJsonLd(site, 'en').publisher).toEqual({ '@id': companyId(site) });
    const app = softwareApplicationJsonLd(site, { description: 'd', installUrl: stores });
    expect(app.publisher).toEqual({ '@id': companyId(site) });
    expect(app.installUrl).toEqual(stores);
  });

  it('says what the config says, store listings included', () => {
    const org = organizationJsonLd(site, stores);
    expect(org.name).toBe(site.name);
    expect(org.legalName).toBe(site.legal.companyName);
    expect(org.logo).toBe('https://www.racenode.com/pwa-512x512.png');
    expect(org.founder).toEqual({
      '@type': 'Person',
      name: site.business.founder,
      jobTitle: 'Founder',
    });
    expect(org.sameAs).toEqual([site.social.linkedin, ...stores]);
    expect(org.contactPoint).toMatchObject({ email: site.contact.email });
  });

  it('leaves out empty values', () => {
    const bare: SiteConfig = {
      ...site,
      social: { linkedin: '' },
      business: { ...site.business, description: '' },
    };
    const org = organizationJsonLd(bare);
    expect(org).not.toHaveProperty('sameAs');
    expect(org).not.toHaveProperty('description');
  });
});

describe('page entities', () => {
  it('breadcrumb: absolute URLs, positions from 1', () => {
    const crumbs = breadcrumbJsonLd(site, [
      { name: 'Home', url: '/' },
      { name: 'Pricing', url: '/pricing/' },
    ]);
    expect(crumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.racenode.com/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Pricing',
        item: 'https://www.racenode.com/pricing/',
      },
    ]);
  });

  it('FAQ: one question per entry, anchored on its page', () => {
    const faq = faqJsonLd(site, '/pricing/', [{ question: 'Q?', answer: 'A.' }]);
    expect(faq['@id']).toBe('https://www.racenode.com/pricing/#faq');
    expect(faq.mainEntity).toEqual([
      { '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } },
    ]);
  });
});

it('the origin has no trailing slash, so every URL built from it stays single-slashed', () => {
  expect(site.url.endsWith('/')).toBe(false);
});
