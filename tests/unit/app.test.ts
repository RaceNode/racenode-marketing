// Links to the app carry the page's language (src/lib/app.ts).
import { describe, expect, it } from 'vitest';
import { appUrl } from '@/lib/app';

describe('appUrl', () => {
  it('leaves English links plain', () => {
    expect(appUrl('en', '/signup')).toBe('https://app.racenode.com/signup');
  });

  it('tells the app the language of a French page', () => {
    expect(appUrl('fr', '/signup')).toBe('https://app.racenode.com/signup?lang=fr');
    expect(appUrl('fr', '/login')).toBe('https://app.racenode.com/login?lang=fr');
  });
});
