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
# Optional override. By default the app derives native XLM SAC by network:
# testnet CDLZFC3S...HHGCYSC, mainnet CAS3J7GY...XOWMA.
VITE_XLM_SAC_ADDRESS=

# Optional public preset payout addresses for mainnet smoke deals.
# Leave blank to use the pilot ops wallet fallback; set to separate funded
# provider/connector wallets when available.
VITE_MAINNET_DEMO_PROVIDER_ADDRESS=
VITE_MAINNET_DEMO_CONNECTOR_ADDRESS=

# Optional override. By default the app derives USDC-compatible SAC by network:
# testnet demo USDC CAHJQG77...IVLFX, mainnet Circle USDC CCW67TSZ...JMI75.
VITE_USDC_TOKEN_ADDRESS=
VITE_SETTLEMENT_TOKEN_SYMBOL=USDC
VITE_SETTLEMENT_TOKEN_NAME=Stellar USDC
VITE_SETTLEMENT_TOKEN_DECIMALS=7
VITE_SETTLEMENT_MIN_UNITS=1
VITE_SETTLEMENT_ASSET_POLICY=demo-testnet
VITE_STELLAR_BROKER_PROVIDER=testnet-soroswap-seeded
VITE_STELLAR_BROKER_SLIPPAGE_BPS=100
VITE_STELLAR_BROKER_QUOTE_TTL_SECONDS=3600

# Soroswap router used by the Broker-style testnet route
VITE_SOROSWAP_ROUTER_ADDRESS=

# Optional Privy fiat onramp top-up. Defaults buy Base USDC into a Privy/EVM
# wallet; Stellar escrow is funded later from the Stellar wallet after routing.
VITE_PRIVY_FIAT_ONRAMP_ENABLED=true
VITE_PRIVY_FIAT_ONRAMP_ENVIRONMENT=sandbox
VITE_PRIVY_FIAT_ONRAMP_DESTINATION_CHAIN=eip155:8453
VITE_PRIVY_FIAT_ONRAMP_DESTINATION_ASSET=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
VITE_PRIVY_FIAT_ONRAMP_DEFAULT_AMOUNT=50
VITE_PRIVY_FIAT_ONRAMP_SOURCE_ASSETS=usd,eur,gbp
VITE_PRIVY_FIAT_ONRAMP_DEFAULT_SOURCE_ASSET=usd
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
settlement token/router/pool with production-approved provider settings. The
Wallet Prep creates required trustlines from the connected Stellar wallet for
known issued receive assets such as Circle USDC before swap settlement when the
wallet has not opted in yet. Unknown advanced pasted receive contracts require
manual trustline preparation before execution.
Production NEAR Intents top-up and direct escrow funding require active Stellar
destination accounts. Mainnet Create Deal requires the connected client wallet
to be active, then accepts a valid provider payout address without forcing
recipient onboarding during agreement creation. The connector address is
optional; when omitted, the frontend submits the provider as the connector
recipient so the connector share is paid to the provider at milestone release.
XLM settlement is the
recommended default for the grant demo and fresh payout addresses; USDC
settlement remains available as an optional issued-asset path. USDC payout
addresses must be active with XLM reserve and opted into Stellar USDC before
release, because release is the step that actually sends issued assets to
recipients.
Mainnet quick-start presets can prefill public payout addresses using
`VITE_MAINNET_DEMO_PROVIDER_ADDRESS` and
`VITE_MAINNET_DEMO_CONNECTOR_ADDRESS`; only public Stellar addresses belong in
those variables.
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
| Client or Provider | Flag dispute with reason note → milestone frozen |
| Contract admin / operator | Review note and call `resolve_dispute` on-chain with refund split |

The admin address is set when the contract is initialized. Only that address
can call `resolve_dispute`. The client UI surfaces an "Under review" banner
for disputed milestones. It does **not** expose release or admin split controls
for disputed funds; those remain in the protected `/admin` dispute-operations
console and admin-signed contract path. Dispute reasons are stored off-chain in
the indexer/support database, not in public Soroban events.

Final-tranche unhappy-path QA coverage and remaining evidence tasks are tracked
in [`../docs/scf/unhappy-path-qa-2026-07-01.md`](../docs/scf/unhappy-path-qa-2026-07-01.md).

---

## Features

- **Deals** — browse all on-chain escrows, filter by status, search by ID / address, and fund/release/dispute milestones, including settlement-balance checks and cross-chain quote initiation from pending milestones
- **Create Deal** — create milestone-based escrow deals with custom splits and escrow settlement-asset selection; Stellar XLM is selected by default, while Stellar USDC remains available as an optional issued-asset path
- **Wallet Prep** — review wallet destinations, buy USDC with fiat through Privy-supported onramps, convert supported Stellar assets through the configured AMM/broker route, and quote cross-chain wallet top-ups through NEAR Intents before funding the deal. Friendbot is shown only on testnet.
- **Oracle** — scan any public key's on-chain reputation + on-chain leaderboard (top clients / providers)
- **Live Ticker** — real-time feed of recent contract activity on the homepage

