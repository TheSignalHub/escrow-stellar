import { useCallback, useEffect, useMemo, useState } from 'react';

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: 'accountsChanged' | 'chainChanged', handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: 'accountsChanged' | 'chainChanged', handler: (...args: unknown[]) => void) => void;
}

export interface EvmSourceWalletState {
  address: string;
  chainId: string;
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

export function useEvmSourceWallet(): EvmSourceWalletState {
  const provider = typeof window !== 'undefined' ? (window.ethereum as Eip1193Provider | undefined) : undefined;
  const isAvailable = Boolean(provider);
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!provider) return;
    const [accounts, chain] = await Promise.all([
      provider.request({ method: 'eth_accounts' }),
      provider.request({ method: 'eth_chainId' }).catch(() => ''),
    ]);
    setAddress(normalizeAccount(accounts));
    setChainId(normalizeChainId(chain));
  }, [provider]);

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
    if (!provider) {
      setError('Install an Ethereum wallet such as MetaMask or Rabby to continue.');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      setAddress(normalizeAccount(accounts));
      const chain = await provider.request({ method: 'eth_chainId' }).catch(() => '');
      setChainId(normalizeChainId(chain));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Source wallet connection was rejected.');
    } finally {
      setIsConnecting(false);
    }
  }, [provider]);

  const disconnect = useCallback(() => {
    setAddress('');
    setChainId('');
    setError(null);
  }, []);

  return useMemo(
    () => ({
      address,
      chainId,
      isAvailable,
      isConnected: Boolean(address),
      isConnecting,
      error,
      connect,
      disconnect,
    }),
    [address, chainId, connect, disconnect, error, isAvailable, isConnecting]
  );
}
