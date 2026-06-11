/**
 * AssetSwapStep.tsx
 *
 * Step 1.5 of the CreateDeal wizard for SCF #42 — Deliverable 6.
 *
 * Shown only when the user picks a source asset OTHER than USDC. Fetches a
 * Soroswap Aggregator quote for `sourceAsset → USDC`, displays the route,
 * price impact, and amounts, and runs the swap when the user confirms.
 *
 * On success, the parent CreateDeal proceeds to the existing review screen
 * with the settlement token forcibly set to USDC.
 */
import { useEffect, useState } from 'react';

import { useSwapThenCreateDeal } from '../hooks/useSwapThenCreateDeal';
import {
  extractRouteProtocols,
  formatPriceImpact,
  stroopsToUnits,
} from '../lib/swapRoute';
import { getExplorerTxLink } from '../lib/stellar';
import { Card, Button } from './ui/Components';
import { ArrowRight, AlertTriangle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

interface Props {
  /** Source asset SAC address (must differ from USDC) */
  sourceAssetAddress: string;
  sourceAssetSymbol: string;
  /** Destination USDC token address */
  usdcAddress: string;
  /** USDC amount the escrow needs (whole units, not stroops) */
  targetUsdcUnits: number;
  /** Connected wallet that pays */
  walletAddress: string;
  signTransaction: (xdr: string, opts?: unknown) => Promise<string>;
  /** Called after the swap tx confirms — parent advances to review */
  onSwapConfirmed: (params: { txHash: string; usdcReceivedUnits: number }) => void;
  onCancel: () => void;
}

export function AssetSwapStep({
  sourceAssetAddress,
  sourceAssetSymbol,
  usdcAddress,
  targetUsdcUnits,
  walletAddress,
  signTransaction,
  onSwapConfirmed,
  onCancel,
}: Props) {
  const swap = useSwapThenCreateDeal();
  const [acceptedHighImpact, setAcceptedHighImpact] = useState(false);

  // ── Fetch a quote on mount + whenever inputs change ──────────────────────
  useEffect(() => {
    swap.reset();
    void swap.getQuote({
        assetIn: sourceAssetAddress,
        assetOutUsdc: usdcAddress,
        targetUsdcUnits,
        sourceAddress: walletAddress,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceAssetAddress, usdcAddress, targetUsdcUnits]);

  const quote = swap.lastQuote;
  const protocols = quote ? extractRouteProtocols(quote) : [];
  const impact = formatPriceImpact(quote?.priceImpact);
  const amountInUnits = quote ? stroopsToUnits(quote.amountIn) : 0;
  const amountOutUnits = quote ? stroopsToUnits(quote.amountOut) : 0;

  const isHighImpact = impact.severity === 'danger';
  const blockingSwap = isHighImpact && !acceptedHighImpact;

  const handleSwap = async () => {
    try {
      const result = await swap.executeSwap({ walletAddress, signTransaction });
      onSwapConfirmed({
        txHash: result.txHash,
        usdcReceivedUnits: stroopsToUnits(result.quote.amountOut),
      });
    } catch {
      /* error surfaced via swap.error */
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (swap.status === 'quoting' && !quote) {
    return (
      <Card className="p-8">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="animate-spin" size={20} />
          <span>Fetching best route across Soroswap, Phoenix, Aqua…</span>
        </div>
      </Card>
    )
  }

  // ── Error state (with retry) ─────────────────────────────────────────────
  if (swap.status === 'error' && !quote) {
    return (
      <Card className="p-8">
        <div className="flex items-start gap-3 text-red-400 mb-4">
          <AlertTriangle size={20} />
          <div>
            <p className="font-bold mb-1">Quote unavailable</p>
            <p className="text-sm text-zinc-400">{swap.error}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() =>
              swap.getQuote({
        assetIn: sourceAssetAddress,
        assetOutUsdc: usdcAddress,
        targetUsdcUnits,
        sourceAddress: walletAddress,
      })
            }
          >
            Retry
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Back
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
          <ShieldCheck size={14} />
          Step 1.5 — Asset Conversion
        </div>
        <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight">
          Swap {sourceAssetSymbol} → USDC before escrow
        </h2>
        <p className="text-zinc-500 text-sm mt-1">
          The DealEscrow contract settles in USDC. We&apos;ll route your {sourceAssetSymbol}{' '}
          through the aggregator before creating the deal.
        </p>
      </div>

      {/* Quote summary */}
      <div className="bg-[#09090b] border border-zinc-800 rounded-2xl p-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1">
              You pay
            </p>
            <p className="font-mono text-xl lg:text-2xl text-white font-bold">
              {amountInUnits.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
              <span className="text-emerald-400">{sourceAssetSymbol}</span>
            </p>
          </div>
          <ArrowRight size={24} className="text-zinc-600 hidden md:block" />
          <div className="md:text-right">
            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-1">
              Escrow receives
            </p>
            <p className="font-mono text-xl lg:text-2xl text-white font-bold">
              {amountOutUnits.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
              <span className="text-emerald-400">USDC</span>
            </p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-zinc-800 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-zinc-500 mb-1.5">Routed via</p>
            <div className="flex flex-wrap gap-1.5">
              {protocols.length > 0 ? (
                protocols.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-md font-bold uppercase tracking-wider"
                  >
                    {p}
                  </span>
                ))
              ) : (
                <span className="text-zinc-600">aggregator</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-zinc-500 mb-1.5">Price impact</p>
            <p
              className={`font-mono font-bold ${
                impact.severity === 'danger'
                  ? 'text-red-400'
                  : impact.severity === 'warn'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {impact.display}
            </p>
          </div>
        </div>
      </div>

      {/* High-impact warning */}
      {isHighImpact && (
        <label className="flex items-start gap-3 bg-red-500/5 border border-red-500/30 rounded-xl p-4 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedHighImpact}
            onChange={(e) => setAcceptedHighImpact(e.target.checked)}
            className="mt-1 accent-red-500"
          />
          <div>
            <p className="text-red-400 font-bold text-sm">
              High price impact ({impact.display})
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              Testnet liquidity is thin for this pair. You may receive significantly less than
              the quoted USDC amount. Check the box to confirm you want to proceed.
            </p>
          </div>
        </label>
      )}

      {/* Swap progress / result */}
      {swap.status === 'swapping' && (
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-5">
          <Loader2 className="animate-spin" size={16} />
          Signing and submitting swap transaction…
        </div>
      )}
      {swap.status === 'confirmed' && swap.lastTxHash && (
        <div className="text-emerald-400 text-sm mb-5">
          ✓ Swap confirmed —{' '}
          <a
            href={getExplorerTxLink(swap.lastTxHash)}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-emerald-300 font-mono"
          >
            {swap.lastTxHash.slice(0, 8)}…
          </a>
        </div>
      )}
      {swap.status === 'error' && quote && (
        <div className="text-red-400 text-sm mb-5">⚠ {swap.error}</div>
      )}

      <div className="flex gap-3">
        <Button
          variant="primary"
          onClick={handleSwap}
          disabled={
            !quote ||
            swap.status === 'swapping' ||
            swap.status === 'confirmed' ||
            blockingSwap
          }
          icon={ArrowRight}
        >
          {swap.status === 'confirmed' ? 'Swap complete' : 'Swap & Continue'}
        </Button>
        <Button
          variant="secondary"
          icon={RefreshCw}
          onClick={() =>
            swap.getQuote({
        assetIn: sourceAssetAddress,
        assetOutUsdc: usdcAddress,
        targetUsdcUnits,
        sourceAddress: walletAddress,
      })
          }
          disabled={swap.status === 'quoting' || swap.status === 'swapping'}
        >
          Re-quote
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={swap.status === 'swapping'}>
          Back
        </Button>
      </div>
    </Card>
  )
}
