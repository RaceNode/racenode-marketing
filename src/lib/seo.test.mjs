// Structured data (seo.ts) from the site configuration. Node loads the .ts files as is (type stripping).
//   npm run test:seo
import test from 'node:test';
import assert from 'node:assert/strict';
import { site } from '../site.config.ts';
import {
  breadcrumbJsonLd,
  companyId,
  faqJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from './seo.ts';

const stores = ['https://apps.apple.com/app/id1', 'https://play.google.com/store/apps/details?id=x'];

test('one company entity, referenced by @id from the site and the app', () => {
  const org = organizationJsonLd(site, stores);
  assert.equal(org['@id'], 'https://www.racenode.com/#organization');
  assert.equal(org['@id'], companyId(site));
  assert.deepEqual(websiteJsonLd(site, 'en').publisher, { '@id': companyId(site) });
  const app = softwareApplicationJsonLd(site, { description: 'd', installUrl: stores });
  assert.deepEqual(app.publisher, { '@id': companyId(site) });
  assert.deepEqual(app.installUrl, stores);
});

test('the organisation says what the config says, store listings included', () => {
  const org = organizationJsonLd(site, stores);
  assert.equal(org.name, site.name);
  assert.equal(org.legalName, site.legal.companyName);
  assert.equal(org.logo, 'https://www.racenode.com/pwa-512x512.png');
  assert.deepEqual(org.founder, { '@type': 'Person', name: site.business.founder, jobTitle: 'Founder' });
  assert.deepEqual(org.sameAs, [site.social.linkedin, ...stores]);
  assert.equal(org.contactPoint.email, site.contact.email);
});

test('empty values are left out', () => {
  const bare = { ...site, social: { linkedin: '' }, business: { ...site.business, description: '' } };
  const org = organizationJsonLd(bare);
  assert.equal('sameAs' in org, false);
  assert.equal('description' in org, false);
});

test('breadcrumb: absolute URLs, positions from 1', () => {
  const crumbs = breadcrumbJsonLd(site, [
    { name: 'Home', url: '/' },
    { name: 'Pricing', url: '/pricing/' },
  ]);
  assert.deepEqual(crumbs.itemListElement, [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.racenode.com/' },
    { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://www.racenode.com/pricing/' },
  ]);
});

test('FAQ: one question per entry, anchored on its page', () => {
  const faq = faqJsonLd(site, '/pricing/', [{ question: 'Q?', answer: 'A.' }]);
  assert.equal(faq['@id'], 'https://www.racenode.com/pricing/#faq');
  assert.deepEqual(faq.mainEntity, [
    { '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } },
  ]);
});

test('no trailing slash on the origin: every URL built from it stays single-slashed', () => {
  assert.equal(site.url.endsWith('/'), false);
});
