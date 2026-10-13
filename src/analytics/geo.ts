/**
 * Visitor country, as seen by Cloudflare (ISO 3166-1 alpha-2). Pages are
 * static, so the value comes from a tiny Worker endpoint, fetched once per
 * session. Exposed on `<html data-country>` for a future per-region consent
 * regime; not used to decide anything yet. Cloudflare only: a static
 * hosting has no such endpoint, the country stays unknown.
 */
import { site } from '@/site.config';

const STORAGE_KEY = 'visitor-country';

export async function getVisitorCountry(): Promise<string | undefined> {
  if (site.hosting !== 'cloudflare') return undefined;
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached) return cached;
  } catch {
    // Storage may be unavailable: fall through to the request.
  }
  try {
    const response = await fetch('/api/geo', { headers: { Accept: 'application/json' } });
    if (!response.ok) return undefined;
    const { country } = (await response.json()) as { country?: string };
    if (country) {
      try {
        sessionStorage.setItem(STORAGE_KEY, country);
      } catch {
        // Ignore: the value is a convenience, not a requirement.
      }
    }
    return country;
  } catch {
    return undefined;
  }
}
