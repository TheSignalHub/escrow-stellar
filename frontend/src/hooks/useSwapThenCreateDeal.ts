/**
 * useSwapThenCreateDeal.ts
 *
 * Orchestration hook for SCF #42 — Deliverable 6 (Stellar Broker / multi-asset
 * funding). Chains:
 *   quote → build → sign → submit swap → wait for confirmation
 *
 * The actual `create_deal` contract call is NOT triggered by this hook — the
 * caller (CreateDeal.tsx) keeps its own onCreateDeal flow and just invokes
 * this hook BEFORE create_deal when the source asset differs from the
 * settlement token (USDC). This keeps the create-deal logic identical to
 * Tranche 1 and isolates the swap concern.
 *
 * State machine:
 *   idle ──getQuote()──→ quoting ──→ quoted
 *                                       │
 *                                  executeSwap()
 *                                       ↓
 *                                    swapping ──→ confirmed | error
 */
import { useCallback, useRef, useState } from 'react';

import { stellarBrokerClient, type BrokerQuote } from '../lib/stellarBroker';
import { unitsToStroops } from '../lib/swapRoute';
import { NETWORK_PASSPHRASE } from '../lib/stellar';

export type SwapStatus =
  | 'idle'
  | 'quoting'
  | 'quoted'
  | 'swapping'
  | 'confirmed'
  | 'error';

export interface SwapResult {
  quote: BrokerQuote;
  signedXdr: string;
  txHash: string;
}

export interface UseSwapThenCreateDealReturn {
  status: SwapStatus;
  lastQuote: BrokerQuote | null;
  lastTxHash: string | null;
  error: string;
  /** Fetch a swap quote (assetIn → settlement token, EXACT_OUT on the settlement amount) */
  getQuote: (params: {
    assetIn: string;
    assetOutUsdc: string;
    targetUsdcUnits: number;
    sourceAddress?: string;
  }) => Promise<BrokerQuote>;
  /** Execute the previously fetched quote (build → sign → submit) */
  executeSwap: (params: {
    walletAddress: string;
    signTransaction: (xdr: string, opts?: unknown) => Promise<string>;
  }) => Promise<SwapResult>;
  reset: () => void;
}

export function useSwapThenCreateDeal(): UseSwapThenCreateDealReturn {
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [lastQuote, setLastQuote] = useState<BrokerQuote | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Keep the latest quote in a ref so executeSwap doesn't race against React
  // batching when called immediately after getQuote() resolves.
  const quoteRef = useRef<BrokerQuote | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setLastQuote(null);
    setLastTxHash(null);
    setError('');
    quoteRef.current = null;
  }, []);

  const getQuote = useCallback<UseSwapThenCreateDealReturn['getQuote']>(
    async ({ assetIn, assetOutUsdc, targetUsdcUnits, sourceAddress }) => {
      setStatus('quoting');
      setError('');
      try {
        const amount = unitsToStroops(targetUsdcUnits);
        // EXACT_OUT — we want a specific settlement amount delivered; the router's
        // router_get_amounts_in tells us how much of `assetIn` to spend.
        const quote = await stellarBrokerClient.getQuote(
          assetIn,
          assetOutUsdc,
          amount,
          'EXACT_OUT',
          sourceAddress,
        );
        quoteRef.current = quote;
        setLastQuote(quote);
        setStatus('quoted');
        return quote;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus('error');
        throw err;
      }
    },
    [],
  );

  const executeSwap = useCallback<UseSwapThenCreateDealReturn['executeSwap']>(
    async ({ walletAddress, signTransaction }) => {
      const quote = quoteRef.current;
      if (!quote) {
        const msg = 'No quote available — call getQuote() first';
        setError(msg);
        setStatus('error');
        throw new Error(msg);
      }

      setStatus('swapping');
      setError('');
      try {
        const xdr = await stellarBrokerClient.buildTransaction(quote, walletAddress);
        const signedXdr = await signTransaction(xdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: walletAddress,
        });
        const { txHash } = await stellarBrokerClient.sendTransaction(signedXdr);
        setLastTxHash(txHash);
        setStatus('confirmed');
        return { quote, signedXdr, txHash };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus('error');
        throw err;
      }
    },
    [],
  );

  return {
    status,
    lastQuote,
    lastTxHash,
    error,
    getQuote,
    executeSwap,
    reset,
  };
}
