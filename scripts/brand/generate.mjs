// Social media assets for RaceNode: avatars, LinkedIn banners, post visuals, OG image.
// Everything is rendered from the logo lockups produced by logo.mjs (public/
// logo_horizontal.svg, favicon.svg) with the site's design tokens and IBM Plex,
// in headless Chromium (playwright-core; the browser binary is the one already
// installed for the app's e2e suite).
//
//   node scripts/brand/generate.mjs          # all assets -> brand/social/ (+ public/og-image.png)
//   node scripts/brand/generate.mjs posts    # only the posts from posts.json
//
// Post copy lives in posts.json (one entry = one square + one portrait visual).

import { chromium } from "playwright-core";
import { readFileSync, mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "brand/social");
mkdirSync(OUT, { recursive: true });

// Tokens (dark values: src/styles/global.css + Tailwind gray ramp)
const T = {
  bg: "#030712", card: "#111827", border: "#1f2937",
  text: "#ffffff", muted: "#9ca3af", faint: "#6b7280",
  mark: "#aab4bd", accent: "#5b5bd6",
};

const readPublic = (f) => readFileSync(path.join(ROOT, "public", f), "utf8");
const inlineSvg = (svg) =>
  svg.replace(/<\?xml[^>]*>/, "").replace(/<svg([^>]*?)\s(height|width)="[^"]+"/g, "<svg$1");
const MARK = inlineSvg(readPublic("favicon.svg"));          // the R node alone
const LOGO = inlineSvg(readPublic("logo_horizontal.svg"));  // mark + wordmark (logo.mjs)
const LOGO_RATIO = "417.49/100";
const BADGE_APPLE = inlineSvg(readPublic("badge-app-store.svg"));
const BADGE_PLAY = inlineSvg(readPublic("badge-google-play.svg"));

