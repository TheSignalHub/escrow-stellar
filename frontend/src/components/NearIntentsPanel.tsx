import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
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
  type NearIntentDepositTxResponse,
  type NearIntentMetadata,
  type NearIntentQuoteResponse,
  type NearIntentStatusResponse,
  type NearIntentsReadiness,
  type NearIntentsToken,
} from '../lib/nearIntents';
import { accountExists, IS_TESTNET, SETTLEMENT_TOKEN_DECIMALS, USDC_TOKEN_ADDRESS, XLM_SAC_ADDRESS } from '../lib/stellar';
import { useEvmSourceWallet } from '../hooks/useEvmSourceWallet';
import { Card, Button, Tag } from './ui/Components';

interface NearIntentsPanelProps {
  walletAddress: string;
  mode?: 'routePreview' | 'dealFunding';
  dealId?: number;
  milestoneIdx?: number;
  amountDue?: string;
  settlementTokenAddress?: string;
  settlementTokenSymbol?: string;
  stepNumber?: number;
  onClose?: () => void;
  onNavigateToFiatTopUp?: () => void;
}

type StepState = 'done' | 'active' | 'pending';

const REVIEW_BINDING_ID = 'mb_sig-demo-001';
const NEAR_QUOTE_DEMO_ASSET_ID = 'nep141:usdt.tether-token.near';
const EVM_DRY_QUOTE_REFUND_ADDRESS = '0x1111111111111111111111111111111111111111';
const SOLANA_DRY_QUOTE_REFUND_ADDRESS = '11111111111111111111111111111111';
const EVM_CHAINS = new Set(['eth', 'base', 'arb', 'op', 'avax', 'bsc', 'pol', 'gnosis', 'bera', 'xlayer', 'monad', 'plasma', 'scroll']);
const EVM_CHAIN_IDS: Record<string, string> = {
  eth: '0x1',
  base: '0x2105',
  arb: '0xa4b1',
  op: '0xa',
  avax: '0xa86a',
  bsc: '0x38',
  pol: '0x89',
  gnosis: '0x64',
  bera: '0x138d5',
  xlayer: '0xc4',
  scroll: '0x82750',
};
const EVM_TX_EXPLORERS: Record<string, string> = {
  eth: 'https://etherscan.io/tx/',
  base: 'https://basescan.org/tx/',
  arb: 'https://arbiscan.io/tx/',
  op: 'https://optimistic.etherscan.io/tx/',
  avax: 'https://snowtrace.io/tx/',
  bsc: 'https://bscscan.com/tx/',
  pol: 'https://polygonscan.com/tx/',
  gnosis: 'https://gnosisscan.io/tx/',
  scroll: 'https://scrollscan.com/tx/',
};
const DRY_QUOTE_SOURCE_CHAINS = new Set(['near', 'sol', ...EVM_CHAINS]);
const RECOMMENDED_SOURCE_ROUTES = [
  { chain: 'near', symbol: 'wNEAR' },
  { chain: 'eth', symbol: 'USDC' },
  { chain: 'eth', symbol: 'ETH' },
  { chain: 'base', symbol: 'USDC' },
  { chain: 'base', symbol: 'ETH' },
  { chain: 'sol', symbol: 'USDC' },
  { chain: 'sol', symbol: 'SOL' },
  { chain: 'avax', symbol: 'USDC' },
  { chain: 'pol', symbol: 'USDC' },
] as const;

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

