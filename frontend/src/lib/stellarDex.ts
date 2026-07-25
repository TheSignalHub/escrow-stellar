import * as StellarSdk from '@stellar/stellar-sdk';

import {
  HORIZON_URL,
  NETWORK_PASSPHRASE,
  USDC_TOKEN_ADDRESS,
  XLM_SAC_ADDRESS,
  horizonServer,
} from './stellar';
import type { SwapQuote } from './soroswapOnchain';

const PUBLIC_USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

type StellarDexTradeType = 'EXACT_IN' | 'EXACT_OUT';

function toHumanAmount(stroops: string): string {
  return (Number(stroops) / 1e7).toFixed(7);
}

function toStroops(human: string): string {
  return BigInt(Math.round(Number(human) * 1e7)).toString();
}

function withSlippage(humanAmount: string, direction: 'up' | 'down', slippageBps: number): string {
  const amount = Number(humanAmount);
  const factor = slippageBps / 10000;
  const adjusted = direction === 'up' ? amount * (1 + factor) : amount * (1 - factor);
  return adjusted.toFixed(7);
}

function isXlmSac(asset: string): boolean {
  return asset === XLM_SAC_ADDRESS;
}

function isCircleUsdcSac(asset: string): boolean {
  return asset === USDC_TOKEN_ADDRESS;
}

function toClassicAsset(asset: string): StellarSdk.Asset {
  if (isXlmSac(asset)) return StellarSdk.Asset.native();
  if (isCircleUsdcSac(asset)) return new StellarSdk.Asset('USDC', PUBLIC_USDC_ISSUER);
  throw new Error('Stellar DEX route supports native XLM and Circle USDC only.');
}

function assetParam(asset: string): string {
  if (isXlmSac(asset)) return 'native';
  if (isCircleUsdcSac(asset)) return `USDC:${PUBLIC_USDC_ISSUER}`;
  throw new Error('Stellar DEX route supports native XLM and Circle USDC only.');
}

function reserveParams(prefix: 'source' | 'destination', asset: string): Record<string, string> {
  if (isXlmSac(asset)) {
    return { [`${prefix}_asset_type`]: 'native' };
  }

  if (isCircleUsdcSac(asset)) {
    return {
      [`${prefix}_asset_type`]: 'credit_alphanum4',
      [`${prefix}_asset_code`]: 'USDC',
      [`${prefix}_asset_issuer`]: PUBLIC_USDC_ISSUER,
    };
  }

  throw new Error('Stellar DEX route supports native XLM and Circle USDC only.');
}

function describeHorizonError(body: string): string {
  try {
    const parsed = JSON.parse(body);
    const parts = [
      parsed.title,
      parsed.detail,
      parsed.extras?.result_codes ? `Result codes: ${JSON.stringify(parsed.extras.result_codes)}` : '',
      parsed.extras?.result_xdr ? `Result XDR: ${parsed.extras.result_xdr}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  } catch {
    return body;
  }
}

async function horizonJson(path: string, params: Record<string, string>) {
  const url = new URL(path, HORIZON_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(describeHorizonError(text || response.statusText) || `Horizon request failed with status ${response.status}`);
  }
  return response.json();
}

function isDirectRecord(record: any): boolean {
  return Array.isArray(record?.path) && record.path.length === 0;
}

export const stellarDexClient = {
  canHandle(assetIn: string, assetOut: string): boolean {
    const directPair =
      (isXlmSac(assetIn) && isCircleUsdcSac(assetOut)) ||
      (isCircleUsdcSac(assetIn) && isXlmSac(assetOut));
    return directPair;
  },

  async getQuote(
    assetIn: string,
    assetOut: string,
    amount: string,
    tradeType: StellarDexTradeType = 'EXACT_IN',
  ): Promise<SwapQuote> {
    if (!this.canHandle(assetIn, assetOut)) {
      throw new Error('Stellar DEX route supports native XLM and Circle USDC only.');
    }

    const humanAmount = toHumanAmount(amount);
    const result =
      tradeType === 'EXACT_OUT'
        ? await horizonJson('/paths/strict-receive', {
            source_assets: assetParam(assetIn),
            ...reserveParams('destination', assetOut),
            destination_amount: humanAmount,
          })
        : await horizonJson('/paths/strict-send', {
            ...reserveParams('source', assetIn),
            source_amount: humanAmount,
            destination_assets: assetParam(assetOut),
          });

    const records = result?._embedded?.records || [];
    const record = records.find(isDirectRecord) || records[0];
    if (!record) {
      throw new Error('No Stellar DEX path found for this pair.');
    }

    return {
      amountIn: toStroops(record.source_amount),
      amountOut: toStroops(record.destination_amount),
      priceImpact: '0',
      route: record.path || [],
      rawQuote: {
        kind: 'stellar-dex-path',
        assetIn,
        assetOut,
        tradeType,
        amount,
        path: record.path || [],
        sourceAmount: record.source_amount,
        destinationAmount: record.destination_amount,
        protocols: ['stellar-dex'],
      },
    };
  },

  async buildTransaction(quote: SwapQuote, fromAddress: string): Promise<string> {
    const raw = quote.rawQuote as any;
    if (raw?.kind !== 'stellar-dex-path') {
      throw new Error('Invalid Stellar DEX quote.');
    }

    const account = await horizonServer.loadAccount(fromAddress);
    const sendAsset = toClassicAsset(raw.assetIn);
    const destAsset = toClassicAsset(raw.assetOut);
    const path = (raw.path || []).map((item: any) => {
      if (item.asset_type === 'native') return StellarSdk.Asset.native();
      return new StellarSdk.Asset(item.asset_code, item.asset_issuer);
    });
    const slippageBps = Number(raw.slippageBps || (quote as any).slippageBps || 100);

    const operation =
      raw.tradeType === 'EXACT_OUT'
        ? StellarSdk.Operation.pathPaymentStrictReceive({
            sendAsset,
            sendMax: withSlippage(raw.sourceAmount, 'up', slippageBps),
            destination: fromAddress,
            destAsset,
            destAmount: raw.destinationAmount,
            path,
          })
        : StellarSdk.Operation.pathPaymentStrictSend({
            sendAsset,
            sendAmount: raw.sourceAmount,
            destination: fromAddress,
            destAsset,
            destMin: withSlippage(raw.destinationAmount, 'down', slippageBps),
            path,
          });

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(120)
      .build();

    return tx.toXDR();
  },

  async sendTransaction(signedXdr: string): Promise<{ txHash: string }> {
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const result = await horizonServer.submitTransaction(signedTx);
    return { txHash: result.hash };
  },
};
