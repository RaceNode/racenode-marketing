// RaceNode logo lockups, built from the store icon mark (public/favicon.svg)
// and the wordmark "RaceNode" set in IBM Plex Sans 600, converted to outlines
// so the SVGs need no font.
//
//   node scripts/brand/logo.mjs
//
// Writes to public/:
//   logo_horizontal.svg        mark + wordmark, white ink (dark backgrounds)
//   logo_horizontal_black.svg  same, dark ink (light backgrounds)
//   logo_vertical.svg          mark above wordmark, white ink, 120:97 ratio
//   logo_vertical_black.svg    same, dark ink
//   email/logo-white.png       horizontal, 2x of the 134x32 signature slot
//   email/logo-vertical.png    vertical, 3x of the 120x97 transactional email slot
//
// The app repo keeps its own copies (src/assets/logos, public/): copy these over.

import opentype from "opentype.js";
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUB = path.join(ROOT, "public");
mkdirSync(path.join(PUB, "email"), { recursive: true });

// ---------- Ink ----------
const INK = {
  white: { mark: "#aab4bd", text: "#ffffff" },
  black: { mark: "#6b7280", text: "#111827" },
};

// ---------- Mark (the R node) ----------
const MARK_VB = { w: 150.40347, h: 145.85779 };
const markSrc = readFileSync(path.join(PUB, "favicon.svg"), "utf8");
// Keep only the drawing (the <g> tree), drop the XML prolog, metadata and root <svg>.
const markInner = markSrc.slice(markSrc.indexOf("<g"), markSrc.lastIndexOf("</svg>"));
const markGroup = (x, y, h, color) => {
  const s = h / MARK_VB.h;
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(s, 5)})">${markInner.replace(/#aab4bd/g, color)}</g>`;
};

// ---------- Wordmark ----------
const fontBuf = readFileSync(path.join(ROOT, "node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff"));
const font = opentype.parse(fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength));
const CAP = font.tables.os2.sCapHeight / font.unitsPerEm; // 0.698
// Glyph by glyph, with our own serializer: opentype's Path.toPathData() emits
// NaN / broken segments on some glyphs of this WOFF at certain sizes.
const TRACK = -0.02; // em, same tracking as the site wordmark
const serialize = (cmds) =>
  cmds.map((c) => {
    switch (c.type) {
      case "M": case "L": return `${c.type}${n(c.x)} ${n(c.y)}`;
      case "Q": return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      case "C": return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      case "Z": return "Z";
      default: throw new Error(`unexpected path command ${c.type}`);
    }
  }).join("");
const n = (v) => { if (!Number.isFinite(v)) throw new Error("non-finite coordinate"); return Number(v.toFixed(3)); };
const wordmark = (size) => {
  const glyphs = font.stringToGlyphs("RaceNode");
  const scale = size / font.unitsPerEm;
  let x = 0, d = "", left = Infinity, right = -Infinity;
  glyphs.forEach((g, i) => {
    const p = g.getPath(x, 0, size);
    const bb = p.getBoundingBox();
    left = Math.min(left, bb.x1); right = Math.max(right, bb.x2);
    d += serialize(p.commands);
    x += g.advanceWidth * scale;
    if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * scale + TRACK * size;
  });
  return { d, left, width: right - left, cap: CAP * size };
};

const r = (n, d = 2) => Number(n.toFixed(d));
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(w)} ${r(h)}" width="${r(w)}" height="${r(h)}" role="img" aria-label="RaceNode">\n${body}\n</svg>\n`;

// ---------- Lockups ----------

// Horizontal: mark 100 high; wordmark cap height = 45% of the mark, optically centred.
function horizontal(ink) {
  const M = 100, markW = M * (MARK_VB.w / MARK_VB.h);
  const size = (0.45 * M) / CAP;
  const wm = wordmark(size);
  const gap = 0.26 * M;
  const x = markW + gap - wm.left;
  const baseline = M / 2 + wm.cap / 2;
  const W = markW + gap + wm.width;
  return {
    w: W, h: M,
    svg: svg(W, M,
      markGroup(0, 0, M, ink.mark) +
      `\n<path fill="${ink.text}" transform="translate(${r(x)} ${r(baseline)})" d="${wm.d}"/>`),
  };
}

// Vertical: mark above the wordmark, canvas locked to the 120:97 email slot.
function vertical(ink) {
  const M = 100, markW = M * (MARK_VB.w / MARK_VB.h);
  const size = (0.30 * M) / CAP;
  const wm = wordmark(size);
  const gap = 0.18 * M;
  const inkH = M + gap + wm.cap;
  const W = Math.max(markW, wm.width) * 1.06; // small side margin
  const H = W * (97 / 120);
  const top = (H - inkH) / 2;
  return {
    w: W, h: H,
    svg: svg(W, H,
      markGroup((W - markW) / 2, top, M, ink.mark) +
      `\n<path fill="${ink.text}" transform="translate(${r((W - wm.width) / 2 - wm.left)} ${r(top + M + gap + wm.cap)})" d="${wm.d}"/>`),
  };
}

const out = {
  "logo_horizontal.svg": horizontal(INK.white),
  "logo_horizontal_black.svg": horizontal(INK.black),
  "logo_vertical.svg": vertical(INK.white),
  "logo_vertical_black.svg": vertical(INK.black),
};
for (const [name, { svg: s, w, h }] of Object.entries(out)) {
  writeFileSync(path.join(PUB, name), s);
  console.log("wrote public/" + name, `${r(w)}x${r(h)}`, `ratio ${r(w / h, 3)}`);
}

// ---------- Email PNGs (transparent background) ----------
const png = async (name, s, width) => {
  const file = path.join(PUB, "email", name);
  await sharp(Buffer.from(s)).resize({ width }).png().toFile(file);
  const meta = await sharp(file).metadata();
  console.log("wrote public/email/" + name, `${meta.width}x${meta.height}`);
};
await png("logo-white.png", out["logo_horizontal.svg"].svg, 268);   // signature slot 134x32 @2x
await png("logo-vertical.png", out["logo_vertical.svg"].svg, 360);  // email slot 120x97 @3x
