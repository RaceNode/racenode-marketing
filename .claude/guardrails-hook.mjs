#!/usr/bin/env node
// PostToolUse hook (declared in .claude/settings.json): on the first edit of a session, a short reminder of
// the judgment rules; on every edit, the guardrail violations of the file touched (or of the site).
// Silent when everything holds, never blocks.
import fs from 'node:fs';
import os from 'node:os';
import { join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const REMINDER = `You are editing the public RaceNode site. Prove, don't promise: every claim is backed by something a visitor can check (screenshot, store listing, self-serve trial); no superlative, no feature announced before it ships, no competitor named, no invented testimonial.
Guardrails (scripts/guardrails.mjs, run by npm run build and so by Cloudflare) are checked after each edit: if they fail, fix the copy. A rule only changes with Willi's agreement.`;

try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const file = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  const rel = file ? relative(root, file).replaceAll('\\', '/') : '..';
  if (rel.startsWith('..') || isAbsolute(rel)) process.exit(0);

  const said = [];
  const marker = join(os.tmpdir(), `guardrails-racenode-marketing-${input.session_id ?? 'x'}`);
  if (!fs.existsSync(marker)) { fs.writeFileSync(marker, ''); said.push(REMINDER); }

  const { check } = await import('../scripts/guardrails.mjs');
  const all = check(root);
  const mine = all.filter((m) => m.includes(rel));
  const shown = mine.length ? mine : all;
  if (shown.length) {
    const rest = all.length - shown.length;
    said.push(`Guardrails broken, fix now:\n${shown.map((m) => `- ${m}`).join('\n')}${rest ? `\n(+${rest} elsewhere)` : ''}`);
  }
  if (said.length) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: said.join('\n\n') } }));
} catch (error) {
  console.error(`guardrails-hook: ${error.message}`);
}
