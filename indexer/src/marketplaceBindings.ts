import { randomUUID } from 'node:crypto';
import type { IndexerConfig } from './config.js';
import type { IndexerDb } from './db.js';
import type {
  DecodedEscrowEvent,
  EscrowEventTopic,
  MarketplaceBinding,
  MarketplaceBindingEvent,
  MarketplaceBindingMode,
  MarketplaceBindingReconcileResult,
  MarketplaceBindingStatus,
} from './types.js';

type CreateBindingInput = Omit<
  MarketplaceBinding,
  | 'bindingId'
  | 'bindingMode'
  | 'network'
  | 'rail'
  | 'sorobanContractAddress'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
> & {
  bindingId?: string;
  bindingMode?: MarketplaceBindingMode;
  network?: MarketplaceBinding['network'];
  sorobanContractAddress?: string;
  status?: MarketplaceBindingStatus;
};

const EVENT_STATUS: Record<EscrowEventTopic, MarketplaceBindingStatus> = {
  created: 'onchain_created',
  funded: 'active',
  released: 'active',
  done: 'completed',
  dispute: 'disputed',
  resolved: 'needs_review',
  refund: 'cancelled',
};

const BINDING_STATUSES = new Set<MarketplaceBindingStatus>([
  'intent_created',
  'onchain_created',
  'funding',
  'active',
  'disputed',
  'completed',
  'cancelled',
  'needs_review',
]);

