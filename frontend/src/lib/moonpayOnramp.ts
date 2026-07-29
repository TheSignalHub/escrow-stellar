export const MOONPAY_ONRAMP_API_KEY = import.meta.env.VITE_MOONPAY_API_KEY || '';

export const MOONPAY_ONRAMP_ENVIRONMENT =
  import.meta.env.VITE_MOONPAY_ENVIRONMENT === 'production' ? 'production' : 'sandbox';

export const MOONPAY_ONRAMP_DEFAULT_AMOUNT =
  import.meta.env.VITE_MOONPAY_DEFAULT_AMOUNT || '30';

export const MOONPAY_ONRAMP_BASE_CURRENCY =
  (import.meta.env.VITE_MOONPAY_BASE_CURRENCY || 'eur').toLowerCase();

export const MOONPAY_ONRAMP_CURRENCY_CODE =
  (import.meta.env.VITE_MOONPAY_CURRENCY_CODE || 'xlm').toLowerCase();

export function getMoonPayWidgetBaseUrl(): string {
  return MOONPAY_ONRAMP_ENVIRONMENT === 'production'
    ? 'https://buy.moonpay.com'
    : 'https://buy-sandbox.moonpay.com';
}

export function createMoonPayOnrampUrl(input: {
  walletAddress: string;
  baseCurrencyAmount?: string;
  baseCurrencyCode?: string;
}): string {
  const params = new URLSearchParams({
    apiKey: MOONPAY_ONRAMP_API_KEY,
    currencyCode: MOONPAY_ONRAMP_CURRENCY_CODE,
    defaultCurrencyCode: MOONPAY_ONRAMP_CURRENCY_CODE,
    walletAddress: input.walletAddress,
    baseCurrencyCode: (input.baseCurrencyCode || MOONPAY_ONRAMP_BASE_CURRENCY).toLowerCase(),
    baseCurrencyAmount: input.baseCurrencyAmount || MOONPAY_ONRAMP_DEFAULT_AMOUNT,
    showWalletAddressForm: 'false',
    theme: 'dark',
  });

  return `${getMoonPayWidgetBaseUrl()}/?${params.toString()}`;
}
