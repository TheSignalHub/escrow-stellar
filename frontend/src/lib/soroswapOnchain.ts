/**
 * soroswapOnchain.ts — direct Soroswap AMM router client.
 *
 * SCF #42 Deliverable 6 (Stellar Broker / multi-asset funding).
 *
 * The Soroswap Aggregator REST API (api.soroswap.finance) has NO indexed pools
 * on Soroban Testnet after the network reset — its curated token list points at
 * SACs that no longer exist, so every /quote returns "No path found". Rather
 * than depend on that black box, we call the Soroswap router contract directly:
 * the on-chain AMM works fine and we seed our own XLM/USDC pool (see
 * scripts/seed-testnet-pool.sh).
 *
 * This client mirrors the interface of the old REST `SoroswapClient`
 * (getQuote / buildTransaction / sendTransaction) so useSwapThenCreateDeal and
 * AssetSwapStep need no changes — just a different import.
 *
 * Router ABI used (Uniswap-V2 fork):
 *   router_get_amounts_in(amount_out: i128, path: Vec<Address>)  -> Vec<i128>
 *   router_get_amounts_out(amount_in: i128, path: Vec<Address>)  -> Vec<i128>
 *   swap_tokens_for_exact_tokens(amount_out, amount_in_max, path, to, deadline)
 *   swap_exact_tokens_for_tokens(amount_in, amount_out_min, path, to, deadline)
 */
import * as StellarSdk from '@stellar/stellar-sdk';

import { NETWORK_PASSPHRASE, SOROSWAP_ROUTER_ADDRESS, sorobanServer } from './stellar';

const rpc = StellarSdk.rpc;

const MAX_TX_POLL_RETRIES = 30; // 30 × 2s = 60s
const SLIPPAGE_BPS = 100; // 1%

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  priceImpact: string;
  route: string[];
  rawQuote: {
    path: string[];
    tradeType: 'EXACT_IN' | 'EXACT_OUT';
    /** the fixed side amount in stroops (amount_out for EXACT_OUT, amount_in for EXACT_IN) */
    amount: string;
    /** liquidity sources used — read by swapRoute.extractRouteProtocols for the UI badges */
    protocols: string[];
  };
}

function i128(value: string | bigint): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(BigInt(value), { type: 'i128' });
}

function pathScVal(path: string[]): StellarSdk.xdr.ScVal {
  return StellarSdk.xdr.ScVal.scvVec(path.map((a) => new StellarSdk.Address(a).toScVal()));
}

/** Apply a slippage buffer: for EXACT_OUT we raise amount_in_max, for EXACT_IN we lower amount_out_min. */
function withSlippage(amount: bigint, direction: 'up' | 'down'): bigint {
  const bps = BigInt(SLIPPAGE_BPS);
  const denom = BigInt(10000);
  return direction === 'up'
    ? (amount * (denom + bps)) / denom
    : (amount * (denom - bps)) / denom;
}

export class SoroswapOnchainClient {
  private routerId: string;

  constructor(routerId?: string) {
    this.routerId = routerId || SOROSWAP_ROUTER_ADDRESS;
  }

