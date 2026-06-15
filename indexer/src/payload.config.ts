import * as payloadBundlerExports from '@payloadcms/bundler-webpack';
import * as payloadMongoExports from '@payloadcms/db-mongodb';
import * as payloadConfigExports from 'payload/dist/exports/config.js';

const { webpackBundler } = (payloadBundlerExports as any).default ?? payloadBundlerExports;
const { mongooseAdapter } = (payloadMongoExports as any).default ?? payloadMongoExports;
const { buildConfig } = (payloadConfigExports as any).default ?? payloadConfigExports;

const noopEditor = {
  validate: () => true,
};

const DATABASE_URI = process.env.DATABASE_URI || '';
const SERVER_URL = process.env.PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL;

const readOnlyAccess = {
  create: () => false,
  update: () => false,
  delete: () => false,
};

const Users = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    group: 'Admin',
  },
  fields: [],
};

const EscrowTransfers = {
  slug: 'escrow-transfers',
  labels: {
    singular: 'Escrow Transfer',
    plural: 'Escrow Transfers',
  },
  admin: {
    group: 'Stellar Indexer',
    defaultColumns: [
      'sorobanEventTopic',
      'sorobanDealId',
      'sorobanMilestoneIdx',
      'amount',
      'sorobanLedgerSeq',
      'updatedAt',
    ],
  },
  access: readOnlyAccess,
  fields: [
    { name: 'chain', type: 'text', index: true },
    { name: 'amount', type: 'number' },
    { name: 'platformCommission', type: 'number' },
    { name: 'onchainTxHash', type: 'text' },
    { name: 'metadata', type: 'json' },
    { name: 'sorobanContractAddress', type: 'text', index: true },
    { name: 'sorobanDealId', type: 'number', index: true },
    { name: 'sorobanMilestoneIdx', type: 'number', index: true },
    { name: 'sorobanEventTopic', type: 'text', index: true },
    { name: 'sorobanEventId', type: 'text', unique: true, index: true },
    { name: 'sorobanEventData', type: 'json' },
    { name: 'sorobanLedgerSeq', type: 'number', index: true },
  ],
};

const StellarIndexerState = {
  slug: 'stellar-indexer-state',
  labels: {
    singular: 'Stellar Indexer State',
    plural: 'Stellar Indexer State',
  },
  admin: {
    group: 'Stellar Indexer',
    defaultColumns: [
      'contractAddress',
      'network',
      'enabled',
      'lastSeenLedger',
      'lastTickStatus',
      'updatedAt',
    ],
  },
  access: readOnlyAccess,
  fields: [
    { name: 'contractAddress', type: 'text', index: true },
    { name: 'network', type: 'text', index: true },
    { name: 'rpcUrl', type: 'text' },
    { name: 'lastSeenLedger', type: 'number' },
    { name: 'lastSeenTxIndex', type: 'number' },
    { name: 'overlapLedgers', type: 'number' },
    { name: 'lastTickAt', type: 'date' },
    { name: 'lastTickStatus', type: 'text' },
    { name: 'lastTickEventsProcessed', type: 'number' },
    { name: 'lastError', type: 'textarea' },
    { name: 'totalEventsProcessed', type: 'number' },
    { name: 'enabled', type: 'checkbox' },
  ],
};

export default buildConfig({
  serverURL: SERVER_URL,
  admin: {
    user: Users.slug,
    bundler: webpackBundler(),
    buildPath: process.env.PAYLOAD_ADMIN_BUILD_PATH,
  },
  editor: noopEditor,
  db: mongooseAdapter({
    url: DATABASE_URI,
    autoPluralization: false,
  }),
  collections: [Users, EscrowTransfers, StellarIndexerState],
} as any);
