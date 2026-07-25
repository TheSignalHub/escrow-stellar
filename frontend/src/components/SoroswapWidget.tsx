import { useState } from 'react';
import {
  fundTestnetAccount,
  getExplorerTxLink,
  IS_TESTNET,
  NETWORK_PASSPHRASE,
  SETTLEMENT_TOKEN_SYMBOL,
  USDC_TOKEN_ADDRESS,
  XLM_SAC_ADDRESS,
} from '../lib/stellar';
import { stellarBrokerClient } from '../lib/stellarBroker';
import { useToast } from '../App';
import type { BrokerQuote } from '../lib/stellarBroker';
import { Card, Button, Tag } from './ui/Components';
import { PrivyFiatTopUpCard } from './PrivyFiatTopUpCard';
import { WalletPrepOverview } from './WalletPrepOverview';
import { NearIntentsPanel } from './NearIntentsPanel';
import { Zap, ArrowDown, ExternalLink, AlertCircle, RefreshCw, CheckCircle2, ArrowRight, Droplets } from 'lucide-react';

type SwapMode = 'exact-in' | 'exact-out';
type SwapAssetKey = 'xlm' | 'usdc';

const SLIPPAGE_PRESETS = [
  { label: '0.5%', bps: 50 },
  { label: '1%', bps: 100 },
  { label: '2%', bps: 200 },
];

