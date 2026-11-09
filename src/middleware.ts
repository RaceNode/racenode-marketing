import { defineMiddleware } from 'astro:middleware';

import { serverAsyncLocalStorage } from '@/paraglide/runtime';
import { paraglideMiddleware } from '@/paraglide/server';

/**
 * The locale of every page while prerendering, as in the WBLT template
 * (without its security headers: Cloudflare Pages serves `public/_headers`).
 * Paraglide reads it from the URL (`/fr/…`; a URL without a prefix is in
 * English) and pins it for the duration of the request, so `getLocale()` and
 * the message functions resolve correctly. The request is rebuilt from the
 * URL alone: no page reads request headers. Astro streams HTML, so the body
 * is read back inside that context.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const request = context.isPrerendered ? new Request(context.url) : context.request;
  return paraglideMiddleware(request, async () => withRequestContext(await next()));
});

/** Read the response body inside the current Paraglide request context. */
function withRequestContext(response: Response): Response {
  const storage = serverAsyncLocalStorage;
  const store = storage?.getStore();
  if (!storage || !store || !response.body) return response;

  const reader = response.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    pull: (controller) =>
      storage.run(store, async () => {
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      }),
    cancel: (reason) => reader.cancel(reason),
  });
  return new Response(body, response);
}
