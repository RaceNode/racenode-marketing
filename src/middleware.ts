// The race calendar's rendered pages are kept 5 minutes in the data centre's cache (Cache API), so most visits
// cost a cache lookup instead of a render. The data behind them has its own cache (src/lib/calendar/live.mjs).
// Every other page is prerendered and never reaches this code at request time.
import { defineMiddleware } from 'astro:middleware';

const PAGE_S = 300;

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  // Static pages get their trailing slash from Pages; the rendered ones from here, so each page has one URL.
  if (url.pathname === '/calendar') return context.redirect('/calendar/' + url.search, 308);
  const store = (globalThis as any).caches?.default as Cache | undefined;
  if (!url.pathname.startsWith('/calendar') || request.method !== 'GET' || !store || context.isPrerendered) return next();

  const key = new Request(`${url.origin}${url.pathname}`);
  const hit = await store.match(key).catch(() => undefined);
  if (hit) {
    const res = new Response(hit.body, hit);
    res.headers.set('x-calendar-page', 'hit');
    return res;
  }

  const res = await next();
  if (res.status === 200) {
    const copy = res.clone();
    const headers = new Headers(copy.headers);
    headers.set('cache-control', `public, max-age=${PAGE_S}`);
    const put = store.put(key, new Response(copy.body, { status: 200, headers })).catch(() => {});
    (context.locals as any).cfContext?.waitUntil?.(put);
  }
  res.headers.set('x-calendar-page', 'miss');
  return res;
});
