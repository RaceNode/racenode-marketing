// A preview built on sample data has no views to read again: these static files stand in for them, at the views'
// own paths, so the visitor's browser runs exactly the code it runs against Supabase (and tests can intercept it).
// Production (built from the views) gets no file here.
import type { APIRoute } from 'astro';
import { catalog } from '../../../../../lib/calendar/build.mjs';
import { VIEWS } from '../../../../../lib/calendar/contract.mjs';

export async function getStaticPaths() {
  const { data } = await catalog();
  if (!data.sample) return [];
  return Object.entries(VIEWS).map(([kind, view]) => ({ params: { view }, props: { rows: data[kind] } }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.rows), { headers: { 'content-type': 'application/json' } });
