/**
 * Web font files of the first screen, preloaded by `BaseLayout.astro` so the
 * text never swaps visibly and the layout does not shift (WBLT site template:
 * src/styles/fonts.ts). Two or three at most: the condensed bold of the big
 * headings (the home page's LCP), the body text and its semibold (buttons, links).
 */
import display700 from '@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-700-normal.woff2?url';
import sans400 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url';
import sans600 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2?url';

export const preloadFonts: string[] = [display700, sans400, sans600];
