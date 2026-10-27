// Pre-push gate (.githooks/pre-push): pricing never reaches the public repo without Willi's yes.
// Reads git's pre-push stdin ("<local ref> <local sha> <remote ref> <remote sha>" per line).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ZERO = /^0+$/;
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
// Same figures as the "price figures" rule of scripts/guardrails.mjs, plus the pricing words themselves.
const PRICE = /€\s?\d|\d\s?€|\bper month\b|\/\s?month\b|\bper year\b|free trial|subscription/i;
const PAGES = ['src/pages/pricing.astro'];
// The rules themselves quote the words they look for.
const RULES = [
  'scripts/pricing-push-gate.mjs',
  'scripts/guardrails.mjs',
  'scripts/guardrails.test.mjs',
];

const refused = [];
for (const line of readFileSync(0, 'utf8').split('\n').filter(Boolean)) {
  const [, local, remoteRef, remote] = line.split(' ');
  if (ZERO.test(local)) continue; // branch deletion
  const base = ZERO.test(remote) ? git('merge-base', local, 'origin/main').trim() : remote;
  if (base === local) continue;
  const range = `${base}..${local}`;
  const files = git('diff', '--name-only', range).split('\n').filter(Boolean);
  const added = git('diff', '-U0', range, '--', '.', ...RULES.map((f) => ':!' + f))
    .split('\n')
    .filter((l) => (l.startsWith('+') || l.startsWith('-')) && !/^(\+\+\+|---) /.test(l));
  const touches = files.some((f) => PAGES.includes(f)) || added.some((l) => PRICE.test(l));
  if (!touches) continue;
  if (/^Oui-Willi: .+/m.test(git('log', '--format=%B', range))) continue;
  refused.push(remoteRef);
}

if (refused.length) {
  console.error(
    `Refused: ${refused.join(', ')} changes the pricing page or price wording without Willi's yes.\n` +
      'Show him a capture first; once he says yes, add the trailer "Oui-Willi: <date and his words>" to a commit of the push.',
  );
  process.exit(1);
}
