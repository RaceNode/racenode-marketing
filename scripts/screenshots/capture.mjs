// Product screenshots of the site, taken in the live app on the demo organization (Valmorel Motorsport).
//
//   infisical run --projectId <racenode> --env prod --path /main -- node scripts/screenshots/capture.mjs [name…]
//
// The demo accounts' password comes from DEMO_ACCOUNTS_PASSWORD (Infisical racenode / prod / main), injected by
// infisical run: never written here nor printed. With names, only those shots; with none, all of them.
// OUT=<dir> writes elsewhere than src/assets/screenshots (to compare before replacing).
//
// Read-only, by construction: the demo is shared and must not change. Every request that could write is
// dropped before it leaves the browser (only GET, the login, read RPCs and file URL signing go through), and so is analytics.
// What got dropped is listed at the end. The import shots read a file on the device and stop at the
// preview: nothing is imported, and the modal is never closed (closing it logs the reading).
//
// Sizes match what the pages expect: desktop 1920×1080 at 2x (3840×2160), phone 390×844 at 3x (1170×2532).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

const APP = 'https://app.racenode.com';
const ACCOUNTS = {
  claire: 'claire.vasseur@valmorel-motorsport.example', // owner: every module
  hugo: 'hugo.garnier@valmorel-motorsport.example', // chief mechanic: the crew app
};
const R07 = 'ba1e0000-0000-4000-8000-000000000410'; // Nürburgring: the event with the most data
const R08 = 'ba1e0000-0000-4000-8000-000000000408'; // Barcelona: no timetable, no bookings yet (import previews)
const DESKTOP = { width: 1920, height: 1080, scale: 2 };
const PHONE = { width: 390, height: 844, scale: 3 };
const AGENDA_DAY = '2026-10-06T10:00:00+02:00'; // Tuesday before R07, first day of a workshop block
const FILES = join(import.meta.dirname, 'files');

