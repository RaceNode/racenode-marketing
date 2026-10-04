// Tells IndexNow engines (Bing, Yandex, Seznam, Naver; Bing's index also feeds
// ChatGPT search) that the site's pages changed, so they recrawl without
// waiting. Needs no account: ownership is proved by the key file in public/.
// The key is public by design.
//
//   node scripts/seo/indexnow.mjs        # after a deploy that changed pages
//
// Reads the live sitemap, so run it once Cloudflare Pages has published.

const KEY = "8bea224a622d5882ae5365958fd16b0b";
const HOST = "www.racenode.com";

const index = await (await fetch(`https://${HOST}/sitemap-index.xml`)).text();
const sitemaps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const urls = [];
for (const sm of sitemaps) {
  const xml = await (await fetch(sm)).text();
  urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${urls.length} URLs, HTTP ${res.status}`);
if (!res.ok && res.status !== 202) process.exit(1);
