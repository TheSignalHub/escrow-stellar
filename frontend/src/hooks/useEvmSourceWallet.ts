import { useCallback, useEffect, useMemo, useState } from 'react';

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: 'accountsChanged' | 'chainChanged', handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: 'accountsChanged' | 'chainChanged', handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isRabby?: boolean;
  providers?: Eip1193Provider[];
}

export interface EvmSourceWalletState {
  address: string;
  chainId: string;
  provider?: Eip1193Provider;
  isAvailable: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

function normalizeAccount(value: unknown): string {
  if (!Array.isArray(value)) return '';
  const [account] = value;
  return typeof account === 'string' ? account : '';
}

function normalizeChainId(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function getInjectedEvmProvider(): Eip1193Provider | undefined {
  if (typeof window === 'undefined') return undefined;
  const ethereum = window.ethereum as Eip1193Provider | undefined;
  if (!ethereum) return undefined;

  if (Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
    return (
      ethereum.providers.find((candidate: Eip1193Provider) => candidate.isMetaMask) ||
      ethereum.providers.find((candidate: Eip1193Provider) => candidate.isRabby) ||
      ethereum.providers[0]
    );
  }

  return ethereum;
}

export function useEvmSourceWallet(): EvmSourceWalletState {
  const [provider, setProvider] = useState<Eip1193Provider | undefined>(() => getInjectedEvmProvider());
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectProvider = useCallback(() => {
    const nextProvider = getInjectedEvmProvider();
    setProvider(nextProvider);
    return nextProvider;
  }, []);

  const refresh = useCallback(async () => {
    const currentProvider = provider || detectProvider();
    if (!currentProvider) return;
    const [accounts, chain] = await Promise.all([
      currentProvider.request({ method: 'eth_accounts' }),
      currentProvider.request({ method: 'eth_chainId' }).catch(() => ''),
    ]);
    setAddress(normalizeAccount(accounts));
    setChainId(normalizeChainId(chain));
  }, [detectProvider, provider]);

  useEffect(() => {
    detectProvider();
    const handleInitialized = () => {
      void refresh();
    };
    window.addEventListener('ethereum#initialized', handleInitialized, { once: true });
    const firstRetry = window.setTimeout(() => {
      void refresh();
    }, 250);
    const secondRetry = window.setTimeout(() => {
      void refresh();
    }, 1200);
    return () => {
      window.removeEventListener('ethereum#initialized', handleInitialized);
      window.clearTimeout(firstRetry);
      window.clearTimeout(secondRetry);
    };
  }, [detectProvider, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!provider?.on) return;
    const handleAccountsChanged = (accounts: unknown) => {
      setAddress(normalizeAccount(accounts));
    };
    const handleChainChanged = (nextChainId: unknown) => {
      setChainId(normalizeChainId(nextChainId));
    };
    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);
    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [provider]);

  const connect = useCallback(async () => {
    const currentProvider = provider || detectProvider();
    if (!currentProvider) {
      setError('No EVM wallet was detected. Unlock MetaMask, refresh the page, or check that the extension is enabled for this site.');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = await currentProvider.request({ method: 'eth_requestAccounts' });
      setAddress(normalizeAccount(accounts));
      const chain = await currentProvider.request({ method: 'eth_chainId' }).catch(() => '');
      setChainId(normalizeChainId(chain));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Source wallet connection was rejected.');
    } finally {
      setIsConnecting(false);
    }
  }, [detectProvider, provider]);

  const disconnect = useCallback(() => {
    setAddress('');
    setChainId('');
    setError(null);
  }, []);

  return useMemo(
    () => ({
      address,
      chainId,
      provider,
      isAvailable: Boolean(provider),
      isConnected: Boolean(address),
      isConnecting,
      error,
      connect,
      disconnect,
    }),
    [address, chainId, connect, disconnect, error, isConnecting, provider]
  );
}