// Each shot: one page, as one account, at one size. `then` acts on the page (read-only: tabs, scroll, import preview).
const SHOTS = [
  { name: 'landing-modules', who: 'claire', size: DESKTOP, url: '/home' },
  { name: 'landing-modules-phone', who: 'claire', size: PHONE, url: '/home' },

  ...['overview', 'event-staff', 'accommodation', 'travel', 'vehicles'].flatMap((tab) => {
    const name = `logistics-${tab === 'event-staff' ? 'staff' : tab}`;
    return [
      { name, who: 'claire', size: DESKTOP, url: `/logistics/${tab}/${R07}` },
      { name: `${name}-phone`, who: 'claire', size: PHONE, url: `/logistics/${tab}/${R07}` },
    ];
  }),
  { name: 'logistics-info', who: 'claire', size: DESKTOP, url: `/logistics/info/${R07}` },
  { name: 'logistics-import', who: 'claire', size: DESKTOP, url: `/logistics/overview/${R08}`, then: importPreview('booking-confirmation.html') },
  { name: 'logistics-import-phone', who: 'claire', size: PHONE, url: `/logistics/overview/${R08}`, then: importPreview('booking-confirmation.html') },

  ...['overview', 'event-staff', 'racecars', 'crew-structure', 'meals', 'info'].flatMap((tab) => {
    const name = `management-${{ 'crew-structure': 'team' }[tab] ?? tab}`;
    return [
      { name, who: 'claire', size: DESKTOP, url: `/management/${tab}/${R07}` },
      { name: `${name}-phone`, who: 'claire', size: PHONE, url: `/management/${tab}/${R07}` },
    ];
  }),

  { name: 'timetable-overview', who: 'claire', size: DESKTOP, url: `/timetable/timetable/${R07}` },
  { name: 'timetable-schedule', who: 'claire', size: DESKTOP, url: `/timetable/timetable/${R07}`, then: scrollTo('text=/Friday, October 16/') },
  { name: 'timetable-schedule-phone', who: 'claire', size: PHONE, url: `/timetable/timetable/${R07}` },
  { name: 'timetable-items', who: 'claire', size: DESKTOP, url: `/timetable/items/${R07}` },
  { name: 'timetable-items-phone', who: 'claire', size: PHONE, url: `/timetable/items/${R07}` },
  { name: 'timetable-rules', who: 'claire', size: DESKTOP, url: `/timetable/rules/${R07}` },
  { name: 'timetable-rules-phone', who: 'claire', size: PHONE, url: `/timetable/rules/${R07}` },
  { name: 'timetable-share', who: 'claire', size: DESKTOP, url: `/timetable/timetable/${R07}`, then: click('role=button[name=/^Share/]') },
  // `now` sets the device's clock for that shot. The paddock display, as on race morning (its clock and countdowns).
  { name: 'timetable-box', who: 'claire', size: DESKTOP, url: `/timetable/timetable/${R07}`, now: '2026-10-16T10:12:00+02:00', then: async (page) => { await click('role=button[name=/^Share/]')(page); await openLink('a[href*="/box/"]')(page); } },
  { name: 'timetable-import', who: 'claire', size: DESKTOP, url: `/timetable/timetable/${R08}`, then: importPreview('official-timetable.pdf') },
  { name: 'timetable-import-phone', who: 'claire', size: PHONE, url: `/timetable/timetable/${R08}`, then: importPreview('official-timetable.pdf') },

  // Free view spans a window around today: a day where neither R06 nor R08 is cut at an edge.
  { name: 'planning-overview', who: 'claire', size: DESKTOP, url: '/planning/grid', now: '2026-10-10T10:00:00+02:00' },
  { name: 'planning-grid', who: 'claire', size: DESKTOP, url: '/planning/grid', then: click('role=button[name="Quarter"]') },
  { name: 'planning-days', who: 'claire', size: DESKTOP, url: '/planning/grid', then: async (page) => { await click('role=button[name="Week"]')(page); await click('button[aria-label^="Next"]')(page); } },
  { name: 'planning-attendance', who: 'claire', size: DESKTOP, url: '/planning/grid', then: click('role=button[name="Month"]') },
  { name: 'planning-phone', who: 'claire', size: PHONE, url: '/planning/grid', then: click('button[aria-label^="Next"]') }, // the race week

  // The crew app: what a chief mechanic sees on his phone.
  { name: 'crew-app-race-weekend', who: 'hugo', size: PHONE, url: `/personal/${R07}` },
  { name: 'crew-app-race-weekend-more', who: 'hugo', size: PHONE, url: `/personal/${R07}`, then: scrollTo('text=/My accommodation/i') },
  // The agenda starts today: a day that begins a block, else the block's title sits above the first row.
  { name: 'crew-app-agenda', who: 'hugo', size: PHONE, url: '/personal/planning', now: AGENDA_DAY },
  { name: 'crew-app-month', who: 'hugo', size: PHONE, url: '/personal/planning', now: AGENDA_DAY, then: click('role=button[name="Month"]') },
];

function scrollTo(selector) {
  return async (page) => {
    await page.locator(selector).first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(800);
  };
}

