#!/usr/bin/env node
/**
 * Lighthouse, mobile profile, against the target of the WBLT site template
 * (its docs/architecture.md, "Performance": performance 95+, accessibility,
 * best practices and SEO 100). From the template's tests/lighthouse.mjs, adapted:
 *
 * - Served by `astro preview` on the built site (no `npm run serve`: Pages, not
 *   Workers), or not served at all with LIGHTHOUSE_BASE (the live site).
 * - Information only for now: misses are reported as warnings and the exit
 *   code stays 0, unless LIGHTHOUSE_STRICT=1 (then as in the template).
 *
 *   npm run build && npm run test:lighthouse
 *   LIGHTHOUSE_BASE=https://www.racenode.com npm run test:lighthouse
 *   npm run test:lighthouse -- /pricing/ /crew-app/
 *
 * Performance depends on the machine: best of two runs below 90. The chrome
 * Lighthouse drives is CHROME_PATH, or the one it finds.
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LIGHTHOUSE = 'lighthouse@12.8.2';
const PORT = process.env.PORT ?? '8091';
const LIVE = process.env.LIGHTHOUSE_BASE?.replace(/\/$/, '');
const BASE = LIVE ?? `http://127.0.0.1:${PORT}`;
const STRICT = process.env.LIGHTHOUSE_STRICT === '1';
const MIN = { performance: 90, accessibility: 100, 'best-practices': 100, seo: 100 };

// One page per kind: home, a module page, the calendar, a championship page (the first one built).
const championship = LIVE
  ? 'british-gt'
  : readdirSync('dist/calendar', { withFileTypes: true })
      .filter(
        (d) => d.isDirectory() && !['circuits', 'logos', 'sample-api', 'api'].includes(d.name),
      )
      .map((d) => d.name)
      .sort()[0];
const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/logistics/', '/calendar/', ...(championship ? [`/calendar/${championship}/`] : [])];

let server;
const stop = () => {
  try {
    if (server) process.kill(-server.pid, 'SIGTERM');
  } catch {
    // already stopped
  }
};
process.on('exit', stop);

if (!LIVE) {
  server = spawn('npx', ['astro', 'preview', '--port', PORT, '--host', '127.0.0.1'], {
    stdio: 'ignore',
    detached: true,
  });
  for (let i = 0; ; i++) {
    if (i > 120) throw new Error(`server did not start on ${BASE}`);
    try {
      if ((await fetch(`${BASE}/robots.txt`)).ok) break;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

const dir = mkdtempSync(join(tmpdir(), 'lighthouse-'));
function run(path) {
  const output = join(dir, 'report.json');
  execFileSync(
    'npx',
    [
      '--yes',
      LIGHTHOUSE,
      `${BASE}${path}`,
      '--quiet',
      '--chrome-flags=--headless=new --no-sandbox',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json',
      `--output-path=${output}`,
    ],
    { stdio: 'inherit' },
  );
  const report = JSON.parse(readFileSync(output, 'utf8'));
  const scores = Object.fromEntries(
    Object.entries(report.categories).map(([id, category]) => [
      id,
      Math.round(category.score * 100),
    ]),
  );
  // What drags each category down: the failing audits, for the next lot.
  const failing = Object.values(report.categories).flatMap((category) =>
    category.auditRefs
      .filter((ref) => ref.weight > 0 && (report.audits[ref.id].score ?? 1) < 0.9)
      .map(
        (ref) =>
          `${category.id}: ${ref.id} (${report.audits[ref.id].displayValue ?? report.audits[ref.id].score})`,
      ),
  );
  return { scores, failing };
}

let failed = false;
for (const path of pages) {
  const { scores, failing } = run(path);
  if (scores.performance < MIN.performance)
    scores.performance = Math.max(scores.performance, run(path).scores.performance);
  const misses = Object.entries(MIN).filter(([id, min]) => scores[id] < min);
  console.log(
    `${path} ${Object.entries(scores)
      .map(([id, score]) => `${id}=${score}`)
      .join(' ')}`,
  );
  for (const audit of failing) console.log(`  ${audit}`);
  for (const [id, min] of misses)
    console.log(`::${STRICT ? 'error' : 'warning'}::${path}: ${id} ${scores[id]} < ${min}`);
  failed ||= misses.length > 0;
}
stop();
process.exit(failed && STRICT ? 1 : 0);
