import {
  ApiError,
  OneClickService,
  OpenAPI,
  QuoteRequest,
  verifyQuoteSignature,
  type GetExecutionStatusResponse,
  type QuoteResponse,
  type SubmitDepositTxResponse,
  type TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript';
import { StrKey } from '@stellar/stellar-sdk';
import type { IndexerConfig } from './config.js';
import type {
  CrossChainPaymentStatus,
  MarketplaceBinding,
  NearIntentProviderStatus,
  NearIntentQuoteMetadata,
} from './types.js';

export class NearIntentsProviderError extends Error {
  statusCode: number;
  detail?: unknown;

  constructor(message: string, statusCode = 400, detail?: unknown) {
    super(message);
    this.name = 'NearIntentsProviderError';
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

export interface NearIntentQuoteInput {
  originAsset: string;
  destinationAsset?: string;
  amount: string;
  refundTo?: string;
  recipient?: string;
  dry?: boolean;
  slippageTolerance?: number;
  deadline?: string;
  /** @deprecated 1Click decides whether a deposit memo is required for the selected route. */
  depositMode?: 'SIMPLE' | 'MEMO';
  referral?: string;
  quoteWaitingTimeMs?: number;
}

export interface NearIntentDepositTxInput {
  txHash: string;
  nearSenderAccount?: string;
}

const STATUS_MAP: Record<NearIntentProviderStatus, CrossChainPaymentStatus> = {
  PENDING_DEPOSIT: 'intent_created',
  KNOWN_DEPOSIT_TX: 'funded',
  INCOMPLETE_DEPOSIT: 'needs_review',
  PROCESSING: 'routed',
  SUCCESS: 'settled_on_stellar',
  REFUNDED: 'refunded',
  FAILED: 'failed',
};

function configureSdk(config: IndexerConfig): void {
  OpenAPI.BASE = config.nearIntents.apiBaseUrl;
  OpenAPI.TOKEN = config.nearIntents.jwt;
}

function ensureEnabled(config: IndexerConfig): void {
  if (!config.nearIntents.enabled) {
    throw new NearIntentsProviderError('NEAR Intents is disabled.', 503);
  }
  if (!config.nearIntents.jwt) {
    throw new NearIntentsProviderError('NEAR_INTENTS_JWT is required.', 503);
  }
}

function resolveDestinationAsset(config: IndexerConfig, input: NearIntentQuoteInput): string {
  const requestedAsset = input.destinationAsset?.trim();
  const asset = requestedAsset || config.nearIntents.defaultStellarDestinationAsset;
  if (!asset) {
    throw new NearIntentsProviderError(
      'destinationAsset or NEAR_INTENTS_DEFAULT_STELLAR_DESTINATION_ASSET is required.',
      503
    );
  }
  const allowlist = config.nearIntents.stellarDestinationAssetAllowlist;
  const demoAllowlist = config.nearIntents.demoDestinationAssetAllowlist;
  const approvedAssets = [...allowlist, ...demoAllowlist];
  if (approvedAssets.length > 0 && !approvedAssets.includes(asset)) {
    throw new NearIntentsProviderError('destinationAsset is not approved for this deployment.', 400, {
      destinationAsset: asset,
      allowedDestinationAssets: approvedAssets,
    });
  }
  return asset;
}

function isDemoDestinationAsset(config: IndexerConfig, destinationAsset: string): boolean {
  return config.nearIntents.demoDestinationAssetAllowlist.includes(destinationAsset);
}

function isEvmOriginAsset(originAsset: string): boolean {
  return /^nep141:(eth|base|arb|op|avax|bsc|pol|gnosis)-0x/i.test(originAsset);
}

function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function normalizeHorizonUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function isNativeStellarAsset(token: TokenResponse): boolean {
  return token.blockchain === 'stellar' && token.symbol.toUpperCase() === 'XLM';
}

async function findDestinationToken(
  destinationAsset: string
): Promise<TokenResponse | undefined> {
  const tokens = await OneClickService.getTokens();
  return tokens.find((token) => token.assetId === destinationAsset);
}

async function ensureStellarRecipientReady(
  config: IndexerConfig,
  destinationAsset: string,
  recipient: string
): Promise<void> {
  const destinationToken = await findDestinationToken(destinationAsset);
  if (!destinationToken || destinationToken.blockchain !== 'stellar') return;

  if (!StrKey.isValidEd25519PublicKey(recipient)) {
    throw new NearIntentsProviderError(
      'Stellar destination recipient must be a valid G-address for this destination asset.',
      400,
      { recipientType: 'DESTINATION_CHAIN', destinationAsset }
    );
  }

  if (isNativeStellarAsset(destinationToken)) return;

  const issuer = destinationToken.contractAddress;
  if (!issuer) {
    throw new NearIntentsProviderError(
      '1Click Stellar issued asset metadata is missing the issuer required for recipient trustline validation.',
      502,
      { destinationAsset, symbol: destinationToken.symbol }
    );
  }

  const accountUrl = `${normalizeHorizonUrl(config.nearIntents.stellarHorizonUrl)}/accounts/${recipient}`;
  const response = await fetch(accountUrl, { headers: { Accept: 'application/json' } });
  if (response.status === 404) {
    throw new NearIntentsProviderError(
      `Stellar destination recipient must exist and have a ${destinationToken.symbol} trustline before requesting a NEAR Intents quote.`,
      400,
      {
        destinationAsset,
        symbol: destinationToken.symbol,
        issuer,
        horizonStatus: 404,
      }
    );
  }
  if (!response.ok) {
    throw new NearIntentsProviderError(
      'Unable to validate Stellar destination recipient trustline before requesting a NEAR Intents quote.',
      502,
      {
        destinationAsset,
        symbol: destinationToken.symbol,
        issuer,
        horizonStatus: response.status,
      }
    );
  }

  const account = (await response.json()) as {
    balances?: Array<{ asset_type?: string; asset_code?: string; asset_issuer?: string }>;
  };
  const hasTrustline = (account.balances || []).some(
    (balance) =>
      balance.asset_code === destinationToken.symbol &&
      balance.asset_issuer === issuer
  );
  if (!hasTrustline) {
    throw new NearIntentsProviderError(
      `Stellar destination recipient must add a ${destinationToken.symbol} trustline before requesting a NEAR Intents quote.`,
      400,
      {
        destinationAsset,
        symbol: destinationToken.symbol,
        issuer,
        horizonStatus: response.status,
      }
    );
  }
}

function parseSdkError(error: unknown): NearIntentsProviderError {
  if (error instanceof NearIntentsProviderError) return error;
  if (error instanceof ApiError) {
    const body = error.body as Record<string, unknown> | undefined;
    const message =
      (typeof body?.message === 'string' && body.message) ||
      (typeof body?.error === 'string' && body.error) ||
      error.message ||
      'NEAR Intents request failed.';
    return new NearIntentsProviderError(message, error.status || 502, error.body);
  }
  return new NearIntentsProviderError(
    error instanceof Error ? error.message : String(error),
    502
  );
}

function deadlineFromConfig(config: IndexerConfig): string {
  return new Date(Date.now() + config.nearIntents.quoteTtlSeconds * 1000).toISOString();
}

function providerStatusToLocal(status: string): CrossChainPaymentStatus {
  return STATUS_MAP[status as NearIntentProviderStatus] ?? 'needs_review';
}

function normalizeQuoteMetadata(
  input: NearIntentQuoteInput,
  response: QuoteResponse,
  signatureVerified: boolean
): NearIntentQuoteMetadata {
  const quote = response.quote;
  const deadline = quote.deadline ?? response.quoteRequest.deadline;
  return {
    quoteId: response.correlationId,
    correlationId: response.correlationId,
    signature: response.signature,
    signatureVerified,
    depositAddress: quote.depositAddress,
    depositMemo: quote.depositMemo,
    sourceAsset: response.quoteRequest.originAsset,
    destinationAsset: response.quoteRequest.destinationAsset,
    sourceAmount: response.quoteRequest.amount,
    expectedDestinationAmount: quote.amountOut,
    minDestinationAmount: quote.minAmountOut,
    recipient: response.quoteRequest.recipient,
    refundTo: response.quoteRequest.refundTo,
    dry: input.dry ?? true,
    deadline,
    expiresAt: deadline ? new Date(deadline) : undefined,
    providerStatusRaw: quote.depositAddress ? 'PENDING_DEPOSIT' : undefined,
    providerStatusUpdatedAt: new Date(),
  };
}

export function nearIntentStatusToLocal(status: string): CrossChainPaymentStatus {
  return providerStatusToLocal(status);
}

export async function listNearIntentTokens(
  config: IndexerConfig
): Promise<Array<TokenResponse>> {
  ensureEnabled(config);
  configureSdk(config);
  try {
    return await OneClickService.getTokens();
  } catch (error) {
    throw parseSdkError(error);
  }
}

export async function requestNearIntentQuote(
  config: IndexerConfig,
  binding: MarketplaceBinding,
  input: NearIntentQuoteInput
): Promise<{ quote: QuoteResponse; metadata: NearIntentQuoteMetadata }> {
  ensureEnabled(config);
  configureSdk(config);

  const dry = input.dry ?? true;
  if (!dry && !config.nearIntents.allowLiveExecution) {
    throw new NearIntentsProviderError(
      'Live NEAR Intents execution requires NEAR_INTENTS_ALLOW_LIVE=true.',
      400
    );
  }

  const destinationAsset = resolveDestinationAsset(config, input);
  const refundTo = input.refundTo || config.nearIntents.defaultRefundAccount;
  if (!refundTo) {
    throw new NearIntentsProviderError(
      'refundTo or NEAR_INTENTS_DEFAULT_REFUND_ACCOUNT is required.'
    );
  }

  const isDemoDestination = isDemoDestinationAsset(config, destinationAsset);
  if (isDemoDestination && !config.nearIntents.defaultRefundAccount) {
    throw new NearIntentsProviderError(
      'NEAR_INTENTS_DEFAULT_REFUND_ACCOUNT is required for quote-only demo destinations.',
      503
    );
  }
  const recipient =
    isDemoDestination && config.nearIntents.defaultRefundAccount
      ? config.nearIntents.defaultRefundAccount
      : input.recipient || binding.participants.clientWallet;
  if (!input.originAsset) throw new NearIntentsProviderError('originAsset is required.');
  if (!input.amount) throw new NearIntentsProviderError('amount is required.');
  if (isEvmOriginAsset(input.originAsset) && !isEvmAddress(refundTo)) {
    throw new NearIntentsProviderError(
      'Connect the source-chain wallet before requesting this quote. Ethereum/Base refunds require an EVM refund address.',
      400,
      { originAsset: input.originAsset, refundAddressType: 'evm' }
    );
  }

  await ensureStellarRecipientReady(config, destinationAsset, recipient);

  const requestBody = {
    dry,
    swapType: QuoteRequest.swapType.EXACT_INPUT,
    slippageTolerance: Number.isFinite(Number(input.slippageTolerance))
      ? Number(input.slippageTolerance)
      : 100,
    originAsset: input.originAsset,
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    destinationAsset,
    amount: input.amount,
    refundTo,
    refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
    recipient,
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    deadline: input.deadline || deadlineFromConfig(config),
    referral: input.referral || 'the-signal-escrow',
    quoteWaitingTimeMs: Number.isFinite(Number(input.quoteWaitingTimeMs))
      ? Number(input.quoteWaitingTimeMs)
      : undefined,
  };

  try {
    const quote = await OneClickService.getQuote(requestBody);
    const signatureVerified = verifyQuoteSignature(quote);
    if (!signatureVerified) {
      throw new NearIntentsProviderError('Invalid NEAR Intents quote signature.', 502);
    }
    return { quote, metadata: normalizeQuoteMetadata(input, quote, signatureVerified) };
  } catch (error) {
    throw parseSdkError(error);
  }
}

export async function getNearIntentExecutionStatus(
  config: IndexerConfig,
  nearIntent: NearIntentQuoteMetadata
): Promise<{
  status: GetExecutionStatusResponse;
  localStatus: CrossChainPaymentStatus;
}> {
  ensureEnabled(config);
  configureSdk(config);

  if (!nearIntent.depositAddress) {
    throw new NearIntentsProviderError('nearIntent.depositAddress is required for status.');
  }

  try {
    const status = await OneClickService.getExecutionStatus(
      nearIntent.depositAddress,
      nearIntent.depositMemo
    );
    return {
      status,
      localStatus: providerStatusToLocal(status.status),
    };
  } catch (error) {
    throw parseSdkError(error);
  }
}

export async function submitNearIntentDepositTx(
  config: IndexerConfig,
  nearIntent: NearIntentQuoteMetadata,
  input: NearIntentDepositTxInput
): Promise<{
  result: SubmitDepositTxResponse;
  localStatus: CrossChainPaymentStatus;
}> {
  ensureEnabled(config);
  configureSdk(config);

  if (!nearIntent.depositAddress) {
    throw new NearIntentsProviderError('nearIntent.depositAddress is required.');
  }
  if (!input.txHash) throw new NearIntentsProviderError('txHash is required.');

  try {
    const result = await OneClickService.submitDepositTx({
      txHash: input.txHash,
      depositAddress: nearIntent.depositAddress,
      memo: nearIntent.depositMemo,
      nearSenderAccount: input.nearSenderAccount,
    });
    return {
      result,
      localStatus: providerStatusToLocal(result.status),
    };
  } catch (error) {
    throw parseSdkError(error);
  }
}
