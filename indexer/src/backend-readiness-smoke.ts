type CheckStatus = 'pass' | 'warn' | 'fail' | 'blocked' | 'skip';

interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
}

interface HttpResult<T = unknown> {
  status: number;
  ok: boolean;
  body: T;
}

interface Readiness {
  enabled?: boolean;
  liveExecutionEnabled?: boolean;
  configured?: {
    jwt?: boolean;
    stellarDestinationAsset?: boolean;
    defaultStellarDestinationAsset?: boolean;
    stellarDestinationAssetAllowlist?: boolean;
    defaultRefundAccount?: boolean;
  };
  destinationAssets?: {
    default?: string;
    allowlist?: string[];
  };
}

interface DashboardSummary {
  state?: {
    enabled?: boolean;
    lastTickStatus?: string;
    totalEventsProcessed?: number;
    lastError?: string | null;
  };
  countsByTopic?: Array<{ _id: string; count: number }>;
  marketplaceBindings?: unknown[];
}

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict') || process.env.BACKEND_SMOKE_STRICT === 'true';
const includeTokens = args.has('--tokens') || process.env.BACKEND_SMOKE_TOKENS === 'true';
const includeQuote = args.has('--quote') || process.env.BACKEND_SMOKE_QUOTE === 'true';
const includeIndexerTick =
  args.has('--run-indexer') || process.env.BACKEND_SMOKE_RUN_INDEXER === 'true';
const jsonOutput = args.has('--json') || process.env.BACKEND_SMOKE_JSON === 'true';

const baseUrl = normalizeBaseUrl(
  readArg('--base-url') || process.env.BACKEND_BASE_URL || 'http://localhost:3000'
);
const bindingId =
  readArg('--binding-id') || process.env.BACKEND_SMOKE_BINDING_ID || 'mb_sig-demo-001';
const adminUsername = process.env.BACKEND_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
const adminPassword = process.env.BACKEND_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

const checks: Check[] = [];

