import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { useToast } from '../App';
import {
  nearIntentsClient,
  NearIntentsApiError,
  type NearIntentMetadata,
  type NearIntentQuoteResponse,
  type NearIntentStatusResponse,
  type NearIntentsReadiness,
} from '../lib/nearIntents';
import { Card, Button, Tag } from './ui/Components';

interface NearIntentsPanelProps {
  walletAddress: string;
}

const STATUS_COLORS: Record<string, 'emerald' | 'amber' | 'red' | 'blue' | 'zinc'> = {
  PENDING_DEPOSIT: 'amber',
  KNOWN_DEPOSIT_TX: 'blue',
  INCOMPLETE_DEPOSIT: 'amber',
  PROCESSING: 'blue',
  SUCCESS: 'emerald',
  REFUNDED: 'zinc',
  FAILED: 'red',
  disabled: 'zinc',
  ready: 'emerald',
};

function formatBaseAmount(value?: string): string {
  if (!value) return '0';
  if (!/^\d+$/.test(value)) return value;
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return value;
  return asNumber.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function shortText(value?: string): string {
  if (!value) return 'not available';
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function errorHelp(error: NearIntentsApiError | null): string {
  if (!error) return '';
  if (error.status === 401) return 'Open /admin once with admin credentials, then retry this protected request.';
  if (error.status === 503) return 'Server-side NEAR Intents envs are disabled or incomplete.';
  if (error.status === 400) return 'Check the binding id, origin asset, refund address, and amount.';
  return 'Check the server logs or retry after the indexer API is reachable.';
}

function StatusRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-zinc-800 bg-black/30 px-3 py-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 leading-5">{label}</span>
      <span className="min-w-0 break-all font-mono text-xs leading-5 text-zinc-300">{value || 'not available'}</span>
    </div>
  );
}