  /**
   * Quote via a read-only simulation of the router's amounts view function.
   * EXACT_OUT (default) → router_get_amounts_in; EXACT_IN → router_get_amounts_out.
   * `amount` is in stroops (7-decimal).
   */
  async getQuote(
    assetIn: string,
    assetOut: string,
    amount: string,
    tradeType: 'EXACT_IN' | 'EXACT_OUT' = 'EXACT_OUT',
    sourceAddress?: string,
  ): Promise<SwapQuote> {
    if (!this.routerId) throw new Error('Soroswap router address not configured');
    const path = [assetIn, assetOut];
    const contract = new StellarSdk.Contract(this.routerId);

    const fnName =
      tradeType === 'EXACT_OUT' ? 'router_get_amounts_in' : 'router_get_amounts_out';
    const op = contract.call(fnName, i128(amount), pathScVal(path));

    // The read-only `router_get_amounts_*` call still needs a structurally valid
    // source account to simulate. We use the connected wallet (always present
    // when AssetSwapStep is mounted); a sequence of '0' is fine for simulation.
    if (!sourceAddress) {
      throw new Error('Connect a wallet to fetch a swap quote.');
    }
    const source = new StellarSdk.Account(sourceAddress, '0');
    const tx = new StellarSdk.TransactionBuilder(source, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(60)
      .build();

    const sim = await sorobanServer.simulateTransaction(tx);
    if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
      throw new Error('No liquidity route found for this pair on the Soroswap testnet AMM.');
    }

    const amounts = StellarSdk.scValToNative(sim.result.retval) as Array<string | bigint | number>;
    // amounts[0] = amount_in, amounts[last] = amount_out
    const amountInStr = amounts[0].toString();
    const amountOutStr = amounts[amounts.length - 1].toString();

    return {
      amountIn: amountInStr,
      amountOut: amountOutStr,
      priceImpact: '0',
      route: path,
      rawQuote: { path, tradeType, amount, protocols: ['soroswap'] },
    };
  }

  /**
   * Build (and simulate + assemble) the unsigned swap transaction. The caller
   * signs the returned XDR, then calls sendTransaction.
   */
  async buildTransaction(quote: SwapQuote, fromAddress: string): Promise<string> {
    if (!this.routerId) throw new Error('Soroswap router address not configured');
    const { path, tradeType, amount } = quote.rawQuote;
    const contract = new StellarSdk.Contract(this.routerId);
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const toScVal = new StellarSdk.Address(fromAddress).toScVal();
    const deadlineScVal = StellarSdk.nativeToScVal(deadline, { type: 'u64' });

    let op: StellarSdk.xdr.Operation;
    if (tradeType === 'EXACT_OUT') {
      const amountInMax = withSlippage(BigInt(quote.amountIn), 'up');
      op = contract.call(
        'swap_tokens_for_exact_tokens',
        i128(amount), // amount_out (exact)
        i128(amountInMax), // amount_in_max
        pathScVal(path),
        toScVal,
        deadlineScVal,
      );
    } else {
      const amountOutMin = withSlippage(BigInt(quote.amountOut), 'down');
      op = contract.call(
        'swap_exact_tokens_for_tokens',
        i128(amount), // amount_in (exact)
        i128(amountOutMin), // amount_out_min
        pathScVal(path),
        toScVal,
        deadlineScVal,
      );
    }

    const account = await sorobanServer.getAccount(fromAddress);
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(120)
      .build();

    const sim = await sorobanServer.simulateTransaction(tx);
    if (!rpc.Api.isSimulationSuccess(sim)) {
      throw new Error('Swap simulation failed. The pool may lack liquidity for this size.');
    }

    const assembled = rpc.assembleTransaction(tx, sim).build();
    return assembled.toXDR();
  }

  /** Submit the signed XDR and poll for confirmation. Returns the tx hash. */
  async sendTransaction(signedXdr: string): Promise<{ txHash: string }> {
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const sendResult = await sorobanServer.sendTransaction(signedTx);
    if (sendResult.status === 'ERROR') {
      throw new Error('Swap submission failed. The network may be congested — please try again.');
    }

    let getResult: Awaited<ReturnType<typeof sorobanServer.getTransaction>>;
    let retries = 0;
    do {
      if (retries >= MAX_TX_POLL_RETRIES) {
        throw new Error('Swap confirmation timed out. Check Stellar Explorer for the tx.');
      }
      await new Promise((r) => setTimeout(r, 2000));
      getResult = await sorobanServer.getTransaction(sendResult.hash);
      retries++;
    } while (getResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND);

    if (getResult.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Swap was rejected on-chain. The pool price may have moved — re-quote and retry.');
    }

    return { txHash: sendResult.hash };
  }
}

export const soroswapOnchainClient = new SoroswapOnchainClient();