function readArg(name: string): string | undefined {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function basicAuthHeader(): Record<string, string> | undefined {
  if (!adminUsername || !adminPassword) return undefined;
  const token = Buffer.from(`${adminUsername}:${adminPassword}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

function addCheck(status: CheckStatus, name: string, detail: string): void {
  checks.push({ status, name, detail });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 20_000
): Promise<HttpResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
    });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    return { status: response.status, ok: response.ok, body: body as T };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkHealth(): Promise<void> {
  try {
    const result = await request('/health');
    const body = asRecord(result.body);
    if (!result.ok || body.ok !== true) {
      addCheck('fail', 'backend health', `Expected ok health JSON, got HTTP ${result.status}.`);
      return;
    }
    addCheck(
      'pass',
      'backend health',
      `Service=${String(body.service || 'unknown')} network=${String(body.network || 'unknown')}.`
    );
  } catch (error) {
    addCheck('fail', 'backend health', error instanceof Error ? error.message : String(error));
  }
}

async function checkNearReadiness(): Promise<Readiness | undefined> {
  try {
    const result = await request<Readiness>('/api/near-intents/readiness');
    if (!result.ok) {
      addCheck('fail', 'NEAR readiness route', `HTTP ${result.status}.`);
      return undefined;
    }

    const readiness = result.body;
    addCheck('pass', 'NEAR readiness route', 'Readiness endpoint returned JSON.');

    const configured = readiness.configured || {};
    const hasDestinationAsset = Boolean(
      configured.stellarDestinationAsset ||
        configured.defaultStellarDestinationAsset ||
        configured.stellarDestinationAssetAllowlist ||
        readiness.destinationAssets?.default ||
        (readiness.destinationAssets?.allowlist || []).length > 0
    );
    if (!readiness.enabled) {
      addCheck('blocked', 'NEAR enabled', 'NEAR_INTENTS_ENABLED is false.');
    } else {
      addCheck('pass', 'NEAR enabled', 'NEAR_INTENTS_ENABLED is true.');
    }

    const missing = [
      configured.jwt ? undefined : 'JWT',
      hasDestinationAsset ? undefined : 'Stellar destination asset allowlist/default',
      configured.defaultRefundAccount ? undefined : 'default refund account',
    ].filter(Boolean);
    if (missing.length > 0) {
      addCheck('blocked', 'NEAR env config', `Missing ${missing.join(', ')}.`);
    } else {
      addCheck('pass', 'NEAR env config', 'JWT, destination asset config, and refund account are present.');
    }

    if (readiness.liveExecutionEnabled) {
      addCheck('warn', 'NEAR live execution', 'Live execution is enabled. Confirm tiny-amount QA approval.');
    } else {
      addCheck('pass', 'NEAR live execution', 'Live execution is disabled; dry quote path is expected.');
    }

    return readiness;
  } catch (error) {
    addCheck('fail', 'NEAR readiness route', error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

async function checkDashboardSummary(): Promise<DashboardSummary | undefined> {
  try {
    const result = await request<DashboardSummary>('/api/market-dashboard/summary');
    if (!result.ok) {
      addCheck('fail', 'dashboard summary', `HTTP ${result.status}.`);
      return undefined;
    }

    const summary = result.body;
    const state = summary.state || {};
    if (state.enabled && state.lastTickStatus === 'ok') {
      addCheck(
        'pass',
        'indexer state',
        `enabled=true lastTickStatus=ok totalEvents=${state.totalEventsProcessed ?? 0}.`
      );
    } else {
      addCheck(
        'warn',
        'indexer state',
        `enabled=${String(state.enabled)} lastTickStatus=${String(state.lastTickStatus)} lastError=${String(
          state.lastError || ''
        )}.`
      );
    }

    const counts = new Map((summary.countsByTopic || []).map((row) => [row._id, row.count]));
    if ((state.totalEventsProcessed || 0) > 0) {
      addCheck('pass', 'escrow events', `Indexed ${state.totalEventsProcessed} total events.`);
    } else {
      addCheck('blocked', 'escrow events', 'No indexed escrow events found.');
    }

    if ((counts.get('dispute') || 0) > 0) {
      addCheck('pass', 'dispute evidence', `Indexed dispute events=${counts.get('dispute')}.`);
    } else {
      addCheck('blocked', 'dispute evidence', 'No indexed dispute event found in dashboard summary.');
    }

    const bindingCount = summary.marketplaceBindings?.length || 0;
    if (bindingCount > 0) {
      addCheck('pass', 'shadow bindings', `Dashboard summary includes ${bindingCount} binding(s).`);
    } else {
      addCheck('blocked', 'shadow bindings', 'No marketplace bindings in dashboard summary.');
    }

    return summary;
  } catch (error) {
    addCheck('fail', 'dashboard summary', error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

async function checkAdminBinding(): Promise<void> {
  const headers = basicAuthHeader();
  if (!headers) {
    addCheck('skip', 'protected binding lookup', 'ADMIN_USERNAME/ADMIN_PASSWORD not provided.');
    return;
  }

  try {
    const result = await request(`/api/marketplace-bindings/${encodeURIComponent(bindingId)}`, {
      headers,
    });
    if (!result.ok) {
      addCheck('blocked', 'protected binding lookup', `Binding ${bindingId} returned HTTP ${result.status}.`);
      return;
    }
    const binding = asRecord(result.body);
    addCheck(
      'pass',
      'protected binding lookup',
      `Found ${String(binding.bindingId)} status=${String(binding.status)}.`
    );

    const events = await request<{ events?: unknown[] }>(
      `/api/marketplace-bindings/${encodeURIComponent(bindingId)}/events`,
      { headers }
    );
    if (events.ok) {
      addCheck(
        'pass',
        'binding event lookup',
        `Mapped binding events=${events.body.events?.length || 0}.`
      );
    } else {
      addCheck('warn', 'binding event lookup', `HTTP ${events.status}.`);
    }
  } catch (error) {
    addCheck('fail', 'protected binding lookup', error instanceof Error ? error.message : String(error));
  }
}

async function checkNearTokens(readiness: Readiness | undefined): Promise<void> {
  const headers = basicAuthHeader();
  if (!includeTokens) {
    addCheck('skip', 'NEAR token discovery', 'Use --tokens or BACKEND_SMOKE_TOKENS=true.');
    return;
  }
  if (!headers) {
    addCheck('blocked', 'NEAR token discovery', 'ADMIN_USERNAME/ADMIN_PASSWORD not provided.');
    return;
  }
  if (!readiness?.enabled) {
    addCheck('blocked', 'NEAR token discovery', 'NEAR Intents is disabled.');
    return;
  }

  try {
    const result = await request<{ tokens?: unknown[] }>('/api/near-intents/tokens', { headers });
    if (!result.ok) {
      addCheck('blocked', 'NEAR token discovery', `HTTP ${result.status}: ${JSON.stringify(result.body)}`);
      return;
    }
    addCheck('pass', 'NEAR token discovery', `Tokens returned=${result.body.tokens?.length || 0}.`);
  } catch (error) {
    addCheck('fail', 'NEAR token discovery', error instanceof Error ? error.message : String(error));
  }
}

async function checkNearDryQuote(readiness: Readiness | undefined): Promise<void> {
  const headers = basicAuthHeader();
  if (!includeQuote) {
    addCheck('skip', 'NEAR dry quote', 'Use --quote or BACKEND_SMOKE_QUOTE=true.');
    return;
  }
  if (!headers) {
    addCheck('blocked', 'NEAR dry quote', 'ADMIN_USERNAME/ADMIN_PASSWORD not provided.');
    return;
  }
  if (!readiness?.enabled) {
    addCheck('blocked', 'NEAR dry quote', 'NEAR Intents is disabled.');
    return;
  }

  const originAsset = process.env.NEAR_SMOKE_ORIGIN_ASSET;
  const amount = process.env.NEAR_SMOKE_AMOUNT;
  if (!originAsset || !amount) {
    addCheck(
      'blocked',
      'NEAR dry quote',
      'NEAR_SMOKE_ORIGIN_ASSET and NEAR_SMOKE_AMOUNT are required for quote smoke.'
    );
    return;
  }

  const body = {
    dry: true,
    originAsset,
    destinationAsset: process.env.NEAR_SMOKE_DESTINATION_ASSET,
    amount,
    refundTo: process.env.NEAR_SMOKE_REFUND_TO,
    recipient: process.env.NEAR_SMOKE_RECIPIENT,
    slippageTolerance: process.env.NEAR_SMOKE_SLIPPAGE_BPS
      ? Number(process.env.NEAR_SMOKE_SLIPPAGE_BPS)
      : undefined,
  };

  try {
    const result = await request(
      `/api/marketplace-bindings/${encodeURIComponent(bindingId)}/near-intents/quote`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      },
      45_000
    );
    if (!result.ok) {
      addCheck('blocked', 'NEAR dry quote', `HTTP ${result.status}: ${JSON.stringify(result.body)}`);
      return;
    }
    const payload = asRecord(result.body);
    const nearIntent = asRecord(payload.nearIntent);
    addCheck('pass', 'NEAR dry quote', `Quote stored quoteId=${String(nearIntent.quoteId || 'unknown')}.`);
  } catch (error) {
    addCheck('fail', 'NEAR dry quote', error instanceof Error ? error.message : String(error));
  }
}

async function runProtectedIndexerTick(): Promise<void> {
  const headers = basicAuthHeader();
  if (!includeIndexerTick) {
    addCheck('skip', 'protected indexer tick', 'Use --run-indexer or BACKEND_SMOKE_RUN_INDEXER=true.');
    return;
  }
  if (!headers) {
    addCheck('blocked', 'protected indexer tick', 'ADMIN_USERNAME/ADMIN_PASSWORD not provided.');
    return;
  }

  try {
    const result = await request('/api/indexer/run-once', {
      method: 'POST',
      headers,
    });
    if (!result.ok) {
      addCheck('blocked', 'protected indexer tick', `HTTP ${result.status}: ${JSON.stringify(result.body)}`);
      return;
    }
    const body = asRecord(result.body);
    addCheck(
      'pass',
      'protected indexer tick',
      `fetched=${String(body.fetched)} parsed=${String(body.parsed)} inserted=${String(body.inserted)}.`
    );
  } catch (error) {
    addCheck('fail', 'protected indexer tick', error instanceof Error ? error.message : String(error));
  }
}

function printReport(): void {
  if (jsonOutput) {
    console.log(JSON.stringify({ baseUrl, bindingId, strict, checks }, null, 2));
    return;
  }

  console.log(`Backend readiness smoke: ${baseUrl}`);
  console.log(`Binding: ${bindingId}`);
  console.log('');
  for (const check of checks) {
    console.log(`${check.status.toUpperCase().padEnd(7)} ${check.name} - ${check.detail}`);
  }
}

function exitCode(): number {
  if (checks.some((check) => check.status === 'fail')) return 1;
  if (strict && checks.some((check) => check.status === 'warn' || check.status === 'blocked')) {
    return 1;
  }
  return 0;
}

const readiness = await checkNearReadiness();
await checkHealth();
await checkDashboardSummary();
await checkAdminBinding();
await checkNearTokens(readiness);
await checkNearDryQuote(readiness);
await runProtectedIndexerTick();

printReport();
process.exitCode = exitCode();
