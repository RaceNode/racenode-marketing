// Checks store/listing.json against the App Store and Play Console limits.
// Usage: node scripts/store/check.mjs [path] — exits 1 on any error.
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? new URL('../../store/listing.json', import.meta.url);
const listing = JSON.parse(readFileSync(file, 'utf8'));

// Character limits (both consoles count characters); Apple keywords: 100 bytes.
const LIMITS = { name: 30, subtitle: 30, shortDescription: 80, description: 4000 };
const FIELDS = ['name', 'subtitle', 'shortDescription', 'description', 'keywords', 'supportUrl', 'privacyPolicyUrl'];
const chars = (s) => [...s].length;

const errors = [];
const locales = Object.entries(listing.locales ?? {});
if (!locales.length) errors.push('no locale');

for (const [locale, l] of locales) {
  const err = (msg) => errors.push(`${locale}: ${msg}`);
  for (const f of FIELDS) if (l[f] === undefined) err(`${f} missing`);
  for (const f of Object.keys(l)) if (!FIELDS.includes(f)) err(`unknown field ${f}`);
  if (!Array.isArray(l.description) || !Array.isArray(l.keywords)) {
    err('description and keywords must be arrays');
    continue;
  }

  const text = {
    name: l.name,
    subtitle: l.subtitle,
    shortDescription: l.shortDescription,
    description: l.description.join('\n\n'),
    keywords: l.keywords.join(','),
  };
  for (const [f, s] of Object.entries(text)) {
    if (typeof s !== 'string' || !s.trim()) { err(`${f} empty`); continue; }
    if (LIMITS[f] && chars(s) > LIMITS[f]) err(`${f}: ${chars(s)} characters, limit ${LIMITS[f]}`);
    if (s !== s.trim() || /[ \t]\n|\n[ \t]/.test(s)) err(`${f}: stray whitespace`);
    // The stores show text as typed: no Markdown, no HTML.
    if (/\*\*|__|`|^#|^>|<\/?[a-z]/im.test(s)) err(`${f}: Markdown or HTML would show as-is`);
  }
  for (const p of l.description) if (/\n/.test(p)) err('description: one paragraph per entry, no line breaks inside');

  const kwBytes = Buffer.byteLength(text.keywords);
  if (kwBytes > 100) err(`keywords: ${kwBytes} bytes, limit 100`);
  for (const k of l.keywords) if (!k || k !== k.trim() || k.includes(',')) err(`keywords: bad entry "${k}"`);
  if (new Set(l.keywords.map((k) => k.toLowerCase())).size !== l.keywords.length) err('keywords: duplicate');

  for (const f of ['supportUrl', 'privacyPolicyUrl']) if (!/^https:\/\/\S+$/.test(l[f])) err(`${f}: not an https URL`);

  console.log(`${locale}: name ${chars(text.name)}/30, subtitle ${chars(text.subtitle)}/30, short ${chars(text.shortDescription)}/80, description ${chars(text.description)}/4000, keywords ${kwBytes}/100`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log('✓ store listing within limits');