const fontFace = (family, dir, weight) => {
  const file = path.join(ROOT, "node_modules/@fontsource", dir, "files", `${dir}-latin-${weight}-normal.woff2`);
  const b64 = readFileSync(file).toString("base64");
  return `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
};
const FONTS = [
  fontFace("IBM Plex Sans", "ibm-plex-sans", 400),
  fontFace("IBM Plex Sans", "ibm-plex-sans", 500),
  fontFace("IBM Plex Sans", "ibm-plex-sans", 600),
  fontFace("IBM Plex Mono", "ibm-plex-mono", 500),
].join("\n");

const BASE_CSS = `
  ${FONTS}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:${T.bg};color:${T.text};
    font-family:"IBM Plex Sans",sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
  .mark,.logo{display:block}
  .mark svg,.logo svg{display:block;width:100%;height:100%}
  .logo{aspect-ratio:${LOGO_RATIO}}
  .muted{color:${T.muted}}
  .mono{font-family:"IBM Plex Mono",monospace;font-weight:500;letter-spacing:0.08em;text-transform:uppercase}
  .badge svg{display:block;height:100%;width:auto}
`;

const page = (css, body) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}${css}</style></head><body>${body}</body></html>`;

// ---------- Templates ----------

// Same composition as the store icon: mark = 60.4% of the canvas, centered.
const avatar = () =>
  page(
    `body{display:grid;place-items:center} .mark{width:60.4vw;aspect-ratio:150.40347/145.85779}`,
    `<div class="mark">${MARK}</div>`,
  );

// Logo + tagline, centered in the safe zone. `shift`/`right`/`align` keep the
// block clear of the LinkedIn avatar overlay (bottom-left).
const banner = ({ shift = "0", right = "0", align = "center", logoPx, tagPx, gap }) =>
  page(
    `body{display:flex;align-items:center;justify-content:${align};padding-left:${shift};padding-right:${right}}
     .row{display:flex;align-items:center;gap:${gap}px}
     .logo{height:${logoPx}px}
     .sep{width:2px;height:${logoPx * 0.8}px;background:${T.border}}
     .tag{font-size:${tagPx}px;line-height:1.35;white-space:nowrap}
     .tag .l1{color:${T.text};font-weight:500}
     .tag .l2{color:${T.muted}}`,
    `<div class="row">
       <div class="logo">${LOGO}</div>
       <div class="sep"></div>
       <div class="tag"><div class="l1">Racing team management software.</div>
         <div class="l2">Planning, travel, timetable and event management, in one place.</div></div>
     </div>`,
  );

// Post visual (square or portrait). Header = logo, middle = message, footer = badges + site.
const post = ({ kicker, title, body, badges }, { W }) => {
  const pad = Math.round(W * 0.09);
  return page(
    `body{padding:${pad}px;display:flex;flex-direction:column;justify-content:space-between}
     .head .logo{height:${W * 0.09}px}
     .kicker{display:flex;align-items:center;gap:${W * 0.02}px;font-size:${W * 0.024}px;color:${T.muted}}
     .kicker::before{content:"";display:block;width:${W * 0.006}px;height:${W * 0.036}px;background:${T.accent};border-radius:2px}
     h1{font-size:${W * 0.088}px;font-weight:600;line-height:1.08;letter-spacing:-0.025em;margin:${W * 0.03}px 0 ${W * 0.035}px;max-width:${W * 0.86}px}
     p{font-size:${W * 0.036}px;line-height:1.45;color:${T.muted};max-width:${W * 0.8}px}
     .foot{display:flex;align-items:flex-end;justify-content:space-between}
     .badges{display:flex;gap:${W * 0.02}px}
     .badge{height:${W * 0.075}px}
     .site{font-size:${W * 0.024}px;color:${T.faint}}`,
    `<div class="head"><div class="logo">${LOGO}</div></div>
     <div>
       <div class="kicker mono">${kicker}</div>
       <h1>${title}</h1>
       <p>${body}</p>
     </div>
     <div class="foot">
       <div class="badges">${badges ? `<div class="badge">${BADGE_APPLE}</div><div class="badge">${BADGE_PLAY}</div>` : ""}</div>
       <div class="site mono">racenode.com</div>
     </div>`,
  );
};

// Open Graph image for the site.
const og = () =>
  page(
    `body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:56px}
     .logo{height:150px}
     .tag{font-size:34px;color:${T.muted}}`,
    `<div class="logo">${LOGO}</div>
     <div class="tag">Racing team management software</div>`,
  );

// ---------- Render ----------

const JOBS = {
  "avatar-1024": { W: 1024, H: 1024, scale: 1, html: avatar() },
  "avatar-400": { W: 400, H: 400, scale: 1, html: avatar() },
  // LinkedIn company page cover: 1128x191, rendered at 2x. Block kept in the central 60%.
  "linkedin-banner-company-2256x382": {
    W: 1128, H: 191, scale: 2, html: banner({ logoPx: 66, tagPx: 16, gap: 18 }),
  },
  // LinkedIn personal profile cover: 1584x396, rendered at 2x. Block kept right of the avatar overlay.
  "linkedin-banner-profile-3168x792": {
    W: 1584, H: 396, scale: 2, html: banner({ shift: "22%", right: "8%", align: "flex-end", logoPx: 94, tagPx: 19, gap: 26 }),
  },
  "og-image-1200x630": { W: 1200, H: 630, scale: 2, html: og(), copyTo: path.join(ROOT, "public/og-image.png") },
};

const posts = JSON.parse(readFileSync(path.join(ROOT, "scripts/brand/posts.json"), "utf8"));
for (const p of posts) {
  JOBS[`post-${p.slug}-square-1080`] = { W: 1080, H: 1080, scale: 2, html: post(p, { W: 1080 }) };
  JOBS[`post-${p.slug}-portrait-1080x1350`] = { W: 1080, H: 1350, scale: 2, html: post(p, { W: 1080 }) };
}

const only = process.argv[2];
const browser = await chromium.launch();
for (const [name, job] of Object.entries(JOBS)) {
  if (only === "posts" && !name.startsWith("post-")) continue;
  const ctx = await browser.newContext({ viewport: { width: job.W, height: job.H }, deviceScaleFactor: job.scale });
  const pg = await ctx.newPage();
  await pg.setContent(job.html, { waitUntil: "load" });
  await pg.evaluate(() => document.fonts.ready);
  const file = path.join(OUT, `${name}.png`);
  await pg.screenshot({ path: file, type: "png" });
  await ctx.close();
  console.log("wrote", path.relative(ROOT, file));
  if (job.copyTo) { copyFileSync(file, job.copyTo); console.log("copied to", path.relative(ROOT, job.copyTo)); }
}
await browser.close();
