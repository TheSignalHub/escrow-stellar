import { useState } from 'react';
import {
  fundTestnetAccount,
  getExplorerTxLink,
  NETWORK_PASSPHRASE,
  SOROSWAP_POOL_ADDRESS,
  SOROSWAP_ROUTER_ADDRESS,
  USDC_TOKEN_ADDRESS,
  XLM_SAC_ADDRESS,
} from '../lib/stellar';
import { stellarBrokerClient } from '../lib/stellarBroker';
import { soroswapClient, type SwapQuote as PublicAggregatorQuote } from '../lib/soroswap';
import { useToast } from '../App';
import type { BrokerQuote } from '../lib/stellarBroker';
import { Card, Button, Tag } from './ui/Components';
import { Zap, ArrowDown, ExternalLink, AlertCircle, RefreshCw, CheckCircle2, ArrowRight, Droplets, Copy } from 'lucide-react';

type SwapMode = 'buy-exact-in' | 'buy-exact-out' | 'sell-exact-in';

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
  const [swapMode, setSwapMode] = useState<SwapMode>('buy-exact-in');
  const [swapAmount, setSwapAmount] = useState('2260');
  const [quote, setQuote] = useState<BrokerQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [error, setError] = useState('');
  const [poolEmpty, setPoolEmpty] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [publicTargetToken, setPublicTargetToken] = useState(USDC_TOKEN_ADDRESS);
  const [publicQuote, setPublicQuote] = useState<PublicAggregatorQuote | null>(null);
  const [publicQuoteLoading, setPublicQuoteLoading] = useState(false);
  const [publicQuoteError, setPublicQuoteError] = useState('');

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
    setSwapAmount(mode === 'buy-exact-in' ? '2260' : mode === 'buy-exact-out' ? '500' : '100');
    setTxHash('');
    resetQuoteState();
  };

  const inputSymbol = swapMode === 'buy-exact-in' ? 'XLM' : 'tUSDC';
  const outputSymbol = swapMode === 'sell-exact-in' || swapMode === 'buy-exact-out' ? 'XLM' : 'tUSDC';
  const inputLabel = swapMode === 'buy-exact-out' ? 'Target Receive' : 'Pay Amount';
  const outputLabel = swapMode === 'buy-exact-out' ? 'Pay Estimate' : 'Receive Estimate';
  const outputAmount = quote
    ? swapMode === 'buy-exact-out'
      ? quote.amountIn
      : quote.amountOut
    : '';

  const copyRouteValue = async (label: string, value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast(`${label} copied`, 'success');
  };

  const checkPublicAggregatorRoute = async () => {
    const amount = parseFloat(swapAmount);
    const targetToken = publicTargetToken.trim();
    if (!amount || amount <= 0 || !targetToken) return;

    setPublicQuoteLoading(true);
    setPublicQuote(null);
    setPublicQuoteError('');
    try {
      const stroops = BigInt(Math.round(amount * 1e7)).toString();
      const result = await soroswapClient.getQuote(
        XLM_SAC_ADDRESS,
        targetToken,
        stroops,
        'EXACT_IN'
      );
      setPublicQuote(result);
    } catch (err: any) {
      setPublicQuoteError(err.message || 'No public aggregator route found for this target token.');
    } finally {
      setPublicQuoteLoading(false);
    }
  };

  const fetchQuote = async () => {
    const amount = parseFloat(swapAmount);
    if (!amount || amount <= 0) return;

    setQuoteLoading(true);
    setError('');
    setPoolEmpty(false);
    try {
      const stroops = BigInt(Math.round(amount * 1e7)).toString();
      const assetIn = swapMode === 'sell-exact-in' ? USDC_TOKEN_ADDRESS : XLM_SAC_ADDRESS;
      const assetOut = swapMode === 'sell-exact-in' ? XLM_SAC_ADDRESS : USDC_TOKEN_ADDRESS;
      const tradeType = swapMode === 'buy-exact-out' ? 'EXACT_OUT' : 'EXACT_IN';
      const q = await stellarBrokerClient.getQuote(
        assetIn,
        assetOut,
        stroops,
        tradeType,
        walletAddress
      );
      setQuote(q);
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('no path') || msg.includes('no route') || msg.includes('no liquidity')) {
        setPoolEmpty(true);
      } else {
        setError(err.message || 'Failed to fetch a Stellar Broker quote from the seeded testnet route.');
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
      if (onSwapComplete && swapMode !== 'sell-exact-in' && quote.amountOut) {
        onSwapComplete(quote.amountOut);
      }
    } catch (err: any) {
      setError(err.message || 'Swap transaction failed. Check your balance and try again.');
      toast('Swap failed — check the error details below', 'error');
    } finally {
      setSwapLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 lg:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-4 lg:mb-8">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter uppercase mb-1 lg:mb-2">Liquidity Terminal</h2>
          <p className="text-zinc-500 font-medium text-sm lg:text-base">Provision testnet assets for smart contract execution.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
        {/* Section 1: Friendbot Funding */}
        <Card className="p-4 sm:p-6 lg:p-8 flex flex-col h-full bg-[#02040a]" glowOnHover>
          <div className="flex items-center gap-3 mb-4 lg:mb-6">
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">1</div>
            <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight">Initialize Vault</h3>
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
                    Deploy Contract →
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
                    Deploy Contract →
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Section 2: Stellar Broker testnet swap */}
        <Card className="p-4 sm:p-6 lg:p-8 flex flex-col h-full bg-[#02040a]" glowOnHover>
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-sm">2</div>
              <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight">Stellar Broker Funding</h3>
            </div>
            <Tag color="zinc">Testnet Adapter</Tag>
          </div>

          <p className="text-zinc-500 text-xs mb-6 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
            Demo-only Stellar Broker route: swap XLM into the configured test USDC settlement asset by calling the seeded{' '}
            <a
              href={`https://testnet.soroswap.finance/#/liquidity/add/${XLM_SAC_ADDRESS}/${USDC_TOKEN_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-300"
            >
              Soroswap testnet router path
            </a>
            . This is not production Circle USDC liquidity, and the demo token may not appear in Soroswap&apos;s public token picker.
          </p>
          <div className="mb-6 grid grid-cols-1 gap-2 text-[10px] font-mono text-zinc-500">
            {[
              { label: 'XLM SAC', value: XLM_SAC_ADDRESS },
              { label: 'Test USDC', value: USDC_TOKEN_ADDRESS },
              { label: 'Router', value: SOROSWAP_ROUTER_ADDRESS },
              { label: 'Pool', value: SOROSWAP_POOL_ADDRESS },
            ].map((item) => (
              <div key={item.label} className="grid grid-cols-[5.75rem_minmax(0,1fr)_auto] items-start gap-3 bg-black/30 border border-zinc-800 rounded-lg px-3 py-2">
                <span className="uppercase tracking-widest leading-5">{item.label}</span>
                <span className="text-zinc-300 leading-5 break-all">{item.value || 'not configured'}</span>
                {item.value && (
                  <button
                    type="button"
                    onClick={() => copyRouteValue(item.label, item.value)}
                    title={`Copy ${item.label}`}
                    className="w-7 h-7 rounded-md border border-zinc-800 bg-zinc-900/80 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/40 flex items-center justify-center transition-colors"
                  >
                    <Copy size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {txHash ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-2 tracking-tight">Testnet Swap Executed</h4>
                <p className="text-zinc-400 text-sm font-mono mb-6">
                  {swapMode === 'buy-exact-out'
                    ? `${quote ? (parseFloat(quote.amountIn) / 1e7).toFixed(2) : '?'} XLM -> ${swapAmount} test USDC`
                    : `${swapAmount} ${inputSymbol} -> ${quote ? (parseFloat(quote.amountOut) / 1e7).toFixed(2) : '?'} ${outputSymbol === 'tUSDC' ? 'test USDC' : 'XLM'}`}
                </p>
                <div className="flex flex-col gap-3">
                  <a
                    href={getExplorerTxLink(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-bold bg-emerald-500/10 hover:bg-emerald-500/20 px-6 py-3 rounded-xl transition-colors border border-emerald-500/20"
                  >
                    View TX on Explorer <ExternalLink size={14} />
                  </a>
                  <Button
                    onClick={() => { setTxHash(''); resetQuoteState(); setSwapAmount(swapMode === 'buy-exact-in' ? '2260' : swapMode === 'buy-exact-out' ? '500' : '100'); }}
                    variant="secondary"
                  >
                    Initialize New Swap
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mode: 'buy-exact-in' as const, label: 'Pay XLM' },
                  { mode: 'buy-exact-out' as const, label: 'Target USDC' },
                  { mode: 'sell-exact-in' as const, label: 'Sell USDC' },
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
                      <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${inputSymbol === 'XLM' ? 'bg-white text-black' : 'bg-[#2775ca] text-white'}`}>
                        {inputSymbol === 'XLM' ? 'X' : '$'}
                      </div>
                      <span className="font-bold text-sm">{inputSymbol}</span>
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
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 shrink-0 border ${outputSymbol === 'XLM' ? 'bg-zinc-800/80 border-zinc-700' : 'bg-[#2775ca]/20 border-[#2775ca]/30'}`}>
                      <div className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${outputSymbol === 'XLM' ? 'bg-white text-black' : 'bg-[#2775ca] text-white'}`}>
                        {outputSymbol === 'XLM' ? 'X' : '$'}
                      </div>
                      <span className={`font-bold text-sm ${outputSymbol === 'XLM' ? 'text-white' : 'text-[#2775ca]'}`}>{outputSymbol}</span>
                    </div>
                  </div>
                </div>
              </div>

              {quote && (
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50 text-xs font-mono text-zinc-400 flex flex-col gap-2">
                   <div className="flex justify-between">
                     <span>Exchange Rate</span>
                     <span className="text-white">
                       {swapMode === 'sell-exact-in'
                         ? `1 test USDC = ${(parseFloat(quote.amountOut) / 1e7 / parseFloat(swapAmount)).toFixed(4)} XLM`
                         : `1 XLM = ${(parseFloat(quote.amountOut) / 1e7 / (parseFloat(quote.amountIn) / 1e7)).toFixed(4)} test USDC`}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span>Slippage Tolerance</span>
                     <span className="text-emerald-400">1.0%</span>
                   </div>
                </div>
              )}

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/50">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((open) => !open)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
                >
                  <span>
                    <span className="block text-xs font-black uppercase tracking-widest text-zinc-300">Advanced Public Aggregator Check</span>
                    <span className="block text-[10px] text-zinc-500 mt-1">Paste a target token contract to test public Soroswap aggregator depth.</span>
                  </span>
                  <span className="text-zinc-500 text-xs font-mono">{advancedOpen ? 'Hide' : 'Show'}</span>
                </button>

                {advancedOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/70">
                    <p className="text-[10px] text-zinc-500 leading-relaxed pt-3">
                      This check is informational. The executable demo route above uses the seeded on-chain router path for reliability; the public aggregator may return no route on testnet if indexed liquidity is thin.
                    </p>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Target token contract</label>
                      <textarea
                        value={publicTargetToken}
                        onChange={(event) => {
                          setPublicTargetToken(event.target.value);
                          setPublicQuote(null);
                          setPublicQuoteError('');
                        }}
                        rows={2}
                        spellCheck={false}
                        className="w-full resize-none bg-[#09090b] border border-zinc-800 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono outline-none break-all"
                      />
                    </div>
                    <Button
                      onClick={checkPublicAggregatorRoute}
                      disabled={publicQuoteLoading || !publicTargetToken.trim() || !swapAmount || parseFloat(swapAmount) <= 0}
                      variant="secondary"
                      className="w-full py-3 text-xs"
                    >
                      {publicQuoteLoading ? 'Checking Aggregator...' : 'Check Public Aggregator Route'}
                    </Button>

                    {publicQuote && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-mono text-zinc-300 space-y-2">
                        <div className="flex justify-between gap-3">
                          <span className="text-zinc-500">Amount in</span>
                          <span>{(Number(publicQuote.amountIn) / 1e7).toLocaleString(undefined, { maximumFractionDigits: 7 })} XLM</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-zinc-500">Amount out</span>
                          <span>{(Number(publicQuote.amountOut) / 1e7).toLocaleString(undefined, { maximumFractionDigits: 7 })}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-zinc-500">Route legs</span>
                          <span>{publicQuote.route?.length || 0}</span>
                        </div>
                      </div>
                    )}

                    {publicQuoteError && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300 leading-relaxed">
                        {publicQuoteError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Empty pool notice */}
              {poolEmpty && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 animate-fade-in space-y-3">
                  <div className="flex items-start gap-2">
                    <Droplets size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-400 font-bold text-sm mb-1">Broker Route Not Found</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        The configured demo XLM → test-USDC broker route has no usable liquidity. Seed the Soroswap testnet pool by CLI, then retry the quote.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
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
                  <span className="flex-1">{error}</span>
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
                  Execute Swap
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
