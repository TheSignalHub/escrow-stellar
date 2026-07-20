export interface NearIntentsReadiness {
  enabled: boolean;
  liveExecutionEnabled: boolean;
  apiBaseUrl: string;
  configured: {
    jwt: boolean;
    stellarDestinationAsset: boolean;
    defaultStellarDestinationAsset?: boolean;
    stellarDestinationAssetAllowlist?: boolean;
    defaultRefundAccount: boolean;
  };
  destinationAssets?: {
    default?: string;
    allowlist: string[];
  };
  quoteTtlSeconds: number;
  pollIntervalSeconds: number;
}

export type NearIntentProviderStatus =
  | 'PENDING_DEPOSIT'
  | 'KNOWN_DEPOSIT_TX'
  | 'INCOMPLETE_DEPOSIT'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'REFUNDED'
  | 'FAILED';

export type CrossChainPaymentStatus =
  | 'not_applicable'
  | 'intent_created'
  | 'funded'
  | 'routed'
  | 'settled_on_stellar'
  | 'expired'
  | 'failed'
  | 'refunded'
  | 'needs_review';

export interface NearIntentMetadata {
  quoteId: string;
  intentId?: string;
  correlationId?: string;
  signature?: string;
  signatureVerified?: boolean;
  depositAddress?: string;
  depositMemo?: string;
  sourceAsset: string;
  destinationAsset: string;
  sourceAmount: string;
  expectedDestinationAmount?: string;
  minDestinationAmount?: string;
  recipient: string;
  refundTo: string;
  dry: boolean;
  deadline?: string;
  expiresAt?: string;
  providerStatusRaw?: NearIntentProviderStatus | string;
  providerStatusUpdatedAt?: string;
  submittedDepositTxHash?: string;
}

export interface ExternalPaymentIntent {
  provider: 'near-intents' | 'external';
  intentId?: string;
  status: CrossChainPaymentStatus;
  refundRef?: string;
  updatedAt?: string;
}

export interface NearIntentQuoteRequest {
  originAsset: string;
  destinationAsset?: string;
  amount: string;
  refundTo?: string;
  recipient?: string;
  dry: boolean;
  slippageTolerance?: number;
  depositMode?: 'SIMPLE' | 'MEMO';
}

export interface NearIntentQuoteResponse {
  bindingId: string;
  externalPaymentIntent: ExternalPaymentIntent;
  nearIntent: NearIntentMetadata;
  quote: {
    correlationId: string;
    timestamp?: string;
    quote?: {
      amountIn?: string;
      amountInFormatted?: string;
      amountOut?: string;
      amountOutFormatted?: string;
      minAmountOut?: string;
      depositAddress?: string;
      depositMemo?: string;
      deadline?: string;
      timeWhenInactive?: string;
      timeEstimate?: number;
    };
  };
}

export interface NearIntentStatusResponse {
  bindingId: string;
  externalPaymentIntent: ExternalPaymentIntent;
  nearIntent: NearIntentMetadata;
  status: {
    status: NearIntentProviderStatus;
    updatedAt?: string;
    correlationId?: string;
    swapDetails?: {
      amountIn?: string;
      amountOut?: string;
      amountOutFormatted?: string;
      depositedAmount?: string;
      refundReason?: string;
    };
  };
}

export class NearIntentsApiError extends Error {
  status: number;
  detail?: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'NearIntentsApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const body = payload as { error?: string; message?: string; detail?: unknown };
    throw new NearIntentsApiError(
      body.error || body.message || response.statusText || 'NEAR Intents request failed',
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

export const nearIntentsClient = {
  readiness(): Promise<NearIntentsReadiness> {
    return request<NearIntentsReadiness>('/api/near-intents/readiness');
  },

  createQuote(bindingId: string, body: NearIntentQuoteRequest): Promise<NearIntentQuoteResponse> {
    return request<NearIntentQuoteResponse>(
      `/api/marketplace-bindings/${encodeURIComponent(bindingId)}/near-intents/quote`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  },

  getStatus(bindingId: string): Promise<NearIntentStatusResponse> {
    return request<NearIntentStatusResponse>(
      `/api/marketplace-bindings/${encodeURIComponent(bindingId)}/near-intents/status`
    );
  },
};
