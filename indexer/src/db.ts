import { MongoClient, type Collection, type Db } from 'mongodb';
import type { DecodedEscrowEvent, IndexerState } from './types.js';

export interface IndexerDb {
  client: MongoClient;
  db: Db;
  state: Collection<IndexerState>;
  transfers: Collection<DecodedEscrowEvent>;
}

export async function connectIndexerDb(databaseUri: string): Promise<IndexerDb> {
  const client = new MongoClient(databaseUri);
  await client.connect();
  const db = client.db();
  const state = db.collection<IndexerState>('stellar-indexer-state');
  const transfers = db.collection<DecodedEscrowEvent>('escrow-transfers');

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
  ]);

  return { client, db, state, transfers };
}

export async function closeIndexerDb(indexerDb: IndexerDb): Promise<void> {
  await indexerDb.client.close();
}
