import { Buffer } from 'node:buffer';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const baseUrl = (process.env.BACKEND_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const bindingId = process.env.MARKETPLACE_BINDING_ID || 'mb_sig-demo-001';
const adminUsername = process.env.BACKEND_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
const adminPassword = process.env.BACKEND_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
const depositTxHash = process.env.NEAR_INTENTS_SHAPE_TX_HASH;

function authHeaders(): Record<string, string> {
  if (!adminUsername || !adminPassword) {
    throw new Error('Set ADMIN_USERNAME/ADMIN_PASSWORD or BACKEND_ADMIN_USERNAME/BACKEND_ADMIN_PASSWORD before checking protected NEAR response shapes.');
  }
  return {
    Authorization: `Basic ${Buffer.from(`${adminUsername}:${adminPassword}`).toString('base64')}`,
  };
}

function describe(value: JsonValue, indent = ''): string[] {
  if (value === null) return [`${indent}<null>`];
  if (Array.isArray(value)) {
    if (!value.length) return [`${indent}<array empty>`];
    return [`${indent}<array>`].concat(describe(value[0], `${indent}  `));
  }
  if (typeof value !== 'object') return [`${indent}<${typeof value}>`];

  return Object.entries(value).flatMap(([key, child]) => {
    const type = Array.isArray(child) ? 'array' : child === null ? 'null' : typeof child;
    const line = `${indent}${key}: ${type}`;
    if (child && typeof child === 'object') return [line, ...describe(child, `${indent}  `)];
    return [line];
  });
}

async function readJson(path: string, init?: RequestInit): Promise<JsonValue> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${init?.method || 'GET'} ${path} returned ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function main() {
  console.log(`NEAR Intents shape check`);
  console.log(`Backend: ${baseUrl}`);
  console.log(`Binding: ${bindingId}`);

  const statusPayload = await readJson(`/api/marketplace-bindings/${encodeURIComponent(bindingId)}/near-intents/status`);
  console.log('\nGET /near-intents/status shape');
  console.log(describe(statusPayload).join('\n'));

  if (!depositTxHash) {
    console.log('\nPOST /near-intents/deposit-tx shape skipped: set NEAR_INTENTS_SHAPE_TX_HASH to inspect a real submitted source tx response.');
    return;
  }

  const depositPayload = await readJson(`/api/marketplace-bindings/${encodeURIComponent(bindingId)}/near-intents/deposit-tx`, {
    method: 'POST',
    body: JSON.stringify({ txHash: depositTxHash }),
  });
  console.log('\nPOST /near-intents/deposit-tx shape');
  console.log(describe(depositPayload).join('\n'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
