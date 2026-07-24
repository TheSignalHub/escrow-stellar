import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { PrivyProvider } from '@privy-io/react-auth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID ?? ''}
        config={{
          appearance: {
            theme: 'dark',
            accentColor: '#10b981',
          },
          // Email + social logins — no external EVM wallets needed
          loginMethods: ['email', 'google', 'twitter', 'discord'],
          embeddedWallets: {
            // Keep EVM wallet creation manual: fiat onramp creates/uses it only when the user chooses Buy USDC.
            ethereum: { createOnLogin: 'off' },
          },
        }}
      >
        <App />
      </PrivyProvider>
    </ErrorBoundary>
  </StrictMode>,
)
