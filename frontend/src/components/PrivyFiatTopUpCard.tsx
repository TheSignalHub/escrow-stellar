import { useMemo, useState } from 'react';
import { CreditCard, Loader2, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCreateWallet, useFiatOnramp, usePrivy, useWallets } from '@privy-io/react-auth';
import type { Wallet as PrivyWallet } from '@privy-io/react-auth';
import { useToast } from '../App';
import {
  PRIVY_FIAT_ONRAMP_DEFAULT_AMOUNT,
  PRIVY_FIAT_ONRAMP_DEFAULT_SOURCE_ASSET,
  PRIVY_FIAT_ONRAMP_DESTINATION_ASSET,
  PRIVY_FIAT_ONRAMP_DESTINATION_CHAIN,
  PRIVY_FIAT_ONRAMP_ENABLED,
  PRIVY_FIAT_ONRAMP_ENVIRONMENT,
  PRIVY_FIAT_ONRAMP_SOURCE_ASSETS,
  findEmbeddedEvmWallet,
  onrampChainLabel,
  shortOnrampAddress,
} from '../lib/privyOnramp';
import { Button, Card, Tag } from './ui/Components';

export function PrivyFiatTopUpCard() {
  const toast = useToast();
  const { authenticated } = usePrivy();
  const { wallets, ready } = useWallets();
  const { createWallet } = useCreateWallet();
  const { fund } = useFiatOnramp();
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [funding, setFunding] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitted' | 'confirmed'>('idle');
  const [error, setError] = useState('');

  const destinationWallet = useMemo(
    () => findEmbeddedEvmWallet(wallets as Array<{ address: string; walletClientType?: string }>),
    [wallets]
  );

  const canStart = PRIVY_FIAT_ONRAMP_ENABLED && authenticated && ready;
  const destinationLabel = onrampChainLabel(PRIVY_FIAT_ONRAMP_DESTINATION_CHAIN);

  const ensureDestinationWallet = async (): Promise<string> => {
    if (destinationWallet?.address) return destinationWallet.address;

    setCreatingWallet(true);
    try {
      const wallet = (await createWallet()) as PrivyWallet;
      return wallet.address;
    } finally {
      setCreatingWallet(false);
    }
  };

  const startOnramp = async () => {
    if (!canStart || funding || creatingWallet) return;

    setFunding(true);
    setError('');
    setStatus('idle');

    try {
      const address = await ensureDestinationWallet();
      const result = await fund({
        source: {
          assets: PRIVY_FIAT_ONRAMP_SOURCE_ASSETS,
          defaultAsset: PRIVY_FIAT_ONRAMP_DEFAULT_SOURCE_ASSET,
        },
        destination: {
          address,
          asset: PRIVY_FIAT_ONRAMP_DESTINATION_ASSET,
          chain: PRIVY_FIAT_ONRAMP_DESTINATION_CHAIN,
        },
        environment: PRIVY_FIAT_ONRAMP_ENVIRONMENT,
        defaultAmount: PRIVY_FIAT_ONRAMP_DEFAULT_AMOUNT,
      });

      setStatus(result.status);
      toast(result.status === 'confirmed' ? 'Fiat top-up confirmed' : 'Fiat top-up submitted', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fiat top-up was not completed.';
      setError(message);
      toast('Fiat top-up did not complete', 'error');
    } finally {
      setFunding(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6 lg:p-8 bg-[#02040a]" glowOnHover>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-sm">3</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight">Buy USDC with Fiat</h3>
                <Tag color={PRIVY_FIAT_ONRAMP_ENVIRONMENT === 'production' ? 'emerald' : 'blue'}>
                  {PRIVY_FIAT_ONRAMP_ENVIRONMENT}
                </Tag>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Privy onramp top-up for the source wallet.</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-zinc-400">
            Buy USDC into a {destinationLabel} wallet, then use <span className="text-zinc-200">Add Funds from Another Chain</span> to route that balance into the Stellar settlement wallet before funding escrow.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Buy with</p>
              <p className="mt-1 text-sm font-bold text-white uppercase">{PRIVY_FIAT_ONRAMP_SOURCE_ASSETS.join(' / ')}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Receive</p>
              <p className="mt-1 text-sm font-bold text-white">USDC on {destinationLabel}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Destination</p>
              <p className="mt-1 truncate font-mono text-sm font-bold text-emerald-300">
                {destinationWallet?.address ? shortOnrampAddress(destinationWallet.address) : 'Privy EVM wallet'}
              </p>
            </div>
          </div>

          {status !== 'idle' && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200 flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>
                {status === 'confirmed'
                  ? 'Provider confirmation completed. Refresh the source wallet balance before routing into Stellar.'
                  : 'Purchase submitted. Provider settlement can still take a short time before the wallet balance updates.'}
              </span>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="lg:w-64 space-y-3">
          <Button
            onClick={startOnramp}
            disabled={!canStart || funding || creatingWallet || !PRIVY_FIAT_ONRAMP_ENABLED}
            variant="primary"
            className="w-full py-4"
            icon={funding || creatingWallet ? Loader2 : CreditCard}
          >
            {creatingWallet ? 'Creating Wallet...' : funding ? 'Opening Onramp...' : 'Buy USDC'}
          </Button>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-500">
            <div className="mb-2 flex items-center gap-2 text-zinc-300 font-bold">
              <Wallet size={14} />
              Fiat is not escrow state
            </div>
            Escrow locks only after the Stellar wallet receives settlement assets and the user confirms Fund Deal.
          </div>
        </div>
      </div>
    </Card>
  );
}
