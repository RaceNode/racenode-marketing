// LinkedIn / Instagram carousels: one PNG per slide (1080x1350) plus one PDF
// (LinkedIn "document" post). Same tokens, fonts and logo as generate.mjs;
// screenshots come from src/assets/screenshots, cropped per slide.
//
//   node scripts/brand/carousel.mjs <carousel.json> [outDir]
//
// carousel.json: { "slug": "...", "slides": [ slide, ... ] } where a slide is
//   { "type": "cover", "kicker", "title", "body" }
//   { "type": "shot",  "kicker", "title", "body", "shot": "logistics-travel",
//     "crop": { "x": 0.04, "y": 0.27, "w": 0.48, "h": 0.55 } }   // fractions of the screenshot
//   { "type": "end",   "title", "body", "badges": true }
// The copy files live outside this public repo; only the renderer is here.

import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SHOTS = path.join(ROOT, "src/assets/screenshots");
const [specPath, outArg] = process.argv.slice(2);
if (!specPath) {
  console.error("usage: node scripts/brand/carousel.mjs <carousel.json> [outDir]");
  process.exit(1);
}
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const OUT = path.resolve(outArg ?? path.dirname(specPath), spec.slug);
mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1350, PAD = 96;
const T = {
  bg: "#030712", card: "#111827", border: "#1f2937",
  text: "#ffffff", muted: "#9ca3af", faint: "#6b7280", accent: "#5b5bd6",
};

const readPublic = (f) => readFileSync(path.join(ROOT, "public", f), "utf8");
const inlineSvg = (svg) =>
  svg.replace(/<\?xml[^>]*>/, "").replace(/<svg([^>]*?)\s(height|width)="[^"]+"/g, "<svg$1");
const LOGO = inlineSvg(readPublic("logo_horizontal.svg"));
const BADGE_APPLE = inlineSvg(readPublic("badge-app-store.svg"));
const BADGE_PLAY = inlineSvg(readPublic("badge-google-play.svg"));

const fontFace = (family, dir, weight) => {
  const file = path.join(ROOT, "node_modules/@fontsource", dir, "files", `${dir}-latin-${weight}-normal.woff2`);
  return `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(file).toString("base64")}) format("woff2")}`;
};

const CSS = `
  ${fontFace("IBM Plex Sans", "ibm-plex-sans", 400)}
  ${fontFace("IBM Plex Sans", "ibm-plex-sans", 600)}
  ${fontFace("IBM Plex Mono", "ibm-plex-mono", 500)}
  @page{size:${W}px ${H}px;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:${T.bg};color:${T.text};font-family:"IBM Plex Sans",sans-serif;-webkit-font-smoothing:antialiased}
  .slide{width:${W}px;height:${H}px;padding:${PAD}px;display:flex;flex-direction:column;gap:48px;overflow:hidden;break-after:page;position:relative}
  .logo{height:56px;aspect-ratio:417.49/100}
  .logo svg,.badge svg{display:block;height:100%;width:auto}
  .mono{font-family:"IBM Plex Mono",monospace;font-weight:500;letter-spacing:0.08em;text-transform:uppercase}
  .kicker{display:flex;align-items:center;gap:20px;font-size:26px;color:${T.muted}}
  .kicker::before{content:"";width:6px;height:38px;background:${T.accent};border-radius:2px}
  h1{font-size:76px;font-weight:600;line-height:1.08;letter-spacing:-0.025em}
  h2{font-size:56px;font-weight:600;line-height:1.1;letter-spacing:-0.02em}
  p{font-size:36px;line-height:1.45;color:${T.muted}}
  .grow{flex:1;display:flex;flex-direction:column;justify-content:center;gap:40px}
  .shotwrap{flex:1;min-height:0;display:flex;align-items:center}
  .shot{width:100%;border:2px solid ${T.border};border-radius:20px;overflow:hidden;background:${T.card};position:relative}
  .shot img{position:absolute;display:block}
  .foot{display:flex;align-items:flex-end;justify-content:space-between}
  .badges{display:flex;gap:20px}.badge{height:80px}
  .site{font-size:26px;color:${T.faint}}
  .page{position:absolute;right:${PAD}px;top:${PAD + 14}px;font-size:24px;color:${T.faint}}
`;

const shotUrl = (name) => "file://" + path.join(SHOTS, `${name}.png`);

// The crop box is scaled to fill the frame's width; the frame takes the crop's
// height, capped by the room the slide leaves, and is centred in that room.
const shot = ({ shot: name, crop }) =>
  `<div class="shotwrap"><div class="shot" data-crop='${JSON.stringify(crop)}'><img src="${shotUrl(name)}"></div></div>`;

const n = spec.slides.length;
const slide = (s, i) => {
  const page = `<div class="page mono">${i + 1} / ${n}</div>`;
  const head = `<div class="logo">${LOGO}</div>${page}`;
  if (s.type === "cover")
    return `<section class="slide">${head}<div class="grow">
      <div class="kicker mono">${s.kicker}</div><h1>${s.title}</h1><p>${s.body}</p></div>
      <div class="foot"><div></div><div class="site mono">Swipe →</div></div></section>`;
  if (s.type === "shot")
    return `<section class="slide">${head}
      <div><div class="kicker mono" style="margin-bottom:28px">${s.kicker}</div><h2>${s.title}</h2>
      <p style="margin-top:24px">${s.body}</p></div>${shot(s)}</section>`;
  return `<section class="slide">${head}<div class="grow"><h1>${s.title}</h1><p>${s.body}</p></div>
    <div class="foot"><div class="badges">${s.badges ? `<div class="badge">${BADGE_APPLE}</div><div class="badge">${BADGE_PLAY}</div>` : ""}</div>
    <div class="site mono">racenode.com</div></div></section>`;
};

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${spec.slides.map(slide).join("")}</body></html>`;
const htmlFile = path.join(OUT, "carousel.html");
writeFileSync(htmlFile, html);

const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: W, height: H } });
await pg.goto("file://" + htmlFile, { waitUntil: "load" });
await pg.evaluate(() => document.fonts.ready);
await pg.evaluate(() => {
  for (const frame of document.querySelectorAll(".shot")) {
    const c = JSON.parse(frame.dataset.crop);
    const img = frame.querySelector("img");
    const scale = frame.clientWidth / (c.w * img.naturalWidth);
    const room = frame.parentElement.clientHeight;
    frame.style.height = `${Math.min(room, c.h * img.naturalHeight * scale)}px`;
    img.style.width = `${img.naturalWidth * scale}px`;
    img.style.left = `${-c.x * img.naturalWidth * scale}px`;
    img.style.top = `${-c.y * img.naturalHeight * scale}px`;
  }
});
const sections = await pg.$$("section.slide");
for (const [i, el] of sections.entries()) {
  const file = path.join(OUT, `${spec.slug}-${String(i + 1).padStart(2, "0")}.png`);
  await el.screenshot({ path: file });
  console.log("wrote", file);
}
const pdf = path.join(OUT, `${spec.slug}.pdf`);
await pg.pdf({ path: pdf, width: `${W}px`, height: `${H}px`, printBackground: true });
console.log("wrote", pdf);
await browser.close();
