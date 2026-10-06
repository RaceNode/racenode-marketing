// Guardrails of the marketing site: rules that already drifted once, turned into checks.
//
// Where the rules come from (each one broke at least once):
// - colors: the app went monochrome + indigo on 2026-08-07 ("color signals a state, never a category");
//   the site kept green CTAs until 2026-08-23, and a literal red was still on the home page on 2026-10-05.
// - pricing: Willi, 2026-09-28, only three promises hold (free until 31/12/2026; the price you join at holds
//   until 31 December; monthly with an annual option). "Early adopter price kept for life", "regardless of
//   team size", "Personal free, always" were withdrawn that day. Prices stay unpublished until he decides.
// - vocabulary: docs/racenode-marketing-site-seo-reference.md §3.3 rules out "roadbook" (rally-raid intent in
//   English) and "motorsport logistics" (freight intent); "freight" was taken off the Logistics breadcrumb on
//   2026-10-04, "roadbook" was still on the home page on 2026-10-05.
// - conflict detection: Willi, 2026-08-23, it does not work well yet; do not market it until he says it is solid.
//   It was still on the Timetable page on 2026-10-05.
//
// A rule only changes with Willi's agreement, his words and the date next to it. Changing a rule to let a
// change through is the very drift it is here to stop.
// check(root) → messages (empty = everything holds). Run by the test, the .claude/guardrails-hook.mjs hook
// and npm run build (Cloudflare Pages builds every commit: a failing check means no deploy).
import fs from 'node:fs';
import { join, relative } from 'node:path';

// Violations present when a rule was set, named one by one: the list can only shrink.
export const TOLERATED = {};

const RULES = [
  {
    name: 'colors',
    dirs: ['src'],
    re: /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|decoration|shadow|accent|caret)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\bbg-(?:gradient|linear|radial|conic)-|\b(?:linear|radial|conic)-gradient\(/,
    why: 'literal color class or gradient: color signals a state, never a category; use the tokens of src/styles/global.css (accent, ok, watch, blocking) or a gray',
  },
  {
    name: 'pricing',
    dirs: ['src', 'public/llms.txt', 'store/listing.json'],
    re: /for life|lifetime (?:price|deal|access)|early[- ]adopter|regardless of (?:team )?size|free,? (?:always|forever)|€\s?\d|\d\s?€|\bper month\b|\/\s?month\b/i,
    why: 'pricing promise or price figure: only the three promises of 2026-09-28 hold and prices stay unpublished until Willi decides',
  },
  {
    name: 'vocabulary',
    dirs: ['src', 'public/llms.txt', 'store/listing.json'],
    re: /\broadbook|motorsport logistics/i,
    why: 'word the SEO reference rules out in English (§3.3): "roadbook" reads as rally-raid navigation, "motorsport logistics" as freight; write event brief, crew travel, people logistics',
  },
  {
    name: 'conflict detection',
    dirs: ['src', 'public/llms.txt', 'store/listing.json'],
    re: /conflict detection|detects? (?:scheduling )?conflicts?|conflict (?:alerts?|warnings?)/i,
    why: 'conflict detection does not work well yet (Willi, 2026-08-23): do not market it until he says it is solid',
  },
];

// URLs declared or linked outside this repo: removing or renaming one breaks something we do not control.
// /account-deletion is declared in Google Play Console (Data Safety); /privacy and /terms in both stores and
// the app; the module pages and /crew-app are linked from the app, the store listings and search results.
// Willi, 2026-10-06 (taken from the WBLT site template).
export const STABLE_URLS = ['/account-deletion', '/privacy', '/terms', '/crew-planning', '/logistics', '/management', '/timetable', '/crew-app'];

const PAGE_EXTS = ['.astro', '.md', '.mdx'];

const EXTS = ['.astro', '.ts', '.js', '.mjs', '.md', '.mdx', '.css', '.txt', '.json'];

/** The text without its comments: the rule is about what the page shows, not what a comment says. */
export const code = (t) =>
  t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1');

function files(root, target) {
  const out = [];
  const walk = (p) => {
    let st;
    try { st = fs.statSync(p); } catch { return; }
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(p)) if (e !== 'node_modules' && !e.startsWith('.')) walk(join(p, e));
    } else if (EXTS.some((x) => p.endsWith(x))) {
      out.push({ rel: relative(root, p).replaceAll('\\', '/'), text: fs.readFileSync(p, 'utf8') });
    }
  };
  walk(join(root, target));
  return out;
}

export function check(root) {
  const out = [];
  for (const rule of RULES) {
    const found = rule.dirs.flatMap((d) => files(root, d)).filter((f) => rule.re.test(code(f.text)));
    const tolerated = TOLERATED[rule.name] ?? [];
    for (const f of found) {
      if (tolerated.includes(f.rel)) continue;
      const hit = code(f.text).match(rule.re)[0];
      out.push(`${f.rel} has "${hit}": ${rule.why}`);
    }
    for (const t of tolerated.filter((t) => !found.some((f) => f.rel === t)))
      out.push(`${t} no longer breaks "${rule.name}": remove it from TOLERATED in scripts/guardrails.mjs`);
  }

  for (const url of STABLE_URLS) {
    const page = join(root, 'src/pages', url);
    if (!PAGE_EXTS.some((x) => fs.existsSync(page + x) || fs.existsSync(join(page, 'index' + x))))
      out.push(`${url} has no page in src/pages any more: it is a stable URL (declared at Google Play or linked from the app and stores), put the page back`);
  }

  // Wiring: the triggers still exist.
  try {
    const hooks = JSON.stringify(JSON.parse(fs.readFileSync(join(root, '.claude/settings.json'), 'utf8')).hooks?.PostToolUse ?? []);
    if (!hooks.includes('guardrails-hook.mjs')) out.push('.claude/settings.json no longer runs the guardrails hook: put it back');
  } catch {
    out.push('.claude/settings.json missing or unreadable: the guardrails hook is no longer wired');
  }
  try {
    const build = JSON.parse(fs.readFileSync(join(root, 'package.json'), 'utf8')).scripts?.build ?? '';
    if (!build.includes('scripts/guardrails.mjs')) out.push('package.json: npm run build no longer runs scripts/guardrails.mjs, so Cloudflare would deploy past it: put it back');
  } catch {
    out.push('package.json missing or unreadable');
  }
  return out;
}

// CLI: node scripts/guardrails.mjs → list, exit 1 on any violation.
if (process.argv[1] && import.meta.filename === fs.realpathSync(process.argv[1])) {
  const found = check(join(import.meta.dirname, '..'));
  for (const m of found) console.error(`✗ ${m}`);
  if (found.length) process.exit(1);
  console.log('✓ guardrails hold');
}
