import * as StellarSdk from '@stellar/stellar-sdk';
import type { IndexerConfig } from './config.js';
import type { IndexerDb } from './db.js';
import { parseEscrowEvent } from './parseEscrowEvent.js';
import type { DecodedEscrowEvent, IndexerRunResult, IndexerState } from './types.js';

const rpc = StellarSdk.rpc;

async function getLatestLedger(rpcUrl: string): Promise<number> {
  const server = new rpc.Server(rpcUrl);
  const latestLedger = await server.getLatestLedger();
  return latestLedger.sequence;
}

async function fetchContractEvents(
  config: IndexerConfig,
  startLedger: number,
  latestLedger: number
): Promise<any[]> {
  if (startLedger > latestLedger) return [];

  const server = new rpc.Server(config.rpcUrl);
  const response = await server.getEvents({
    startLedger,
    filters: [
      {
        type: 'contract',
        contractIds: [config.contractAddress],
      },
    ],
    limit: 1000,
  });

  return response.events ?? [];
}

async function loadOrCreateState(config: IndexerConfig, indexerDb: IndexerDb): Promise<IndexerState> {
  const now = new Date();
  const existing = await indexerDb.state.findOne({
    contractAddress: config.contractAddress,
    network: config.network,
  });

  if (existing) {
    return {
      ...existing,
      rpcUrl: config.rpcUrl,
      overlapLedgers: config.overlapLedgers,
      enabled: config.enabled,
    };
  }

  const state: IndexerState = {
    contractAddress: config.contractAddress,
    network: config.network,
    rpcUrl: config.rpcUrl,
    lastSeenLedger: config.startLedger,
    overlapLedgers: config.overlapLedgers,
    lastTickStatus: 'idle',
    lastTickEventsProcessed: 0,
    totalEventsProcessed: 0,
    enabled: config.enabled,
    updatedAt: now,
  };

  await indexerDb.state.insertOne(state);
  return state;
}

async function markRunning(config: IndexerConfig, indexerDb: IndexerDb): Promise<void> {
  await indexerDb.state.updateOne(
    { contractAddress: config.contractAddress, network: config.network },
    {
      $set: {
        lastTickAt: new Date(),
        lastTickStatus: 'running',
        lastError: undefined,
        updatedAt: new Date(),
      },
    }
  );
}

async function markOk(
  config: IndexerConfig,
  indexerDb: IndexerDb,
  latestLedger: number,
  inserted: number
): Promise<void> {
  await indexerDb.state.updateOne(
    { contractAddress: config.contractAddress, network: config.network },
    {
      $set: {
        lastSeenLedger: latestLedger,
        lastTickAt: new Date(),
        lastTickStatus: 'ok',
        lastTickEventsProcessed: inserted,
        lastError: undefined,
        updatedAt: new Date(),
      },
      $inc: { totalEventsProcessed: inserted },
    }
  );
}

async function markError(config: IndexerConfig, indexerDb: IndexerDb, error: unknown): Promise<void> {
  await indexerDb.state.updateOne(
    { contractAddress: config.contractAddress, network: config.network },
    {
      $set: {
        lastTickAt: new Date(),
        lastTickStatus: 'error',
        lastError: error instanceof Error ? error.message : String(error),
        updatedAt: new Date(),
      },
    }
  );
}

async function insertEvents(
  indexerDb: IndexerDb,
  events: DecodedEscrowEvent[]
): Promise<{ inserted: number; deduped: number }> {
  let inserted = 0;
  let deduped = 0;

  for (const event of events) {
    const result = await indexerDb.transfers.updateOne(
      { sorobanEventId: event.sorobanEventId },
      { $setOnInsert: event },
      { upsert: true }
    );
    if (result.upsertedCount > 0) inserted += 1;
    else deduped += 1;
  }

  return { inserted, deduped };
}

export async function runStellarIndexerOnce(
  config: IndexerConfig,
  indexerDb: IndexerDb
): Promise<IndexerRunResult> {
  const state = await loadOrCreateState(config, indexerDb);
  const latestLedger = await getLatestLedger(config.rpcUrl);
  const configuredStart = config.startLedger ?? Math.max(1, latestLedger - 1200);
  const previousLedger = state.lastSeenLedger ?? configuredStart;
  const fromLedger = Math.max(1, previousLedger - state.overlapLedgers);

  if (!state.enabled) {
    return {
      enabled: false,
      fromLedger,
      latestLedger,
      fetched: 0,
      parsed: 0,
      inserted: 0,
      deduped: 0,
      skipped: 0,
    };
  }

  await markRunning(config, indexerDb);

  try {
    const rawEvents = await fetchContractEvents(config, fromLedger, latestLedger);
    const parsedEvents: DecodedEscrowEvent[] = [];
    let skipped = 0;

    for (const rawEvent of rawEvents) {
      const parsed = parseEscrowEvent(rawEvent, config.contractAddress, config.network);
      if (parsed) parsedEvents.push(parsed);
      else skipped += 1;
    }

    const { inserted, deduped } = await insertEvents(indexerDb, parsedEvents);
    await markOk(config, indexerDb, latestLedger, inserted);

    return {
      enabled: true,
      fromLedger,
      latestLedger,
      fetched: rawEvents.length,
      parsed: parsedEvents.length,
      inserted,
      deduped,
      skipped,
    };
  } catch (error) {
    await markError(config, indexerDb, error);
    throw error;
  }
}
