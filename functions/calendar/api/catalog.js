// GET /calendar/api/catalog[?series=<slug>]: the calendar pages' live refresh (src/lib/calendar/relay.mjs).
// Env (Pages, production and preview): MOTORSPORT_DATA_API_KEY (the server's key, a secret); without it, the app's
// views, CATALOG_SUPABASE_URL + CATALOG_SUPABASE_KEY (the way back until the clean-up).
import { ipBudget, relay } from '../../../src/lib/calendar/relay.mjs';

const allow = ipBudget();

export const onRequestGet = ({ request, env, waitUntil }) =>
  relay(request, env, { cache: caches.default, allow, waitUntil });
