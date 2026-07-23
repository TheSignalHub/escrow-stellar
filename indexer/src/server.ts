import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from 'inngest/express';
import { registerAdminDashboard, requireAdminAuth } from './adminDashboard.js';
import { getConfig } from './config.js';
import { closeIndexerDb, connectIndexerDb } from './db.js';
import { functions, inngest } from './inngest.js';
import { createMarketplaceBinding, reconcileMarketplaceBindings } from './marketplaceBindings.js';
import {
  getNearIntentExecutionStatus,
  listNearIntentTokens,
  NearIntentsProviderError,
  requestNearIntentQuote,
  submitNearIntentDepositTx,
} from './nearIntentsProvider.js';
import { runStellarIndexerOnce } from './runStellarIndexerOnce.js';
import type { CrossChainPaymentStatus, MarketplaceBinding } from './types.js';

const config = getConfig();
const app = express();

app.use(express.json());
registerAdminDashboard(app, config);

function stringifyApiError(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  for (const key of ['detail', 'title', 'message', 'error', 'reason']) {
    const nested = stringifyApiError(record[key]);
    if (nested) return nested;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function nearIntentStatusToBindingStatus(
  binding: MarketplaceBinding,
  status: CrossChainPaymentStatus
): MarketplaceBinding['status'] {
  if (binding.status === 'completed' || binding.status === 'cancelled') return binding.status;
  if (binding.status === 'disputed') return binding.status;
  if (status === 'failed' || status === 'refunded' || status === 'needs_review') {
    return 'needs_review';
  }
  if (status === 'intent_created') return binding.status === 'intent_created' ? 'intent_created' : binding.status;
  return 'funding';
}

function sendNearIntentError(res: express.Response, error: unknown): void {
  if (error instanceof NearIntentsProviderError) {
    res.status(error.statusCode).json({ error: error.message, detail: error.detail });
    return;
  }
  res.status(500).json({
    error: error instanceof Error ? error.message : String(error),
  });
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'escrow-stellar-indexer',
    network: config.network,
    contractAddress: config.contractAddress,
  });
});

