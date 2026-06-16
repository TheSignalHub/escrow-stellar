// Known testnet token addresses
export const TESTNET_TOKENS = {
  XLM: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  USDC: import.meta.env.VITE_USDC_TOKEN_ADDRESS || '',
};

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  priceImpact: string;
  route: any[];
  rawQuote: any;
}

function stringifyApiError(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  for (const key of ['detail', 'title', 'message', 'error', 'reason']) {
    const nested = stringifyApiError(record[key]);
    if (nested) return nested;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

export class SoroswapClient {
  private async apiRequest(endpoint: string, data: any): Promise<any> {
    const url = `/api/soroswap${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      const msg = stringifyApiError(error) || response.statusText;
      throw new Error(`Soroswap API error: ${msg}`);
    }
    return response.json();
  }

  // Step 1: Get a swap quote
  async getQuote(
    assetIn: string,
    assetOut: string,
    amount: string,
    tradeType: 'EXACT_IN' | 'EXACT_OUT' = 'EXACT_IN'
  ): Promise<SwapQuote> {
    const result = await this.apiRequest('/quote', {
      assetIn,
      assetOut,
      amount,
      tradeType,
      protocols: ['soroswap', 'phoenix', 'aqua'],
      slippageBps: 100, // 1% slippage
    });

    return {
      amountIn: result.amountIn || amount,
      amountOut: result.amountOut || '0',
      priceImpact: result.priceImpact || '0',
      route: result.route || [],
      rawQuote: result,
    };
  }

  // Step 2: Build a signable transaction
  async buildTransaction(
    quote: any,
    fromAddress: string,
    toAddress?: string
  ): Promise<string> {
    const result = await this.apiRequest('/quote/build', {
      quote: quote.rawQuote || quote,
      from: fromAddress,
      to: toAddress || fromAddress,
    });

    return result.xdr;
  }

  // Step 3: Send signed transaction
  async sendTransaction(signedXdr: string): Promise<{ txHash: string }> {
    const result = await this.apiRequest('/send', {
      xdr: signedXdr,
      launchtube: false,
    });

    return { txHash: result.txHash || result.hash || '' };
  }
}

export const soroswapClient = new SoroswapClient();
