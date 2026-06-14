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

export type BrokerQuote = SwapQuote;

export const stellarBrokerClient = {
  getQuote: soroswapOnchainClient.getQuote.bind(soroswapOnchainClient),
  buildTransaction: soroswapOnchainClient.buildTransaction.bind(soroswapOnchainClient),
  sendTransaction: soroswapOnchainClient.sendTransaction.bind(soroswapOnchainClient),
};
