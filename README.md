# The Signal — Stellar Escrow

Milestone-based escrow with atomic 3-way payment splits on Soroban. Built for the [Stellar Community Fund (SCF) Integration Track](https://communityfund.stellar.org/).

## What This Is

A fully functional implementation of The Signal's deal escrow system on Stellar's Soroban smart contract platform. It demonstrates how a real-world B2B marketplace handles milestone-based payments with three-party atomic splits, production wallet funding, cross-chain top-ups, and admin dispute resolution.

**Contract on Testnet**: [`CCUOZRSDISJOF66YPNEGY7FDH7WTUZHI5TB55F4MOGED2UEKZXYRP6AP`](https://stellar.expert/explorer/testnet/contract/CCUOZRSDISJOF66YPNEGY7FDH7WTUZHI5TB55F4MOGED2UEKZXYRP6AP)

**Contract on Mainnet**: [`CDZSYODEHRJPMN63RDARHEH5NUOXWC76MFM67MEAZYOWY2YJC34OS2Z4`](https://stellar.expert/explorer/public/contract/CDZSYODEHRJPMN63RDARHEH5NUOXWC76MFM67MEAZYOWY2YJC34OS2Z4)

**GitHub**: [github.com/TheSignalHub/escrow-stellar](https://github.com/TheSignalHub/escrow-stellar)

## SCF #42 Build Status

This repository includes both the original Tranche 2 testnet environment and a
mainnet pilot contract for production validation:

- **Deliverable 4**: DealEscrow is deployed to Soroban Testnet and connected to the marketplace frontend.
- **Deliverable 5**: DealEscrow event topics and indexer mapping are published in [`docs/EVENT_SCHEMA.md`](docs/EVENT_SCHEMA.md), with an isolated testnet indexer and read-only event dashboard in [`indexer`](indexer).
- **Deliverable 6**: The frontend exposes a Broker-style multi-asset funding step. On testnet, the adapter routes XLM into the configured demo test USDC settlement asset through a seeded Soroswap router path because public indexed testnet liquidity may be unavailable after resets.
- **Mainnet DealEscrow pilot**: The audited `fund_deal` contract is deployed on Stellar Mainnet and supports create, fund-once, release, dispute, and admin resolution flows.
- **NEAR Intents cross-chain top-up**: NEAR Intents / 1Click is integrated as a server-side cross-chain Stellar wallet top-up path. The user chooses source chain, source asset, and source amount; the destination is constrained to the approved Stellar settlement asset for the deal. EVM source routes can submit native/ERC-20 payments from a connected browser wallet to the 1Click deposit address. After the Stellar wallet is topped up, the user confirms **Fund Deal**, which calls `fund_deal`; escrow state remains gated on Soroban `funded` events.
- **Fiat onramp path**: Stripe hosted crypto onramp can create an XLM top-up session for the connected Stellar wallet. The user completes the fiat purchase with Stripe/Link, then funds the same DealEscrow workflow from the Stellar wallet after XLM arrives.

Live links:

```text
Frontend:             https://stellar.thesignal.directory
Event dashboard:      https://stellar.thesignal.directory/market_dashboard
Internal admin:       https://stellar.thesignal.directory/admin
Mainnet contract:     https://stellar.expert/explorer/public/contract/CDZSYODEHRJPMN63RDARHEH5NUOXWC76MFM67MEAZYOWY2YJC34OS2Z4
Testnet contract:     https://stellar.expert/explorer/testnet/contract/CCUOZRSDISJOF66YPNEGY7FDH7WTUZHI5TB55F4MOGED2UEKZXYRP6AP
```

`/market_dashboard` is intentionally public and read-only for review. `/admin`
is a protected dispute-operations console with open-dispute evidence,
resolution/refund actions, and manual indexer controls. It is protected by
operator authentication. Resolution actions require the configured admin wallet
to sign on Stellar.

Backend readiness can be checked before frontend QA from `indexer/`:

```bash
BACKEND_BASE_URL=https://stellar.thesignal.directory npm run smoke:backend
```

The smoke command checks health, NEAR readiness, indexer/dashboard state,
dispute-event evidence, and optional protected NEAR quote or indexer actions
when admin credentials are supplied.

Reference testnet funding configuration:

```text
DealEscrow:        CCUOZRSDISJOF66YPNEGY7FDH7WTUZHI5TB55F4MOGED2UEKZXYRP6AP
test USDC:         CAHJQG77XDPFZAC7JJSRGAVYWKGEUDWOQ5O33VK4VTR2ZKOBCZAIVLFX
XLM SAC:           CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
Soroswap router:   CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD
Seeded pool:       CA4ASYDOCOJXZFB3H7O6QJ5PTDAMXORCRZN5HNE3KI7TBGS5PGR53XZ5
```

Current mainnet pilot configuration:

```text
DealEscrow:        CDZSYODEHRJPMN63RDARHEH5NUOXWC76MFM67MEAZYOWY2YJC34OS2Z4
Admin wallet:      GD7H2KNLMG5MUOE75HWFAYONMTX5P3CNT3KT53P7SFSB32J4H3JJKFYG
Protocol wallet:   GD7H2KNLMG5MUOE75HWFAYONMTX5P3CNT3KT53P7SFSB32J4H3JJKFYG
XLM SAC:           CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA
USDC SAC:          CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75
Preset provider:   configurable via VITE_MAINNET_DEMO_PROVIDER_ADDRESS
Preset connector:  configurable via VITE_MAINNET_DEMO_CONNECTOR_ADDRESS
```

The test USDC token is a demo-only SEP-41 testnet token, not Circle-issued
USDC. The Soroswap route is used to prove the non-USDC source asset flow on
testnet: XLM in, demo test USDC settlement asset out, then escrow funding.

The indexer database is not the source of truth for funds or deal state. The
Soroban contract remains the source of truth; the isolated MongoDB indexer
database is a read model for marketplace-style status sync and operational
visibility.

Network endpoints are environment-driven. Set `VITE_STELLAR_NETWORK`,
`VITE_STELLAR_RPC_URL`, `VITE_STELLAR_HORIZON_URL`, and
`VITE_STELLAR_EXPLORER_URL` for a mainnet, staging, or testnet profile.
Friendbot is testnet-only and hidden outside testnet.
Mainnet browser-signed escrow transactions default to a `10000` stroop
inclusion fee; override with `VITE_STELLAR_INCLUSION_FEE_STROOPS` if needed.
Wallet Prep includes browser-signed native XLM transfer and fresh-account
activation, so users can move XLM from a Privy/Stellar wallet without
exporting private keys.
Settlement asset policy, precision, minimum amount, and trustline notes are in
[`docs/SETTLEMENT_ASSET_POLICY.md`](docs/SETTLEMENT_ASSET_POLICY.md).

NEAR Intents / 1Click is integrated as a cross-chain add-funds path. A user can
choose a supported source chain and asset, request a live route, send the source
payment from a connected browser wallet, track routing progress, and then fund
the Stellar escrow from the connected Stellar wallet after settlement arrives.
Escrow state remains anchored to the Soroban DealEscrow contract and its funded
events. See [`docs/NEAR_INTENTS_BOUNDARY.md`](docs/NEAR_INTENTS_BOUNDARY.md).

Stripe hosted crypto onramp is integrated as an XLM wallet top-up path. A user
can buy native XLM into the connected Stellar wallet, then fund the same
DealEscrow workflow from that wallet. See
[`docs/PAYMENT_RAIL_BOUNDARY.md`](docs/PAYMENT_RAIL_BOUNDARY.md).
An isolated MoonPay sandbox route check is also available at
`/moonpay_onramp_test` when `VITE_MOONPAY_API_KEY` is configured.

## Key Features

- **Fund-Once Milestone Escrow** — Deals split into milestones (e.g., 30/50/20). The client can lock the remaining deal balance once, then release or dispute each milestone independently.
- **Atomic 3-Way Splits** — Every release executes three transfers in one atomic transaction: Provider, Connector (BD), and Protocol.
- **On-Chain Reputation** — Providers accumulate a verifiable deal completion counter on-chain. Cannot be faked.
- **Dispute Resolution** — Either party raises a dispute with an off-chain reason note to freeze funds. Admin resolution supports provider win, client refund, or partial split outcomes with explicit on-chain states, and the protected `/admin` console shows open dispute evidence, notes, and admin resolution actions.
- **Wallet Prep** — Review wallet destinations, send native XLM through the connected wallet signer, buy XLM through Stripe hosted onramp, convert supported Stellar assets, and prepare cross-chain top-ups before funding a deal.
- **Mainnet Wallet Readiness** — XLM is the recommended default settlement asset because native XLM can activate fresh Stellar accounts. Stellar USDC remains available for wallets with XLM reserve and a USDC trustline.
- **Fiat Top-Up via Stripe** — Buy native XLM through Stripe hosted onramp into the connected Stellar wallet, then fund DealEscrow from that wallet after settlement arrives.
- **Cross-Chain Add Funds Entry** — Choose a supported source chain and asset, request a NEAR Intents / 1Click route, send the source payment from a connected browser wallet, track routing progress, and fund the Stellar escrow after settlement arrives.
- **Privy Wallet Path** — Embedded Stellar wallet flow, with Stellar Wallets Kit support retained in the codebase.
- **Indexer Dashboard** — Soroban RPC event reader writes decoded DealEscrow lifecycle events into an isolated MongoDB read model and exposes `/market_dashboard`. NEAR Intents / 1Click top-up events are separate wallet-funding evidence and are not counted as escrow state until `fund_deal` emits DealEscrow `funded` events.
- **Live Network Ticker** — Real-time on-chain contract data displayed on the homepage marquee (read-only, no wallet required).

## Architecture Overview

```text
┌──────────────────────────────────────────────────┐
│                    Frontend                       │
│  React 19 + TypeScript + Vite + Tailwind CSS v4  │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Connect  │ │ Create   │ │  Deal Dashboard   │  │
│  │ Wallet   │ │ Deal     │ │  (Fund/Release/   │  │
│  │          │ │          │ │   Dispute)        │  │
│  └────┬─────┘ └────┬─────┘ └────────┬──────────┘  │
│       │             │                │             │
│  ┌────┴─────────────┴────────────────┴──────────┐  │
│  │        useDealEscrow Hook                     │  │
│  │  (Build TX → Simulate → Sign → Submit → Poll)│  │
│  └──────────────────┬────────────────────────────┘  │
└─────────────────────┼────────────────────────────────┘
                      │ Soroban RPC
┌─────────────────────┼────────────────────────────────┐
│              Stellar Network                          │
│  ┌──────────────────┴────────────────────────────┐   │
│  │         DealEscrow Smart Contract              │   │
│  │                                                │   │
│  │  create_deal() → fund_deal() → release_milestone()│ │
│  │                    ↓                            │  │
│  │            Atomic 3-Way Split                   │  │
│  │     ┌──────────┬──────────┬──────────┐         │  │
│  │     │ Provider │Connector │ Protocol │         │  │
│  │     │  (90%)   │  (4%)    │  (6%)    │         │  │
│  │     └──────────┴──────────┴──────────┘         │  │
│  └────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
                      │ Soroban RPC events
┌─────────────────────┼────────────────────────────────┐
│          Off-chain Indexer / Read Model               │
│  Soroban RPC getEvents → decode DealEscrow topics     │
│  → MongoDB escrow-transfers + indexer checkpoint      │
│  → /market_dashboard read-only dashboard              │
└───────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) with `wasm32v1-none` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
- Node.js 18+
- A Privy app ID for the embedded wallet path, or a Stellar wallet extension for the fallback wallet-kit path

### 1. Build the Smart Contract

```bash
stellar contract build
stellar contract optimize --wasm target/wasm32v1-none/release/deal_escrow.wasm
cargo test
```

### 2. Deploy to Testnet

```bash
stellar keys generate deployer --network testnet --fund

stellar contract deploy \
  --wasm target/wasm32v1-none/release/deal_escrow.wasm \
  --source-account deployer \
  --network testnet \
  --alias deal_escrow

stellar contract invoke --id deal_escrow --source-account deployer --network testnet \
  -- initialize \
  --admin deployer \
  --protocol_wallet deployer
```

### 3. Run the Frontend

```bash
cd frontend
npm install

cp .env.example .env
# Edit .env: set VITE_PRIVY_APP_ID, VITE_DEAL_ESCROW_CONTRACT,
# VITE_USDC_TOKEN_ADDRESS, VITE_SOROSWAP_ROUTER_ADDRESS,
# VITE_SOROSWAP_POOL_ADDRESS, and any VITE_STELLAR_* network overrides

npm run dev
```

### 4. Try It

1. Open `http://localhost:5173` — the landing page shows "Trust Engine." with a live glitch effect
2. Click **Connect Wallet** and use Privy or a Stellar testnet wallet
3. Fund your wallet with 10,000 XLM via Friendbot
4. Use **Wallet Prep** to buy XLM through Stripe hosted onramp, quote a NEAR Intents wallet top-up, or swap XLM into demo test USDC through the seeded Soroswap testnet route if the deal requires that settlement asset
5. Create a deal using a Quick Start scenario; the financial setup defaults to Stellar XLM, with Stellar USDC still available as an optional issued-asset settlement path
6. In **Deals**, open the first pending milestone, confirm the deal-funding balance row, then choose **Fund Deal with XLM** or use **Prepare Wallet** / **Top Up from Another Chain** when the wallet needs more XLM first
7. For the cross-chain path, request a remaining-balance top-up quote, wait for the connected Stellar wallet balance to be ready, then confirm **Fund Deal**; escrow state remains gated on Stellar `funded` events
8. Release funded milestones and watch the 3-way split visualization
9. Check synced events in `/market_dashboard`
10. For marketplace-adapter proof, run `npm run seed:marketplace-bindings` from `indexer/` to create Signal-style bindings, then reconcile through the protected binding API
11. Check the provider's on-chain reputation in the Oracle tab

## Project Structure

```text
escrow-stellar/
├── contracts/
│   └── deal_escrow/
│       └── src/
│           ├── lib.rs              # Smart contract (525 lines, 9 functions)
│           └── test.rs             # Test suite (385 lines, 10 tests)
├── frontend/
│   ├── public/
│   │   └── logo.png               # The Signal logo (favicon + header)
│   └── src/
│       ├── App.tsx                 # Root: toast system, navigation, LiveTicker, LandingView
│       ├── index.css               # Tailwind v4 @theme, animations, glitch effect CSS
│       ├── hooks/
│       │   ├── useStellarWallet.ts # Wallet connection + balance management
│       │   └── useDealEscrow.ts    # Contract interaction layer
│       ├── lib/
│       │   ├── stellar.ts          # Stellar SDK config + helpers
│       │   ├── stellarBroker.ts    # Deliverable 6 broker-facing adapter
│       │   ├── nearIntents.ts      # Browser client for local NEAR adapter APIs
│       │   ├── soroswapOnchain.ts  # Testnet route adapter via seeded Soroswap pool
│       │   └── dealMetadata.ts     # Local milestone naming + event log
│       └── components/
│           ├── ui/
│           │   ├── Components.tsx  # Card, Button, Tag shared components
│           │   └── Branding.tsx    # SignalLogo, GlowingBackground
│           ├── ConnectWallet.tsx   # Multi-wallet connect UI
│           ├── CreateDeal.tsx      # Deal creation with review + success screens
│           ├── DealDashboard.tsx   # Full deal lifecycle (split-panel, search, filters)
│           ├── SoroswapWidget.tsx  # Friendbot + Stellar Broker wallet prep
│           ├── NearIntentsPanel.tsx # Cross-chain funding quote, instructions, and status UI
│           └── ReputationBadge.tsx # On-chain reputation with radar animation
└── docs/
    ├── ARCHITECTURE.md             # System design + integration patterns
    ├── SMART_CONTRACT.md           # Contract API reference
    ├── FRONTEND.md                 # Frontend architecture details
    ├── EVENT_SCHEMA.md             # Published DealEscrow event schema
    └── DEMO_GUIDE.md              # Step-by-step QA walkthrough
```

## Smart Contract API

| Function | Auth | Description |
|----------|------|-------------|
| `initialize(admin, protocol_wallet)` | Deployer | One-time setup |
| `create_deal(client, provider, connector, token, fee_bps, share_bps, milestones)` | Client | Create escrow deal |
| `fund_deal(deal_id)` | Client | Fund all pending milestones in one payment |
| `deposit(deal_id, milestone_idx)` | Client | Fund one milestone; retained for staged funding/backwards compatibility |
| `release_milestone(deal_id, milestone_idx)` | Client | Atomic 3-way split |
| `dispute(caller, deal_id, milestone_idx)` | Client/Provider | Freeze disputed milestone |
| `resolve_dispute(deal_id, milestone_idx, refund_bps)` | Admin | Split disputed funds |
| `refund(deal_id)` | Admin | Full refund of funded milestones |
| `get_deal(deal_id)` | Anyone | Read deal state |
| `get_reputation(provider)` | Anyone | Read provider's completed deal count |

## Split Math

```text
Example: $10,000 milestone, 10% platform fee, 40% connector share

platform_fee    = $10,000 × 10%  = $1,000
connector_cut   = $1,000  × 40%  = $400
protocol_cut    = $1,000  − $400  = $600
provider_cut    = $10,000 − $1,000 = $9,000

→ Provider:  $9,000 (90%)
→ Connector: $400   (4%)
→ Protocol:  $600   (6%)
```

## Test Suite

13 comprehensive tests:

| # | Test | Verifies |
|---|------|----------|
| 1 | Happy path (single milestone) | Create → Fund → Release → verify split |
| 2 | Multi-milestone (30/50/20) | Fund deal once, release milestones independently |
| 3 | Reputation counter | Increments on deal completion |
| 4 | Dispute + resolve | Freeze → admin resolves 50/50 |
| 5 | Full refund | Admin refunds all funded milestones |
| 6 | Dispute provider win | Admin can release disputed funds fully to provider |
| 7 | Dispute client win | Admin can refund disputed funds fully to client |
| 8 | Auth checks | Non-client cannot deposit |
| 9 | Double deposit prevention | Cannot fund same milestone twice |
| 10 | Release unfunded fails | Cannot release a Pending milestone |
| 11 | Deal count tracking | Counter increments correctly |
| 12 | Variable commission (65%) | Architect tier connector share |
| 13 | Milestone count limit | Rejects deals with more than 20 milestones |

```bash
cargo test
# running 13 tests ... test result: ok. 13 passed; 0 failed
```

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Smart Contract | Rust + Soroban SDK | 22.0.0 |
| Frontend | React + TypeScript | 19.x + 5.9 |
| Build Tool | Vite | 8.0 |
| CSS | Tailwind CSS v4 | 4.2.x |
| Icons | Lucide React | 0.577+ |
| Fonts | Space Grotesk, JetBrains Mono | Google Fonts |
| Stellar SDK | @stellar/stellar-sdk | 14.6.1 |
| Wallet | Privy + Stellar Wallets Kit fallback | Mainnet/Testnet |
| Broker route | Stellar DEX pathfinding on mainnet; Soroswap router adapter on testnet | Mainnet/Testnet |
| Indexer | Express + Inngest + MongoDB | Read model |
| Network | Stellar Mainnet/Testnet | Soroban RPC |

## Production Parity

| Feature | Marketplace Rail | Stellar Escrow Rail |
|---------|------------------------|---------------------|
| 3-party split | `approveMilestone()` in Node.js | `release_milestone()` in Rust |
| Milestone lifecycle | Pending → Funded → Released / Resolved / Refunded | Same states, on-chain |
| BD connector tiers | 40–65% of platform fee | Parameterized per deal |
| Dispute escalation | Admin dashboard + Stripe | Smart contract + admin auth |
| Reputation | Database counter | Persistent storage on-chain |
| Payment | Fiat top-up + Stellar escrow funding | SAC token transfers, Stellar DEX conversion, NEAR Intents top-up |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design, integration patterns, security model
- [Smart Contract Reference](docs/SMART_CONTRACT.md) — Complete API with types and events
- [Frontend Architecture](docs/FRONTEND.md) — Component structure, hooks, design system
- [Demo Guide](docs/DEMO_GUIDE.md) — Step-by-step walkthrough test
- [Near Intents Integration Plan](docs/NEAR_INTENTS_BOUNDARY.md) — Required cross-chain payment adapter plan and source-of-truth rules
- [Fiat Onramp Flow](docs/PAYMENT_RAIL_BOUNDARY.md) — Privy onramp wallet top-up, NEAR Intents routing, and Stellar escrow source-of-truth rules
- [Settlement Asset Policy](docs/SETTLEMENT_ASSET_POLICY.md) — Demo/mainnet asset policy, precision, minimums, and trustline notes

## License

MIT
