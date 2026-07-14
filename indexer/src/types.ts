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

export type MarketplaceBindingMode = 'shadow' | 'staging' | 'production-adapter';
export type MarketplaceBindingStatus =
  | 'intent_created'
  | 'onchain_created'
  | 'funding'
  | 'active'
  | 'disputed'
  | 'completed'
  | 'cancelled'
  | 'needs_review';

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

export type NearIntentProviderStatus =
  | 'PENDING_DEPOSIT'
  | 'KNOWN_DEPOSIT_TX'
  | 'INCOMPLETE_DEPOSIT'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'REFUNDED'
  | 'FAILED';

export interface NearIntentQuoteMetadata {
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
  expiresAt?: Date;
  providerStatusRaw?: NearIntentProviderStatus | string;
  providerStatusUpdatedAt?: Date;
  submittedDepositTxHash?: string;
}

export interface MarketplaceBinding {
  bindingId: string;
  bindingMode: MarketplaceBindingMode;
  externalMarketplaceId: string;
  externalDealId: string;
  externalDealUrl?: string;
  sorobanContractAddress: string;
  sorobanDealId: number;
  network: 'testnet' | 'mainnet';
  rail: 'stellar';
  externalPaymentIntent?: {
    provider: 'near-intents' | 'external';
    intentId?: string;
    status: CrossChainPaymentStatus;
    refundRef?: string;
    updatedAt?: Date;
  };
  nearIntent?: NearIntentQuoteMetadata;
  settlementAsset: {
    contractAddress: string;
    symbol: string;
    decimals: number;
  };
  participants: {
    clientWallet: string;
    providerWallet: string;
    connectorWallet: string;
    protocolWallet?: string;
  };
  milestoneMap: Array<{
    externalMilestoneId: string;
    sorobanMilestoneIdx: number;
    label?: string;
    expectedAmountStroops: string;
  }>;
  status: MarketplaceBindingStatus;
  lastIndexedEventId?: string;
  lastOnchainTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceBindingEvent {
  bindingId: string;
  externalDealId: string;
  sorobanDealId: number;
  sorobanMilestoneIdx?: number;
  sorobanEventTopic: EscrowEventTopic;
  sorobanEventId: string;
  onchainTxHash?: string;
  mappedStatus: MarketplaceBindingStatus;
  rawEventRef: string;
  createdAt: Date;
}

export interface MarketplaceBindingReconcileResult {
  bindingsChecked: number;
  eventsScanned: number;
  eventsInserted: number;
  eventsDeduped: number;
  bindingsUpdated: number;
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
