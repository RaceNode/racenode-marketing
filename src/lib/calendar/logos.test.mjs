// Logos: hosted by the site, a text row when one is missing, the storage's address never reaching the relay or a page.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { sanitize } from './contract.mjs';
import { loadLogos, pickLogo } from './logos.mjs';
import { logoOf, roundRow } from './render.mjs';

const serie = { slug: 'a', name: 'A', short_name: null, discipline: 'gt', region: 'europe' };

test('the logo URLs are read by the build only: the relay and the browser never get them', () => {
  const row = { ...serie, logo_url: 'https://x.supabase.co/a.png', logo_light_url: null, logo_dark_url: null };
  assert.equal(sanitize({ series: [row] }).series[0].logo_url, undefined);
  assert.equal(sanitize({ series: [row] }, { logos: true }).series[0].logo_url, 'https://x.supabase.co/a.png');
});

test('the logo that reads on paper wins; one made for a dark background goes on an ink chip', () => {
  assert.deepEqual(pickLogo({ logo_url: 'u', logo_light_url: 'l', logo_dark_url: 'd' }), { url: 'l', tone: 'l' });
  assert.deepEqual(pickLogo({ logo_url: 'u', logo_light_url: null, logo_dark_url: 'd' }), { url: 'u', tone: 'l' });
  assert.deepEqual(pickLogo({ logo_url: 'd', logo_light_url: null, logo_dark_url: 'd' }), { url: 'd', tone: 'd' });
  assert.equal(pickLogo({ logo_url: null, logo_light_url: null, logo_dark_url: null }), null);
  assert.equal(pickLogo(serie), null);
});

test('a logo that is missing or does not download leaves its row as text and never breaks the build', async () => {
  const png = await sharp({ create: { width: 300, height: 100, channels: 4, background: '#f00' } }).png().toBuffer();
  const answers = {
    'https://s.test/ok.png': () => new Response(png),
    'https://s.test/gone.png': () => new Response('no', { status: 404 }),
    'https://s.test/junk.png': () => new Response('not an image'),
  };
  const warn = console.warn;
  const said = [];
  console.warn = (m) => said.push(m);
  let got;
  try {
    got = await loadLogos(
      [
        { slug: 'ok', logo_url: 'https://s.test/ok.png' },
        { slug: 'gone', logo_url: 'https://s.test/gone.png' },
        { slug: 'junk', logo_url: 'https://s.test/junk.png' },
        { slug: 'none' },
      ],
      { fetchImpl: async (u) => answers[u]() },
    );
  } finally {
    console.warn = warn;
  }
  assert.deepEqual([...got.keys()], ['ok']);
  assert.equal(said.length, 2);
  assert.doesNotMatch(said.join(), /s\.test/, 'the log does not carry the storage address');
  const meta = await sharp(got.get('ok').file).metadata();
  assert.equal(meta.format, 'webp');
  assert.ok(meta.width <= 192 && meta.height <= 128);
});

test('a row shows the hosted logo in a fixed box, lazy; no logo, no image; the path comes from the slug', () => {
  const c = { slug: 'dtm', name: 'DTM', short_name: null, discipline: 'gt', region: null };
  const r = {
    series_slug: 'dtm', season_label: '2027', season_year: 2027, name: 'Round', kind: 'race',
    start_date: '2027-04-15', end_date: '2027-04-15', status: 'scheduled', venue_slug: 'spa', venue_name: 'Spa', championship: c,
  };
  const withLogo = roundRow(r, { countries: {}, logos: { dtm: 'l' }, logoColumn: true });
  assert.match(withLogo, /<div class="c has-logo"><img class="cal-logo" data-tone="l" src="\/calendar\/logos\/dtm\.webp" alt="" width="48" height="32" loading="lazy"/);
  // Another championship without a logo: text, aligned with the others (the column is kept); never an image.
  const text = roundRow(r, { countries: {}, logos: {}, logoColumn: true });
  assert.match(text, /<div class="c has-logo"><a /);
  assert.doesNotMatch(text, /<img/);
  assert.doesNotMatch(roundRow(r, { countries: {} }), /<img|has-logo/);
  assert.doesNotMatch(withLogo, /supabase/);
  assert.equal(logoOf('x', { logos: {} }), '');
  assert.match(logoOf('dtm', { logos: { dtm: 'd' } }, { large: true }), /cal-logo-lg" data-tone="d".*width="72" height="48"/);
});
