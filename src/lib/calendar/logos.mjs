// The championships' official logos, hosted by the site (Willi, 2026-10-08): the build downloads each one from the
// catalog's storage, shrinks it to a small webp and the site serves it at /calendar/logos/<slug>.webp
// (src/pages/calendar/logos/[slug].webp.ts). A page never points to the storage. A logo that is missing or does not
// download is simply absent: its row stays text and the build goes on. Node only (sharp).
import sharp from 'sharp';

/** The box a logo is shown in (render.mjs and global.css) and the size it is kept at: 4x that, for sharp screens. */
export const LOGO_BOX = { width: 48, height: 32 };
const KEPT = { width: LOGO_BOX.width * 4, height: LOGO_BOX.height * 4 };
const DOWNLOAD_TIMEOUT_MS = 15000;
const MAX_BYTES = 5_000_000;
const PARALLEL = 8;

/**
 * Which of a series' logos the paper of the calendar pages can carry, and the tone it needs:
 * - 'l': reads on paper (the light variant, or the only logo when it is not the dark variant);
 * - 'd': made for a dark background, shown on an ink chip.
 * null when the series has no logo.
 */
export function pickLogo(s) {
  if (s.logo_light_url) return { url: s.logo_light_url, tone: 'l' };
  if (s.logo_url && s.logo_url !== s.logo_dark_url) return { url: s.logo_url, tone: 'l' };
  const dark = s.logo_dark_url ?? s.logo_url;
  return dark ? { url: dark, tone: 'd' } : null;
}

async function download(url, fetchImpl) {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`answered ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error('too big');
  return sharp(buf, { density: 300 })
    .resize({ ...KEPT, fit: 'inside' })
    .webp({ quality: 85 })
    .toBuffer();
}

/**
 * slug → { tone, file } for every series whose logo downloaded and converted; the others are left out (and said on
 * the build's log, without the storage's address).
 */
export async function loadLogos(series, { fetchImpl = fetch } = {}) {
  const todo = series.map((s) => ({ slug: s.slug, pick: pickLogo(s) })).filter((x) => x.pick);
  const out = new Map();
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const { slug, pick } = todo[next++];
      try {
        out.set(slug, { tone: pick.tone, file: await download(pick.url, fetchImpl) });
      } catch (e) {
        console.warn(
          `calendar: no logo for ${slug} (${String(e.message ?? e).slice(0, 80)}); its rows stay text`,
        );
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker));
  return out;
}