function shortText(value?: string): string {
  if (!value) return 'not available';
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function isEvmAddress(value?: string): boolean {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

function toHexQuantity(value: string): string {
  return `0x${BigInt(value).toString(16)}`;
}

function padHexWord(value: string): string {
  return value.replace(/^0x/, '').padStart(64, '0');
}

function encodeErc20Transfer(to: string, amount: string): string {
  return `0xa9059cbb${padHexWord(to)}${padHexWord(toHexQuantity(amount))}`;
}

function isNativeEvmToken(token?: NearIntentsToken): boolean {
  if (!token) return false;
  const symbol = token.symbol.toUpperCase();
  const assetId = token.assetId.toLowerCase();
  return !token.contractAddress || assetId.startsWith('native:') || ['ETH', 'BNB', 'MATIC', 'AVAX'].includes(symbol);
}

function sourceTxExplorerUrl(token: NearIntentsToken | undefined, txHash: string): string {
  if (!token || !txHash) return '';
  const baseUrl = EVM_TX_EXPLORERS[token.blockchain];
  return baseUrl ? `${baseUrl}${txHash}` : '';
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

function formatDestinationAmount(value?: string, destinationAsset?: string): string {
  if (!value || !/^\d+$/.test(value)) return value || 'Awaiting quote';
  const label = friendlySettlementAsset(destinationAsset);
  const symbol = label.includes('XLM') ? 'XLM' : label.includes('USDC') ? 'USDC' : label;
  try {
    const decimals = 7;
    const scale = 10n ** BigInt(decimals);
    const raw = BigInt(value);
    const whole = raw / scale;
    const fraction = raw % scale;
    const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
    const display = fractionText ? `${whole.toLocaleString()}.${fractionText}` : whole.toLocaleString();
    return `${display} ${symbol}`;
  } catch {
    return `${value} ${symbol}`;
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

function findXlmDestinationAsset(assetIds: string[]): string {
  return assetIds.find((assetId) => getSettlementKindFromAssetId(assetId) === 'xlm') || '';
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

function tokenSelectLabel(token: NearIntentsToken): string {
  return token.symbol;
}

function chainIdLabel(chainId?: string): string {
  const labels: Record<string, string> = {
    '0x1': 'Ethereum',
    '0x2105': 'Base',
    '0xa': 'Optimism',
    '0xa4b1': 'Arbitrum',
    '0x89': 'Polygon',
    '0xa86a': 'Avalanche',
    '0x38': 'BNB Chain',
    '0x64': 'Gnosis',
  };
  if (!chainId) return 'Network unknown';
  return labels[chainId.toLowerCase()] || chainId;
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

function isRecommendedSourceToken(token?: NearIntentsToken): boolean {
  if (!token) return false;
  return RECOMMENDED_SOURCE_ROUTES.some(
    (route) => route.chain === token.blockchain && route.symbol.toUpperCase() === token.symbol.toUpperCase()
  );
}

function routeRank(token: NearIntentsToken): number {
  const symbol = token.symbol.toUpperCase();
  if (isRecommendedSourceToken(token)) return 0;
  if (symbol === 'USDC') return 1;
  if (symbol === 'USDT') return 2;
  if (['ETH', 'SOL', 'NEAR', 'WNEAR'].includes(symbol)) return 3;
  return 4;
}

function sortSourceTokens(tokens: NearIntentsToken[]): NearIntentsToken[] {
  return [...tokens].sort((a, b) => {
    const rankDiff = routeRank(a) - routeRank(b);
    if (rankDiff !== 0) return rankDiff;
    return `${a.symbol} ${a.assetId}`.localeCompare(`${b.symbol} ${b.assetId}`);
  });
}

function parsePrice(value?: number | string): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatSourceAmount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '1';
  const fixed = value >= 100 ? value.toFixed(2) : value >= 1 ? value.toFixed(6) : value.toPrecision(6);
  return fixed.replace(/\.?0+$/, '');
}

function estimateSourceAmount(
  targetBaseUnits: string,
  destinationToken: NearIntentsToken | undefined,
  sourceToken: NearIntentsToken | undefined
): string {
  if (!targetBaseUnits || !/^\d+$/.test(targetBaseUnits) || !destinationToken || !sourceToken) return '1';
  const destinationPrice = parsePrice(destinationToken.price);
  const sourcePrice = parsePrice(sourceToken.price);
  if (!destinationPrice || !sourcePrice) return '1';
  const targetUnits = Number(targetBaseUnits) / 10 ** 7;
  if (!Number.isFinite(targetUnits) || targetUnits <= 0) return '1';
  return formatSourceAmount((targetUnits * destinationPrice) / sourcePrice);
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
  if (isRouteUnavailableError(error)) {
    return '1Click can see both assets, but market makers are not quoting this exact pair/size right now. Pick a recommended route such as wNEAR, ETH, USDC, or SOL and retry.';
  }
  if (error.status === 401) return 'Payment quotes require a protected reviewer session in this environment.';
  if (error.status === 503) return 'Cross-chain payments are not available in this environment yet.';
  if (error.status === 400) return 'Check the source asset, settlement asset, and amount, then request a new quote.';
  return 'Retry shortly. If this continues, check the payment service logs.';
}

function isRouteUnavailableError(error: NearIntentsApiError | null): boolean {
  if (!error) return false;
  return /no liquidity available|quoting for this pair is not available|no_quote|route.*not available/i.test(error.message);
}

function friendlyErrorTitle(error: NearIntentsApiError | null): string {
  if (!error) return '';
  if (isRouteUnavailableError(error)) return 'No quoted route for this pair';
  return error.message;
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
  stepNumber,
  onClose,
  onNavigateToFiatTopUp,
}: NearIntentsPanelProps) {
  const toast = useToast();
  const evmSourceWallet = useEvmSourceWallet();
  const [readiness, setReadiness] = useState<NearIntentsReadiness | null>(null);
  const [allTokens, setAllTokens] = useState<NearIntentsToken[]>([]);
  const [sourceTokens, setSourceTokens] = useState<NearIntentsToken[]>([]);
  const [sourceChain, setSourceChain] = useState('');
  const [originAsset, setOriginAsset] = useState('');
  const [destinationAsset, setDestinationAsset] = useState('');
  const [amount, setAmount] = useState(amountDue || '10');
  const [sourceAmount, setSourceAmount] = useState('1');
  const [sourceAmountTouched, setSourceAmountTouched] = useState(false);
  const [recentlyQuotedAssetIds, setRecentlyQuotedAssetIds] = useState<string[]>([]);
  const [quote, setQuote] = useState<NearIntentQuoteResponse | null>(null);
  const [status, setStatus] = useState<NearIntentStatusResponse | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [sendingSourcePayment, setSendingSourcePayment] = useState(false);
  const [sourcePaymentTxHash, setSourcePaymentTxHash] = useState('');
  const [sourcePaymentError, setSourcePaymentError] = useState('');
  const [lastStatusCheckedAt, setLastStatusCheckedAt] = useState('');
  const [error, setError] = useState<NearIntentsApiError | null>(null);
  const [stellarRecipientExists, setStellarRecipientExists] = useState<boolean | null>(null);

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
      setAllTokens(tokens);
      setSourceTokens(sortSourceTokens(tokens.filter(isQuotePreviewSourceToken)));
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
    const priority = ['near', 'eth', 'base', 'sol', 'avax', 'pol', 'arb', 'op'];
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
    () => sortSourceTokens(sourceTokens.filter((token) => token.blockchain === sourceChain)),
    [sourceChain, sourceTokens]
  );
  const selectedOriginAsset = sourceTokens.find((token) => token.assetId === originAsset);
  const recommendedTokens = useMemo(() => {
    const seen = new Set<string>();
    return RECOMMENDED_SOURCE_ROUTES
      .map((route) =>
        sourceTokens.find(
          (token) => token.blockchain === route.chain && token.symbol.toUpperCase() === route.symbol.toUpperCase()
        )
      )
      .filter((token): token is NearIntentsToken => Boolean(token))
      .filter((token) => {
        if (seen.has(token.assetId)) return false;
        seen.add(token.assetId);
        return true;
      });
  }, [sourceTokens]);

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
      sourceTokensForChain.find(isRecommendedSourceToken) ||
      sourceTokensForChain.find((token) => token.symbol.toUpperCase() === 'USDC') ||
      sourceTokensForChain.find((token) => token.symbol.toUpperCase() === 'NEAR') ||
      sourceTokensForChain[0];
    setOriginAsset(preferred.assetId);
    setSourceAmountTouched(false);
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
  const routePreviewDefaultDestination = !isDealFundingMode ? findXlmDestinationAsset(destinationAllowlist) : '';
  const configuredDefaultDestination = readiness?.destinationAssets?.default || '';

  useEffect(() => {
    const nextDestinationAsset =
      preferredDestinationAsset ||
      routePreviewDefaultDestination ||
      (destinationAllowlist.includes(configuredDefaultDestination) ? configuredDefaultDestination : destinationAllowlist[0] || '');

    if (destinationAsset && !destinationAllowlist.includes(destinationAsset)) {
      setDestinationAsset(nextDestinationAsset);
      return;
    }
    if (nextDestinationAsset && !destinationAsset) setDestinationAsset(nextDestinationAsset);
  }, [configuredDefaultDestination, destinationAllowlist, destinationAsset, preferredDestinationAsset, routePreviewDefaultDestination]);

  const quoteDemoDestination = demoDestinationAllowlist.includes(destinationAsset);
  const destinationToken = allTokens.find((token) => token.assetId === destinationAsset);
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
  const targetTopUpBaseUnits = isDealFundingMode ? amount : decimalToBaseUnits(amount, 7);
  const topUpAmountLabel = isDealFundingMode
    ? `${formatStellarBaseUnits(amount)} ${settlementTokenSymbol || 'settlement units'}`
    : `${amount || '0'} ${settlementLabel.includes('USDC') ? 'USDC' : 'XLM'}`;
  const livePaymentAvailable = Boolean(readiness?.enabled && readiness.liveExecutionEnabled);
  const hasValidStellarRecipient = StrKey.isValidEd25519PublicKey(walletAddress);
  const hasActivatedStellarRecipient = IS_TESTNET || stellarRecipientExists === true;
  const sourceUsesEvmWallet = Boolean(selectedOriginAsset && EVM_CHAINS.has(selectedOriginAsset.blockchain));
  const sourceConnectorKind = sourceUsesEvmWallet
    ? 'evm'
    : selectedOriginAsset?.blockchain === 'near'
      ? 'near'
      : selectedOriginAsset?.blockchain === 'sol'
        ? 'solana'
        : selectedOriginAsset
          ? 'unsupported'
          : 'none';
  const sourceRefundAddress: string | undefined =
    sourceUsesEvmWallet && evmSourceWallet.address ? evmSourceWallet.address : undefined;
  const hasSourceRefundRoute = Boolean(sourceRefundAddress || quoteDemoDestination);
  const paymentPreviewOnly = !livePaymentAvailable || quoteDemoDestination || !sourceRefundAddress;
  const liveSourceWalletReady = Boolean(
    livePaymentAvailable &&
    !quoteDemoDestination &&
    sourceUsesEvmWallet &&
    evmSourceWallet.isConnected &&
    sourceRefundAddress
  );
  const quoteSourceAmount = selectedOriginAsset ? decimalToBaseUnits(sourceAmount, selectedOriginAsset.decimals) : '';
  const quoteRequestAmount = quoteSourceAmount;
  const suggestedSourceAmount = estimateSourceAmount(targetTopUpBaseUnits, destinationToken, selectedOriginAsset);
  const selectedRouteRecommended = isRecommendedSourceToken(selectedOriginAsset);
  const selectedRouteRecentlyQuoted = Boolean(selectedOriginAsset && recentlyQuotedAssetIds.includes(selectedOriginAsset.assetId));
  const canFiatTopUpSelectedSource = Boolean(
    onNavigateToFiatTopUp &&
    selectedOriginAsset &&
    EVM_CHAINS.has(selectedOriginAsset.blockchain) &&
    selectedOriginAsset.symbol.toUpperCase() === 'USDC'
  );

  useEffect(() => {
    let cancelled = false;
    if (!hasValidStellarRecipient) {
      setStellarRecipientExists(null);
      return;
    }

    accountExists(walletAddress).then((exists) => {
      if (!cancelled) setStellarRecipientExists(exists);
    });

    return () => {
      cancelled = true;
    };
  }, [hasValidStellarRecipient, walletAddress]);

  useEffect(() => {
    if (!selectedOriginAsset || sourceAmountTouched) return;
    setSourceAmount(suggestedSourceAmount);
  }, [selectedOriginAsset, sourceAmountTouched, suggestedSourceAmount]);

  useEffect(() => {
    setSourcePaymentTxHash('');
    setSourcePaymentError('');
  }, [destinationAsset, originAsset, sourceAmount]);

  const sourceAssetAvailable = Boolean(selectedOriginAsset);
  const canRequestQuote = useMemo(() => {
    return Boolean(
        readiness?.enabled &&
        hasValidStellarRecipient &&
        hasActivatedStellarRecipient &&
        sourceAssetAvailable &&
        originAsset.trim() &&
        destinationAsset.trim() &&
        quoteRequestAmount.trim()
    );
  }, [destinationAsset, hasActivatedStellarRecipient, hasValidStellarRecipient, originAsset, quoteRequestAmount, readiness?.enabled, sourceAssetAvailable]);

  const nearIntent: NearIntentMetadata | undefined = status?.nearIntent || quote?.nearIntent;
  const quoteDetails = quote?.quote?.quote;
  const providerStatus =
    quoteDemoDestination && quote
      ? 'QUOTE_CREATED'
      : status?.status?.status || nearIntent?.providerStatusRaw || (quote ? 'QUOTE_CREATED' : undefined);
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
  const sourcePaymentAmount = nearIntent?.sourceAmount || quoteDetails?.amountIn || quoteRequestAmount;
  const statusUpdatedAt = status?.status?.updatedAt || nearIntent?.providerStatusUpdatedAt || status?.externalPaymentIntent.updatedAt;
  const detectedSourceTx =
    status?.status?.swapDetails?.originChainTxHashes?.[0] ||
    status?.status?.swapDetails?.sourceChainTxHashes?.[0];
  const detectedDestinationTx = status?.status?.swapDetails?.destinationChainTxHashes?.[0];
  const displayedSourceTxHash = sourcePaymentTxHash || nearIntent?.submittedDepositTxHash || detectedSourceTx?.hash || '';
  const displayedSourceTxUrl =
    detectedSourceTx?.explorerUrl || sourceTxExplorerUrl(selectedOriginAsset, displayedSourceTxHash);
  const nearExplorerUrl = nearIntent?.depositAddress
    ? `https://explorer.near-intents.org/?search=${encodeURIComponent(nearIntent.depositAddress)}`
    : '';
  const canSendEvmSourcePayment = Boolean(
    liveSourceWalletReady &&
    nearIntent?.depositAddress &&
    !nearIntent.dry &&
    selectedOriginAsset &&
    sourcePaymentAmount &&
    isEvmAddress(nearIntent.depositAddress)
  );

  const hasQuote = Boolean(nearIntent);
  const sourcePaymentSeen = Boolean(sourcePaymentTxHash) || ['KNOWN_DEPOSIT_TX', 'INCOMPLETE_DEPOSIT', 'PROCESSING', 'SUCCESS'].includes(providerStatus || '');
  const routingStarted = ['PROCESSING', 'SUCCESS'].includes(providerStatus || '');
  const settlementReported = providerStatus === 'SUCCESS';
  const paymentSteps: Array<{ label: string; state: StepState }> = [
    { label: hasQuote ? 'Top-up route quoted by 1Click' : 'Choose top-up source', state: hasQuote ? 'done' : 'active' },
    { label: 'Waiting for 1Click to detect source payment', state: sourcePaymentSeen ? 'done' : hasQuote ? 'active' : 'pending' },
    { label: 'Routing through 1Click / NEAR Intents', state: routingStarted ? 'done' : sourcePaymentSeen ? 'active' : 'pending' },
    {
      label: quoteDemoDestination ? 'Quote route priced by 1Click' : 'Sending settlement to Stellar wallet',
      state: settlementReported ? 'done' : routingStarted ? 'active' : 'pending',
    },
    {
      label: quoteDemoDestination
        ? isDealFundingMode ? 'Escrow funding not included in quote demo' : 'Wallet top-up not included in quote demo'
        : isDealFundingMode ? 'Fund Deal from Stellar wallet' : 'Return to Deals after wallet top-up',
      state: quoteDemoDestination ? 'pending' : settlementReported ? 'active' : 'pending',
    },
  ];

  const createQuote = async ({ forceDry = false }: { forceDry?: boolean } = {}) => {
    if (!canRequestQuote) return;
    const dry = forceDry || paymentPreviewOnly;
    const refundTo = sourceRefundAddress || (dry ? getDryQuoteRefundAddress(selectedOriginAsset) : undefined);
    setLoadingQuote(true);
    setStatus(null);
    setError(null);
    try {
      const result = await nearIntentsClient.createQuote(REVIEW_BINDING_ID, {
        originAsset: originAsset.trim(),
        destinationAsset: destinationAsset.trim(),
        amount: quoteRequestAmount.trim(),
        refundTo,
        recipient: quoteDemoDestination ? undefined : walletAddress,
        dry,
        slippageTolerance: 100,
      });
      setQuote(result);
      setSourcePaymentTxHash('');
      setSourcePaymentError('');
      setRecentlyQuotedAssetIds((current) =>
        originAsset ? [originAsset, ...current.filter((assetId) => assetId !== originAsset)].slice(0, 12) : current
      );
      toast(dry ? 'Quote preview ready' : isDealFundingMode ? 'Live Add Funds quote ready' : 'Live cross-chain quote ready', 'success');
    } catch (err) {
      const apiError = err instanceof NearIntentsApiError ? err : new NearIntentsApiError(String(err), 500);
      setError(apiError);
      toast(apiError.message, 'error');
    } finally {
      setLoadingQuote(false);
    }
  };

  const applyStatusResult = (result: NearIntentStatusResponse | NearIntentDepositTxResponse) => {
    if ('status' in result) setStatus(result);
    setLastStatusCheckedAt(new Date().toISOString());
    if (result.nearIntent.submittedDepositTxHash) setSourcePaymentTxHash(result.nearIntent.submittedDepositTxHash);
    setQuote((current) =>
      current
        ? {
            ...current,
            externalPaymentIntent: result.externalPaymentIntent,
            nearIntent: result.nearIntent,
          }
        : current
    );
  };

  const refreshStatus = async ({ quiet = false }: { quiet?: boolean } = {}) => {
    setLoadingStatus(true);
    setError(null);
    try {
      const result = await nearIntentsClient.getStatus(REVIEW_BINDING_ID);
      applyStatusResult(result);
      if (!quiet) toast('Payment status refreshed', 'success');
    } catch (err) {
      const apiError = err instanceof NearIntentsApiError ? err : new NearIntentsApiError(String(err), 500);
      setError(apiError);
      if (!quiet) toast(apiError.message, 'error');
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    const shouldAutoPoll = Boolean(
      displayedSourceTxHash &&
      nearIntent?.depositAddress &&
      providerStatus &&
      !['SUCCESS', 'FAILED', 'REFUNDED'].includes(providerStatus)
    );
    if (!shouldAutoPoll) return;

    const pollMs = Math.max(10, readiness?.pollIntervalSeconds || 20) * 1000;
    const interval = window.setInterval(() => {
      void refreshStatus({ quiet: true });
    }, pollMs);

    return () => window.clearInterval(interval);
  }, [displayedSourceTxHash, nearIntent?.depositAddress, providerStatus, readiness?.pollIntervalSeconds]);

  const sendEvmSourcePayment = async () => {
    if (!canSendEvmSourcePayment || !nearIntent?.depositAddress || !selectedOriginAsset || !sourcePaymentAmount) return;
    const provider = evmSourceWallet.provider;
    if (!provider) {
      setSourcePaymentError('Connect an EVM wallet before sending source-chain payment.');
      return;
    }
    if (nearIntent.depositMemo) {
      setSourcePaymentError('This route returned a memo requirement, so use manual payment instructions for this quote.');
      return;
    }

    setSendingSourcePayment(true);
    setSourcePaymentError('');
    try {
      const expectedChainId = EVM_CHAIN_IDS[selectedOriginAsset.blockchain];
      if (expectedChainId && evmSourceWallet.chainId.toLowerCase() !== expectedChainId.toLowerCase()) {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: expectedChainId }],
        });
      }

      const amountHex = toHexQuantity(sourcePaymentAmount);
      if (!isNativeEvmToken(selectedOriginAsset) && !isEvmAddress(selectedOriginAsset.contractAddress)) {
        throw new Error('Selected source token is missing a valid EVM token contract.');
      }
      const txParams = isNativeEvmToken(selectedOriginAsset)
        ? {
            from: evmSourceWallet.address,
            to: nearIntent.depositAddress,
            value: amountHex,
          }
        : {
            from: evmSourceWallet.address,
            to: selectedOriginAsset.contractAddress,
            value: '0x0',
            data: encodeErc20Transfer(nearIntent.depositAddress, sourcePaymentAmount),
          };

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
      const normalizedHash = typeof txHash === 'string' ? txHash : '';
      setSourcePaymentTxHash(normalizedHash);
      toast('Source payment submitted', 'success');
      if (normalizedHash) {
        try {
          const result = await nearIntentsClient.submitDepositTx(REVIEW_BINDING_ID, { txHash: normalizedHash });
          applyStatusResult(result);
        } catch {
          setSourcePaymentError('Source transaction was submitted. 1Click notification is still pending, so use Refresh Payment Status to continue tracking.');
          void refreshStatus({ quiet: true });
        }
      } else {
        void refreshStatus();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Source payment was rejected or failed before submission.';
      setSourcePaymentError(message);
      toast(message, 'error');
    } finally {
      setSendingSourcePayment(false);
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
            {stepNumber ?? (isDealFundingMode && milestoneIdx !== undefined ? milestoneIdx + 1 : 4)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight">
                Add funds from another chain
              </h3>
              <Tag color={readiness?.enabled ? 'blue' : 'zinc'}>{readiness?.enabled ? 'Available' : 'Unavailable'}</Tag>
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5">
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {isDealFundingMode ? 'Amount due' : 'Target top-up amount'}
                </span>
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

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pay from</span>
                <Tag color={liveSourceWalletReady ? 'emerald' : 'amber'}>
                  {liveSourceWalletReady ? 'Ready' : 'Preview'}
                </Tag>
              </div>

              {recommendedTokens.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recommendedTokens.slice(0, 9).map((token) => {
                    const selected = token.assetId === originAsset;
                    return (
                      <button
                        key={token.assetId}
                        type="button"
                        onClick={() => {
                          setSourceChain(token.blockchain);
                          setOriginAsset(token.assetId);
                          setSourceAmountTouched(false);
                          setQuote(null);
                          setStatus(null);
                          setError(null);
                        }}
                        className={`shrink-0 rounded-lg border px-3 py-2 text-left transition ${
                          selected
                            ? 'border-blue-400 bg-blue-500/15 text-blue-100'
                            : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-blue-500/40 hover:text-blue-100'
                        }`}
                      >
                        <span className="block text-xs font-black">{token.symbol}</span>
                        <span className="block text-[9px] uppercase tracking-widest text-zinc-500">{chainLabel(token.blockchain)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">You pay</span>
                  {sourceAssetAvailable && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                      {selectedRouteRecommended ? 'recommended' : '1Click route'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    value={sourceAmount}
                    onChange={(event) => {
                      setSourceAmount(event.target.value.replace(/[^\d.]/g, ''));
                      setSourceAmountTouched(true);
                      setQuote(null);
                      setStatus(null);
                      setError(null);
                    }}
                    className="min-w-0 max-w-full bg-transparent text-2xl sm:text-3xl font-mono text-zinc-100 outline-none"
                    placeholder="0"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={sourceChain}
                      onChange={(event) => {
                        setSourceChain(event.target.value);
                        setSourceAmountTouched(false);
                        setQuote(null);
                        setStatus(null);
                        setError(null);
                      }}
                      disabled={loadingTokens || sourceChains.length === 0}
                      className="w-full min-w-0 bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2 text-xs font-bold text-zinc-100 outline-none disabled:cursor-not-allowed disabled:text-zinc-600"
                    >
                      {sourceChains.length === 0 ? (
                        <option value="">{loadingTokens ? 'Loading chains...' : 'No chains'}</option>
                      ) : (
                        sourceChains.map((chain) => (
                          <option key={chain} value={chain}>
                            {chainLabel(chain)}
                          </option>
                        ))
                      )}
                    </select>
                    <select
                      value={originAsset}
                      onChange={(event) => {
                        setOriginAsset(event.target.value);
                        setSourceAmountTouched(false);
                        setQuote(null);
                        setStatus(null);
                        setError(null);
                      }}
                      disabled={loadingTokens || sourceTokensForChain.length === 0}
                      className="w-full min-w-0 bg-[#09090b] border border-zinc-800 focus:border-blue-500/50 rounded-lg px-3 py-2 text-xs font-bold text-zinc-100 outline-none disabled:cursor-not-allowed disabled:text-zinc-600"
                    >
                      {sourceTokensForChain.length === 0 ? (
                        <option value="">{loadingTokens ? 'Loading assets...' : 'No assets'}</option>
                      ) : (
                        sourceTokensForChain.map((token) => (
                          <option key={token.assetId} value={token.assetId}>
                            {tokenSelectLabel(token)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="relative flex justify-center">
                <div className="absolute inset-x-0 top-1/2 border-t border-zinc-800" />
                <div className="relative h-9 w-9 rounded-full border border-zinc-700 bg-zinc-950 flex items-center justify-center text-zinc-400">
                  <ArrowRightLeft size={16} />
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200/80">You receive</span>
                  <Tag color="emerald">Stellar wallet</Tag>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-2xl font-black text-emerald-100">{settlementLabel}</p>
                    <p className="mt-1 text-xs text-emerald-100/60">
                      {quoteDemoDestination ? 'Quote evidence only' : `To ${shortText(walletAddress)}`}
                    </p>
                  </div>
                  <ShieldCheck className="shrink-0 text-emerald-300" size={24} />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Source wallet</p>
                    <p className="mt-1 break-words text-sm text-zinc-300">
                      {sourceUsesEvmWallet
                        ? evmSourceWallet.isConnected
                          ? `${shortText(evmSourceWallet.address)} · ${chainIdLabel(evmSourceWallet.chainId)}`
                          : `Connect wallet for ${chainLabel(selectedOriginAsset?.blockchain)} live payment`
                        : sourceConnectorKind === 'near'
                          ? 'NEAR source wallet support coming soon'
                          : sourceConnectorKind === 'solana'
                            ? 'Solana source wallet support coming soon'
                            : 'Source wallet support coming soon'}
                    </p>
                  </div>
                  {sourceUsesEvmWallet && (
                  <Button
                      onClick={evmSourceWallet.isConnected ? evmSourceWallet.disconnect : evmSourceWallet.connect}
                      variant={evmSourceWallet.isConnected ? 'secondary' : 'primary'}
                      className="w-full sm:w-auto py-3 text-xs"
                      icon={evmSourceWallet.isConnecting ? Loader2 : Wallet}
                    >
                      {evmSourceWallet.isConnecting
                        ? 'Connecting...'
                        : evmSourceWallet.isConnected
                          ? 'Disconnect'
                          : evmSourceWallet.isAvailable
                            ? 'Connect'
                            : 'Detect Wallet'}
                    </Button>
                  )}
                </div>
                {evmSourceWallet.error && (
                  <p className="mt-3 text-xs leading-relaxed text-red-300">{evmSourceWallet.error}</p>
                )}
              </div>

              <p className="text-xs leading-relaxed text-zinc-500">
                Source assets come from live 1Click discovery. This tops up your Stellar wallet; escrow locks later when you click Fund Deal.
              </p>
              <div className="flex flex-wrap gap-2">
                {sourceAssetAvailable && <Tag color={selectedRouteRecommended ? 'blue' : 'zinc'}>{selectedRouteRecommended ? 'Recommended route' : 'Discovered route'}</Tag>}
                {selectedRouteRecentlyQuoted && <Tag color="emerald">Recently quoted</Tag>}
                {!sourceAmountTouched && <Tag color="zinc">Estimated from live prices</Tag>}
              </div>
              {loadingTokens && <p className="text-xs text-blue-300">Loading supported 1Click source assets...</p>}
              {!loadingTokens && sourceTokens.length === 0 && (
                <p className="text-xs text-amber-300">No source assets are available from token discovery right now.</p>
              )}
            </div>

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
                Preview mode: pricing only. Connect a supported source wallet to pay.
              </div>
            )}

            {!hasValidStellarRecipient && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-3 text-xs leading-relaxed text-red-200">
                Connect a Stellar wallet before requesting a cross-chain quote so settlement can target a real Stellar recipient.
              </div>
            )}

            {hasValidStellarRecipient && !hasActivatedStellarRecipient && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed text-amber-200">
                Activate the connected Stellar wallet with XLM before requesting a cross-chain top-up. NEAR Intents settlement requires an existing Stellar destination account.
              </div>
            )}

            {!sourceAssetAvailable && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed text-amber-200">
                This source will become available after its native wallet connection and refund route are wired.
              </div>
            )}

            {sourceAssetAvailable && !hasSourceRefundRoute && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed text-amber-200">
                Connect the source wallet to unlock live payment and automatic refunds.
              </div>
            )}

            {canFiatTopUpSelectedSource && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 space-y-3">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-blue-200">Need source funds?</p>
                    <p className="mt-1 text-xs leading-relaxed text-blue-100/75">
                      Buy USDC with fiat in Wallet Prep, then return here to route it into Stellar with NEAR Intents.
                    </p>
                  </div>
                  <Button
                    onClick={onNavigateToFiatTopUp}
                    variant="secondary"
                    className="py-3 text-xs border-blue-500/30 text-blue-200 hover:border-blue-400/60"
                    icon={CreditCard}
                  >
                    Buy USDC
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => createQuote({ forceDry: true })}
                disabled={loadingQuote || !canRequestQuote}
                variant="secondary"
                className="w-full py-4"
                icon={loadingQuote ? Loader2 : ShieldCheck}
              >
                {loadingQuote ? 'Getting Quote...' : 'Preview Quote'}
              </Button>
              <Button
                onClick={() => createQuote({ forceDry: false })}
                disabled={loadingQuote || !canRequestQuote || !liveSourceWalletReady}
                variant={canRequestQuote && liveSourceWalletReady ? 'primary' : 'secondary'}
                className="w-full py-4"
                icon={loadingQuote ? Loader2 : Wallet}
              >
                {loadingQuote ? 'Getting Quote...' : 'Get Live Payment Quote'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{friendlyErrorTitle(error)}</span>
              </div>
              {friendlyErrorTitle(error) !== error.message && (
                <p className="text-[10px] text-red-200/60">Provider response: {error.message}</p>
              )}
              <p className="text-xs text-red-200/80">{errorHelp(error)}</p>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-4">
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
                <div className="grid grid-cols-1 gap-2">
                  <RouteMetric label="Send from" value={tokenLabel(selectedOriginAsset)} />
                  <RouteMetric label="Settle as" value={settlementLabel} />
                  <RouteMetric label="Estimated received" value={formatDestinationAmount(expectedSettlement, destinationAsset)} />
                  <RouteMetric label="Minimum received" value={formatDestinationAmount(minimumSettlement, destinationAsset)} />
                  <RouteMetric label="Quote expires" value={formatDateTime(quoteExpiry)} />
                  <RouteMetric label="Quote verified" value={nearIntent.signatureVerified ? 'Yes' : 'Pending'} />
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <h5 className="text-xs font-black uppercase tracking-widest text-emerald-200">Quote evidence</h5>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-emerald-100/80">
                    {[
                      `${tokenLabel(selectedOriginAsset)} selected from 1Click discovery`,
                      `Destination locked to ${settlementLabel}`,
                      nearIntent.signatureVerified ? '1Click signature verified' : 'Signature verification pending',
                      paymentPreviewOnly ? 'Dry preview: no funds moved' : 'Live payment route requested',
                      isDealFundingMode ? 'Escrow still waits for Fund Deal' : 'Wallet top-up is separate from escrow funding',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
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
                      {canSendEvmSourcePayment && (
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 space-y-3">
                          <p className="text-xs leading-relaxed text-blue-100/80">
                            This sends the quoted {tokenLabel(selectedOriginAsset)} amount from your source wallet to 1Click. After it settles into Stellar, open Deals and fund escrow from the Stellar wallet.
                          </p>
                          <Button
                            onClick={sendEvmSourcePayment}
                            disabled={sendingSourcePayment}
                            variant="primary"
                            className="w-full py-3 text-xs"
                            icon={sendingSourcePayment ? Loader2 : Wallet}
                          >
                            {sendingSourcePayment ? 'Opening Wallet...' : 'Send Source Payment'}
                          </Button>
                        </div>
                      )}
                      {displayedSourceTxHash && (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1">Source tx submitted</p>
                          <p className="break-all font-mono text-xs text-emerald-100">{displayedSourceTxHash}</p>
                          {displayedSourceTxUrl && (
                            <a
                              href={displayedSourceTxUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex text-[10px] font-black uppercase tracking-widest text-blue-200 hover:text-blue-100"
                            >
                              View source tx
                            </a>
                          )}
                        </div>
                      )}
                      {sourcePaymentError && (
                        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-200">
                          {sourcePaymentError}
                        </p>
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
                  {nearExplorerUrl && (
                    <a
                      href={nearExplorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-[10px] font-black uppercase tracking-widest text-blue-300 hover:text-blue-200"
                    >
                      Track on NEAR Intents Explorer
                    </a>
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
                <p className="mt-1 text-[10px] text-zinc-500">
                  {isDealFundingMode
                    ? 'Escrow updates after Stellar settlement is indexed. This can take a few minutes.'
                    : 'Wallet top-up status updates as 1Click detects and routes payment. This can take a few minutes.'}
                </p>
              </div>
              {settlementReported && (
                <Tag color="emerald">Swap completed</Tag>
              )}
            </div>
            <div className="space-y-2">
              {paymentSteps.map((step) => (
                <PaymentStep key={step.label} label={step.label} state={step.state} />
              ))}
            </div>
            {(lastStatusCheckedAt || statusUpdatedAt || detectedDestinationTx?.hash) && (
              <div className="rounded-lg border border-zinc-800 bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-zinc-500 space-y-1">
                {lastStatusCheckedAt && <p>Last checked {formatDateTime(lastStatusCheckedAt)}</p>}
                {statusUpdatedAt && <p>1Click updated {formatDateTime(statusUpdatedAt)}</p>}
                {detectedDestinationTx?.hash && (
                  <p>
                    Stellar settlement tx{' '}
                    {detectedDestinationTx.explorerUrl ? (
                      <a
                        href={detectedDestinationTx.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-300 hover:text-blue-200"
                      >
                        {shortText(detectedDestinationTx.hash)}
                      </a>
                    ) : (
                      <span className="font-mono text-zinc-300">{shortText(detectedDestinationTx.hash)}</span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200 leading-relaxed flex items-start gap-3">
            <Timer size={16} className="mt-0.5 shrink-0 text-amber-300" />
            <span>
              {isDealFundingMode
                ? 'Cross-chain payment status is not escrow state. Funds count as locked only after the Stellar DealEscrow funded event is indexed.'
                : 'Cross-chain payment status is wallet top-up state, not escrow state. Funds count as locked only after you fund a deal from the Stellar wallet.'}
            </span>
          </div>

          {providerStatus === 'SUCCESS' && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-200 leading-relaxed flex items-start gap-3">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <span>Funds reached your Stellar wallet. Open Deals and fund escrow when ready.</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
