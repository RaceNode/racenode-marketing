// A preview built on sample data has no relay to ask: this static file (/calendar/sample-api/catalog.json) stands in
// for it with the relay's answer for the whole catalog, so the visitor's browser runs exactly the code it runs against
// the relay (it filters a championship's rows itself). Production (built from the views) gets no file here.
import type { APIRoute } from 'astro';
import { catalog } from '../../../lib/calendar/build.mjs';

export async function getStaticPaths() {
  const { data } = await catalog();
  if (!data.sample) return [];
  return [
    {
      params: { file: 'catalog.json' },
      props: { body: { series: data.series, seasons: data.seasons, events: data.events } },
    },
  ];
}

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.body), { headers: { 'content-type': 'application/json' } });
