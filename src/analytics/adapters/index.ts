import type { Provider } from '../resolve';
import { cloudflare } from './cloudflare';
import { ga4 } from './ga4';
import { gtm } from './gtm';
import { plausible } from './plausible';
import { posthog } from './posthog';
import type { Adapter } from './types';

export const adapters: Record<Provider, Adapter> = { cloudflare, ga4, gtm, plausible, posthog };

export type { Adapter, ConsentState, EventProps } from './types';