export function NearIntentsPanel({ walletAddress }: NearIntentsPanelProps) {
  const toast = useToast();
  const [readiness, setReadiness] = useState<NearIntentsReadiness | null>(null);
  const [bindingId, setBindingId] = useState('mb_sig-demo-001');
  const [originAsset, setOriginAsset] = useState('nep141:wrap.near');
  const [destinationAsset, setDestinationAsset] = useState('');
  const [amount, setAmount] = useState('1000000');
  const [refundTo, setRefundTo] = useState(walletAddress);
  const [dry, setDry] = useState(true);
  const [quote, setQuote] = useState<NearIntentQuoteResponse | null>(null);
  const [status, setStatus] = useState<NearIntentStatusResponse | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [error, setError] = useState<NearIntentsApiError | null>(null);

  useEffect(() => {
    if (walletAddress && !refundTo) setRefundTo(walletAddress);
  }, [refundTo, walletAddress]);

  useEffect(() => {
    const configuredDefault = readiness?.destinationAssets?.default;
    if (configuredDefault && !destinationAsset) setDestinationAsset(configuredDefault);
  }, [destinationAsset, readiness?.destinationAssets?.default]);

  const loadReadiness = async () => {
    setLoadingReadiness(true);
    setError(null);
    try {
      setReadiness(await nearIntentsClient.readiness());
    } catch (err) {
      setError(err instanceof NearIntentsApiError ? err : new NearIntentsApiError(String(err), 500));
    } finally {
      setLoadingReadiness(false);
    }
  };

  useEffect(() => {
    void loadReadiness();
  }, []);

  const canRequestQuote = useMemo(() => {
    return Boolean(
      readiness?.enabled &&
        bindingId.trim() &&
        originAsset.trim() &&
        destinationAsset.trim() &&
        amount.trim() &&
        refundTo.trim()
    );
  }, [amount, bindingId, destinationAsset, originAsset, readiness?.enabled, refundTo]);

  const nearIntent: NearIntentMetadata | undefined = status?.nearIntent || quote?.nearIntent;
  const providerStatus = status?.status.status || nearIntent?.providerStatusRaw || (quote ? 'QUOTE_CREATED' : undefined);
  const statusColor = STATUS_COLORS[providerStatus || 'disabled'] || 'zinc';

  const createQuote = async () => {
    if (!canRequestQuote) return;
    setLoadingQuote(true);
    setStatus(null);
    setError(null);
    try {
      const result = await nearIntentsClient.createQuote(bindingId.trim(), {
        originAsset: originAsset.trim(),
        destinationAsset: destinationAsset.trim(),
        amount: amount.trim(),
        refundTo: refundTo.trim(),
        recipient: walletAddress || refundTo.trim(),
        dry: dry || !readiness?.liveExecutionEnabled,
        slippageTolerance: 100,
        depositMode: 'MEMO',
      });
      setQuote(result);
      toast('NEAR Intents quote stored on binding', 'success');
    } catch (err) {
      const apiError = err instanceof NearIntentsApiError ? err : new NearIntentsApiError(String(err), 500);
      setError(apiError);
      toast(apiError.message, 'error');
    } finally {
      setLoadingQuote(false);
    }
  };

  const refreshStatus = async () => {
    if (!bindingId.trim()) return;
    setLoadingStatus(true);
    setError(null);
    try {
      const result = await nearIntentsClient.getStatus(bindingId.trim());
      setStatus(result);
      setQuote((current) =>
        current
          ? {
              ...current,
              externalPaymentIntent: result.externalPaymentIntent,
              nearIntent: result.nearIntent,
            }
          : current
      );
      toast('NEAR Intents status refreshed', 'success');
    } catch (err) {
      const apiError = err instanceof NearIntentsApiError ? err : new NearIntentsApiError(String(err), 500);
      setError(apiError);
      toast(apiError.message, 'error');
    } finally {
      setLoadingStatus(false);
    }
  };

  const copyValue = async (label: string, value?: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast(`${label} copied`, 'success');
  };

  const destinationAllowlist = readiness?.destinationAssets?.allowlist || [];

  return (
    <Card className="p-4 sm:p-6 lg:p-8 bg-[#02040a]" glowOnHover>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-300 font-bold text-sm">
            3
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight">NEAR Intents Funding</h3>
              <Tag color={readiness?.enabled ? 'blue' : 'zinc'}>
                {readiness?.enabled ? 'SDK Ready' : 'Disabled'}
              </Tag>
              <Tag color={readiness?.liveExecutionEnabled ? 'amber' : 'zinc'}>
                {readiness?.liveExecutionEnabled ? 'Live Allowed' : 'Dry First'}
              </Tag>
            </div>
            <p className="max-w-2xl text-sm text-zinc-400 leading-relaxed">
              Create and track a 1Click quote against a marketplace binding. This initiates cross-chain funding only; escrow is funded after the Stellar settlement asset is deposited and the Soroban funded event is indexed.
            </p>
          </div>
        </div>
        <Button onClick={loadReadiness} variant="secondary" className="py-3 text-xs" icon={loadingReadiness ? Loader2 : RefreshCw}>
          Check Server
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5">
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Binding ID</span>
                <input
                  value={bindingId}
                  onChange={(event) => setBindingId(event.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2.5 text-sm text-zinc-100 font-mono outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Amount</span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2.5 text-sm text-zinc-100 font-mono outline-none"
                />
              </label>
            </div>
            <label className="space-y-2 block">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Origin Asset ID</span>
              <textarea
                value={originAsset}
                onChange={(event) => setOriginAsset(event.target.value)}
                rows={2}
                spellCheck={false}
                className="w-full resize-none bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2.5 text-xs text-zinc-100 font-mono outline-none"
              />
            </label>
            <label className="space-y-2 block">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Destination Asset ID</span>
              {destinationAllowlist.length > 0 ? (
                <select
                  value={destinationAsset}
                  onChange={(event) => setDestinationAsset(event.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2.5 text-xs text-zinc-100 font-mono outline-none"
                >
                  <option value="">Choose approved asset</option>
                  {destinationAllowlist.map((asset) => (
                    <option key={asset} value={asset}>
                      {asset}
                    </option>
                  ))}
                </select>
              ) : (
                <textarea
                  value={destinationAsset}
                  onChange={(event) => setDestinationAsset(event.target.value)}
                  rows={2}
                  spellCheck={false}
                  placeholder="Stellar assetId from 1Click token discovery"
                  className="w-full resize-none bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2.5 text-xs text-zinc-100 font-mono outline-none placeholder:text-zinc-700"
                />
              )}
              <p className="text-[10px] text-zinc-500">
                {destinationAllowlist.length > 0
                  ? `${destinationAllowlist.length} approved destination asset${destinationAllowlist.length === 1 ? '' : 's'} from server readiness.`
                  : 'Run protected token discovery, then configure an approved Stellar destination asset allowlist.'}
              </p>
            </label>
            <label className="space-y-2 block">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Refund Address</span>
              <textarea
                value={refundTo}
                onChange={(event) => setRefundTo(event.target.value)}
                rows={2}
                spellCheck={false}
                className="w-full resize-none bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2.5 text-xs text-zinc-100 font-mono outline-none"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black/30 px-3 py-3">
              <span className="text-xs font-bold text-zinc-300">Dry quote</span>
              <input
                type="checkbox"
                checked={dry || !readiness?.liveExecutionEnabled}
                disabled={!readiness?.liveExecutionEnabled}
                onChange={(event) => setDry(event.target.checked)}
                className="h-4 w-4 accent-blue-500"
              />
            </label>
            <Button
              onClick={createQuote}
              disabled={loadingQuote || !canRequestQuote}
              variant={canRequestQuote ? 'primary' : 'secondary'}
              className="w-full py-4"
              icon={loadingQuote ? Loader2 : ShieldCheck}
            >
              {loadingQuote ? 'Requesting Quote...' : 'Request Quote'}
            </Button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error.message}</span>
              </div>
              <p className="text-xs text-red-200/80">{errorHelp(error)}</p>
              {error.status === 401 && (
                <a href="/admin" target="_blank" rel="noopener noreferrer" className="inline-flex text-xs font-bold underline underline-offset-4">
                  Open admin auth
                </a>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Server Readiness</h4>
                <p className="mt-1 text-[10px] text-zinc-500">JWT and asset id stay server-side.</p>
              </div>
              <Tag color={readiness?.enabled ? 'emerald' : 'zinc'}>
                {readiness?.enabled ? 'Configured' : 'Off'}
              </Tag>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'JWT', ok: readiness?.configured.jwt },
                {
                  label: 'Assets',
                  ok:
                    readiness?.configured.stellarDestinationAsset ||
                    readiness?.configured.defaultStellarDestinationAsset ||
                    readiness?.configured.stellarDestinationAssetAllowlist,
                },
                { label: 'Refund', ok: readiness?.configured.defaultRefundAccount },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-zinc-800 bg-black/30 px-2 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{item.label}</p>
                  <p className={`mt-1 text-xs font-bold ${item.ok ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {item.ok ? 'set' : 'missing'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Quote / Status</h4>
                <p className="mt-1 text-[10px] text-zinc-500">Quote metadata is stored on the binding.</p>
              </div>
              <Tag color={statusColor}>{providerStatus || 'No Quote'}</Tag>
            </div>

            {nearIntent ? (
              <>
                <div className="grid grid-cols-1 gap-2">
                  <StatusRow label="Quote" value={nearIntent.quoteId} />
                  <StatusRow label="Source" value={nearIntent.sourceAsset} />
                  <StatusRow label="Destination" value={nearIntent.destinationAsset} />
                  <StatusRow label="Output" value={`${formatBaseAmount(nearIntent.expectedDestinationAmount)} base units`} />
                  <StatusRow label="Min Output" value={`${formatBaseAmount(nearIntent.minDestinationAmount)} base units`} />
                  <StatusRow label="Signature" value={nearIntent.signatureVerified ? 'verified by 1Click SDK' : 'not verified'} />
                  <StatusRow label="Deadline" value={nearIntent.deadline} />
                  <StatusRow label="Recipient" value={shortText(nearIntent.recipient)} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <div className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Deposit Address</p>
                    <p className="break-all font-mono text-xs text-zinc-300">{nearIntent.depositAddress || (nearIntent.dry ? 'dry quote: no deposit address' : 'not available')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyValue('Deposit address', nearIntent.depositAddress)}
                    disabled={!nearIntent.depositAddress}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-zinc-500 hover:text-blue-300 disabled:opacity-40"
                    title="Copy deposit address"
                  >
                    <Copy size={16} />
                  </button>
                </div>

                {nearIntent.depositMemo && (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <StatusRow label="Memo" value={nearIntent.depositMemo} />
                    <button
                      type="button"
                      onClick={() => copyValue('Deposit memo', nearIntent.depositMemo)}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-zinc-500 hover:text-blue-300"
                      title="Copy deposit memo"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                )}

                <Button
                  onClick={refreshStatus}
                  disabled={loadingStatus || !nearIntent.depositAddress}
                  variant="secondary"
                  className="w-full py-3 text-xs"
                  icon={loadingStatus ? Loader2 : RefreshCw}
                >
                  {loadingStatus ? 'Refreshing Status...' : 'Refresh Status'}
                </Button>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-black/20 p-6 text-center">
                <KeyRound size={24} className="mx-auto mb-3 text-zinc-600" />
                <p className="text-sm font-bold text-zinc-400">No NEAR intent quote yet</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200 leading-relaxed flex items-start gap-3">
            <Timer size={16} className="mt-0.5 shrink-0 text-amber-300" />
            <span>
              NEAR status can show payment progress, but the escrow rail only treats funds as locked after the Stellar DealEscrow contract emits the funded event.
            </span>
          </div>

          {status?.status.status === 'SUCCESS' && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-200 leading-relaxed flex items-start gap-3">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <span>NEAR reports settlement success. Reconcile Soroban events before marking escrow funded.</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