app.get('/api/near-intents/readiness', (_req, res) => {
  res.json({
    enabled: config.nearIntents.enabled,
    liveExecutionEnabled: config.nearIntents.allowLiveExecution,
    apiBaseUrl: config.nearIntents.apiBaseUrl,
    configured: {
      jwt: Boolean(config.nearIntents.jwt),
      stellarDestinationAsset: Boolean(
        config.nearIntents.defaultStellarDestinationAsset ||
          config.nearIntents.stellarDestinationAssetAllowlist.length > 0
      ),
      defaultStellarDestinationAsset: Boolean(config.nearIntents.defaultStellarDestinationAsset),
      stellarDestinationAssetAllowlist:
        config.nearIntents.stellarDestinationAssetAllowlist.length > 0,
      demoDestinationAssetAllowlist: config.nearIntents.demoDestinationAssetAllowlist.length > 0,
      defaultRefundAccount: Boolean(config.nearIntents.defaultRefundAccount),
    },
    destinationAssets: {
      default: config.nearIntents.defaultStellarDestinationAsset,
      allowlist: config.nearIntents.stellarDestinationAssetAllowlist,
      demoAllowlist: config.nearIntents.demoDestinationAssetAllowlist,
    },
    quoteTtlSeconds: config.nearIntents.quoteTtlSeconds,
    pollIntervalSeconds: config.nearIntents.pollIntervalSeconds,
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

app.post('/api/marketplace-bindings', requireAdminAuth, async (req, res) => {
  const indexerDb = await connectIndexerDb(config.databaseUri);
  try {
    const binding = await createMarketplaceBinding(config, indexerDb, req.body || {});
    res.status(201).json(binding);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await closeIndexerDb(indexerDb);
  }
});

app.get('/api/marketplace-bindings', requireAdminAuth, async (_req, res) => {
  const indexerDb = await connectIndexerDb(config.databaseUri);
  try {
    const bindings = await indexerDb.marketplaceBindings
      .find({})
      .sort({ updatedAt: -1 })
      .limit(100)
      .toArray();
    res.json({ bindings });
  } finally {
    await closeIndexerDb(indexerDb);
  }
});

app.get(
  '/api/marketplace-bindings/by-external/:externalMarketplaceId/:externalDealId',
  requireAdminAuth,
  async (req, res) => {
    const indexerDb = await connectIndexerDb(config.databaseUri);
    try {
      const binding = await indexerDb.marketplaceBindings.findOne({
        externalMarketplaceId: req.params.externalMarketplaceId,
        externalDealId: req.params.externalDealId,
      });
      if (!binding) {
        res.status(404).json({ error: 'Marketplace binding not found.' });
        return;
      }
      res.json(binding);
    } finally {
      await closeIndexerDb(indexerDb);
    }
  }
);

app.get('/api/marketplace-bindings/:bindingId', requireAdminAuth, async (req, res) => {
  const indexerDb = await connectIndexerDb(config.databaseUri);
  try {
    const binding = await indexerDb.marketplaceBindings.findOne({
      bindingId: req.params.bindingId,
    });
    if (!binding) {
      res.status(404).json({ error: 'Marketplace binding not found.' });
      return;
    }
    res.json(binding);
  } finally {
    await closeIndexerDb(indexerDb);
  }
});

app.get('/api/marketplace-bindings/:bindingId/events', requireAdminAuth, async (req, res) => {
  const indexerDb = await connectIndexerDb(config.databaseUri);
  try {
    const events = await indexerDb.marketplaceBindingEvents
      .find({ bindingId: req.params.bindingId })
      .sort({ createdAt: 1 })
      .toArray();
    res.json({ events });
  } finally {
    await closeIndexerDb(indexerDb);
  }
});

app.post('/api/marketplace-bindings/reconcile', requireAdminAuth, async (req, res) => {
  const indexerDb = await connectIndexerDb(config.databaseUri);
  try {
    const bindingId =
      typeof req.body?.bindingId === 'string' && req.body.bindingId.trim()
        ? req.body.bindingId.trim()
        : undefined;
    const result = await reconcileMarketplaceBindings(indexerDb, bindingId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await closeIndexerDb(indexerDb);
  }
});

app.get('/api/near-intents/tokens', async (_req, res) => {
  try {
    const tokens = await listNearIntentTokens(config);
    res.json({ tokens });
  } catch (error) {
    sendNearIntentError(res, error);
  }
});

app.post(
  '/api/marketplace-bindings/:bindingId/near-intents/quote',
  requireAdminAuth,
  async (req, res) => {
    const indexerDb = await connectIndexerDb(config.databaseUri);
    try {
      const binding = await indexerDb.marketplaceBindings.findOne({
        bindingId: req.params.bindingId,
      });
      if (!binding) {
        res.status(404).json({ error: 'Marketplace binding not found.' });
        return;
      }

      const { quote, metadata } = await requestNearIntentQuote(config, binding, req.body || {});
      const externalPaymentIntent = {
        provider: 'near-intents' as const,
        intentId: metadata.quoteId,
        status: 'intent_created' as const,
        updatedAt: new Date(),
      };

      const bindingStatus = nearIntentStatusToBindingStatus(binding, externalPaymentIntent.status);
      await indexerDb.marketplaceBindings.updateOne(
        { bindingId: binding.bindingId },
        {
          $set: {
            externalPaymentIntent,
            nearIntent: metadata,
            status: bindingStatus,
            updatedAt: new Date(),
          },
        }
      );

      res.status(201).json({
        bindingId: binding.bindingId,
        externalPaymentIntent,
        nearIntent: metadata,
        quote,
      });
    } catch (error) {
      sendNearIntentError(res, error);
    } finally {
      await closeIndexerDb(indexerDb);
    }
  }
);

app.get(
  '/api/marketplace-bindings/:bindingId/near-intents/status',
  requireAdminAuth,
  async (req, res) => {
    const indexerDb = await connectIndexerDb(config.databaseUri);
    try {
      const binding = await indexerDb.marketplaceBindings.findOne({
        bindingId: req.params.bindingId,
      });
      if (!binding) {
        res.status(404).json({ error: 'Marketplace binding not found.' });
        return;
      }
      if (!binding.nearIntent) {
        res.status(400).json({ error: 'Binding has no NEAR intent metadata.' });
        return;
      }

      const { status, localStatus } = await getNearIntentExecutionStatus(
        config,
        binding.nearIntent
      );
      const now = new Date();
      const nearIntent = {
        ...binding.nearIntent,
        providerStatusRaw: status.status,
        providerStatusUpdatedAt: now,
      };
      const externalPaymentIntent = {
        provider: 'near-intents' as const,
        intentId: binding.externalPaymentIntent?.intentId || binding.nearIntent.quoteId,
        status: localStatus,
        refundRef: localStatus === 'refunded' ? status.correlationId : binding.externalPaymentIntent?.refundRef,
        updatedAt: now,
      };
      const bindingStatus = nearIntentStatusToBindingStatus(binding, localStatus);

      await indexerDb.marketplaceBindings.updateOne(
        { bindingId: binding.bindingId },
        {
          $set: {
            externalPaymentIntent,
            nearIntent,
            status: bindingStatus,
            updatedAt: now,
          },
        }
      );

      res.json({
        bindingId: binding.bindingId,
        externalPaymentIntent,
        nearIntent,
        status,
      });
    } catch (error) {
      sendNearIntentError(res, error);
    } finally {
      await closeIndexerDb(indexerDb);
    }
  }
);

app.post(
  '/api/marketplace-bindings/:bindingId/near-intents/deposit-tx',
  requireAdminAuth,
  async (req, res) => {
    const indexerDb = await connectIndexerDb(config.databaseUri);
    try {
      const binding = await indexerDb.marketplaceBindings.findOne({
        bindingId: req.params.bindingId,
      });
      if (!binding) {
        res.status(404).json({ error: 'Marketplace binding not found.' });
        return;
      }
      if (!binding.nearIntent) {
        res.status(400).json({ error: 'Binding has no NEAR intent metadata.' });
        return;
      }

      const { result, localStatus } = await submitNearIntentDepositTx(
        config,
        binding.nearIntent,
        req.body || {}
      );
      const now = new Date();
      const nearIntent = {
        ...binding.nearIntent,
        submittedDepositTxHash: req.body?.txHash,
        providerStatusRaw: result.status,
        providerStatusUpdatedAt: now,
      };
      const externalPaymentIntent = {
        provider: 'near-intents' as const,
        intentId: binding.externalPaymentIntent?.intentId || binding.nearIntent.quoteId,
        status: localStatus,
        refundRef: localStatus === 'refunded' ? result.correlationId : binding.externalPaymentIntent?.refundRef,
        updatedAt: now,
      };
      const bindingStatus = nearIntentStatusToBindingStatus(binding, localStatus);

      await indexerDb.marketplaceBindings.updateOne(
        { bindingId: binding.bindingId },
        {
          $set: {
            externalPaymentIntent,
            nearIntent,
            status: bindingStatus,
            updatedAt: now,
          },
        }
      );

      res.json({
        bindingId: binding.bindingId,
        externalPaymentIntent,
        nearIntent,
        result,
      });
    } catch (error) {
      sendNearIntentError(res, error);
    } finally {
      await closeIndexerDb(indexerDb);
    }
  }
);

app.post(
  '/api/marketplace-bindings/:bindingId/near-intents/reconcile',
  requireAdminAuth,
  async (req, res) => {
    const indexerDb = await connectIndexerDb(config.databaseUri);
    try {
      const result = await reconcileMarketplaceBindings(indexerDb, req.params.bindingId);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await closeIndexerDb(indexerDb);
    }
  }
);

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
        stringifyApiError(payload) || response.statusText;
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