function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function assertNumber(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be a number`);
  return parsed;
}

function normalizeStatus(value: unknown): MarketplaceBindingStatus {
  if (value === undefined || value === null || value === '') return 'intent_created';
  if (typeof value !== 'string' || !BINDING_STATUSES.has(value as MarketplaceBindingStatus)) {
    throw new Error('status must be a valid marketplace binding status');
  }
  return value as MarketplaceBindingStatus;
}

export function normalizeCreateBindingInput(
  config: IndexerConfig,
  input: Record<string, unknown>
): MarketplaceBinding {
  const now = new Date();
  const settlementAsset = input.settlementAsset as Record<string, unknown> | undefined;
  const participants = input.participants as Record<string, unknown> | undefined;
  const milestoneMap = input.milestoneMap;

  if (!settlementAsset || typeof settlementAsset !== 'object') {
    throw new Error('settlementAsset is required');
  }
  if (!participants || typeof participants !== 'object') {
    throw new Error('participants is required');
  }
  if (!Array.isArray(milestoneMap) || milestoneMap.length === 0) {
    throw new Error('milestoneMap must contain at least one milestone');
  }

  return {
    bindingId:
      typeof input.bindingId === 'string' && input.bindingId.trim()
        ? input.bindingId.trim()
        : `mb_${randomUUID()}`,
    bindingMode:
      input.bindingMode === 'staging' || input.bindingMode === 'production-adapter'
        ? input.bindingMode
        : 'shadow',
    externalMarketplaceId: assertString(input.externalMarketplaceId, 'externalMarketplaceId'),
    externalDealId: assertString(input.externalDealId, 'externalDealId'),
    externalDealUrl:
      typeof input.externalDealUrl === 'string' && input.externalDealUrl.trim()
        ? input.externalDealUrl.trim()
        : undefined,
    sorobanContractAddress:
      typeof input.sorobanContractAddress === 'string' && input.sorobanContractAddress.trim()
        ? input.sorobanContractAddress.trim()
        : config.contractAddress,
    sorobanDealId: assertNumber(input.sorobanDealId, 'sorobanDealId'),
    network:
      input.network === 'mainnet' || input.network === 'testnet'
        ? input.network
        : config.network,
    rail: 'stellar',
    settlementAsset: {
      contractAddress: assertString(settlementAsset.contractAddress, 'settlementAsset.contractAddress'),
      symbol: assertString(settlementAsset.symbol, 'settlementAsset.symbol'),
      decimals: assertNumber(settlementAsset.decimals, 'settlementAsset.decimals'),
    },
    participants: {
      clientWallet: assertString(participants.clientWallet, 'participants.clientWallet'),
      providerWallet: assertString(participants.providerWallet, 'participants.providerWallet'),
      connectorWallet: assertString(participants.connectorWallet, 'participants.connectorWallet'),
      protocolWallet:
        typeof participants.protocolWallet === 'string' && participants.protocolWallet.trim()
          ? participants.protocolWallet.trim()
          : undefined,
    },
    milestoneMap: milestoneMap.map((item, idx) => {
      const milestone = item as Record<string, unknown>;
      return {
        externalMilestoneId: assertString(
          milestone.externalMilestoneId,
          `milestoneMap[${idx}].externalMilestoneId`
        ),
        sorobanMilestoneIdx: assertNumber(
          milestone.sorobanMilestoneIdx,
          `milestoneMap[${idx}].sorobanMilestoneIdx`
        ),
        label:
          typeof milestone.label === 'string' && milestone.label.trim()
            ? milestone.label.trim()
            : undefined,
        expectedAmountStroops: assertString(
          milestone.expectedAmountStroops,
          `milestoneMap[${idx}].expectedAmountStroops`
        ),
      };
    }),
    status: normalizeStatus(input.status),
    createdAt: now,
    updatedAt: now,
  };
}

function statusForEvent(event: DecodedEscrowEvent): MarketplaceBindingStatus {
  if (event.sorobanEventTopic !== 'resolved') return EVENT_STATUS[event.sorobanEventTopic];
  return 'needs_review';
}

function bindingEventFor(
  binding: MarketplaceBinding,
  event: DecodedEscrowEvent
): MarketplaceBindingEvent {
  return {
    bindingId: binding.bindingId,
    externalDealId: binding.externalDealId,
    sorobanDealId: binding.sorobanDealId,
    sorobanMilestoneIdx: event.sorobanMilestoneIdx,
    sorobanEventTopic: event.sorobanEventTopic,
    sorobanEventId: event.sorobanEventId,
    onchainTxHash: event.onchainTxHash,
    mappedStatus: statusForEvent(event),
    rawEventRef: event.sorobanEventId,
    createdAt: new Date(),
  };
}

function nextStatus(
  current: MarketplaceBindingStatus,
  event: DecodedEscrowEvent
): MarketplaceBindingStatus {
  const mapped = statusForEvent(event);
  if (mapped === 'active' && current === 'disputed') return current;
  if (mapped === 'onchain_created' && current !== 'intent_created') return current;
  return mapped;
}

export async function createMarketplaceBinding(
  config: IndexerConfig,
  indexerDb: IndexerDb,
  input: Record<string, unknown>
): Promise<MarketplaceBinding> {
  const binding = normalizeCreateBindingInput(config, input);
  await indexerDb.marketplaceBindings.insertOne(binding);
  return binding;
}

export async function reconcileMarketplaceBindings(
  indexerDb: IndexerDb,
  bindingId?: string
): Promise<MarketplaceBindingReconcileResult> {
  const bindings = await indexerDb.marketplaceBindings
    .find(bindingId ? { bindingId } : {})
    .toArray();

  const result: MarketplaceBindingReconcileResult = {
    bindingsChecked: bindings.length,
    eventsScanned: 0,
    eventsInserted: 0,
    eventsDeduped: 0,
    bindingsUpdated: 0,
  };

  for (const binding of bindings) {
    const events = await indexerDb.transfers
      .find({
        sorobanContractAddress: binding.sorobanContractAddress,
        sorobanDealId: binding.sorobanDealId,
      })
      .sort({ sorobanLedgerSeq: 1, sorobanEventId: 1 })
      .toArray();

    result.eventsScanned += events.length;
    if (events.length === 0) continue;

    let status = binding.status;
    let lastIndexedEventId = binding.lastIndexedEventId;
    let lastOnchainTxHash = binding.lastOnchainTxHash;

    for (const event of events) {
      const bindingEvent = bindingEventFor(binding, event);
      const insert = await indexerDb.marketplaceBindingEvents.updateOne(
        { bindingId: binding.bindingId, sorobanEventId: event.sorobanEventId },
        { $setOnInsert: bindingEvent },
        { upsert: true }
      );

      if (insert.upsertedCount > 0) result.eventsInserted += 1;
      else result.eventsDeduped += 1;

      status = nextStatus(status, event);
      lastIndexedEventId = event.sorobanEventId;
      lastOnchainTxHash = event.onchainTxHash ?? lastOnchainTxHash;
    }

    const update = await indexerDb.marketplaceBindings.updateOne(
      { bindingId: binding.bindingId },
      {
        $set: {
          status,
          lastIndexedEventId,
          lastOnchainTxHash,
          updatedAt: new Date(),
        },
      }
    );
    if (update.modifiedCount > 0) result.bindingsUpdated += 1;
  }

  return result;
}
