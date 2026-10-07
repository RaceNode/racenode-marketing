// The site holds to its guardrails, and each drift injected into a copy is caught.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { check } from './guardrails.mjs';

const root = join(import.meta.dirname, '..');

test('the site holds to its guardrails', () => {
  assert.deepEqual(check(root), []);
});

test('the guardrails catch a drift', (t) => {
  const copy = fs.mkdtempSync(join(os.tmpdir(), 'guardrails-'));
  t.after(() => fs.rmSync(copy, { recursive: true, force: true }));
  for (const d of ['src', 'public/llms.txt', 'store', 'package.json']) fs.cpSync(join(root, d), join(copy, d), { recursive: true });
  const page = (name, body) => fs.writeFileSync(join(copy, 'src', 'components', name), body);
  page('Drift1.astro', '<a class="bg-green-600">Start</a>');
  page('Drift2.astro', '<div class="bg-gradient-to-r from-gray-900">x</div>');
  page('Drift3.astro', '<p>Early adopter price kept for life.</p>');
  page('Drift4.astro', '<p>Core plan: 150 € per month.</p>');
  page('Drift5.astro', '<p>Publish the roadbook.</p>');
  page('Drift6.astro', '<p>Built-in conflict detection.</p>');
  page('Drift7.astro', '<title>Motorsport ERP</title>');
  page('Fine.astro', '<!-- bg-red-500, roadbook --><p class="text-blocking">People logistics, not freight.</p>');
  fs.rmSync(join(copy, 'src', 'pages', 'account-deletion.astro'));
  fs.renameSync(join(copy, 'src', 'pages', 'crew-app.astro'), join(copy, 'src', 'pages', 'crew.astro'));
  // No .claude/settings.json in the copy, and a build that skips the guardrails.
  fs.writeFileSync(join(copy, 'package.json'), '{"scripts":{"build":"astro build"}}');
  const found = check(copy).join('\n');
  for (const re of [/Drift1.*bg-green-600/, /Drift2.*bg-gradient-/, /Drift3.*Early adopter/i, /Drift4.*€/, /Drift5.*roadbook/, /Drift6.*conflict detection/, /Drift7.*ERP/, /guardrails hook/, /npm run build/, /\/account-deletion has no page/, /\/crew-app has no page/])
    assert.match(found, re);
  assert.doesNotMatch(found, /Fine\.astro/);
  assert.doesNotMatch(found, /\/privacy has no page/);
});
