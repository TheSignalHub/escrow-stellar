import { getConfig } from './config.js';
import { closeIndexerDb, connectIndexerDb } from './db.js';
import { runStellarIndexerOnce } from './runStellarIndexerOnce.js';

const config = getConfig();
const indexerDb = await connectIndexerDb(config.databaseUri);

try {
  const result = await runStellarIndexerOnce(config, indexerDb);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await closeIndexerDb(indexerDb);
}
