import { Inngest } from 'inngest';
import { getConfig } from './config.js';
import { closeIndexerDb, connectIndexerDb } from './db.js';
import { runStellarIndexerOnce } from './runStellarIndexerOnce.js';

export const inngest = new Inngest({
  id: process.env.INNGEST_ID || 'escrow-stellar-indexer',
});

export const sorobanEventListener = inngest.createFunction(
  { id: 'soroban-event-listener', name: 'Soroban Event Listener' },
  { cron: '*/1 * * * *' },
  async ({ step }) => {
    return step.run('index-stellar-escrow-events', async () => {
      const config = getConfig();
      const indexerDb = await connectIndexerDb(config.databaseUri);
      try {
        return await runStellarIndexerOnce(config, indexerDb);
      } finally {
        await closeIndexerDb(indexerDb);
      }
    });
  }
);

export const functions = [sorobanEventListener];
