# The Signal — Stellar Escrow Demo

Decentralized escrow frontend on **Stellar Soroban Testnet**.
Milestone-based contracts, atomic fee routing, on-chain reputation, embedded wallets.

---

## Stack

| Layer | Technology |
| --- | --- |
| UI | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 (`@theme` block) |
| Chain | Stellar / Soroban Testnet |
| Stellar SDK | `@stellar/stellar-sdk` |
| Extension wallets | `@creit.tech/stellar-wallets-kit` — Freighter, Albedo |
| Embedded wallets | `@privy-io/react-auth` — Email OTP, Google, Twitter, Discord |

---

## Quick Start

```bash
cd frontend
npm install
cp .env.example .env   # fill in VITE_PRIVY_APP_ID (see below)
npm run dev            # http://localhost:5173
```

---

## Environment Variables

Create a `.env` file at the root of the `frontend/` folder:

```env
# Required for email/social login (embedded wallets)
VITE_PRIVY_APP_ID=your-privy-app-id-here

# Set after deploying the contract to Testnet
VITE_DEAL_ESCROW_CONTRACT=

# Network profile. Leave as testnet for the SCF demo.
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_STELLAR_EXPLORER_URL=https://stellar.expert/explorer/testnet
VITE_FRIENDBOT_URL=https://friendbot.stellar.org

# Demo testnet USDC-compatible token address (SAC)
VITE_USDC_TOKEN_ADDRESS=
VITE_SETTLEMENT_TOKEN_SYMBOL=tUSDC
VITE_SETTLEMENT_TOKEN_NAME=Demo Test USD
VITE_SETTLEMENT_TOKEN_DECIMALS=7
VITE_SETTLEMENT_MIN_UNITS=1
VITE_SETTLEMENT_ASSET_POLICY=demo-testnet
VITE_STELLAR_BROKER_PROVIDER=testnet-soroswap-seeded
VITE_STELLAR_BROKER_SLIPPAGE_BPS=100
VITE_STELLAR_BROKER_QUOTE_TTL_SECONDS=3600

# Soroswap router used by the Broker-style testnet route
VITE_SOROSWAP_ROUTER_ADDRESS=
```

The Soroswap public aggregator API key is intentionally not a `VITE_` variable.
For the single Coolify deployment, set it on the backend as `SOROSWAP_API_KEY`.
NEAR Intents keys and approved settlement asset lists are also backend-only.
Do not create `VITE_` variables for `NEAR_INTENTS_JWT`, provider asset ids, or
live execution flags; the frontend uses local `/api/near-intents/*` routes so
secrets stay on the server. The reusable cross-chain panel reads the public
readiness payload to prefill/select approved settlement assets from the Deals
funding flow. Refund routing is
managed through the connected source wallet in production; the backend default
refund account is only a dry-quote QA fallback.

For a non-testnet profile, set `VITE_STELLAR_NETWORK=mainnet`, provide mainnet
RPC/Horizon/Explorer URLs, omit `VITE_FRIENDBOT_URL`, and replace the demo
settlement token/router/pool with production-approved provider settings.
See [`../docs/SETTLEMENT_ASSET_POLICY.md`](../docs/SETTLEMENT_ASSET_POLICY.md)
for precision, minimum amount, trustline, and dust/rounding policy.

> Without `VITE_PRIVY_APP_ID`, the **Email / Social** tab shows a warning but the
> **Freighter / Albedo** path remains fully functional.

---

## Wallet Architecture

```text
Connect Wallet
├── Tab "Email / Social"  →  Direct OAuth / OTP (no iframe, no popup blocks)
│     ├── Google / Twitter / Discord  →  useLoginWithOAuth → initOAuth()
│     └── Email OTP                  →  useLoginWithEmail → sendCode / loginWithCode
│           └── useCreateWallet({ chainType: 'stellar' })
│                 └── Stellar Ed25519 embedded wallet
│                       └── signing: getStellarTxHash → signRawHash → assembleStellarSignedTx
│
└── Tab "Extension Wallet"  →  StellarWalletsKit modal
      ├── Freighter (Chrome / Firefox extension)
      └── Albedo   (web-based, no extension needed)
```

Both paths expose the same `WalletState` interface via `useUnifiedWallet`.
All components (`DealDashboard`, `CreateDeal`, etc.) are wallet-source agnostic.

