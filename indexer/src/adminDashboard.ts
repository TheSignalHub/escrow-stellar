import type { Express, NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { IndexerConfig } from './config.js';
import { closeIndexerDb, connectIndexerDb } from './db.js';

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

function safeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function getBasicAuthCredentials(header: string | undefined): { username: string; password: string } {
  if (!header?.startsWith('Basic ')) return { username: '', password: '' };
  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return { username: '', password: '' };
  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    res
      .status(503)
      .type('text')
      .send('Internal admin is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD.');
    return;
  }

  const credentials = getBasicAuthCredentials(req.headers.authorization);
  const isAuthorized =
    safeEqual(credentials.username, expectedUsername) &&
    safeEqual(credentials.password, expectedPassword);

  if (!isAuthorized) {
    res.setHeader('WWW-Authenticate', 'Basic realm="The Signal Internal Admin"');
    res.status(401).type('text').send('Authentication required');
    return;
  }

  next();
}

function getExplorerTxUrl(txHash?: string): string | undefined {
  if (!txHash) return undefined;
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
}

function renderMarketDashboardPage(config: IndexerConfig): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>The Signal Market Dashboard</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #050807;
        --panel: #0c1110;
        --panel-2: #111816;
        --line: #22312d;
        --text: #eef8f3;
        --muted: #8c9994;
        --green: #4ac08b;
        --blue: #6ba4ff;
        --red: #f06c6c;
        --yellow: #f3c76b;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background:
          linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px),
          radial-gradient(circle at 25% 10%, rgba(74,192,139,.12), transparent 32%),
          var(--bg);
        background-size: 44px 44px, 44px 44px, auto, auto;
        color: var(--text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main { max-width: 1220px; margin: 0 auto; padding: 36px 24px 52px; }
      header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 28px; }
      h1 { margin: 0; font-size: 32px; letter-spacing: 0; }
      .sub { color: var(--muted); margin-top: 8px; font-size: 15px; }
      .actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
      button, a.button {
        appearance: none;
        border: 1px solid var(--line);
        background: var(--panel-2);
        color: var(--text);
        min-height: 42px;
        padding: 0 14px;
        border-radius: 8px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      button.primary { background: var(--green); border-color: var(--green); color: #06110c; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
      .panel {
        background: rgba(12, 17, 16, .88);
        border: 1px solid var(--line);
        border-radius: 8px;
        box-shadow: 0 12px 40px rgba(0,0,0,.22);
      }
      .stat { padding: 18px; min-height: 108px; }
      .label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; font-weight: 800; }
      .value { font-size: 26px; font-weight: 850; margin-top: 10px; overflow-wrap: anywhere; }
      .ok { color: var(--green); }
      .error { color: var(--red); }
      .running { color: var(--yellow); }
      .section { padding: 18px; margin-top: 16px; }
      .section h2 { margin: 0 0 14px; font-size: 18px; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; color: var(--muted); font-size: 14px; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; overflow-wrap: anywhere; }
      table { width: 100%; border-collapse: collapse; font-size: 14px; }
      th, td { padding: 12px 10px; text-align: left; border-top: 1px solid var(--line); vertical-align: top; }
      th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
      .pill { display: inline-flex; align-items: center; min-height: 24px; padding: 0 9px; border-radius: 999px; background: #17211f; color: var(--green); font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
      .pill.funded { color: var(--blue); }
      .pill.dispute, .pill.refund { color: var(--red); }
      .pill.released, .pill.done, .pill.resolved { color: var(--green); }
      .pill.shadow { color: var(--yellow); }
      .empty { color: var(--muted); padding: 22px 10px; border-top: 1px solid var(--line); }
      a { color: var(--green); }
      .footer { margin-top: 18px; color: var(--muted); font-size: 13px; }
      @media (max-width: 860px) {
        header { display: block; }
        .actions { justify-content: flex-start; margin-top: 16px; }
        .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .meta { grid-template-columns: 1fr; }
        table { display: block; overflow-x: auto; white-space: nowrap; }
      }
      @media (max-width: 560px) {
        main { padding: 24px 14px 40px; }
        .grid { grid-template-columns: 1fr; }
        h1 { font-size: 26px; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Market Dashboard</h1>
          <div class="sub">Read-only Soroban DealEscrow events synchronized into MongoDB for the Tranche 2 testnet demo.</div>
        </div>
        <div class="actions">
          <button id="refresh">Refresh</button>
        </div>
      </header>

      <section class="grid" id="stats"></section>

      <section class="panel section">
        <h2>Watched Contract</h2>
        <div class="meta">
          <div><span class="label">Network</span><div id="network">${escapeHtml(config.network)}</div></div>
          <div><span class="label">RPC</span><div class="mono">${escapeHtml(config.rpcUrl)}</div></div>
          <div><span class="label">Contract</span><div class="mono">${escapeHtml(config.contractAddress)}</div></div>
          <div><span class="label">Database</span><div>escrow-transfers / stellar-indexer-state</div></div>
        </div>
      </section>

      <section class="panel section">
        <h2>Deal State Summary</h2>
        <div id="deals"></div>
      </section>

      <section class="panel section">
        <h2>Shadow Marketplace Bindings</h2>
        <div id="bindings"></div>
      </section>

      <section class="panel section">
        <h2>Recent Soroban Events</h2>
        <div id="events"></div>
      </section>

      <div class="footer" id="lastUpdated"></div>
    </main>
    <script>
      const fmt = new Intl.NumberFormat('en-US');
      const statusClass = (value) => value === 'error' ? 'error' : value === 'running' ? 'running' : 'ok';
      const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
      const explorer = (tx) => tx ? 'https://stellar.expert/explorer/testnet/tx/' + tx : undefined;

      function stat(label, value, cls = '') {
        return '<div class="panel stat"><div class="label">' + label + '</div><div class="value ' + cls + '">' + escapeHtml(value) + '</div></div>';
      }

      function renderDeals(deals) {
        if (!deals.length) return '<div class="empty">No indexed deals yet. Create/fund/release a testnet deal, then run or wait for the indexer.</div>';
        return '<table><thead><tr><th>Deal</th><th>Last Event</th><th>Milestones Seen</th><th>Events</th><th>Latest Ledger</th></tr></thead><tbody>' +
          deals.map((deal) => '<tr><td class="mono">#' + escapeHtml(deal.dealId) + '</td><td><span class="pill ' + escapeHtml(deal.lastEvent) + '">' + escapeHtml(deal.lastEvent) + '</span></td><td>' + fmt.format(deal.milestonesSeen || 0) + '</td><td>' + fmt.format(deal.eventCount || 0) + '</td><td class="mono">' + fmt.format(deal.latestLedger || 0) + '</td></tr>').join('') +
          '</tbody></table>';
      }

      function renderBindings(bindings) {
        if (!bindings.length) return '<div class="empty">No marketplace shadow bindings seeded yet.</div>';
        return '<table><thead><tr><th>Marketplace</th><th>External Deal</th><th>Mode</th><th>Soroban Deal</th><th>Status</th><th>Milestones</th><th>Last Event</th></tr></thead><tbody>' +
          bindings.map((binding) => '<tr><td>' + escapeHtml(binding.externalMarketplaceId) + '</td><td class="mono">' + escapeHtml(binding.externalDealId) + '</td><td><span class="pill shadow">' + escapeHtml(binding.bindingMode) + '</span></td><td class="mono">#' + escapeHtml(binding.sorobanDealId) + '</td><td><span class="pill ' + escapeHtml(binding.status) + '">' + escapeHtml(binding.status) + '</span></td><td>' + fmt.format(binding.milestoneCount || 0) + '</td><td class="mono">' + escapeHtml(binding.lastIndexedEventId || '-') + '</td></tr>').join('') +
          '</tbody></table>';
      }

      function renderEvents(events) {
        if (!events.length) return '<div class="empty">No escrow events indexed yet.</div>';
        return '<table><thead><tr><th>Event</th><th>Deal</th><th>Milestone</th><th>Amount</th><th>Ledger</th><th>Tx</th></tr></thead><tbody>' +
          events.map((event) => {
            const url = explorer(event.onchainTxHash);
            return '<tr><td><span class="pill ' + escapeHtml(event.sorobanEventTopic) + '">' + escapeHtml(event.sorobanEventTopic) + '</span></td><td class="mono">' + escapeHtml(event.sorobanDealId ?? '-') + '</td><td>' + escapeHtml(event.sorobanMilestoneIdx ?? '-') + '</td><td>' + fmt.format(event.amount || 0) + '</td><td class="mono">' + fmt.format(event.sorobanLedgerSeq || 0) + '</td><td class="mono">' + (url ? '<a href="' + url + '" target="_blank" rel="noreferrer">' + escapeHtml(String(event.onchainTxHash).slice(0, 10)) + '...</a>' : '-') + '</td></tr>';
          }).join('') +
          '</tbody></table>';
      }

      async function load() {
        const response = await fetch('/api/market-dashboard/summary', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load dashboard');
        const state = data.state || {};
        document.getElementById('stats').innerHTML =
          stat('Status', state.lastTickStatus || 'idle', statusClass(state.lastTickStatus)) +
          stat('Last Ledger', state.lastSeenLedger ? fmt.format(state.lastSeenLedger) : '-') +
          stat('Events Indexed', fmt.format(state.totalEventsProcessed || 0)) +
          stat('Last Tick', state.lastTickAt ? new Date(state.lastTickAt).toLocaleString() : '-');
        document.getElementById('deals').innerHTML = renderDeals(data.deals || []);
        document.getElementById('bindings').innerHTML = renderBindings(data.marketplaceBindings || []);
        document.getElementById('events').innerHTML = renderEvents(data.recentEvents || []);
        document.getElementById('lastUpdated').textContent = 'Last refreshed ' + new Date().toLocaleString();
      }

      document.getElementById('refresh').addEventListener('click', load);
      load().catch((error) => {
        document.getElementById('stats').innerHTML = stat('Dashboard Error', error.message, 'error');
      });
    </script>
  </body>
</html>`;
}

function renderInternalAdminPlaceholder(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>The Signal Internal Admin</title>
    <style>
      :root { color-scheme: dark; --bg: #050807; --panel: #0c1110; --line: #22312d; --text: #eef8f3; --muted: #8c9994; --green: #4ac08b; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { width: min(720px, calc(100vw - 32px)); border: 1px solid var(--line); border-radius: 8px; background: var(--panel); padding: 28px; }
      h1 { margin: 0; font-size: 26px; letter-spacing: 0; }
      p { color: var(--muted); line-height: 1.6; }
      a { color: var(--green); font-weight: 800; }
      button { appearance: none; border: 1px solid var(--green); background: var(--green); color: #06110c; min-height: 42px; padding: 0 14px; border-radius: 8px; font-weight: 800; cursor: pointer; }
      pre { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--muted); }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: var(--text); }
    </style>
  </head>
  <body>
    <main>
      <h1>Internal Admin</h1>
      <p>This path is reserved for future operational workflows such as open deal monitoring, dispute queues, action-required reviews, and refund resolution.</p>
      <p>The current Tranche 2 read-only event dashboard is available at <a href="/market_dashboard"><code>/market_dashboard</code></a>.</p>
      <p><button id="run-indexer">Run Indexer Once</button></p>
      <pre id="result"></pre>
    </main>
    <script>
      document.getElementById('run-indexer').addEventListener('click', async () => {
        const result = document.getElementById('result');
        result.textContent = 'Running...';
        try {
          const response = await fetch('/api/indexer/run-once', { method: 'POST' });
          const data = await response.json();
          result.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
          result.textContent = error.message;
        }
      });
    </script>
  </body>
</html>`;
}

async function withIndexerDb<T>(
  config: IndexerConfig,
  res: Response,
  handler: (db: Awaited<ReturnType<typeof connectIndexerDb>>) => Promise<T>
): Promise<void> {
  const indexerDb = await connectIndexerDb(config.databaseUri);
  try {
    const result = await handler(indexerDb);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  } finally {
    await closeIndexerDb(indexerDb);
  }
}

export function registerAdminDashboard(app: Express, config: IndexerConfig): void {
  app.get('/admin', requireAdminAuth, (_req: Request, res: Response) => {
    res.type('html').send(renderInternalAdminPlaceholder());
  });

  app.get('/market_dashboard', (_req: Request, res: Response) => {
    res.type('html').send(renderMarketDashboardPage(config));
  });

  app.get('/api/market-dashboard/summary', async (_req: Request, res: Response) => {
    await withIndexerDb(config, res, async (indexerDb) => {
      const [state, recentEvents, countsByTopic, deals, marketplaceBindings] = await Promise.all([
        indexerDb.state.findOne({ contractAddress: config.contractAddress, network: config.network }),
        indexerDb.transfers
          .find({ sorobanContractAddress: config.contractAddress })
          .sort({ sorobanLedgerSeq: -1, updatedAt: -1 })
          .limit(50)
          .toArray(),
        indexerDb.transfers
          .aggregate([
            { $match: { sorobanContractAddress: config.contractAddress } },
            { $group: { _id: '$sorobanEventTopic', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
          .toArray(),
        indexerDb.transfers
          .aggregate([
            {
              $match: {
                sorobanContractAddress: config.contractAddress,
                sorobanDealId: { $ne: null },
              },
            },
            { $sort: { sorobanLedgerSeq: 1, updatedAt: 1 } },
            {
              $group: {
                _id: '$sorobanDealId',
                eventCount: { $sum: 1 },
                milestones: { $addToSet: '$sorobanMilestoneIdx' },
                lastEvent: { $last: '$sorobanEventTopic' },
                latestLedger: { $max: '$sorobanLedgerSeq' },
              },
            },
            { $sort: { latestLedger: -1 } },
            { $limit: 25 },
          ])
          .toArray(),
        indexerDb.marketplaceBindings
          .find({ sorobanContractAddress: config.contractAddress, network: config.network })
          .sort({ updatedAt: -1 })
          .limit(25)
          .toArray(),
      ]);

      return {
        state,
        countsByTopic,
        deals: deals.map((deal) => ({
          dealId: deal._id,
          eventCount: deal.eventCount,
          milestonesSeen: (deal.milestones || []).filter((value: unknown) => value !== null).length,
          lastEvent: deal.lastEvent,
          latestLedger: deal.latestLedger,
        })),
        marketplaceBindings: marketplaceBindings.map((binding) => ({
          bindingId: binding.bindingId,
          bindingMode: binding.bindingMode,
          externalMarketplaceId: binding.externalMarketplaceId,
          externalDealId: binding.externalDealId,
          sorobanDealId: binding.sorobanDealId,
          status: binding.status,
          milestoneCount: binding.milestoneMap.length,
          lastIndexedEventId: binding.lastIndexedEventId,
          updatedAt: binding.updatedAt,
        })),
        recentEvents: recentEvents.map((event) => ({
          ...event,
          explorerTxUrl: getExplorerTxUrl(event.onchainTxHash),
        })),
        generatedAt: new Date(),
      };
    });
  });

  app.get('/api/market-dashboard/indexer-state', async (_req: Request, res: Response) => {
    await withIndexerDb(config, res, async (indexerDb) =>
      indexerDb.state.findOne({ contractAddress: config.contractAddress, network: config.network })
    );
  });

  app.get('/api/market-dashboard/escrow-events', async (req: Request, res: Response) => {
    const rawLimit = Number.parseInt(String(req.query.limit || '50'), 10);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 200);
    await withIndexerDb(config, res, async (indexerDb) =>
      indexerDb.transfers
        .find({ sorobanContractAddress: config.contractAddress })
        .sort({ sorobanLedgerSeq: -1, updatedAt: -1 })
        .limit(limit)
        .toArray()
    );
  });
}
