// A copy of the catalog taken at build time, shipped inside the calendar worker as its last resort: served only
// when a data centre has no copy of its own and the catalog views do not answer (live.mjs). Never fails the build:
// without the views (no variables, PGRST205 before the app's #197, an outage), the worker simply has no last resort.
// Written to src/data/calendar/snapshot.json (not versioned), before `astro build`.
import fs from 'node:fs';
import { loadCatalog } from '../../src/lib/calendar/contract.mjs';

const out = new URL('../../src/data/calendar/snapshot.json', import.meta.url);
let snapshot = null;
if (process.env.CATALOG_SUPABASE_URL && process.env.CATALOG_SUPABASE_KEY) {
  try {
    const data = await loadCatalog(process.env, { signal: AbortSignal.timeout(20000) });
    snapshot = { data, fetchedAt: Date.now() };
    console.log(`calendar snapshot: ${data.series.length} series, ${data.events.length} rounds`);
  } catch (e) {
    console.warn(`calendar snapshot: none (${String(e).slice(0, 200)})`);
  }
} else {
  console.log('calendar snapshot: none (CATALOG_SUPABASE_URL / CATALOG_SUPABASE_KEY not set)');
}
fs.writeFileSync(out, JSON.stringify(snapshot) + '\n');
