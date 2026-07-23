import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Timer,
  Wallet,
} from 'lucide-react';
import { StrKey } from '@stellar/stellar-sdk';
import { useToast } from '../App';
import {
  nearIntentsClient,
  NearIntentsApiError,
  type NearIntentMetadata,
  type NearIntentQuoteResponse,
  type NearIntentStatusResponse,
  type NearIntentsReadiness,
  type NearIntentsToken,
} from '../lib/nearIntents';
import { SETTLEMENT_TOKEN_DECIMALS, USDC_TOKEN_ADDRESS, XLM_SAC_ADDRESS } from '../lib/stellar';
import { Card, Button, Tag } from './ui/Components';

interface NearIntentsPanelProps {
  walletAddress: string;
  mode?: 'routePreview' | 'dealFunding';
  dealId?: number;
  milestoneIdx?: number;
  amountDue?: string;
  settlementTokenAddress?: string;
  settlementTokenSymbol?: string;
  onClose?: () => void;
}

type StepState = 'done' | 'active' | 'pending';

const REVIEW_BINDING_ID = 'mb_sig-demo-001';
const NEAR_QUOTE_DEMO_ASSET_ID = 'nep141:usdt.tether-token.near';
const EVM_DRY_QUOTE_REFUND_ADDRESS = '0x1111111111111111111111111111111111111111';
const SOLANA_DRY_QUOTE_REFUND_ADDRESS = '11111111111111111111111111111111';
const EVM_CHAINS = new Set(['eth', 'base', 'arb', 'op', 'avax', 'bsc', 'pol', 'gnosis', 'bera', 'xlayer', 'monad', 'plasma', 'scroll']);
const DRY_QUOTE_SOURCE_CHAINS = new Set(['near', 'sol', ...EVM_CHAINS]);

