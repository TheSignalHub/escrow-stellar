import { STELLAR_NETWORK } from './stellar';

export const STRIPE_ONRAMP_ENABLED =
  (import.meta.env.VITE_STRIPE_ONRAMP_ENABLED ?? 'true') !== 'false';

export const STRIPE_ONRAMP_DEFAULT_AMOUNT =
  import.meta.env.VITE_STRIPE_ONRAMP_DEFAULT_AMOUNT || '10';

export const STRIPE_ONRAMP_SOURCE_CURRENCY =
  (import.meta.env.VITE_STRIPE_ONRAMP_SOURCE_CURRENCY || 'usd').toLowerCase();

export const STRIPE_ONRAMP_DESTINATION_CURRENCY =
  (import.meta.env.VITE_STRIPE_ONRAMP_DESTINATION_CURRENCY || 'xlm').toLowerCase();

export const STRIPE_ONRAMP_DESTINATION_NETWORK =
  (import.meta.env.VITE_STRIPE_ONRAMP_DESTINATION_NETWORK || 'stellar').toLowerCase();

export const STRIPE_ONRAMP_MODE =
  import.meta.env.VITE_STRIPE_ONRAMP_MODE || (STELLAR_NETWORK === 'mainnet' ? 'production' : 'test');

export interface StripeOnrampReadiness {
  enabled: boolean;
  configured: {
    secretKey: boolean;
  };
  mode: 'live' | 'test';
  defaults: {
    sourceCurrency: string;
    sourceAmount: string;
    destinationCurrency: string;
    destinationNetwork: string;
    lockWalletAddress: boolean;
  };
}

export interface StripeOnrampSession {
  id: string;
  livemode: boolean;
  status: string;
  redirectUrl: string;
  transactionDetails: {
    sourceAmount?: string;
    sourceCurrency?: string;
    destinationCurrency?: string;
    destinationNetwork?: string;
    lockWalletAddress?: boolean;
    walletAddress?: string;
  };
}

export class StripeOnrampApiError extends Error {
  status: number;
  detail?: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'StripeOnrampApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const body = payload as { error?: string; message?: string; detail?: unknown };
    throw new StripeOnrampApiError(
      body.error || body.message || response.statusText || 'Stripe onramp request failed',
      response.status,
      body.detail ?? payload
    );
  }
  return payload as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  return parseJson<T>(response);
}

export const stripeOnrampClient = {
  readiness(): Promise<StripeOnrampReadiness> {
    return request<StripeOnrampReadiness>('/api/stripe/onramp/readiness');
  },

  createSession(body: {
    walletAddress: string;
    sourceAmount?: string;
    sourceCurrency?: string;
  }): Promise<StripeOnrampSession> {
    return request<StripeOnrampSession>('/api/stripe/onramp/session', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

