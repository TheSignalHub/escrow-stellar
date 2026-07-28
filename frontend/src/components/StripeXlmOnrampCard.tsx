import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, ExternalLink, Loader2, Wallet } from 'lucide-react';
import { useToast } from '../App';
import {
  STRIPE_ONRAMP_DEFAULT_AMOUNT,
  STRIPE_ONRAMP_DESTINATION_CURRENCY,
  STRIPE_ONRAMP_DESTINATION_NETWORK,
  STRIPE_ONRAMP_ENABLED,
  STRIPE_ONRAMP_MODE,
  STRIPE_ONRAMP_SOURCE_CURRENCY,
  stripeOnrampClient,
  type StripeOnrampReadiness,
  type StripeOnrampSession,
} from '../lib/stripeOnramp';
import { Button, Card, Tag } from './ui/Components';

interface StripeXlmOnrampCardProps {
  walletAddress: string;
  stepNumber?: number;
  compact?: boolean;
  embedded?: boolean;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function isPositiveFiatAmount(value: string): boolean {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return false;
  return Number(value) > 0;
}

export function StripeXlmOnrampCard({
  walletAddress,
  stepNumber = 1,
  compact = false,
  embedded = false,
}: StripeXlmOnrampCardProps) {
  const toast = useToast();
  const [sourceAmount, setSourceAmount] = useState(STRIPE_ONRAMP_DEFAULT_AMOUNT);
  const [readiness, setReadiness] = useState<StripeOnrampReadiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [session, setSession] = useState<StripeOnrampSession | null>(null);
  const [error, setError] = useState('');

  const destinationLabel = `${STRIPE_ONRAMP_DESTINATION_CURRENCY.toUpperCase()} on ${STRIPE_ONRAMP_DESTINATION_NETWORK}`;
  const canStart = STRIPE_ONRAMP_ENABLED && Boolean(walletAddress) && isPositiveFiatAmount(sourceAmount);
  const modeLabel = readiness?.mode === 'live' || STRIPE_ONRAMP_MODE === 'production' ? 'production' : 'test';

  const readyLabel = useMemo(() => {
    if (!STRIPE_ONRAMP_ENABLED) return 'disabled';
    if (!readiness) return modeLabel;
    if (!readiness.enabled || !readiness.configured.secretKey) return 'not configured';
    return modeLabel;
  }, [modeLabel, readiness]);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    stripeOnrampClient
      .readiness()
      .then((value) => {
        if (!cancelled) setReadiness(value);
      })
      .catch(() => {
        if (!cancelled) setReadiness(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startHostedOnramp = async () => {
    if (!canStart || loading) return;

    setLoading(true);
    setError('');
    setSession(null);

    try {
      const created = await stripeOnrampClient.createSession({
        walletAddress,
        sourceAmount: sourceAmount.trim(),
        sourceCurrency: STRIPE_ONRAMP_SOURCE_CURRENCY,
      });
      setSession(created);
      toast('Stripe onramp session created', 'success');

      const popup = window.open(created.redirectUrl, '_blank', 'noopener,noreferrer');
      if (!popup) {
        window.location.href = created.redirectUrl;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Stripe onramp session could not be created.';
      setError(message);
      toast('Stripe onramp did not start', 'error');
    } finally {
      setLoading(false);
    }
  };

  const content = (
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-4">
            {!embedded && (
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-sm">
                {stepNumber}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight">Buy XLM with Stripe</h3>
                <Tag color={modeLabel === 'production' ? 'emerald' : 'blue'}>{readyLabel}</Tag>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Hosted fiat top-up to the connected Stellar wallet.
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-zinc-400">
            Buy native XLM directly into this Stellar wallet, then fund escrow from the same wallet in Deals.
            XLM is the default top-up asset because it activates fresh Stellar accounts and avoids issued-asset trustline setup.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="rounded-xl border border-zinc-800 bg-black/30 p-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pay with</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-bold uppercase text-white">{STRIPE_ONRAMP_SOURCE_CURRENCY}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={sourceAmount}
                  onChange={(event) => setSourceAmount(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-right font-mono text-sm font-bold text-emerald-200 outline-none"
                  aria-label="Fiat amount"
                />
              </div>
            </label>
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Receive</p>
              <p className="mt-2 text-sm font-bold text-white">{destinationLabel}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Destination</p>
              <p className="mt-2 truncate font-mono text-sm font-bold text-emerald-300">
                {walletAddress ? shortAddress(walletAddress) : 'Connect wallet'}
              </p>
            </div>
          </div>

          {session && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200 flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>
                Session created. Complete the Stripe flow, then refresh this wallet balance before funding escrow.
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

        <div className="lg:w-72 space-y-3">
          <Button
            onClick={startHostedOnramp}
            disabled={!canStart || loading || checking}
            variant="primary"
            className="w-full py-4"
            icon={loading || checking ? Loader2 : CreditCard}
          >
            {loading ? 'Opening Stripe...' : checking ? 'Checking Stripe...' : 'Buy XLM'}
          </Button>
          {session?.redirectUrl && (
            <a
              href={session.redirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:border-emerald-500/30 hover:text-emerald-300"
            >
              Open session <ExternalLink size={13} />
            </a>
          )}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-500">
            <div className="mb-2 flex items-center gap-2 text-zinc-300 font-bold">
              <Wallet size={14} />
              Top-up first
            </div>
            Escrow locks only after the XLM arrives and you click Fund Deal from this Stellar wallet.
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
        {content}
      </div>
    );
  }

  return (
    <Card className={`bg-[#02040a] ${compact ? 'p-4 sm:p-6' : 'p-4 sm:p-6 lg:p-8'}`} glowOnHover>
      {content}
    </Card>
  );
}
