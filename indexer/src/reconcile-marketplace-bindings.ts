import { getConfig } from './config.js';
import { closeIndexerDb, connectIndexerDb } from './db.js';
import { reconcileMarketplaceBindings } from './marketplaceBindings.js';

const config = getConfig();
const indexerDb = await connectIndexerDb(config.databaseUri);

try {
  const bindingId =
    process.env.MARKETPLACE_BINDING_ID && process.env.MARKETPLACE_BINDING_ID.trim()
      ? process.env.MARKETPLACE_BINDING_ID.trim()
      : undefined;
  const result = await reconcileMarketplaceBindings(indexerDb, bindingId);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await closeIndexerDb(indexerDb);
}
