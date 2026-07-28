import { AlertCircle, Copy, ShieldCheck } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useToast } from '../App';
import { accountExists, IS_TESTNET } from '../lib/stellar';
import { Card } from './ui/Components';

interface WalletPrepOverviewProps {
  stellarAddress: string;
  xlmBalance?: string;
  children?: ReactNode;
}

function truncateStellar(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function WalletPrepOverview({ stellarAddress, xlmBalance, children }: WalletPrepOverviewProps) {
  const toast = useToast();
  const [stellarAccountExists, setStellarAccountExists] = useState<boolean | null>(null);

  const copyAddress = async (label: string, address?: string) => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast(`${label} copied`, 'success');
  };

  useEffect(() => {
    let cancelled = false;
    if (!stellarAddress) {
      setStellarAccountExists(null);
      return;
    }

    accountExists(stellarAddress).then((exists) => {
      if (!cancelled) setStellarAccountExists(exists);
    });

    return () => {
      cancelled = true;
    };
  }, [stellarAddress]);

  return (
    <Card className="p-4 sm:p-6 bg-[#02040a]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Your Wallets</h3>
            <p className="mt-1 text-xs text-zinc-500">Top up and manage the connected Stellar wallet before funding escrow.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg border border-emerald-500/30 bg-black/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-emerald-100">Stellar escrow wallet</p>
                  <p className="mt-1 font-mono text-sm text-emerald-300 truncate">{truncateStellar(stellarAddress)}</p>
                  <p className="mt-2 text-xs leading-relaxed text-emerald-100/70">
                    Used for Fund Deal, releases, disputes, and receiving Stellar settlement assets.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyAddress('Stellar wallet', stellarAddress)}
                className="h-8 w-8 rounded-lg border border-emerald-500/20 bg-black/30 text-emerald-300 hover:border-emerald-400/50 flex items-center justify-center shrink-0"
                title="Copy Stellar wallet"
              >
                <Copy size={14} />
              </button>
            </div>
            <div className="mt-3 rounded-lg border border-emerald-500/10 bg-black/20 px-3 py-2 text-xs font-mono text-emerald-100/80">
              {xlmBalance ? `${parseFloat(xlmBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM` : 'Balance loading'}
            </div>
            {!IS_TESTNET && stellarAccountExists === false && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100/80">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-300" />
                  <span>
                    Activate this Stellar wallet before using escrow, swaps, or NEAR Intents. Send at least the network minimum XLM reserve to this address from an exchange, treasury, or sponsor wallet.
                  </span>
                </div>
              </div>
            )}
          </div>

          {children}
        </div>
      </div>
    </Card>
  );
}
