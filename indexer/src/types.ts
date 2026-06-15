export type EscrowEventTopic =
  | 'created'
  | 'funded'
  | 'released'
  | 'done'
  | 'dispute'
  | 'resolved'
  | 'refund';

export interface IndexerState {
  contractAddress: string;
  network: 'testnet' | 'mainnet';
  rpcUrl: string;
  lastSeenLedger?: number;
  lastSeenTxIndex?: number;
  overlapLedgers: number;
  lastTickAt?: Date;
  lastTickStatus: 'idle' | 'running' | 'ok' | 'error';
  lastTickEventsProcessed: number;
  lastError?: string;
  totalEventsProcessed: number;
  enabled: boolean;
  updatedAt: Date;
}

export interface DecodedEscrowEvent {
  chain: 'stellar';
  amount: number;
  platformCommission: number;
  onchainTxHash?: string;
  metadata: {
    source: 'scf-tranche-2-demo';
    environment: 'testnet' | 'mainnet';
    linkedToMarketplaceDeal: false;
  };
  sorobanContractAddress: string;
  sorobanDealId?: number;
  sorobanMilestoneIdx?: number;
  sorobanEventTopic: EscrowEventTopic;
  sorobanEventId: string;
  sorobanEventData: Record<string, unknown>;
  sorobanLedgerSeq: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IndexerRunResult {
  enabled: boolean;
  fromLedger: number;
  latestLedger: number;
  fetched: number;
  parsed: number;
  inserted: number;
  deduped: number;
  skipped: number;
}