**Key implementation note:** OAuth buttons call `initOAuth()` directly from the main
window context (not from inside Privy's iframe) — required for popup-based OAuth to
work in Firefox and Chrome without being silently blocked.

---

## Dispute Resolution

Disputes follow a two-phase model:

| Actor | Action |
| --- | --- |
| Client or Provider | Flag dispute → milestone frozen |
| Client (optional) | Accept & Release to Provider (override the dispute) |
| Contract admin / operator | Call `resolve_dispute` on-chain with refund split |

The admin address is set when the contract is initialized. Only that address
can call `resolve_dispute`. The client UI surfaces an "Under review" banner
and an optional release override. It does **not** expose the admin split
controls; those remain an operator/contract path for this demo.

Final-tranche unhappy-path QA coverage and remaining evidence tasks are tracked
in [`../docs/scf/unhappy-path-qa-2026-07-01.md`](../docs/scf/unhappy-path-qa-2026-07-01.md).

---

## Features

- **Deals** — browse all on-chain escrows, filter by status, search by ID / address, and fund/release/dispute milestones, including cross-chain quote initiation from pending milestones
- **Create Deal** — create milestone-based escrow deals with custom splits and XLM/direct-USDC/source-asset selection
- **Wallet Prep** — request testnet XLM and route XLM into demo test USDC through the seeded Soroswap testnet path before funding milestones
- **Oracle** — scan any public key's on-chain reputation + on-chain leaderboard (top clients / providers)
- **Live Ticker** — real-time feed of recent contract activity on the homepage

For the SCF #42 Tranche 2 demo, the Fund/Create Deal flows demonstrate
Broker-style multi-asset funding: XLM is used as the non-USDC source asset,
the seeded Soroswap testnet route converts it into the configured demo test
USDC settlement asset, and the escrow contract settles against that configured
asset. Pending milestones in the Deals tab also expose a NEAR Intents-backed
cross-chain funding entry. The panel locks to the selected deal/milestone
amount, lets the user choose a source asset and approved Stellar settlement
asset, gets a quote, shows payment instructions/status, and reports whether the
returned 1Click quote was verified. It intentionally hides binding ids, raw
asset ids, JWT/readiness internals, refund fallback envs, and
internal smoke terminology. The demo test USDC token is not Circle-issued
production USDC, and NEAR/payment status never marks escrow funded until the
Stellar DealEscrow `funded` event exists. If the backend exposes a quote-only
demo destination because Stellar-route liquidity is unavailable, the panel
labels it as quote evidence rather than escrow settlement.

The Oracle tab is separate: it is a reputation and on-chain activity reader,
not the swap proof or indexer dashboard.

---

## Key Files

```text
frontend/src/
├── hooks/
│   ├── useStellarWallet.ts    # Freighter / Albedo via StellarWalletsKit
│   ├── usePrivyWallet.ts      # Email / Social via Privy (isWalletLoading state)
│   ├── useUnifiedWallet.ts    # Merges both sources → single WalletState
│   └── useDealEscrow.ts       # Soroban contract calls
├── lib/
│   ├── stellar.ts             # RPC URLs, Stellar SDK helpers
│   ├── stellarBroker.ts       # Broker-facing adapter for the testnet route
│   ├── nearIntents.ts         # Browser client for local NEAR Intents adapter APIs
│   ├── soroswapOnchain.ts     # Direct seeded Soroswap router path
│   ├── privy-stellar.ts       # Signing bridge: XDR ↔ Privy raw hash
│   └── dealMetadata.ts        # Local event log
├── components/
│   ├── WalletConnectModal.tsx # 2-tab modal (Privy + SWK)
│   ├── NearIntentsPanel.tsx   # Reusable cross-chain quote/status panel for deal funding
│   ├── DealDashboard.tsx      # Split-panel deal management UI
│   ├── ReputationBadge.tsx    # Oracle scanner + leaderboard
│   └── ui/Components.tsx      # Card, Button, Tag primitives
└── App.tsx                    # Root — LiveTicker, tab navigation, wallet loading skeleton
```

---

## Setting Up Privy (Embedded Wallets)

Privy lets users connect **without a browser extension** via email or social account.
A self-custodial Stellar Ed25519 wallet is created client-side on first login.

### 1. Create a Privy account

1. Go to **[https://privy.io](https://privy.io)** → **Start for free**
2. Sign up with GitHub or email

### 2. Create an app

1. Dashboard → **Create app**
2. Name: `The Signal` (or anything)
3. Type: **Web**

### 3. Get the App ID

1. Dashboard → your app → **Settings** → **Basics**
2. Copy the **App ID** field (`clz-xxxxxxxxxxxxxxxxxx`)
3. Paste into `.env`:

   ```env
   VITE_PRIVY_APP_ID=clz-xxxxxxxxxxxxxxxxxx
   ```

### 4. Enable login methods

Dashboard → **Login methods**, enable:

- Email (OTP)
- Google *(requires OAuth credentials in dashboard)*
- Twitter / X *(requires OAuth credentials)*
- Discord *(requires OAuth credentials)*

> Methods not enabled in the dashboard will be silently unavailable.
> If OAuth buttons do nothing, check that the provider is enabled and its
> Client ID / Secret are configured.

### 5. Set allowed origins

Dashboard → **Settings** → **Allowed origins** → add:

- `http://localhost:5173` (dev)
- your production domain if deployed

---

## Commands

```bash
npm run dev      # Dev server (http://localhost:5173)
npm run build    # Production build
npm run preview  # Preview the build
npx tsc --noEmit # Type-check without emitting
```

---

## Resources

- [Stellar Soroban Docs](https://soroban.stellar.org)
- [Privy Docs — Stellar (Tier 2)](https://docs.privy.io/wallets/using-wallets/other-chains)
- [StellarWalletsKit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
- [Stellar Expert (Testnet Explorer)](https://stellar.expert/explorer/testnet)