const STATUS_COLORS: Record<string, 'emerald' | 'amber' | 'red' | 'blue' | 'zinc'> = {
  QUOTE_CREATED: 'blue',
  PENDING_DEPOSIT: 'amber',
  KNOWN_DEPOSIT_TX: 'blue',
  INCOMPLETE_DEPOSIT: 'amber',
  PROCESSING: 'blue',
  SUCCESS: 'emerald',
  REFUNDED: 'zinc',
  FAILED: 'red',
  disabled: 'zinc',
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

function friendlySettlementAsset(assetId?: string): string {
  if (!assetId) return 'Stellar settlement asset';
  if (assetId === NEAR_QUOTE_DEMO_ASSET_ID) return 'NEAR USDT quote demo';
  if (assetId.includes('111bzQBB65')) return 'Stellar USDC';
  if (assetId.includes('111bzQBB5')) return 'Stellar XLM';
  return 'Approved Stellar asset';
}

function formatStellarBaseUnits(value?: string): string {
  if (!value || !/^\d+$/.test(value)) return value || '0';
  try {
    const decimals = Number.isFinite(SETTLEMENT_TOKEN_DECIMALS) ? SETTLEMENT_TOKEN_DECIMALS : 7;
    const scale = 10n ** BigInt(decimals);
    const raw = BigInt(value);
    const whole = raw / scale;
    const fraction = raw % scale;
    const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
    return fractionText ? `${whole.toLocaleString()}.${fractionText}` : whole.toLocaleString();
  } catch {
    return value;
  }
}

function getSettlementKindFromAssetId(assetId?: string): 'xlm' | 'usdc' | 'demo' | 'unknown' {
  if (!assetId) return 'unknown';
  if (assetId === NEAR_QUOTE_DEMO_ASSET_ID) return 'demo';
  const label = friendlySettlementAsset(assetId).toLowerCase();
  const raw = assetId.toLowerCase();
  if (label.includes('xlm') || raw.includes('xlm')) return 'xlm';
  if (label.includes('usdc') || raw.includes('usdc')) return 'usdc';
  return 'unknown';
}

function getSettlementKindFromToken(tokenAddress?: string): 'xlm' | 'usdc' | 'unknown' {
  if (!tokenAddress) return 'unknown';
  if (tokenAddress === XLM_SAC_ADDRESS) return 'xlm';
  if (tokenAddress === USDC_TOKEN_ADDRESS) return 'usdc';
  return 'unknown';
}

function isApprovedTopUpDestination(assetId: string): boolean {
  const kind = getSettlementKindFromAssetId(assetId);
  return kind === 'xlm' || kind === 'usdc';
}

function findPreferredDestinationAsset(assetIds: string[], tokenAddress?: string): string {
  const expectedKind = getSettlementKindFromToken(tokenAddress);
  if (expectedKind === 'unknown') return '';
  return assetIds.find((assetId) => getSettlementKindFromAssetId(assetId) === expectedKind) || '';
}

function uniqueAssets(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function chainLabel(chain?: string): string {
  const labels: Record<string, string> = {
    arb: 'Arbitrum',
    avax: 'Avalanche',
    base: 'Base',
    bera: 'Berachain',
    bsc: 'BNB Chain',
    eth: 'Ethereum',
    gnosis: 'Gnosis',
    monad: 'Monad',
    near: 'NEAR',
    op: 'Optimism',
    plasma: 'Plasma',
    pol: 'Polygon',
    scroll: 'Scroll',
    sol: 'Solana',
    xlayer: 'X Layer',
  };
  if (!chain) return 'Source chain';
  return labels[chain] || chain.charAt(0).toUpperCase() + chain.slice(1);
}

function tokenLabel(token?: NearIntentsToken): string {
  if (!token) return 'Source asset';
  return `${token.symbol} on ${chainLabel(token.blockchain)}`;
}

function isQuotePreviewSourceToken(token: NearIntentsToken): boolean {
  return (
    Boolean(token.assetId && token.symbol) &&
    token.blockchain !== 'stellar' &&
    DRY_QUOTE_SOURCE_CHAINS.has(token.blockchain) &&
    Number(token.decimals) >= 0 &&
    Number(token.price || 0) > 0
  );
}

function decimalToBaseUnits(value: string, decimals: number): string {
  const normalized = value.trim();
  if (!/^\d*(\.\d*)?$/.test(normalized) || normalized === '' || normalized === '.') return '';
  const [wholeRaw, fractionRaw = ''] = normalized.split('.');
  const whole = wholeRaw || '0';
  const fraction = fractionRaw.slice(0, decimals).padEnd(decimals, '0');
  const combined = `${whole}${fraction}`.replace(/^0+/, '');
  return combined || '0';
}

function getDryQuoteRefundAddress(token?: NearIntentsToken): string | undefined {
  if (!token) return undefined;
  if (EVM_CHAINS.has(token.blockchain)) return EVM_DRY_QUOTE_REFUND_ADDRESS;
  if (token.blockchain === 'sol') return SOLANA_DRY_QUOTE_REFUND_ADDRESS;
  return undefined;
}

function formatDateTime(value?: string): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function errorHelp(error: NearIntentsApiError | null): string {
  if (!error) return '';
  if (error.status === 401) return 'Payment quotes require a protected reviewer session in this environment.';
  if (error.status === 503) return 'Cross-chain payments are not available in this environment yet.';
  if (error.status === 400) return 'Check the source asset, settlement asset, and amount, then request a new quote.';
  return 'Retry shortly. If this continues, check the payment service logs.';
}

function RouteMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 min-w-0 break-words text-sm font-bold text-zinc-100">{value}</p>
    </div>
  );
}

function PaymentStep({ label, state }: { label: string; state: StepState }) {
  const classes = {
    done: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    active: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
    pending: 'border-zinc-800 bg-black/20 text-zinc-500',
  };

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${classes[state]}`}>
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          state === 'done' ? 'bg-emerald-300' : state === 'active' ? 'bg-blue-300' : 'bg-zinc-700'
        }`}
      />
      <span className="text-xs font-bold">{label}</span>
    </div>
  );
}

