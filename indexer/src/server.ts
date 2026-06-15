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

app.post('/api/soroswap/quote', async (req, res) => {
  if (!config.soroswapApiKey) {
    res.status(503).json({ error: 'Soroswap API is not configured.' });
    return;
  }

  const { assetIn, assetOut, amount, tradeType, protocols, slippageBps } = req.body || {};
  if (!assetIn || !assetOut || !amount) {
    res.status(400).json({ error: 'assetIn, assetOut, and amount are required.' });
    return;
  }

  try {
    const response = await fetch(`https://api.soroswap.finance/quote?network=${config.network}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.soroswapApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assetIn,
        assetOut,
        amount,
        tradeType: tradeType || 'EXACT_IN',
        protocols: Array.isArray(protocols) ? protocols : ['soroswap', 'phoenix', 'aqua'],
        slippageBps: Number.isFinite(Number(slippageBps)) ? Number(slippageBps) : 100,
      }),
    });

    const payload = await response.json().catch(() => ({ message: response.statusText }));
    if (!response.ok) {
      const message =
        payload.detail || payload.title || payload.error || payload.message || response.statusText;
      res.status(response.status).json({ error: message, detail: payload });
      return;
    }

    res.json(payload);
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : String(error),
    });
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
