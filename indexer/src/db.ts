import { MongoClient, type Collection, type Db } from 'mongodb';
import type {
  DecodedEscrowEvent,
  DisputeNote,
  IndexerState,
  MarketplaceBinding,
  MarketplaceBindingEvent,
} from './types.js';

export interface IndexerDb {
  client: MongoClient;
  db: Db;
  state: Collection<IndexerState>;
  transfers: Collection<DecodedEscrowEvent>;
  marketplaceBindings: Collection<MarketplaceBinding>;
  marketplaceBindingEvents: Collection<MarketplaceBindingEvent>;
  disputeNotes: Collection<DisputeNote>;
}

export async function connectIndexerDb(databaseUri: string): Promise<IndexerDb> {
  const client = new MongoClient(databaseUri);
  await client.connect();
  const db = client.db();
  const state = db.collection<IndexerState>('stellar-indexer-state');
  const transfers = db.collection<DecodedEscrowEvent>('escrow-transfers');
  const marketplaceBindings = db.collection<MarketplaceBinding>('marketplace-bindings');
  const marketplaceBindingEvents = db.collection<MarketplaceBindingEvent>('marketplace-binding-events');
  const disputeNotes = db.collection<DisputeNote>('dispute-notes');

  await Promise.all([
    state.createIndex({ contractAddress: 1, network: 1 }, { unique: true }),
    transfers.createIndex({ sorobanEventId: 1 }, { unique: true }),
    transfers.createIndex({
      sorobanContractAddress: 1,
      sorobanDealId: 1,
      sorobanMilestoneIdx: 1,
      sorobanEventTopic: 1,
      sorobanLedgerSeq: 1,
    }),
    transfers.createIndex({ chain: 1, sorobanContractAddress: 1 }),
    marketplaceBindings.createIndex({ bindingId: 1 }, { unique: true }),
    marketplaceBindings.createIndex(
      { externalMarketplaceId: 1, externalDealId: 1, bindingMode: 1 },
      { unique: true }
    ),
    marketplaceBindings.createIndex({
      sorobanContractAddress: 1,
      sorobanDealId: 1,
      network: 1,
    }),
    marketplaceBindingEvents.createIndex(
      { bindingId: 1, sorobanEventId: 1 },
      { unique: true }
    ),
    marketplaceBindingEvents.createIndex({
      externalDealId: 1,
      sorobanDealId: 1,
      sorobanMilestoneIdx: 1,
    }),
    disputeNotes.createIndex({ dealId: 1, milestoneIdx: 1, updatedAt: -1 }),
    disputeNotes.createIndex({ txHash: 1 }),
  ]);

  return {
    client,
    db,
    state,
    transfers,
    marketplaceBindings,
    marketplaceBindingEvents,
    disputeNotes,
  };
}

export async function closeIndexerDb(indexerDb: IndexerDb): Promise<void> {
  await indexerDb.client.close();
}
