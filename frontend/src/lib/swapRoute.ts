/**
 * swapRoute.ts — helpers for surfacing Stellar Broker routing info.
 * The testnet demo currently receives route metadata from the seeded Soroswap
 * adapter, but the UI can render multiple broker liquidity sources when they
 * are present.
 */
import type { BrokerQuote } from './stellarBroker';

const PROTOCOL_LABELS: Record<string, string> = {
  soroswap: 'Soroswap',
  phoenix: 'Phoenix',
  aqua: 'Aqua',
  aquarius: 'Aquarius',
  classic: 'Stellar DEX',
  sdex: 'Stellar DEX',
};

/**
 * Extract the unique set of liquidity protocols used by the aggregator for
 * this quote. The Soroswap API returns the route shape as an array of legs,
 * each with `protocol` (or `path[*].protocol`). We dedupe + pretty-print.
 */
export function extractRouteProtocols(quote: BrokerQuote): string[] {
  const protocols = new Set<string>();

  const harvest = (value: unknown) => {
    if (!value) return;
    if (typeof value === 'string') {
      protocols.add(value.toLowerCase());
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) harvest(item);
      return;
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.protocol === 'string') protocols.add(obj.protocol.toLowerCase());
      if (obj.path) harvest(obj.path);
      if (obj.protocols) harvest(obj.protocols);
      if (obj.route) harvest(obj.route);
    }
  };

  harvest(quote.route);
  harvest((quote.rawQuote as { protocols?: unknown })?.protocols);
  harvest((quote.rawQuote as { route?: unknown })?.route);

  return Array.from(protocols)
    .map((p) => PROTOCOL_LABELS[p] || titleCase(p))
    .filter((p, i, arr) => arr.indexOf(p) === i);
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Stroop conversion (Stellar's 7-decimal precision). Soroswap amounts are in
 * stroops as decimal strings. Convert to whole-unit display number for the UI.
 */
const STROOPS_PER_UNIT = 10_000_000;
export function stroopsToUnits(stroops: string): number {
  if (!stroops) return 0;
  const big = BigInt(stroops);
  const whole = big / BigInt(STROOPS_PER_UNIT);
  const remainder = big % BigInt(STROOPS_PER_UNIT);
  return Number(whole) + Number(remainder) / STROOPS_PER_UNIT;
}

export function unitsToStroops(units: number | string): string {
  const n = typeof units === 'string' ? Number(units) : units;
  return BigInt(Math.round(n * STROOPS_PER_UNIT)).toString();
}

/**
 * priceImpact comes back as a decimal string (e.g. "0.012" = 1.2%). Convert
 * to a basis-point-friendly percentage for the UI.
 */
export function formatPriceImpact(impact: string | undefined): {
  pct: number;
  display: string;
  severity: 'ok' | 'warn' | 'danger';
} {
  if (!impact) return { pct: 0, display: '~0%', severity: 'ok' };
  const pct = parseFloat(impact) * 100;
  const display = pct < 0.01 ? '<0.01%' : `${pct.toFixed(2)}%`;
  const severity: 'ok' | 'warn' | 'danger' =
    pct >= 5 ? 'danger' : pct >= 1 ? 'warn' : 'ok';
  return { pct, display, severity };
}
