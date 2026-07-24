import { IS_TESTNET } from './stellar';

export const PRIVY_FIAT_ONRAMP_ENABLED =
  (import.meta.env.VITE_PRIVY_FIAT_ONRAMP_ENABLED ?? 'true') !== 'false';

export const PRIVY_FIAT_ONRAMP_ENVIRONMENT =
  (import.meta.env.VITE_PRIVY_FIAT_ONRAMP_ENVIRONMENT || (IS_TESTNET ? 'sandbox' : 'production')) as 'sandbox' | 'production';

export const PRIVY_FIAT_ONRAMP_DESTINATION_CHAIN =
  (import.meta.env.VITE_PRIVY_FIAT_ONRAMP_DESTINATION_CHAIN || 'eip155:8453') as `${string}:${string}`;

export const PRIVY_FIAT_ONRAMP_DESTINATION_ASSET =
  import.meta.env.VITE_PRIVY_FIAT_ONRAMP_DESTINATION_ASSET ||
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const PRIVY_FIAT_ONRAMP_DEFAULT_AMOUNT =
  import.meta.env.VITE_PRIVY_FIAT_ONRAMP_DEFAULT_AMOUNT || '50';

const configuredSourceAssets = (
  import.meta.env.VITE_PRIVY_FIAT_ONRAMP_SOURCE_ASSETS || 'usd,eur,gbp'
)
  .split(',')
  .map((asset: string) => asset.trim().toLowerCase())
  .filter(Boolean);

export const PRIVY_FIAT_ONRAMP_SOURCE_ASSETS = (
  configuredSourceAssets.length > 0 ? configuredSourceAssets : ['usd', 'eur', 'gbp']
) as Array<'usd' | 'eur' | 'gbp'>;

export const PRIVY_FIAT_ONRAMP_DEFAULT_SOURCE_ASSET =
  (import.meta.env.VITE_PRIVY_FIAT_ONRAMP_DEFAULT_SOURCE_ASSET || PRIVY_FIAT_ONRAMP_SOURCE_ASSETS[0] || 'usd') as 'usd' | 'eur' | 'gbp';

export function onrampChainLabel(chain: string): string {
  if (chain === 'eip155:8453') return 'Base';
  if (chain === 'eip155:1') return 'Ethereum';
  if (chain === 'eip155:42161') return 'Arbitrum';
  if (chain === 'solana:mainnet') return 'Solana';
  return chain;
}