For the SCF #42 Tranche 2 demo, Create Deal selects the escrow settlement
asset, while the Deals funding step decides whether the connected wallet can
fund directly. The first pending milestone acts as the checkout entry and shows
the remaining pending deal amount plus the matching wallet balance for XLM or
the configured demo test USDC asset. If the wallet is short, direct Stellar
funding is disabled and the UI keeps **Wallet Prep** and **Pay from Another
Chain** available as recovery paths. Wallet Prep can convert supported Stellar
assets through the configured AMM/broker route, with the seeded Soroswap
testnet path retained for reproducible XLM/demo-USDC review and a mainnet
Stellar DEX/Horizon path for XLM/Circle USDC. This is shown as **Convert on
Stellar** because it prepares wallet balance only; escrow locks later from
Deals via **Fund Deal**. The conversion form uses route dropdowns for common
XLM/USDC routes, shows selected XLM/USDC balances beside the route and amount
fields, includes an exact-pay **Max** action, and keeps custom Stellar token
contract addresses in advanced mode. Slippage is user-selectable. Custom pairs
quote and execute only when the configured broker route has liquidity.
For mainnet issued-asset receives, the connected Stellar wallet must exist on
Stellar before a browser-signed trustline can be created. Inactive wallets show
an XLM activation reminder first; active wallets missing Circle USDC show the
one-click USDC trustline action.

Wallet Prep also shows a **Your Wallets** section and a **Buy USDC with Fiat**
card when Privy onramps are enabled. The wallet overview separates the Stellar
escrow wallet from the Base/EVM funding wallet. The fiat card starts Privy's
fiat-to-crypto modal and sends purchased USDC to the Base/EVM wallet. It is a
top-up path only: the deal is not escrow-funded until the user routes assets
into Stellar when needed and confirms **Fund Deal** from the Stellar wallet.
For fresh Stellar wallets, the default route target is native XLM first,
because XLM activates the Stellar account and can fund XLM-settled escrow
directly. Stellar USDC is appropriate after the Stellar wallet has XLM reserve
and an enabled USDC trustline.

Wallet Prep also includes a general **Add Funds from Another Chain** NEAR
Intents/1Click panel for wallet top-ups. The Deals tab keeps the deal-aware
version where the remaining amount and settlement asset are locked from the
selected pending deal. Standalone Wallet Prep top-up amounts are shown in
human Stellar units and converted to base units only when estimating a 1Click
source amount.

The first pending milestone in the Deals tab also exposes a NEAR Intents-backed
cross-chain **Add Funds** entry. The panel locks to the selected deal and remaining
pending balance, discovers source chain/source asset options from 1Click,
locks the destination to the deal's Stellar settlement asset, gets a quote, and
reports whether the returned 1Click quote was verified. It intentionally hides
binding ids, JWT/readiness internals, refund fallback envs, and internal smoke
terminology. Source token metadata is public 1Click discovery data; destination
settlement assets remain backend-approved. The demo test USDC token is not
Circle-issued production USDC, and
NEAR/payment status never marks escrow funded. After the Stellar wallet is
topped up, the user confirms **Fund Deal**, and only Stellar DealEscrow
`funded` events mark escrow funded. If the backend exposes a quote-only demo destination
because Stellar-route liquidity is unavailable, the panel labels it as quote
evidence rather than escrow settlement. For deal-tied top-ups, the amount is
shown in human Stellar units and the destination route is constrained to the
deal's approved Stellar settlement asset: Stellar USDC-compatible settlement
token for USDC deals, or Stellar XLM for XLM deals. Source assets remain
user-selectable from supported non-Stellar 1Click routes; recommended discovered
routes are ranked first, source amounts are estimated from live token prices
when available, and successful dry quotes show a quote-evidence checklist. The
panel now separates **Preview Quote** from **Get Live Payment Quote** so the app
can prove live 1Click pricing without pretending a source payment is ready.
Live execution requires a connected source wallet so refunds return to the
wallet that pays. EVM source routes now support a lightweight browser-wallet
connector plus native/ERC-20 payment submission to the returned 1Click deposit
address, including chain-switch prompts when the selected EVM route has a known
chain id. NEAR and Solana source routes remain preview-only until their native
connectors are wired.

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
│   ├── privyOnramp.ts         # Privy fiat top-up env/config helpers
│   ├── nearIntents.ts         # Browser client for local NEAR Intents adapter APIs
│   ├── soroswapOnchain.ts     # Direct seeded Soroswap router path
│   ├── privy-stellar.ts       # Signing bridge: XDR ↔ Privy raw hash
│   └── dealMetadata.ts        # Local event log
├── components/
│   ├── WalletConnectModal.tsx # 2-tab modal (Privy + SWK)
│   ├── WalletPrepOverview.tsx # Stellar escrow wallet + Base/EVM funding wallet overview
│   ├── PrivyFiatTopUpCard.tsx # Fiat-to-Base-USDC wallet top-up via Privy onramp
│   ├── NearIntentsPanel.tsx   # Reusable cross-chain quote/status panel for wallet top-up and deal funding
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
