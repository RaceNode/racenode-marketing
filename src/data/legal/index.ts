/**
 * The legal texts, one file per text and language: `src/data/legal/<name>` for the default language,
 * `src/data/legal/<locale>/<name>` for the others. A new language costs one file per text here (a text missing in a
 * language falls back to the default one).
 */
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import { defaultLocale, type Locale } from '@/i18n';

type Text = { Content: AstroComponentFactory };
const texts = import.meta.glob<Text>('./**/*.{md,mdx}', { eager: true });

/** `name`: file name with its extension, e.g. `terms-and-conditions.md`. */
export function legalText(name: string, locale: Locale): Text['Content'] {
  const path = locale === defaultLocale ? `./${name}` : `./${locale}/${name}`;
  return (texts[path] ?? texts[`./${name}`])!.Content;
}
