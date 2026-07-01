import 'dotenv/config';

export type StellarNetwork = 'testnet' | 'mainnet';

export interface IndexerConfig {
  databaseUri: string;
  contractAddress: string;
  network: StellarNetwork;
  rpcUrl: string;
  soroswapApiKey?: string;
  nearIntents: {
    enabled: boolean;
    allowLiveExecution: boolean;
    apiBaseUrl: string;
    jwt?: string;
    stellarDestinationAsset?: string;
    defaultRefundAccount?: string;
    quoteTtlSeconds: number;
    pollIntervalSeconds: number;
  };
  enabled: boolean;
  overlapLedgers: number;
  startLedger?: number;
  port: number;
}

function readRequired(name: string, fallbackName?: string): string {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) {
    throw new Error(
      fallbackName ? `${name} or ${fallbackName} is required` : `${name} is required`
    );
  }
  return value;
}

function readOptionalInt(name: string): number | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number`);
  return parsed;
}

export function getConfig(): IndexerConfig {
  const network = (process.env.STELLAR_NETWORK || 'testnet') as StellarNetwork;
  if (network !== 'testnet' && network !== 'mainnet') {
    throw new Error('STELLAR_NETWORK must be testnet or mainnet');
  }

  return {
    databaseUri: readRequired('DATABASE_URI'),
    contractAddress: readRequired('DEAL_ESCROW_CONTRACT', 'VITE_DEAL_ESCROW_CONTRACT'),
    network,
    rpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
    soroswapApiKey: process.env.SOROSWAP_API_KEY,
    nearIntents: {
      enabled: process.env.NEAR_INTENTS_ENABLED === 'true',
      allowLiveExecution: process.env.NEAR_INTENTS_ALLOW_LIVE === 'true',
      apiBaseUrl: process.env.NEAR_INTENTS_API_BASE_URL || 'https://1click.chaindefuser.com',
      jwt: process.env.NEAR_INTENTS_JWT,
      stellarDestinationAsset: process.env.NEAR_INTENTS_STELLAR_DESTINATION_ASSET,
      defaultRefundAccount: process.env.NEAR_INTENTS_DEFAULT_REFUND_ACCOUNT,
      quoteTtlSeconds: readOptionalInt('NEAR_INTENTS_QUOTE_TTL_SECONDS') ?? 300,
      pollIntervalSeconds: readOptionalInt('NEAR_INTENTS_POLL_INTERVAL_SECONDS') ?? 15,
    },
    enabled: process.env.INDEXER_ENABLED !== 'false',
    overlapLedgers: readOptionalInt('INDEXER_OVERLAP_LEDGERS') ?? 5,
    startLedger: readOptionalInt('INDEXER_START_LEDGER'),
    port: readOptionalInt('PORT') ?? 3030,
  };
}
