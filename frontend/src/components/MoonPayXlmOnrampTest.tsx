import { useState } from 'react';
import { AlertCircle, ExternalLink, Loader2, Moon, Wallet } from 'lucide-react';
import { useToast } from '../App';
import {
  MOONPAY_ONRAMP_API_KEY,
  MOONPAY_ONRAMP_BASE_CURRENCY,
  MOONPAY_ONRAMP_CURRENCY_CODE,
  MOONPAY_ONRAMP_DEFAULT_AMOUNT,
  MOONPAY_ONRAMP_ENVIRONMENT,
  createMoonPayOnrampUrl,
} from '../lib/moonpayOnramp';
import { Button, Card, Tag } from './ui/Components';

interface MoonPayXlmOnrampTestProps {
  walletAddress: string;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function MoonPayXlmOnrampTest({ walletAddress }: MoonPayXlmOnrampTestProps) {
  const toast = useToast();
  const [amount, setAmount] = useState(MOONPAY_ONRAMP_DEFAULT_AMOUNT);
  const [baseCurrency, setBaseCurrency] = useState(MOONPAY_ONRAMP_BASE_CURRENCY);
  const [lastUrl, setLastUrl] = useState('');
  const [opening, setOpening] = useState(false);

  const configured = Boolean(MOONPAY_ONRAMP_API_KEY);
  const canOpen = configured && Boolean(walletAddress) && Number(amount) > 0;

  const openMoonPay = () => {
    if (!canOpen || opening) return;
    setOpening(true);

    const url = createMoonPayOnrampUrl({
      walletAddress,
      baseCurrencyAmount: amount,
      baseCurrencyCode: baseCurrency,
    });
    setLastUrl(url);

    const popup = window.open(url, '_blank');
    if (popup) {
      popup.opener = null;
      popup.focus?.();
      toast('MoonPay sandbox opened', 'success');
    } else {
      window.location.assign(url);
    }

    window.setTimeout(() => setOpening(false), 750);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl lg:text-5xl font-black text-white tracking-tight">MoonPay XLM Onramp Test</h1>
          <Tag color="blue">{MOONPAY_ONRAMP_ENVIRONMENT}</Tag>
        </div>
        <p className="mt-3 text-sm lg:text-base text-zinc-400 max-w-2xl">
          Open a MoonPay hosted buy flow for native XLM into the connected Stellar wallet. This is a sandbox route check; escrow funding still happens later from Deals.
        </p>
      </div>

      <Card className="p-4 sm:p-6 lg:p-8 bg-[#02040a]" glowOnHover>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-6">
          <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl border border-emerald-500/30 bg-black/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <Wallet size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-emerald-100">Connected Stellar wallet</p>
                  <p className="mt-1 font-mono text-sm text-emerald-300 break-all">{walletAddress}</p>
                  <p className="mt-2 text-xs text-emerald-100/70">
                    MoonPay should deliver XLM to this address when the hosted flow accepts the route.
                  </p>
                </div>
              </div>
            </div>

            {!configured && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-300" />
                <span>Set VITE_MOONPAY_API_KEY before opening the MoonPay sandbox widget.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pay amount</span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  className="w-full bg-[#09090b] border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-white font-mono outline-none transition-colors"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fiat</span>
                <select
                  value={baseCurrency}
                  onChange={(event) => setBaseCurrency(event.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-white font-bold outline-none transition-colors"
                >
                  <option value="eur">EUR</option>
                  <option value="gbp">GBP</option>
                  <option value="usd">USD</option>
                </select>
              </label>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Receive</span>
                <div className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm font-black text-white">
                  {MOONPAY_ONRAMP_CURRENCY_CODE.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs leading-relaxed text-blue-100/80">
              Sandbox support can differ from production. If MoonPay asks for signed wallet-prefill, the next step is adding a small server-side signing endpoint with the MoonPay secret key.
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={openMoonPay}
              disabled={!canOpen || opening}
              variant="primary"
              className="w-full py-4"
              icon={opening ? Loader2 : Moon}
            >
              {opening ? 'Opening...' : 'Open MoonPay'}
            </Button>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-500">
              <p className="font-bold text-zinc-300">Test route</p>
              <p className="mt-2 font-mono text-emerald-300">
                {amount || '0'} {baseCurrency.toUpperCase()} {'->'} XLM
              </p>
              <p className="mt-2">To {walletAddress ? shortAddress(walletAddress) : 'connected wallet'}</p>
            </div>
            {lastUrl && (
              <a
                href={lastUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:border-emerald-500/30 hover:text-emerald-300"
              >
                Reopen widget <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
