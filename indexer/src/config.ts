import 'dotenv/config';

export type StellarNetwork = 'testnet' | 'mainnet';

export interface IndexerConfig {
  databaseUri: string;
  contractAddress: string;
  network: StellarNetwork;
  rpcUrl: string;
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
    enabled: process.env.INDEXER_ENABLED !== 'false',
    overlapLedgers: readOptionalInt('INDEXER_OVERLAP_LEDGERS') ?? 5,
    startLedger: readOptionalInt('INDEXER_START_LEDGER'),
    port: readOptionalInt('PORT') ?? 3030,
  };
}
