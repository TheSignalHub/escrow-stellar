import { getConfig } from './config.js';
import { closeIndexerDb, connectIndexerDb } from './db.js';
import { normalizeCreateBindingInput } from './marketplaceBindings.js';
import type { MarketplaceBinding } from './types.js';

const DEMO_SETTLEMENT_ASSET =
  process.env.SETTLEMENT_ASSET_CONTRACT ||
  process.env.VITE_USDC_TOKEN_ADDRESS ||
  'CAHJQG77XDPFZAC7JJSRGAVYWKGEUDWOQ5O33VK4VTR2ZKOBCZAIVLFX';

const DEMO_SETTLEMENT_SYMBOL =
  process.env.SETTLEMENT_TOKEN_SYMBOL || process.env.VITE_SETTLEMENT_TOKEN_SYMBOL || 'tUSDC';

const DEMO_PARTICIPANTS = {
  clientWallet:
    process.env.MARKETPLACE_BINDING_CLIENT_WALLET ||
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPP4V',
  providerWallet:
    process.env.MARKETPLACE_BINDING_PROVIDER_WALLET ||
    'GBGAYFBHEW75IV3M4ISWZ5OYCC6RWJBW6F5OB5CWVPFOPUES6MSKZ52I',
  connectorWallet:
    process.env.MARKETPLACE_BINDING_CONNECTOR_WALLET ||
    'GBH6SRZUJMYVHDRZKF3LCSOAKIINO3VNFJRK7JDNSUW4DIFFATKI7WSS',
  protocolWallet:
    process.env.MARKETPLACE_BINDING_PROTOCOL_WALLET ||
    'GANINT77BUNZNNNIVU4BCZFDA6IBDDQO2IU7MXLNQBLEIL2ZFD45C2OB',
};

function readDealId(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

function fixtureInput(externalDealId: string, sorobanDealId: number, amount: string) {
  return {
    bindingId: `mb_${externalDealId.toLowerCase()}`,
    bindingMode: 'shadow',
    externalMarketplaceId: 'the-signal',
    externalDealId,
    externalDealUrl: `https://signal.local/demo/deals/${externalDealId}`,
    sorobanDealId,
    settlementAsset: {
      contractAddress: DEMO_SETTLEMENT_ASSET,
      symbol: DEMO_SETTLEMENT_SYMBOL,
      decimals: 7,
    },
    participants: DEMO_PARTICIPANTS,
    milestoneMap: [
      {
        externalMilestoneId: `${externalDealId}-M1`,
        sorobanMilestoneIdx: 0,
        label: externalDealId === 'SIG-DEMO-001' ? 'Audit kickoff' : 'Delivery review',
        expectedAmountStroops: amount,
      },
    ],
  };
}

async function upsertBinding(binding: MarketplaceBinding): Promise<'inserted' | 'updated'> {
  const { createdAt, ...mutableBinding } = binding;
  const result = await indexerDb.marketplaceBindings.updateOne(
    { bindingId: binding.bindingId },
    {
      $set: {
        ...mutableBinding,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt },
    },
    { upsert: true }
  );

  return result.upsertedCount > 0 ? 'inserted' : 'updated';
}

const config = getConfig();
const indexerDb = await connectIndexerDb(config.databaseUri);

try {
  const fixtures = [
    normalizeCreateBindingInput(
      config,
      fixtureInput(
        'SIG-DEMO-001',
        readDealId('MARKETPLACE_BINDING_SIG_DEMO_001_DEAL_ID', 1),
        '1500000000'
      )
    ),
    normalizeCreateBindingInput(
      config,
      fixtureInput(
        'SIG-DEMO-002',
        readDealId('MARKETPLACE_BINDING_SIG_DEMO_002_DEAL_ID', 2),
        '2500000000'
      )
    ),
  ];

  const seeded = [];
  for (const binding of fixtures) {
    seeded.push({
      bindingId: binding.bindingId,
      externalDealId: binding.externalDealId,
      sorobanDealId: binding.sorobanDealId,
      status: await upsertBinding(binding),
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: 'shadow',
        marketplace: 'the-signal',
        seeded,
      },
      null,
      2
    )
  );
} finally {
  await closeIndexerDb(indexerDb);
}
