/**
 * stellarBroker.ts — Tranche 2 multi-asset funding adapter.
 *
 * The deliverable-facing integration is the Stellar Broker funding step:
 * quote a non-settlement Stellar asset, swap it into the standardized
 * settlement asset, then let DealEscrow receive that settlement token.
 *
 * On testnet, public indexed liquidity can disappear after resets. The current
 * demo adapter therefore routes through the seeded Soroswap router pool while
 * keeping the same quote/build/send interface the UI expects from a broker.
 */
import {
  soroswapOnchainClient,
  type SwapQuote,
} from './soroswapOnchain';
import {
  STELLAR_BROKER_PROVIDER,
  STELLAR_BROKER_QUOTE_TTL_SECONDS,
  STELLAR_BROKER_SLIPPAGE_BPS,
  STELLAR_NETWORK,
} from './stellar';
import { stellarDexClient } from './stellarDex';

export interface BrokerQuote extends SwapQuote {
  providerId: string;
  quoteExpiresAt: number;
  slippageBps: number;
}

export interface StellarBrokerProvider {
  id: string;
  getQuote(
    assetIn: string,
    assetOut: string,
    amount: string,
    tradeType?: 'EXACT_IN' | 'EXACT_OUT',
    sourceAddress?: string,
  ): Promise<BrokerQuote>;
  buildTransaction(quote: BrokerQuote, fromAddress: string): Promise<string>;
  sendTransaction(signedXdr: string): Promise<{ txHash: string }>;
}

let lastBuiltSubmitter: 'stellar-dex' | 'soroswap' = 'soroswap';

function withProviderMetadata(quote: SwapQuote, providerId = STELLAR_BROKER_PROVIDER): BrokerQuote {
  return {
    ...quote,
    providerId,
    quoteExpiresAt: Date.now() + STELLAR_BROKER_QUOTE_TTL_SECONDS * 1000,
    slippageBps: STELLAR_BROKER_SLIPPAGE_BPS,
  };
}

export const stellarBrokerClient: StellarBrokerProvider = {
  id: STELLAR_BROKER_PROVIDER,
  async getQuote(assetIn, assetOut, amount, tradeType, sourceAddress) {
    if (STELLAR_NETWORK === 'mainnet' && stellarDexClient.canHandle(assetIn, assetOut)) {
      const quote = await stellarDexClient.getQuote(assetIn, assetOut, amount, tradeType);
      return withProviderMetadata(quote, 'stellar-dex-mainnet');
    }

    const quote = await soroswapOnchainClient.getQuote(
      assetIn,
      assetOut,
      amount,
      tradeType,
      sourceAddress,
    );
    return withProviderMetadata(quote);
  },
  buildTransaction(quote, fromAddress) {
    if ((quote.rawQuote as any)?.kind === 'stellar-dex-path') {
      lastBuiltSubmitter = 'stellar-dex';
      return stellarDexClient.buildTransaction(quote, fromAddress);
    }
    lastBuiltSubmitter = 'soroswap';
    return soroswapOnchainClient.buildTransaction(quote, fromAddress);
  },
  sendTransaction(signedXdr) {
    if (lastBuiltSubmitter === 'stellar-dex') {
      return stellarDexClient.sendTransaction(signedXdr);
    }
    return soroswapOnchainClient.sendTransaction(signedXdr);
  },
};
