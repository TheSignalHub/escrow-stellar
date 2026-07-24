import { StrKey } from '@stellar/stellar-sdk';
import { getConfig } from './config.js';
import {
  getNearIntentExecutionStatus,
  listNearIntentTokens,
  requestNearIntentQuote,
} from './nearIntentsProvider.js';
import type { MarketplaceBinding, NearIntentQuoteMetadata } from './types.js';

interface TokenLike {
  assetId: string;
  blockchain: string;
  symbol: string;
  decimals: number;
  price?: number | string;
  contractAddress?: string | null;
}

function readArg(name: string): string | undefined {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function required(name: string, value?: string): string {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseUsd(value?: string): number {
  const parsed = Number(value || '5');
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error('NEAR_LIVE_MAX_USD must be a positive number.');
  return parsed;
}

function amountToUnits(amount: string, decimals: number): number {
  if (!/^\d+$/.test(amount)) throw new Error('Amount must be integer base units.');
  return Number(amount) / 10 ** decimals;
}

function tokenUsdValue(token: TokenLike, amount: string): number {
  const price = Number(token.price || 0);
  if (!Number.isFinite(price) || price <= 0) return 0;
  return amountToUnits(amount, Number(token.decimals)) * price;
}

function isEvmChain(chain: string): boolean {
  return ['arb', 'avax', 'base', 'bera', 'bsc', 'eth', 'gnosis', 'monad', 'op', 'plasma', 'pol', 'scroll', 'xlayer'].includes(chain);
}

function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isSolanaAddress(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

function assertRefundAddress(token: TokenLike, refundTo: string): void {
  if (token.blockchain === 'near' && !/^[a-z0-9._-]+\.near$/i.test(refundTo)) {
    throw new Error('NEAR source swaps require refundTo to be a NEAR account controlled by the tester.');
  }
  if (isEvmChain(token.blockchain) && !isEvmAddress(refundTo)) {
    throw new Error(`${token.blockchain} source swaps require refundTo to be an EVM 0x address controlled by the tester.`);
  }
  if (token.blockchain === 'sol' && !isSolanaAddress(refundTo)) {
    throw new Error('Solana source swaps require refundTo to be a Solana address controlled by the tester.');
  }
}

function createBinding(recipient: string): MarketplaceBinding {
  const now = new Date();
  const config = getConfig();
  return {
    bindingId: 'near-intents-live-smoke',
    bindingMode: 'staging',
    externalMarketplaceId: 'the-signal',
    externalDealId: 'near-intents-live-smoke',
    sorobanContractAddress: config.contractAddress,
    sorobanDealId: 0,
    network: config.network,
    rail: 'stellar',
    settlementAsset: {
      contractAddress: config.nearIntents.defaultStellarDestinationAsset || '1click-stellar-asset',
      symbol: 'Stellar settlement',
      decimals: 7,
    },
    participants: {
      clientWallet: recipient,
      providerWallet: recipient,
      connectorWallet: recipient,
    },
    milestoneMap: [],
    status: 'funding',
    createdAt: now,
    updatedAt: now,
  };
}

function redactAddress(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function quoteEvidence(metadata: NearIntentQuoteMetadata, token: TokenLike, destination: TokenLike | undefined, usdValue: number) {
  return {
    mode: metadata.dry ? 'dry_quote' : 'live_executable_quote',
    source: {
      chain: token.blockchain,
      symbol: token.symbol,
      assetId: token.assetId,
      amountBaseUnits: metadata.sourceAmount,
      estimatedUsd: Number(usdValue.toFixed(6)),
    },
    destination: {
      chain: destination?.blockchain || 'unknown',
      symbol: destination?.symbol || 'unknown',
      assetId: metadata.destinationAsset,
      recipient: redactAddress(metadata.recipient),
    },
    quote: {
      quoteId: metadata.quoteId,
      signatureVerified: metadata.signatureVerified,
      expectedDestinationAmount: metadata.expectedDestinationAmount,
      minDestinationAmount: metadata.minDestinationAmount,
      deadline: metadata.deadline,
      depositAddress: metadata.dry ? undefined : metadata.depositAddress,
      depositMemo: metadata.dry ? undefined : metadata.depositMemo,
      status: metadata.providerStatusRaw || (metadata.dry ? 'QUOTE_CREATED' : 'PENDING_DEPOSIT'),
    },
    nextStep: metadata.dry
      ? 'Dry quote only. Re-run with --live after confirming source wallet, recipient, refund address, and max USD cap.'
      : 'Send exactly the quoted source amount to the deposit address before expiry, then run --status with the deposit address.',
  };
}

async function main(): Promise<void> {
  const config = getConfig();
  const live = hasFlag('--live');
  const statusDepositAddress = readArg('--status');
  const statusDepositMemo = readArg('--memo');

  if (statusDepositAddress) {
    const nearIntent: NearIntentQuoteMetadata = {
      quoteId: 'manual-status-check',
      sourceAsset: 'manual',
      destinationAsset: 'manual',
      sourceAmount: '0',
      recipient: 'manual',
      refundTo: 'manual',
      dry: false,
      depositAddress: statusDepositAddress,
      depositMemo: statusDepositMemo,
    };
    const status = await getNearIntentExecutionStatus(config, nearIntent);
    console.log(JSON.stringify({ mode: 'status', status: status.status, localStatus: status.localStatus }, null, 2));
    return;
  }

  const originAsset = required('NEAR_LIVE_ORIGIN_ASSET', readArg('--origin') || process.env.NEAR_LIVE_ORIGIN_ASSET);
  const destinationAsset = required(
    'NEAR_LIVE_DESTINATION_ASSET',
    readArg('--destination') || process.env.NEAR_LIVE_DESTINATION_ASSET || config.nearIntents.defaultStellarDestinationAsset
  );
  const amount = required('NEAR_LIVE_AMOUNT', readArg('--amount') || process.env.NEAR_LIVE_AMOUNT);
  const recipient = required('NEAR_LIVE_RECIPIENT', readArg('--recipient') || process.env.NEAR_LIVE_RECIPIENT);
  const refundTo = readArg('--refund-to') || process.env.NEAR_LIVE_REFUND_TO || process.env.NEAR_INTENTS_DEFAULT_REFUND_ACCOUNT;
  const maxUsd = parseUsd(readArg('--max-usd') || process.env.NEAR_LIVE_MAX_USD);

  if (!StrKey.isValidEd25519PublicKey(recipient)) {
    throw new Error('NEAR_LIVE_RECIPIENT must be a real Stellar G-address controlled by the tester.');
  }
  if (!refundTo) {
    throw new Error('NEAR_LIVE_REFUND_TO is required. It must be the source wallet/account controlled by the tester.');
  }

  const tokens = (await listNearIntentTokens(config)) as TokenLike[];
  const originToken = tokens.find((token) => token.assetId === originAsset);
  const destinationToken = tokens.find((token) => token.assetId === destinationAsset);
  if (!originToken) throw new Error(`Origin asset not found in 1Click token discovery: ${originAsset}`);
  if (!destinationToken) throw new Error(`Destination asset not found in 1Click token discovery: ${destinationAsset}`);
  if (destinationToken.blockchain !== 'stellar') {
    throw new Error('This production proof script is scoped to Stellar destination assets only.');
  }

  assertRefundAddress(originToken, refundTo);

  const usdValue = tokenUsdValue(originToken, amount);
  if (usdValue <= 0) {
    throw new Error('Unable to price source amount from 1Click token discovery. Use a priced source asset.');
  }
  if (usdValue > maxUsd) {
    throw new Error(`Safety stop: source amount is about $${usdValue.toFixed(4)}, above NEAR_LIVE_MAX_USD=$${maxUsd}.`);
  }
  if (live && !config.nearIntents.allowLiveExecution) {
    throw new Error('Live quote mode requires NEAR_INTENTS_ALLOW_LIVE=true.');
  }

  const { metadata } = await requestNearIntentQuote(config, createBinding(recipient), {
    dry: !live,
    originAsset,
    destinationAsset,
    amount,
    refundTo,
    recipient,
    slippageTolerance: Number(readArg('--slippage-bps') || process.env.NEAR_LIVE_SLIPPAGE_BPS || 100),
  });

  console.log(JSON.stringify(quoteEvidence(metadata, originToken, destinationToken, usdValue), null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
