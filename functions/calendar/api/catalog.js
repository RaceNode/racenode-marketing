// GET /calendar/api/catalog[?series=<slug>]: the calendar pages' live refresh (src/lib/calendar/relay.mjs).
// Env (Pages, production and preview): CATALOG_SUPABASE_URL, CATALOG_SUPABASE_KEY (the server's key, a secret).
import { ipBudget, relay } from '../../../src/lib/calendar/relay.mjs';

const allow = ipBudget();

export const onRequestGet = ({ request, env, waitUntil }) => relay(request, env, { cache: caches.default, allow, waitUntil });
