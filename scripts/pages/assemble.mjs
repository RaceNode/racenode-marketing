// Turns the Cloudflare adapter's output (dist/client + dist/server, made for Workers) into what Cloudflare Pages
// deploys from `dist`: the static site at the root, the server in dist/_worker.js/, and a _routes.json that sends
// only /calendar/* to it. Every other URL stays a static file: free, unlimited, never touches the worker quota.
// Run by `npm run build` after `astro build`.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const client = path.join(dist, 'client');
const server = path.join(dist, 'server');
if (!fs.existsSync(client) || !fs.existsSync(server)) throw new Error(`pages: ${dist} is not the Cloudflare adapter's output`);

// The routes rendered on request. Kept here, next to the only thing that reads it.
export const ROUTES = { version: 1, include: ['/calendar', '/calendar/*'], exclude: [] };

const worker = path.join(dist, '_worker.js');
fs.renameSync(server, `${worker}.tmp`);
for (const name of fs.readdirSync(client)) fs.renameSync(path.join(client, name), path.join(dist, name));
fs.rmdirSync(client);
fs.renameSync(`${worker}.tmp`, worker);

// Pages runs _worker.js/index.js. The adapter's wrangler.json (Workers only) and the sample data (previews without
// the catalog views) have nothing to do in production.
fs.renameSync(path.join(worker, 'entry.mjs'), path.join(worker, 'index.js'));
fs.rmSync(path.join(worker, 'wrangler.json'), { force: true });
fs.rmSync(path.join(worker, '.prerender'), { recursive: true, force: true });
// The redirect the adapter leaves for Wrangler points at dist/server, gone now; `wrangler pages dev` refuses to run with it.
fs.rmSync(path.resolve('.wrangler/deploy/config.json'), { force: true });
fs.writeFileSync(path.join(dist, '_routes.json'), JSON.stringify(ROUTES, null, 2) + '\n');

const size = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);
console.log(`pages: dist/ assembled, worker ${(size(worker) / 1024).toFixed(0)} KiB, routes ${ROUTES.include.join(' ')}`);