function formatSwapError(error: any, fallback: string): string {
  const response = error?.response?.data;
  if (response) {
    const parts = [
      response.title,
      response.detail,
      response.extras?.result_codes ? `Result codes: ${JSON.stringify(response.extras.result_codes)}` : '',
      response.extras?.result_xdr ? `Result XDR: ${response.extras.result_xdr}` : '',
    ].filter(Boolean);
    if (parts.length > 0) return parts.join('\n');
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

interface Props {
  walletAddress: string;
  signTransaction: (xdr: string, opts?: any) => Promise<string>;
  onSwapComplete?: (usdcAmount: string) => void;
  onFundComplete?: () => void;
  onBalanceRefresh?: () => void;
  xlmBalance?: string;
}

export function SoroswapWidget({ walletAddress, signTransaction, onSwapComplete, onFundComplete, onBalanceRefresh, xlmBalance }: Props) {
  const toast = useToast();
  // Friendbot section
  const [fundingLoading, setFundingLoading] = useState(false);
  const [fundingResult, setFundingResult] = useState<'success' | 'error' | null>(null);

  // Stellar Broker section
  const [swapMode, setSwapMode] = useState<SwapMode>('exact-in');
  const [swapAmount, setSwapAmount] = useState('2260');
  const [assetInAddress, setAssetInAddress] = useState(XLM_SAC_ADDRESS);
  const [assetOutAddress, setAssetOutAddress] = useState(USDC_TOKEN_ADDRESS);
  const [assetInSymbol, setAssetInSymbol] = useState('XLM');
  const [assetOutSymbol, setAssetOutSymbol] = useState(SETTLEMENT_TOKEN_SYMBOL);
  const [assetInKey, setAssetInKey] = useState<SwapAssetKey>('xlm');
  const [assetOutKey, setAssetOutKey] = useState<SwapAssetKey>('usdc');
  const [customRouteOpen, setCustomRouteOpen] = useState(false);
  const [slippageBps, setSlippageBps] = useState(100);
  const [customSlippagePct, setCustomSlippagePct] = useState('');
  const [quote, setQuote] = useState<BrokerQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [error, setError] = useState('');
  const [poolEmpty, setPoolEmpty] = useState(false);
  const [txHash, setTxHash] = useState('');

  const handleFundbot = async () => {
    setFundingLoading(true);
    setFundingResult(null);
    const success = await fundTestnetAccount(walletAddress);
    setFundingResult(success ? 'success' : 'error');
    setFundingLoading(false);
    if (success) {
      toast('Wallet funded with 10,000 XLM!', 'success');
      onBalanceRefresh?.();
    } else {
      toast('Wallet already funded! You\'re ready to go.', 'info');
      onBalanceRefresh?.();
    }
  };

  const resetQuoteState = () => {
    setQuote(null);
    setPoolEmpty(false);
    setError('');
  };

  const handleModeChange = (mode: SwapMode) => {
    setSwapMode(mode);
    setSwapAmount(mode === 'exact-in' ? '2260' : '500');
    setTxHash('');
    resetQuoteState();
  };

  const swapAssets = {
    xlm: {
      key: 'xlm' as const,
      symbol: 'XLM',
      name: 'XLM',
      network: 'Native',
      address: XLM_SAC_ADDRESS,
    },
    usdc: {
      key: 'usdc' as const,
      symbol: SETTLEMENT_TOKEN_SYMBOL,
      name: 'Circle USDC',
      network: 'Stellar',
      address: USDC_TOKEN_ADDRESS,
    },
  };

  const selectAsset = (side: 'in' | 'out', key: SwapAssetKey) => {
    const asset = swapAssets[key];
    if (side === 'in') {
      setAssetInKey(key);
      setAssetInAddress(asset.address);
      setAssetInSymbol(asset.symbol);
    } else {
      setAssetOutKey(key);
      setAssetOutAddress(asset.address);
      setAssetOutSymbol(asset.symbol);
    }
    setTxHash('');
    resetQuoteState();
  };

  const handleSlippagePreset = (bps: number) => {
    setSlippageBps(bps);
    setCustomSlippagePct('');
    resetQuoteState();
  };

  const handleCustomSlippage = (value: string) => {
    setCustomSlippagePct(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setSlippageBps(Math.min(500, Math.max(10, Math.round(parsed * 100))));
      resetQuoteState();
    }
  };

  const applyRoutePreset = (preset: 'xlm-to-usdc' | 'usdc-to-xlm') => {
    if (preset === 'xlm-to-usdc') {
      setAssetInAddress(XLM_SAC_ADDRESS);
      setAssetOutAddress(USDC_TOKEN_ADDRESS);
      setAssetInSymbol('XLM');
      setAssetOutSymbol(SETTLEMENT_TOKEN_SYMBOL);
      setAssetInKey('xlm');
      setAssetOutKey('usdc');
      setSwapAmount('2260');
    } else {
      setAssetInAddress(USDC_TOKEN_ADDRESS);
      setAssetOutAddress(XLM_SAC_ADDRESS);
      setAssetInSymbol(SETTLEMENT_TOKEN_SYMBOL);
      setAssetOutSymbol('XLM');
      setAssetInKey('usdc');
      setAssetOutKey('xlm');
      setSwapAmount('100');
    }
    setSwapMode('exact-in');
    setTxHash('');
    resetQuoteState();
  };

  const flipRoute = () => {
    setAssetInAddress(assetOutAddress);
    setAssetOutAddress(assetInAddress);
    setAssetInSymbol(assetOutSymbol);
    setAssetOutSymbol(assetInSymbol);
    setAssetInKey(assetOutKey);
    setAssetOutKey(assetInKey);
    setTxHash('');
    resetQuoteState();
  };

  const inputSymbol = assetInSymbol || 'Token in';
  const outputSymbol = assetOutSymbol || 'Token out';
  const inputLabel = swapMode === 'exact-out' ? 'Target Receive Amount' : 'Pay Amount';
  const outputLabel = swapMode === 'exact-out' ? 'Pay Estimate' : 'Receive Estimate';
  const editableSymbol = swapMode === 'exact-out' ? outputSymbol : inputSymbol;
  const estimateSymbol = swapMode === 'exact-out' ? inputSymbol : outputSymbol;
  const outputAmount = quote
    ? swapMode === 'exact-out'
      ? quote.amountIn
      : quote.amountOut
    : '';
  const isTokenContractAddress = (value: string) => /^C[A-Z2-7]{55}$/.test(value.trim());
  const routeConfigured = isTokenContractAddress(assetInAddress) && isTokenContractAddress(assetOutAddress);

  const fetchQuote = async () => {
    const amount = parseFloat(swapAmount);
    if (!amount || amount <= 0) return;
    if (!routeConfigured) {
      setError('Enter valid Stellar token contract addresses for both sides of the swap.');
      return;
    }

    setQuoteLoading(true);
    setError('');
    setPoolEmpty(false);
    try {
      const stroops = BigInt(Math.round(amount * 1e7)).toString();
      const tradeType = swapMode === 'exact-out' ? 'EXACT_OUT' : 'EXACT_IN';
      const q = await stellarBrokerClient.getQuote(
        assetInAddress.trim(),
        assetOutAddress.trim(),
        stroops,
        tradeType,
        walletAddress,
        slippageBps
      );
      setQuote(q);
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('no path') || msg.includes('no route') || msg.includes('no liquidity')) {
        setPoolEmpty(true);
      } else {
        setError(formatSwapError(err, `Failed to fetch a Stellar Broker quote from the configured ${IS_TESTNET ? 'testnet route' : 'route'}.`));
      }
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!quote) return;
    setSwapLoading(true);
    setError('');

    try {
      const xdr = await stellarBrokerClient.buildTransaction(quote, walletAddress);
      const signedXdr = await signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: walletAddress,
      });
      const result = await stellarBrokerClient.sendTransaction(signedXdr);
      setTxHash(result.txHash);
      toast('Swap completed!', 'success');
      if (onSwapComplete) {
        onSwapComplete(quote.amountOut);
      }
    } catch (err: any) {
      setError(formatSwapError(err, 'Swap transaction failed. Check your balance, trustlines, slippage, and route liquidity, then try again.'));
      toast('Swap failed — check the error details below', 'error');
    } finally {
      setSwapLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 lg:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-4 lg:mb-8">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter uppercase mb-1 lg:mb-2">Wallet Prep</h2>
          <p className="text-zinc-500 font-medium text-sm lg:text-base">
            {IS_TESTNET ? 'Prepare testnet funds before creating or funding a deal milestone.' : 'Prepare the connected Stellar wallet before funding escrow milestones.'}
          </p>
        </div>
        {xlmBalance && (
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl px-4 lg:px-5 py-2 lg:py-3 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
            <span className="text-[10px] lg:text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-0.5">Network Balance</span>
            <span className="font-mono text-emerald-400 font-bold text-lg lg:text-xl">
              {parseFloat(xlmBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
            </span>
          </div>
        )}
      </div>

      <WalletPrepOverview stellarAddress={walletAddress} xlmBalance={xlmBalance} />
      <PrivyFiatTopUpCard stepNumber={1} />

      <div className={`grid grid-cols-1 gap-4 lg:gap-8 ${IS_TESTNET ? 'md:grid-cols-2' : ''}`}>
        {IS_TESTNET && (
          <Card className="p-4 sm:p-6 lg:p-8 flex flex-col h-full bg-[#02040a]" glowOnHover>
            <div className="flex items-center gap-3 mb-4 lg:mb-6">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">2</div>
              <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight">
                Initialize Vault
              </h3>
            </div>

            <p className="text-zinc-400 text-sm mb-4 lg:mb-8 flex-1 leading-relaxed">
              Request 10,000 XLM from the Soroban friendbot. Native XLM is required for gas fees and can be used directly as payment in escrow deals.
            </p>

            <div className="space-y-4">
              <Button
                onClick={handleFundbot}
                disabled={fundingLoading}
                variant="primary"
                className="w-full py-4"
                icon={fundingLoading ? RefreshCw : Zap}
              >
                Request 10,000 XLM
              </Button>

              {fundingResult === 'success' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col gap-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                    <CheckCircle2 size={16} />
                    <span>Vault successfully provisioned.</span>
                  </div>
                  {onFundComplete && (
                    <Button onClick={onFundComplete} variant="secondary" className="w-full py-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20">
                      Create Deal →
                    </Button>
                  )}
                </div>
              )}

              {fundingResult === 'error' && (
                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 flex flex-col gap-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-zinc-300 font-medium text-sm">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>Vault already holds sufficient XLM.</span>
                  </div>
                  {onFundComplete && (
                    <Button onClick={onFundComplete} variant="secondary" className="w-full py-2">
                      Create Deal →
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Stellar-side conversion prepares wallet balance; escrow funding happens from Deals via fund_deal. */}
        <Card className="p-4 sm:p-6 lg:p-8 flex flex-col h-full bg-[#02040a]" glowOnHover>
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-sm">{IS_TESTNET ? '3' : '2'}</div>
              <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight">Convert on Stellar</h3>
            </div>
            <Tag color={IS_TESTNET ? 'zinc' : 'blue'}>{IS_TESTNET ? 'Testnet AMM' : 'AMM Route'}</Tag>
          </div>

          <p className="text-zinc-500 text-xs mb-6 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
            {IS_TESTNET ? (
              <>
                Convert XLM into {SETTLEMENT_TOKEN_SYMBOL} before funding an escrow deal. This wallet-prep route calls the seeded{' '}
                <a
                  href={`https://testnet.soroswap.finance/#/liquidity/add/${XLM_SAC_ADDRESS}/${USDC_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-300"
                >
                  Soroswap testnet router path
                </a>
                . It prepares your Stellar wallet only; escrow locks later when you return to Deals and click Fund Deal.
              </>
            ) : (
              <>Swap supported Stellar assets in the connected wallet. Paste token contract addresses or use presets; escrow locks later from Deals when you click Fund Deal.</>
            )}
          </p>

          {txHash ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2 tracking-tight">Conversion Executed</h4>
                <p className="text-zinc-400 text-sm font-mono mb-6">
                  {swapMode === 'exact-out'
                    ? `${quote ? (parseFloat(quote.amountIn) / 1e7).toFixed(2) : '?'} ${inputSymbol} -> ${swapAmount} ${outputSymbol}`
                    : `${swapAmount} ${inputSymbol} -> ${quote ? (parseFloat(quote.amountOut) / 1e7).toFixed(2) : '?'} ${outputSymbol}`}
                </p>
                <div className="flex flex-col gap-3">
                  <p className="text-xs leading-relaxed text-zinc-500">
                    Wallet balance prepared. Go to Deals and use Fund Deal when the settlement balance is sufficient.
                  </p>
                  <a
                    href={getExplorerTxLink(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-bold bg-emerald-500/10 hover:bg-emerald-500/20 px-6 py-3 rounded-xl transition-colors border border-emerald-500/20"
                  >
                    View TX on Explorer <ExternalLink size={14} />
                  </a>
                  <Button
                    onClick={() => { setTxHash(''); resetQuoteState(); setSwapAmount(swapMode === 'exact-in' ? '2260' : '500'); }}
                    variant="secondary"
                  >
                    Convert Another Amount
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-6">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { mode: 'exact-in' as const, label: 'Exact pay' },
                  { mode: 'exact-out' as const, label: 'Exact receive' },
                ].map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => handleModeChange(option.mode)}
                    className={`rounded-lg border px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      swapMode === option.mode
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Swap route</h4>
                    <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                      Choose the common Stellar route, or open advanced mode to paste token contracts.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => applyRoutePreset('xlm-to-usdc')} variant="secondary" className="py-2 text-[10px]">
                      XLM to {SETTLEMENT_TOKEN_SYMBOL}
                    </Button>
                    <Button onClick={() => applyRoutePreset('usdc-to-xlm')} variant="secondary" className="py-2 text-[10px]">
                      {SETTLEMENT_TOKEN_SYMBOL} to XLM
                    </Button>
                    <Button onClick={flipRoute} variant="secondary" className="py-2 text-[10px]">
                      Flip
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-end">
                  <label className="space-y-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">From</span>
                    <select
                      value={assetInKey}
                      onChange={(event) => selectAsset('in', event.target.value as SwapAssetKey)}
                      className="w-full bg-[#09090b] border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-3 text-sm text-zinc-100 font-bold outline-none"
                    >
                      {Object.values(swapAssets).map((asset) => (
                        <option key={asset.key} value={asset.key}>
                          {asset.symbol} - {asset.network}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={flipRoute}
                    className="h-11 w-11 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors"
                    aria-label="Flip swap route"
                  >
                    ↔
                  </button>
                  <label className="space-y-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">To</span>
                    <select
                      value={assetOutKey}
                      onChange={(event) => selectAsset('out', event.target.value as SwapAssetKey)}
                      className="w-full bg-[#09090b] border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-3 text-sm text-zinc-100 font-bold outline-none"
                    >
                      {Object.values(swapAssets).map((asset) => (
                        <option key={asset.key} value={asset.key}>
                          {asset.symbol} - {asset.network}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setCustomRouteOpen((value) => !value)}
                  className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-emerald-300 transition-colors"
                >
                  {customRouteOpen ? 'Hide advanced token contracts' : 'Advanced: paste token contracts'}
                </button>

                {customRouteOpen && (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[6rem_minmax(0,1fr)] gap-2">
                      <input
                        value={assetInSymbol}
                        onChange={(event) => {
                          setAssetInSymbol(event.target.value.toUpperCase().slice(0, 12));
                          resetQuoteState();
                        }}
                        className="bg-[#09090b] border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-zinc-100 font-bold outline-none"
                        aria-label="Pay token symbol"
                      />
                      <input
                        value={assetInAddress}
                        onChange={(event) => {
                          setAssetInAddress(event.target.value.trim());
                          resetQuoteState();
                        }}
                        spellCheck={false}
                        className={`bg-[#09090b] border ${assetInAddress && !isTokenContractAddress(assetInAddress) ? 'border-red-500/40' : 'border-zinc-800'} focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none`}
                        aria-label="Pay token contract"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[6rem_minmax(0,1fr)] gap-2">
                      <input
                        value={assetOutSymbol}
                        onChange={(event) => {
                          setAssetOutSymbol(event.target.value.toUpperCase().slice(0, 12));
                          resetQuoteState();
                        }}
                        className="bg-[#09090b] border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-zinc-100 font-bold outline-none"
                        aria-label="Receive token symbol"
                      />
                      <input
                        value={assetOutAddress}
                        onChange={(event) => {
                          setAssetOutAddress(event.target.value.trim());
                          resetQuoteState();
                        }}
                        spellCheck={false}
                        className={`bg-[#09090b] border ${assetOutAddress && !isTokenContractAddress(assetOutAddress) ? 'border-red-500/40' : 'border-zinc-800'} focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none`}
                        aria-label="Receive token contract"
                      />
                    </div>
                  </div>
                )}

                {!routeConfigured && (
                  <p className="text-xs leading-relaxed text-amber-300">
                    Use Stellar SAC contract ids beginning with C. Conversion can quote only when the configured broker/AMM route has liquidity for the selected pair.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Slippage</h4>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                      Protects the signed swap from price movement between quote and confirmation.
                    </p>
                  </div>
                  <Tag color="zinc">{(slippageBps / 100).toFixed(2)}%</Tag>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {SLIPPAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.bps}
                      type="button"
                      onClick={() => handleSlippagePreset(preset.bps)}
                      className={`rounded-lg border px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        slippageBps === preset.bps && !customSlippagePct
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <label className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={customSlippagePct}
                      onChange={(event) => handleCustomSlippage(event.target.value)}
                      placeholder="Custom"
                      className="w-full bg-transparent text-[10px] font-bold text-zinc-100 outline-none placeholder:text-zinc-600"
                      aria-label="Custom slippage percent"
                    />
                    <span className="text-[10px] font-bold text-zinc-500">%</span>
                  </label>
                </div>
              </div>

              {/* Swap Inputs */}
              <div className="space-y-2 relative">
                {/* Pay */}
                <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 focus-within:border-emerald-500/50 transition-colors shadow-inner">
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{inputLabel}</label>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={swapAmount}
                      onChange={(e) => { setSwapAmount(e.target.value); resetQuoteState(); }}
                      placeholder="0.0"
                      min="0"
                      step="any"
                      className="bg-transparent text-3xl font-mono text-white outline-none w-full placeholder:text-zinc-700 appearance-none"
                    />
                    <div className="flex items-center gap-2 bg-zinc-800/80 rounded-lg px-3 py-1.5 shrink-0 border border-zinc-700">
                      <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${editableSymbol === 'XLM' ? 'bg-white text-black' : 'bg-[#2775ca] text-white'}`}>
                        {editableSymbol === 'XLM' ? 'X' : '$'}
                      </div>
                      <span className="font-bold text-sm">{editableSymbol}</span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#02040a] flex items-center justify-center text-zinc-400">
                  <ArrowDown size={16} />
                </div>

                {/* Receive */}
                <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 shadow-inner opacity-80">
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{outputLabel}</label>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      value={
                        quoteLoading
                          ? 'Computing...'
                          : outputAmount
                            ? (parseFloat(outputAmount) / 1e7).toFixed(2)
                            : '0.00'
                      }
                      readOnly
                      className="bg-transparent text-3xl font-mono text-white outline-none w-full truncate"
                    />
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 shrink-0 border ${estimateSymbol === 'XLM' ? 'bg-zinc-800/80 border-zinc-700' : 'bg-[#2775ca]/20 border-[#2775ca]/30'}`}>
                      <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${estimateSymbol === 'XLM' ? 'bg-white text-black' : 'bg-[#2775ca] text-white'}`}>
                        {estimateSymbol === 'XLM' ? 'X' : '$'}
                      </div>
                      <span className={`font-bold text-sm ${estimateSymbol === 'XLM' ? 'text-white' : 'text-[#2775ca]'}`}>{estimateSymbol}</span>
                    </div>
                  </div>
                </div>
              </div>

              {quote && (
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50 text-xs font-mono text-zinc-400 flex flex-col gap-2">
                   <div className="flex justify-between">
                     <span>Exchange Rate</span>
                     <span className="text-white">
                       {`1 ${inputSymbol} = ${(parseFloat(quote.amountOut) / 1e7 / (parseFloat(quote.amountIn) / 1e7)).toFixed(4)} ${outputSymbol}`}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span>Slippage Tolerance</span>
                     <span className="text-emerald-400">{(quote.slippageBps / 100).toFixed(2)}%</span>
                   </div>
                </div>
              )}

              {/* Empty pool notice */}
              {poolEmpty && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 animate-fade-in space-y-3">
                  <div className="flex items-start gap-2">
                    <Droplets size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-400 font-bold text-sm mb-1">Broker Route Not Found</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        {IS_TESTNET
                          ? `The selected ${inputSymbol} -> ${outputSymbol} route has no usable liquidity. Use the seeded XLM -> ${SETTLEMENT_TOKEN_SYMBOL} preset for the testnet demo route, or seed the selected pool and retry.`
                          : `The selected ${inputSymbol} -> ${outputSymbol} route has no usable liquidity through the configured AMM route. Try another pair or amount, then retry the quote.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {IS_TESTNET && (
                      <a
                        href={`https://testnet.soroswap.finance/#/liquidity/add/${XLM_SAC_ADDRESS}/${USDC_TOKEN_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="secondary" className="w-full py-2 text-xs" icon={ExternalLink}>
                          View Pool Setup
                        </Button>
                      </a>
                    )}
                    {onFundComplete && (
                      <Button onClick={onFundComplete} variant="primary" className="flex-1 py-2 text-xs" icon={ArrowRight}>
                        Use XLM Instead
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Generic API error */}
              {error && !poolEmpty && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="flex-1 whitespace-pre-wrap break-words">{error}</span>
                  <button onClick={() => { setError(''); fetchQuote(); }} className="font-bold hover:text-red-300 underline">Retry</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-auto pt-4">
                <Button
                  onClick={fetchQuote}
                  disabled={quoteLoading || !swapAmount || parseFloat(swapAmount) <= 0}
                  variant="secondary"
                  className="py-4"
                >
                  Calculate Route
                </Button>
                <Button
                  onClick={handleSwap}
                  disabled={swapLoading || !quote}
                  variant={quote ? "primary" : "secondary"}
                  className="py-4"
                >
                  Convert Balance
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <NearIntentsPanel
        walletAddress={walletAddress}
        mode="routePreview"
        stepNumber={IS_TESTNET ? 4 : 3}
        onNavigateToFiatTopUp={undefined}
      />
    </div>
  );
}
