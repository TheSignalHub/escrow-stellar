import * as StellarSdk from '@stellar/stellar-sdk';
import type { DecodedEscrowEvent, EscrowEventTopic } from './types.js';

const KNOWN_TOPICS = new Set<EscrowEventTopic>([
  'created',
  'funded',
  'released',
  'done',
  'dispute',
  'resolved',
  'refund',
]);

function toNative(scVal: unknown): unknown {
  return StellarSdk.scValToNative(scVal as StellarSdk.xdr.ScVal);
}

function toSerializable(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(toSerializable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        toSerializable(item),
      ])
    );
  }
  return value;
}

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return Number(value);
  return undefined;
}

function stroopsToUnits(value: unknown): number {
  const numeric = toNumber(value);
  return numeric ? numeric / 1e7 : 0;
}

function eventIdOf(event: any): string {
  if (event.id) return String(event.id);
  const ledger = event.ledger ?? event.ledgerSeq ?? event.ledger_sequence ?? 'unknown-ledger';
  const txHash = event.txHash ?? event.tx_hash ?? event.transactionHash ?? 'unknown-tx';
  const paging = event.pagingToken ?? event.paging_token ?? event.eventIndex ?? event.event_index ?? '0';
  return `${ledger}-${txHash}-${paging}`;
}

function txHashOf(event: any): string | undefined {
  return event.txHash ?? event.tx_hash ?? event.transactionHash;
}

function ledgerOf(event: any): number {
  return Number(event.ledger ?? event.ledgerSeq ?? event.ledger_sequence ?? 0);
}

export function parseEscrowEvent(
  event: any,
  contractAddress: string,
  network: 'testnet' | 'mainnet'
): DecodedEscrowEvent | null {
  const rawTopics = event.topic ?? event.topics ?? [];
  if (!Array.isArray(rawTopics) || rawTopics.length === 0) return null;

  const decodedTopics = rawTopics.map(toNative);
  const topic = decodedTopics[0];
  if (typeof topic !== 'string' || !KNOWN_TOPICS.has(topic as EscrowEventTopic)) {
    return null;
  }

  const escrowTopic = topic as EscrowEventTopic;
  const dealId = toNumber(decodedTopics[1]);
  const milestoneIdx = toNumber(decodedTopics[2]);
  const decodedValue = toNative(event.value);
  const eventData: Record<string, unknown> = {
    topic: escrowTopic,
    dealId,
    milestoneIdx,
    value: toSerializable(decodedValue),
  };

  let amount = 0;
  let platformCommission = 0;

  if (escrowTopic === 'created' || escrowTopic === 'funded' || escrowTopic === 'refund') {
    amount = stroopsToUnits(decodedValue);
    eventData.amountStroops = toSerializable(decodedValue);
  }

  if (escrowTopic === 'released' && Array.isArray(decodedValue)) {
    const [providerCut, connectorCut, protocolCut] = decodedValue;
    amount = stroopsToUnits(providerCut) + stroopsToUnits(connectorCut) + stroopsToUnits(protocolCut);
    platformCommission = stroopsToUnits(connectorCut) + stroopsToUnits(protocolCut);
    eventData.providerCutStroops = toSerializable(providerCut);
    eventData.connectorCutStroops = toSerializable(connectorCut);
    eventData.protocolCutStroops = toSerializable(protocolCut);
  }

  if (escrowTopic === 'resolved' && Array.isArray(decodedValue)) {
    const [clientRefund, providerAmount] = decodedValue;
    amount = stroopsToUnits(clientRefund) + stroopsToUnits(providerAmount);
    eventData.clientRefundStroops = toSerializable(clientRefund);
    eventData.providerAmountStroops = toSerializable(providerAmount);
  }

  if (escrowTopic === 'done') {
    eventData.reputationCount = toSerializable(decodedValue);
  }

  if (escrowTopic === 'dispute') {
    eventData.caller = toSerializable(decodedValue);
  }

  const now = new Date();
  return {
    chain: 'stellar',
    amount,
    platformCommission,
    onchainTxHash: txHashOf(event),
    metadata: {
      source: 'scf-tranche-2-demo',
      environment: network,
      linkedToMarketplaceDeal: false,
    },
    sorobanContractAddress: contractAddress,
    sorobanDealId: dealId,
    sorobanMilestoneIdx: milestoneIdx,
    sorobanEventTopic: escrowTopic,
    sorobanEventId: eventIdOf(event),
    sorobanEventData: eventData,
    sorobanLedgerSeq: ledgerOf(event),
    createdAt: now,
    updatedAt: now,
  };
}