export function NearIntentsPanel({
  walletAddress,
  mode = 'routePreview',
  dealId,
  milestoneIdx,
  amountDue,
  settlementTokenAddress,
  settlementTokenSymbol,
  onClose,
}: NearIntentsPanelProps) {
  const toast = useToast();
  const [readiness, setReadiness] = useState<NearIntentsReadiness | null>(null);
  const [sourceTokens, setSourceTokens] = useState<NearIntentsToken[]>([]);
  const [sourceChain, setSourceChain] = useState('');
  const [originAsset, setOriginAsset] = useState('');
  const [destinationAsset, setDestinationAsset] = useState('');
  const [amount, setAmount] = useState(amountDue || '1000000');
  const [sourceAmount, setSourceAmount] = useState('1');
  const [quote, setQuote] = useState<NearIntentQuoteResponse | null>(null);
  const [status, setStatus] = useState<NearIntentStatusResponse | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [error, setError] = useState<NearIntentsApiError | null>(null);

  useEffect(() => {
    if (amountDue) setAmount(amountDue);
  }, [amountDue]);

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

  const loadTokens = async () => {
    setLoadingTokens(true);
    try {
      const tokens = await nearIntentsClient.tokens();
      setSourceTokens(tokens.filter(isQuotePreviewSourceToken));
    } catch (err) {
      setError(err instanceof NearIntentsApiError ? err : new NearIntentsApiError(String(err), 500));
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    void loadTokens();
  }, []);

  const sourceChains = useMemo(() => {
    const chains = uniqueAssets(sourceTokens.map((token) => token.blockchain));
    const priority = ['near', 'eth', 'base', 'sol'];
    return chains.sort((a, b) => {
      const aPriority = priority.indexOf(a);
      const bPriority = priority.indexOf(b);
      if (aPriority !== -1 || bPriority !== -1) {
        return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
      }
      return chainLabel(a).localeCompare(chainLabel(b));
    });
  }, [sourceTokens]);
  const sourceTokensForChain = useMemo(
    () => sourceTokens.filter((token) => token.blockchain === sourceChain),
    [sourceChain, sourceTokens]
  );
  const selectedOriginAsset = sourceTokens.find((token) => token.assetId === originAsset);

  useEffect(() => {
    if (sourceChain && sourceChains.includes(sourceChain)) return;
    setSourceChain(sourceChains[0] || '');
  }, [sourceChain, sourceChains]);

  useEffect(() => {
    if (!sourceTokensForChain.length) {
      setOriginAsset('');
      return;
    }
    if (sourceTokensForChain.some((token) => token.assetId === originAsset)) return;
    const preferred =
      sourceTokensForChain.find((token) => token.symbol.toUpperCase() === 'USDC') ||
      sourceTokensForChain.find((token) => token.symbol.toUpperCase() === 'NEAR') ||
      sourceTokensForChain[0];
    setOriginAsset(preferred.assetId);
  }, [originAsset, sourceTokensForChain]);

  const isDealFundingMode = mode === 'dealFunding';
  const stellarDestinationAllowlist = readiness?.destinationAssets?.allowlist || [];
  const demoDestinationAllowlist = readiness?.destinationAssets?.demoAllowlist || [];
  const dealSettlementKind = getSettlementKindFromToken(settlementTokenAddress);
  const approvedStellarDestinationAllowlist = stellarDestinationAllowlist.filter(isApprovedTopUpDestination);
  const destinationAllowlist = uniqueAssets(
    isDealFundingMode
      ? approvedStellarDestinationAllowlist.filter((asset) => (
          dealSettlementKind === 'unknown' || getSettlementKindFromAssetId(asset) === dealSettlementKind
        ))
      : [...approvedStellarDestinationAllowlist, ...demoDestinationAllowlist]
  );
  const preferredDestinationAsset = findPreferredDestinationAsset(stellarDestinationAllowlist, settlementTokenAddress);
  const configuredDefaultDestination = readiness?.destinationAssets?.default || '';

  useEffect(() => {
    const nextDestinationAsset =
      preferredDestinationAsset ||
      (destinationAllowlist.includes(configuredDefaultDestination) ? configuredDefaultDestination : destinationAllowlist[0] || '');

    if (destinationAsset && !destinationAllowlist.includes(destinationAsset)) {
      setDestinationAsset(nextDestinationAsset);
      return;
    }
    if (nextDestinationAsset && !destinationAsset) setDestinationAsset(nextDestinationAsset);
  }, [configuredDefaultDestination, destinationAllowlist, destinationAsset, preferredDestinationAsset]);

  const quoteDemoDestination = demoDestinationAllowlist.includes(destinationAsset);
  const activeDestinationAsset = destinationAsset || (!isDealFundingMode ? readiness?.destinationAssets?.default : undefined);
  const settlementLabel = friendlySettlementAsset(activeDestinationAsset);
  const lockedSettlementLabel =
    destinationAsset
      ? settlementLabel
      : dealSettlementKind === 'xlm'
        ? 'Stellar XLM route unavailable'
        : dealSettlementKind === 'usdc'
          ? 'Stellar USDC route unavailable'
          : 'Settlement route unavailable';
  const selectedDestinationKind = getSettlementKindFromAssetId(destinationAsset);
  const settlementRouteMismatch =
    isDealFundingMode &&
    dealSettlementKind !== 'unknown' &&
    (selectedDestinationKind === 'unknown' ||
      (selectedDestinationKind !== 'demo' && selectedDestinationKind !== dealSettlementKind));
  const expectedSettlementLabel =
    dealSettlementKind === 'xlm' ? 'Stellar XLM' : dealSettlementKind === 'usdc' ? 'Stellar USDC' : 'the deal settlement asset';
  const topUpAmountLabel = `${formatStellarBaseUnits(amount)} ${settlementTokenSymbol || 'settlement units'}`;
  const livePaymentAvailable = Boolean(readiness?.enabled && readiness.liveExecutionEnabled);
  const hasValidStellarRecipient = StrKey.isValidEd25519PublicKey(walletAddress);
  const sourceRefundAddress: string | undefined = undefined;
  const hasSourceRefundRoute = Boolean(sourceRefundAddress || quoteDemoDestination);
  const paymentPreviewOnly = !livePaymentAvailable || quoteDemoDestination || !sourceRefundAddress;
  const quoteSourceAmount = selectedOriginAsset ? decimalToBaseUnits(sourceAmount, selectedOriginAsset.decimals) : '';
  const quoteRefundAddress = sourceRefundAddress || (paymentPreviewOnly ? getDryQuoteRefundAddress(selectedOriginAsset) : undefined);
  const quoteRequestAmount = quoteSourceAmount;

  const sourceAssetAvailable = Boolean(selectedOriginAsset);
  const canRequestQuote = useMemo(() => {
    return Boolean(
        readiness?.enabled &&
        hasValidStellarRecipient &&
        sourceAssetAvailable &&
        originAsset.trim() &&
        destinationAsset.trim() &&
        quoteRequestAmount.trim()
    );
  }, [destinationAsset, hasValidStellarRecipient, originAsset, quoteRequestAmount, readiness?.enabled, sourceAssetAvailable]);

  const nearIntent: NearIntentMetadata | undefined = status?.nearIntent || quote?.nearIntent;
  const quoteDetails = quote?.quote?.quote;
  const providerStatus =
    quoteDemoDestination && quote
      ? 'QUOTE_CREATED'
      : status?.status.status || nearIntent?.providerStatusRaw || (quote ? 'QUOTE_CREATED' : undefined);
  const statusColor = STATUS_COLORS[providerStatus || 'disabled'] || 'zinc';
  const expectedSettlement =
    quoteDetails?.amountOutFormatted ||
    nearIntent?.expectedDestinationAmount ||
    quoteDetails?.amountOut ||
    'Awaiting quote';
  const minimumSettlement =
    nearIntent?.minDestinationAmount ||
    quoteDetails?.minAmountOut ||
    'Awaiting quote';
  const quoteExpiry =
    quoteDetails?.deadline ||
    quoteDetails?.timeWhenInactive ||
    nearIntent?.deadline;
  const quoteReference = nearIntent?.quoteId || quote?.externalPaymentIntent?.intentId;

  const hasQuote = Boolean(nearIntent);
  const sourcePaymentSeen = ['KNOWN_DEPOSIT_TX', 'INCOMPLETE_DEPOSIT', 'PROCESSING', 'SUCCESS'].includes(providerStatus || '');
  const routingStarted = ['PROCESSING', 'SUCCESS'].includes(providerStatus || '');
  const settlementReported = providerStatus === 'SUCCESS';
  const paymentSteps: Array<{ label: string; state: StepState }> = [
    { label: hasQuote ? 'Top-up route quoted by 1Click' : 'Choose top-up source', state: hasQuote ? 'done' : 'active' },
    { label: 'Source payment pending', state: sourcePaymentSeen ? 'done' : hasQuote ? 'active' : 'pending' },
    { label: 'NEAR Intents routing', state: routingStarted ? 'done' : sourcePaymentSeen ? 'active' : 'pending' },
    {
      label: quoteDemoDestination ? 'Quote route priced by 1Click' : 'Settling on Stellar',
      state: settlementReported ? 'done' : routingStarted ? 'active' : 'pending',
    },
    {
      label: quoteDemoDestination ? 'Escrow funding not included in quote demo' : 'Fund Deal after wallet top-up',
      state: quoteDemoDestination ? 'pending' : settlementReported ? 'active' : 'pending',
    },
  ];

  const createQuote = async () => {
    if (!canRequestQuote) return;
    setLoadingQuote(true);
    setStatus(null);
    setError(null);
    try {
      const result = await nearIntentsClient.createQuote(REVIEW_BINDING_ID, {
        originAsset: originAsset.trim(),
        destinationAsset: destinationAsset.trim(),
        amount: quoteRequestAmount.trim(),
        refundTo: quoteRefundAddress,
        recipient: quoteDemoDestination ? undefined : walletAddress,
        dry: paymentPreviewOnly,
        slippageTolerance: 100,
      });
      setQuote(result);
      toast(isDealFundingMode ? 'Add Funds quote ready' : 'Cross-chain quote ready', 'success');
    } catch (err) {
      const apiError = err instanceof NearIntentsApiError ? err : new NearIntentsApiError(String(err), 500);
      setError(apiError);
      toast(apiError.message, 'error');
    } finally {
      setLoadingQuote(false);
    }
  };

  const refreshStatus = async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const result = await nearIntentsClient.getStatus(REVIEW_BINDING_ID);
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
      toast('Payment status refreshed', 'success');
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

  return (
    <Card className="p-4 sm:p-6 lg:p-8 bg-[#02040a]" glowOnHover>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-300 font-bold text-sm">
            {isDealFundingMode && milestoneIdx !== undefined ? milestoneIdx + 1 : 3}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight">
                Add funds from another chain
              </h3>
              <Tag color={readiness?.enabled ? 'blue' : 'zinc'}>{readiness?.enabled ? 'Available' : 'Unavailable'}</Tag>
              <Tag color="emerald">Escrow gated</Tag>
            </div>
            <p className="max-w-2xl text-sm text-zinc-400 leading-relaxed">
              {isDealFundingMode
                ? `Use NEAR Intents/1Click to quote a top-up for the remaining balance on Deal #${dealId ?? '-'}, anchored to Milestone ${
                    milestoneIdx !== undefined ? milestoneIdx + 1 : '-'
                  }. The route prepares the connected Stellar wallet; escrow locks only after the user confirms Fund Deal from that wallet.`
                : 'Use NEAR Intents/1Click to quote a cross-chain top-up into the connected Stellar wallet. Escrow funding still requires a separate Stellar transaction.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onClose && (
            <Button onClick={onClose} variant="secondary" className="py-3 text-xs">
              Close
            </Button>
          )}
          <Button onClick={loadReadiness} variant="secondary" className="py-3 text-xs" icon={loadingReadiness ? Loader2 : RefreshCw}>
            Refresh Availability
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5">
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Amount due</span>
                <input
                  value={isDealFundingMode ? topUpAmountLabel : amount}
                  onChange={(event) => {
                    if (!isDealFundingMode) setAmount(event.target.value);
                  }}
                  readOnly={isDealFundingMode}
                  className={`w-full bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2.5 text-sm text-zinc-100 font-mono outline-none ${
                    isDealFundingMode ? 'cursor-not-allowed text-zinc-300' : ''
                  }`}
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Settlement asset</span>
                {isDealFundingMode ? (
                  <div className={`w-full rounded-lg border px-3 py-2.5 text-sm font-bold ${
                    destinationAsset
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                      : 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                  }`}>
                    {lockedSettlementLabel}
                  </div>
                ) : destinationAllowlist.length > 0 ? (
                  <select
                    value={destinationAsset}
                    onChange={(event) => {
                      const nextDestinationAsset = event.target.value;
                      setDestinationAsset(nextDestinationAsset);
                    }}
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2.5 text-sm text-zinc-100 outline-none"
                  >
                    <option value="">Choose settlement asset</option>
                    {destinationAllowlist.map((asset) => (
                      <option key={asset} value={asset}>
                        {friendlySettlementAsset(asset)}
                        {demoDestinationAllowlist.includes(asset) ? ' (quote evidence)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2.5 text-sm font-bold text-zinc-500">
                    Settlement route unavailable
                  </div>
                )}
              </label>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pay from</span>
              <div className="grid grid-cols-1 sm:grid-cols-[0.85fr_1.15fr] gap-3">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Source chain</span>
                  <select
                    value={sourceChain}
                    onChange={(event) => {
                      setSourceChain(event.target.value);
                      setQuote(null);
                      setStatus(null);
                      setError(null);
                    }}
                    disabled={loadingTokens || sourceChains.length === 0}
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2.5 text-sm text-zinc-100 outline-none disabled:cursor-not-allowed disabled:text-zinc-600"
                  >
                    {sourceChains.length === 0 ? (
                      <option value="">{loadingTokens ? 'Loading chains...' : 'No source chains available'}</option>
                    ) : (
                      sourceChains.map((chain) => (
                        <option key={chain} value={chain}>
                          {chainLabel(chain)}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Source asset</span>
                  <select
                    value={originAsset}
                    onChange={(event) => {
                      setOriginAsset(event.target.value);
                      setQuote(null);
                      setStatus(null);
                      setError(null);
                    }}
                    disabled={loadingTokens || sourceTokensForChain.length === 0}
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2.5 text-sm text-zinc-100 outline-none disabled:cursor-not-allowed disabled:text-zinc-600"
                  >
                    {sourceTokensForChain.length === 0 ? (
                      <option value="">{loadingTokens ? 'Loading assets...' : 'No assets available'}</option>
                    ) : (
                      sourceTokensForChain.map((token) => (
                        <option key={token.assetId} value={token.assetId}>
                          {token.symbol}
                          {token.contractAddress ? ` · ${shortText(token.contractAddress)}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Source amount</span>
                <input
                  value={sourceAmount}
                  onChange={(event) => {
                    setSourceAmount(event.target.value.replace(/[^\d.]/g, ''));
                    setQuote(null);
                    setStatus(null);
                    setError(null);
                  }}
                  className="w-full bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2.5 text-sm text-zinc-100 font-mono outline-none"
                  placeholder="1"
                />
              </label>
              <p className="text-xs leading-relaxed text-zinc-500">
                Source assets come from live 1Click token discovery. Stellar direct funding stays in Fund Deal / Wallet Prep; this flow quotes cross-chain top-ups only.
              </p>
              {loadingTokens && (
                <p className="text-xs text-blue-300">Loading supported 1Click source assets...</p>
              )}
              {!loadingTokens && sourceTokens.length === 0 && (
                <p className="text-xs text-amber-300">No source assets are available from token discovery right now.</p>
              )}
            </div>

            {isDealFundingMode && sourceAssetAvailable && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-3 text-xs leading-relaxed text-blue-100/75">
                Dry quote preview: {sourceAmount || '0'} {selectedOriginAsset?.symbol} from {chainLabel(selectedOriginAsset?.blockchain)} into {settlementLabel}.
                Escrow still needs the full Stellar balance before Fund Deal.
              </div>
            )}

            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg border border-blue-500/20 bg-blue-500/10 flex items-center justify-center text-blue-300">
                    <Wallet size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-100">
                      {tokenLabel(selectedOriginAsset)}
                    </p>
                    <p className="text-xs text-zinc-500">Source payment</p>
                  </div>
                </div>
                <ArrowRightLeft size={18} className="hidden sm:block text-zinc-600" />
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center text-emerald-300">
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-100">{settlementLabel}</p>
                    <p className="text-xs text-zinc-500">
                      {quoteDemoDestination ? 'Quote evidence route' : 'Stellar escrow settlement'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {isDealFundingMode && (
              <div className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-3 text-xs leading-relaxed text-zinc-400">
                Top-up destination is locked to the deal settlement asset: Stellar USDC for USDC deals, or Stellar XLM for XLM deals.
                The source asset is what the user pays from. Quote previews are wired for supported 1Click routes; live source-wallet execution is a next step.
              </div>
            )}

            {settlementRouteMismatch && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed text-amber-200">
                This deal settles in {settlementTokenSymbol || 'the selected asset'}, so the cross-chain destination must be {expectedSettlementLabel}.
                No matching top-up route is configured in the current backend allowlist. Use direct funding or Wallet Prep unless that route is enabled.
              </div>
            )}

            {quoteDemoDestination && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-3 text-xs leading-relaxed text-blue-200">
                {isDealFundingMode
                  ? 'This selected destination is quote evidence only. It proves the route can price successfully, but it will not top up the Stellar wallet or fund this deal.'
                  : 'This destination is for signed 1Click quote evidence only. It proves the NEAR Intents route can price successfully; it does not top up the Stellar wallet or mark a deal funded.'}
              </div>
            )}

            {paymentPreviewOnly && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed text-amber-200">
                This environment can show pricing and route readiness. Source-chain payment instructions appear after live execution is enabled.
              </div>
            )}

            {!hasValidStellarRecipient && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-3 text-xs leading-relaxed text-red-200">
                Connect a Stellar wallet before requesting a cross-chain quote so settlement can target a real Stellar recipient.
              </div>
            )}

            {!sourceAssetAvailable && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed text-amber-200">
                This source will become available after its native wallet connection and refund route are wired.
              </div>
            )}

            {sourceAssetAvailable && !hasSourceRefundRoute && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed text-amber-200">
                Quote preview only: live source payment requires the source wallet connection so failed routes can refund there automatically.
              </div>
            )}

            <Button
              onClick={createQuote}
              disabled={loadingQuote || !canRequestQuote}
              variant={canRequestQuote ? 'primary' : 'secondary'}
              className="w-full py-4"
              icon={loadingQuote ? Loader2 : ShieldCheck}
            >
              {loadingQuote ? 'Getting Quote...' : isDealFundingMode ? 'Get Add Funds Quote' : 'Get Quote'}
            </Button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error.message}</span>
              </div>
              <p className="text-xs text-red-200/80">{errorHelp(error)}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Quote</h4>
                <p className="mt-1 text-[10px] text-zinc-500">Review the route before sending payment.</p>
              </div>
              <Tag color={statusColor}>{providerStatus ? providerStatus.replaceAll('_', ' ') : 'No quote'}</Tag>
            </div>

            {nearIntent ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <RouteMetric label="Send from" value={tokenLabel(selectedOriginAsset)} />
                  <RouteMetric label="Settle as" value={settlementLabel} />
                  <RouteMetric label="Estimated received" value={`${formatBaseAmount(expectedSettlement)} base units`} />
                  <RouteMetric label="Minimum received" value={`${formatBaseAmount(minimumSettlement)} base units`} />
                  <RouteMetric label="Quote expires" value={formatDateTime(quoteExpiry)} />
                  <RouteMetric label="Quote verified" value={nearIntent.signatureVerified ? 'Yes' : 'Pending'} />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock3 size={15} className="text-blue-300" />
                    <h5 className="text-sm font-bold text-zinc-100">Payment instructions</h5>
                  </div>
                  {nearIntent.depositAddress && !nearIntent.dry ? (
                    <>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Send to</p>
                          <p className="break-all font-mono text-xs text-zinc-300">{nearIntent.depositAddress}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyValue('Payment address', nearIntent.depositAddress)}
                          className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-zinc-500 hover:text-blue-300"
                          title="Copy payment address"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                      {nearIntent.depositMemo && (
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Memo</p>
                            <p className="break-all font-mono text-xs text-zinc-300">{nearIntent.depositMemo}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyValue('Payment memo', nearIntent.depositMemo)}
                            className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-zinc-500 hover:text-blue-300"
                            title="Copy payment memo"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs leading-relaxed text-zinc-500">
                      Payment instructions are hidden until the selected route is available for live execution.
                    </p>
                  )}
                  {quoteReference && (
                    <p className="text-[10px] text-zinc-600">Reference {shortText(quoteReference)}</p>
                  )}
                </div>

                <Button
                  onClick={refreshStatus}
                  disabled={loadingStatus || !nearIntent.depositAddress}
                  variant="secondary"
                  className="w-full py-3 text-xs"
                  icon={loadingStatus ? Loader2 : RefreshCw}
                >
                  {loadingStatus ? 'Refreshing Status...' : 'Refresh Payment Status'}
                </Button>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-black/20 p-6 text-center">
                <ShieldCheck size={24} className="mx-auto mb-3 text-zinc-600" />
                <p className="text-sm font-bold text-zinc-400">No payment quote yet</p>
                <p className="mt-1 text-xs text-zinc-600">Choose a source asset and request a quote.</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Payment status</h4>
                <p className="mt-1 text-[10px] text-zinc-500">Escrow updates after Stellar settlement is indexed.</p>
              </div>
              {settlementReported && (
                <Tag color="amber">Awaiting escrow event</Tag>
              )}
            </div>
            <div className="space-y-2">
              {paymentSteps.map((step) => (
                <PaymentStep key={step.label} label={step.label} state={step.state} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200 leading-relaxed flex items-start gap-3">
            <Timer size={16} className="mt-0.5 shrink-0 text-amber-300" />
            <span>
              Cross-chain payment status is not escrow state. Funds count as locked only after the Stellar DealEscrow funded event is indexed.
            </span>
          </div>

          {status?.status.status === 'SUCCESS' && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-200 leading-relaxed flex items-start gap-3">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <span>Settlement is reported complete. Reconcile Stellar events before showing the milestone as funded.</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
