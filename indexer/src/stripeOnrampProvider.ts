import { StrKey } from '@stellar/stellar-sdk';
import type { IndexerConfig } from './config.js';

export class StripeOnrampProviderError extends Error {
  statusCode: number;
  detail?: unknown;

  constructor(message: string, statusCode = 500, detail?: unknown) {
    super(message);
    this.name = 'StripeOnrampProviderError';
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

export interface StripeOnrampSessionRequest {
  walletAddress?: string;
  sourceCurrency?: string;
  sourceAmount?: string;
}

export interface StripeOnrampSessionResponse {
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

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validateSourceAmount(value: string): string {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new StripeOnrampProviderError('sourceAmount must be a positive fiat amount with at most 2 decimals.', 400);
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new StripeOnrampProviderError('sourceAmount must be greater than 0.', 400);
  }

  return value;
}

async function parseStripeError(response: Response): Promise<unknown> {
  const payload = await response.json().catch(() => ({}));
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: { message?: string } }).error;
    return {
      message: error?.message || response.statusText,
      payload,
    };
  }
  return payload;
}

export async function createStripeOnrampSession(
  config: IndexerConfig,
  request: StripeOnrampSessionRequest
): Promise<StripeOnrampSessionResponse> {
  if (!config.stripeOnramp.enabled) {
    throw new StripeOnrampProviderError('Stripe onramp is disabled.', 503);
  }
  if (!config.stripeOnramp.secretKey) {
    throw new StripeOnrampProviderError('Stripe secret key is not configured.', 503);
  }

  const walletAddress = readString(request.walletAddress);
  if (!walletAddress || !StrKey.isValidEd25519PublicKey(walletAddress)) {
    throw new StripeOnrampProviderError('walletAddress must be a valid Stellar public key.', 400);
  }

  const sourceCurrency = (readString(request.sourceCurrency) || config.stripeOnramp.defaultSourceCurrency).toLowerCase();
  if (!/^[a-z]{3}$/.test(sourceCurrency)) {
    throw new StripeOnrampProviderError('sourceCurrency must be a lowercase ISO currency code.', 400);
  }

  const sourceAmount = validateSourceAmount(
    readString(request.sourceAmount) || config.stripeOnramp.defaultSourceAmount
  );

  const params = new URLSearchParams();
  params.set('source_currency', sourceCurrency);
  params.set('source_amount', sourceAmount);
  params.set('destination_currency', config.stripeOnramp.destinationCurrency);
  params.set('destination_network', config.stripeOnramp.destinationNetwork);
  params.append('destination_currencies[]', config.stripeOnramp.destinationCurrency);
  params.append('destination_networks[]', config.stripeOnramp.destinationNetwork);
  params.set('wallet_addresses[stellar]', walletAddress);
  params.set('lock_wallet_address', String(config.stripeOnramp.lockWalletAddress));
  if (config.stripeOnramp.finishUrl) {
    params.set('finish_url', config.stripeOnramp.finishUrl);
  }

  const response = await fetch(`${config.stripeOnramp.apiBaseUrl}/v1/crypto/onramp_sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.stripeOnramp.secretKey}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const payload = response.ok ? await response.json() : await parseStripeError(response);
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: string }).message)
        : 'Stripe onramp session request failed.';
    throw new StripeOnrampProviderError(message, response.status, payload);
  }

  const session = payload as {
    id?: string;
    livemode?: boolean;
    status?: string;
    redirect_url?: string;
    transaction_details?: {
      source_amount?: string;
      source_currency?: string;
      destination_currency?: string;
      destination_network?: string;
      lock_wallet_address?: boolean;
      wallet_addresses?: { stellar?: string | null };
    };
  };

  if (!session.id || !session.redirect_url) {
    throw new StripeOnrampProviderError('Stripe returned an incomplete onramp session.', 502, payload);
  }

  return {
    id: session.id,
    livemode: Boolean(session.livemode),
    status: session.status || 'initialized',
    redirectUrl: session.redirect_url,
    transactionDetails: {
      sourceAmount: session.transaction_details?.source_amount,
      sourceCurrency: session.transaction_details?.source_currency,
      destinationCurrency: session.transaction_details?.destination_currency,
      destinationNetwork: session.transaction_details?.destination_network,
      lockWalletAddress: session.transaction_details?.lock_wallet_address,
      walletAddress: session.transaction_details?.wallet_addresses?.stellar || walletAddress,
    },
  };
}