/** Follows a link of the page (a share link: its public page). */
function openLink(selector) {
  return async (page) => {
    await page.goto(await page.locator(selector).first().getAttribute('href'), { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(2500);
  };
}

function click(selector) {
  return async (page) => {
    await page.locator(selector).first().click();
    await page.waitForTimeout(1200);
  };
}

/** Opens the event's Import, gives it a file, waits for the preview. Never confirms, never closes. */
function importPreview(file) {
  return async (page) => {
    const phone = page.viewportSize().width < 600;
    // On a phone, Import is the floating button when it is the page's only action, else in its "More actions" menu.
    const direct = page.locator('button[aria-label="Import"]:visible');
    if (phone && !(await direct.count())) await page.locator('button[aria-label="More actions"]').last().click();
    await page.getByRole('button', { name: /^Import$/ }).locator('visible=true').last().click();
    await page.waitForTimeout(1000);
    await page.locator('input[type=file]').first().setInputFiles(join(file.endsWith('.pdf') ? printed : FILES, file));
    await page.waitForTimeout(4000);
  };
}

const only = process.argv.slice(2);
const shots = only.length ? SHOTS.filter((s) => only.includes(s.name)) : SHOTS;
if (!shots.length) throw new Error(`no shot named ${only.join(', ')}`);
if (!process.env.DEMO_ACCOUNTS_PASSWORD) throw new Error('DEMO_ACCOUNTS_PASSWORD missing: run through infisical run (see the top of this file)');
const out = process.env.OUT ?? join(import.meta.dirname, '../../src/assets/screenshots');
fs.mkdirSync(out, { recursive: true });

const dropped = [];
const browser = await chromium.launch();

// The organizer's PDF, printed from its HTML source (files/official-timetable.html) into a temporary folder.
const printed = fs.mkdtempSync(join(os.tmpdir(), 'racenode-shots-'));
{
  const page = await browser.newPage();
  await page.goto(`file://${join(FILES, 'official-timetable.html')}`);
  await page.pdf({ path: join(printed, 'official-timetable.pdf'), format: 'A4', printBackground: true });
  await page.close();
}
const sessions = {}; // one login per account and size, kept in memory only

async function context(who, size) {
  const key = `${who}-${size.width}`;
  const phone = size.width < 600;
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.scale,
    isMobile: phone,
    hasTouch: phone,
    timezoneId: 'Europe/Paris',
    locale: 'en-GB',
    ...(sessions[key] ? { storageState: sessions[key] } : {}),
  });
  await ctx.route('**/*', (route) => {
    const r = route.request();
    const url = r.url().split('?')[0];
    if (/posthog|sentry\.io/.test(url)) return route.abort();
    if (['GET', 'HEAD', 'OPTIONS'].includes(r.method())) return route.continue();
    if (/\/auth\/v1\/token$/.test(url) || /\/rest\/v1\/rpc\/(get|has|is|can|resolve)_[a-z_]+$/.test(url)) return route.continue();
    if (/\/storage\/v1\/object\/sign\//.test(url)) return route.continue(); // signs a read URL (profile photos, files)
    dropped.push(`${r.method()} ${url.replace(/^https:\/\/[^/]+/, '')}`);
    return route.abort();
  });
  if (!sessions[key]) {
    const page = await ctx.newPage();
    await page.goto(`${APP}/login`);
    await page.fill('input[type=email]', ACCOUNTS[who]);
    await page.fill('input[type=password]', process.env.DEMO_ACCOUNTS_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
    await page.waitForTimeout(2000);
    sessions[key] = await ctx.storageState();
    await page.close();
  }
  return ctx;
}

for (const shot of shots) {
  const ctx = await context(shot.who, shot.size);
  const page = await ctx.newPage();
  if (shot.now) await page.clock.setFixedTime(new Date(shot.now));
  await page.goto(APP + shot.url, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500);
  if (shot.then) await shot.then(page);
  // Profile photos load late (each one signs its URL first): wait until every image is in.
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  // Toasts and focus rings are not part of the product shot.
  await page.mouse.move(0, shot.size.height - 1);
  const file = join(out, `${shot.name}.png`);
  await page.screenshot({ path: file });
  console.log(`✓ ${shot.name}`);
  await ctx.close(); // closes the page without closing any modal in it
}
await browser.close();

const counts = Object.entries(dropped.reduce((m, d) => ({ ...m, [d]: (m[d] ?? 0) + 1 }), {}));
if (counts.length) console.log(`Dropped (read-only):${os.EOL}${counts.map(([d, n]) => `  ${n}× ${d}`).join(os.EOL)}`);
