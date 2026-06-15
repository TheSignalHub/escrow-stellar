import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from 'inngest/express';
import { registerAdminDashboard, requireAdminAuth } from './adminDashboard.js';
import { getConfig } from './config.js';
import { closeIndexerDb, connectIndexerDb } from './db.js';
import { functions, inngest } from './inngest.js';
import { runStellarIndexerOnce } from './runStellarIndexerOnce.js';

const config = getConfig();
const app = express();

app.use(express.json());
registerAdminDashboard(app, config);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'escrow-stellar-indexer',
    network: config.network,
    contractAddress: config.contractAddress,
  });
});

app.post('/api/indexer/run-once', requireAdminAuth, async (_req, res) => {
  const indexerDb = await connectIndexerDb(config.databaseUri);
  try {
    const result = await runStellarIndexerOnce(config, indexerDb);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await closeIndexerDb(indexerDb);
  }
});

app.use(
  '/api/inngest',
  serve({
    client: inngest,
    functions,
  })
);

const frontendDistPath = process.env.FRONTEND_DIST_PATH;
if (frontendDistPath && fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.listen(config.port, () => {
  console.log(`escrow-stellar-indexer listening on :${config.port}`);
});
