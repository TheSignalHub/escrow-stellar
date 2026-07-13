# The Signal — Stellar Escrow Demo

Milestone-based escrow with atomic 3-way payment splits on Soroban. Built for the [Stellar Community Fund (SCF) Integration Track](https://communityfund.stellar.org/).

## What This Is

A fully functional implementation of The Signal's deal escrow system on Stellar's Soroban smart contract platform. It demonstrates how a real-world B2B marketplace handles milestone-based payments with three-party atomic splits — the exact logic running in production at [thesignal.directory](https://thesignal.directory).

**Contract on Testnet**: [`CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC`](https://stellar.expert/explorer/testnet/contract/CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC)

**GitHub**: [github.com/TheSignalHub/escrow-stellar](https://github.com/TheSignalHub/escrow-stellar)

## SCF #42 Tranche 2 Testnet Notes

This repository is configured for the Tranche 2 testnet review:

- **Deliverable 4**: DealEscrow is deployed to Soroban Testnet and connected to the marketplace frontend.
- **Deliverable 5**: DealEscrow event topics and indexer mapping are published in [`docs/EVENT_SCHEMA.md`](docs/EVENT_SCHEMA.md), with an isolated testnet indexer and purpose-built read-only reviewer dashboard in [`indexer`](indexer).
- **Deliverable 6**: The frontend exposes a Broker-style multi-asset funding step. On testnet, the adapter routes XLM into the configured demo test USDC settlement asset through a seeded Soroswap router path because public indexed testnet liquidity may be unavailable after resets.
- **Final-tranche cross-chain adapter**: NEAR Intents is integrated as a feature-flagged server adapter and Liquidity-tab readiness/dry quote/status panel. Live execution remains disabled until JWT, approved Stellar asset id, refund path, and no-testnet tiny-amount evidence are complete.

Reviewer links:

```text
Frontend:             https://stellar.thesignal.directory
Event dashboard:      https://stellar.thesignal.directory/market_dashboard
Internal admin:       https://stellar.thesignal.directory/admin
Contract explorer:    https://stellar.expert/explorer/testnet/contract/CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC
```

Coolify deployment env and operations are documented in
[`docs/COOLIFY_DEMO_DEPLOYMENT.md`](docs/COOLIFY_DEMO_DEPLOYMENT.md). Keep live
server secrets in Coolify or a secrets manager, not in git.

`/market_dashboard` is intentionally public and read-only for review. `/admin`
and manual indexer controls are protected by `ADMIN_USERNAME` /
`ADMIN_PASSWORD`.

Current testnet funding configuration:

```text
DealEscrow:        CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC
test USDC:         CAHJQG77XDPFZAC7JJSRGAVYWKGEUDWOQ5O33VK4VTR2ZKOBCZAIVLFX
XLM SAC:           CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
Soroswap router:   CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD
Seeded pool:       CA4ASYDOCOJXZFB3H7O6QJ5PTDAMXORCRZN5HNE3KI7TBGS5PGR53XZ5
```

The test USDC token is a demo-only SEP-41 testnet token, not Circle-issued
USDC. The Soroswap route is used to prove the non-USDC source asset flow on
testnet: XLM in, demo test USDC settlement asset out, then escrow funding.

The indexer database is not the source of truth for funds or deal state. The
Soroban contract remains the source of truth; the isolated MongoDB indexer
database is a read model for marketplace-style status sync and reviewer
visibility.

Network endpoints are environment-driven. The app defaults to testnet for SCF
review, but `VITE_STELLAR_NETWORK`, `VITE_STELLAR_RPC_URL`,
`VITE_STELLAR_HORIZON_URL`, and `VITE_STELLAR_EXPLORER_URL` can be set for a
mainnet/staging profile. Friendbot is testnet-only and hidden outside testnet.
Settlement asset policy, precision, minimum amount, and trustline notes are in
[`docs/SETTLEMENT_ASSET_POLICY.md`](docs/SETTLEMENT_ASSET_POLICY.md).

## Marketplace Integration Positioning

This repo deliberately keeps the Stellar settlement rail isolated from The
Signal's production marketplace database. That is a product and safety choice:
the live marketplace remains responsible for discovery, KYB, matching, client
qualification, and commercial workflow, while this repo proves the reusable
escrow rail.

For final-tranche validation, the intended path is a marketplace-compatible
binding layer rather than direct writes into production marketplace
collections. A marketplace can map its own external deal IDs, milestone IDs,
provider wallets, connector wallets, and client wallets to Soroban `deal_id`
values through an adapter/API model. The Signal is the reference marketplace,
but the rail is designed to be reusable by other service marketplaces.

NEAR Intents is now treated as a required final-tranche integration workstream,
not something to bypass. The current repo includes a feature-flagged adapter
around the official `@defuse-protocol/one-click-sdk-typescript` SDK, protected
quote/status/deposit/reconcile APIs, binding metadata persistence, and a
Liquidity-tab panel for readiness, dry quotes, deposit instructions, and
provider status refresh. Soroban `funded` events remain the source of truth for
escrow funding, even when NEAR Intents reports that a cross-chain payment is
moving. Live NEAR execution still needs credentials, approved asset ids, refund
semantics, and tiny-amount no-testnet evidence. See
[`docs/NEAR_INTENTS_BOUNDARY.md`](docs/NEAR_INTENTS_BOUNDARY.md).

Stripe Connect remains The Signal production marketplace's fiat payment rail
and is not implemented inside this repository. This repo owns the Stellar
escrow rail and marketplace-compatible binding model; adding Stripe here would
mix production marketplace payments with the grant demo service. See
[`docs/PAYMENT_RAIL_BOUNDARY.md`](docs/PAYMENT_RAIL_BOUNDARY.md).

## Key Features

- **Milestone-Based Escrow** — Deals split into milestones (e.g., 30/50/20). Each funded independently, released only on client approval.
- **Atomic 3-Way Splits** — Every release executes three transfers in one atomic transaction: Provider, Connector (BD), and Protocol.
- **On-Chain Reputation** — Providers accumulate a verifiable deal completion counter on-chain. Cannot be faked.
- **Dispute Resolution** — Either party raises a dispute to freeze funds. Admin resolves with configurable refund percentage.
- **Broker-Style Funding Step** — Pay with XLM and settle escrow in the configured USDC-compatible testnet asset.
- **NEAR Intents Funding Panel** — Check SDK-backed readiness, request dry quotes, view deposit instructions/status, and keep escrow funding gated on Soroban events.
- **Privy Wallet Path** — Embedded Stellar wallet flow for the Tranche 2 demo, with Stellar Wallets Kit support retained in the codebase.
- **Indexer Dashboard** — Soroban RPC event reader writes decoded escrow events into an isolated MongoDB read model and exposes `/market_dashboard`.
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
│              Stellar Testnet                          │
│  ┌──────────────────┴────────────────────────────┐   │
│  │         DealEscrow Smart Contract              │   │
│  │                                                │   │
│  │  create_deal() → deposit() → release_milestone()│  │
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
│  → /market_dashboard reviewer dashboard               │
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
4. Use the **Liquidity** tab to swap XLM into demo test USDC through the seeded Soroswap testnet route
5. Optional: inspect the NEAR Intents panel for readiness/dry quote/status behavior on the shadow marketplace binding
6. Create a deal using a Quick Start scenario
7. Fund milestones, release them, and watch the 3-way split visualization
8. Check synced events in `/market_dashboard`
9. For final-tranche marketplace proof, run `npm run seed:marketplace-bindings` from `indexer/` to create shadow Signal-style bindings, then reconcile through the protected binding API
10. Check the provider's on-chain reputation in the Oracle tab

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
│           ├── SoroswapWidget.tsx  # Friendbot + Stellar Broker + NEAR panel shell
│           ├── NearIntentsPanel.tsx # NEAR readiness, dry quote, deposit/status UI
│           └── ReputationBadge.tsx # On-chain reputation with radar animation
└── docs/
    ├── ARCHITECTURE.md             # System design + integration patterns
    ├── SMART_CONTRACT.md           # Contract API reference
    ├── FRONTEND.md                 # Frontend architecture details
    ├── EVENT_SCHEMA.md             # Published DealEscrow event schema
    └── DEMO_GUIDE.md              # Step-by-step demo walkthrough
```

## Smart Contract API

| Function | Auth | Description |
|----------|------|-------------|
| `initialize(admin, protocol_wallet)` | Deployer | One-time setup |
| `create_deal(client, provider, connector, token, fee_bps, share_bps, milestones)` | Client | Create escrow deal |
| `deposit(deal_id, milestone_idx)` | Client | Fund a milestone |
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

10 comprehensive tests:

| # | Test | Verifies |
|---|------|----------|
| 1 | Happy path (single milestone) | Create → Fund → Release → verify split |
| 2 | Multi-milestone (30/50/20) | 3 milestones sequentially |
| 3 | Reputation counter | Increments on deal completion |
| 4 | Dispute + resolve | Freeze → admin resolves 50/50 |
| 5 | Full refund | Admin refunds all funded milestones |
| 6 | Auth checks | Non-client cannot deposit |
| 7 | Double deposit prevention | Cannot fund same milestone twice |
| 8 | Release unfunded fails | Cannot release a Pending milestone |
| 9 | Deal count tracking | Counter increments correctly |
| 10 | Variable commission (65%) | Architect tier connector share |

```bash
cargo test
# running 10 tests ... test result: ok. 10 passed; 0 failed
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
| Wallet | Privy + Stellar Wallets Kit fallback | Testnet |
| Broker route | Broker-style adapter + Soroswap router testnet route | Testnet |
| Indexer | Express + Inngest + MongoDB | Testnet read model |
| Network | Stellar Testnet | Soroban RPC |

## Production Parity

| Feature | Production (The Signal) | This Demo (Soroban) |
|---------|------------------------|---------------------|
| 3-party split | `approveMilestone()` in Node.js | `release_milestone()` in Rust |
| Milestone lifecycle | Pending → Funded → Released | Same states, on-chain |
| BD connector tiers | 40–65% of platform fee | Parameterized per deal |
| Dispute escalation | Admin dashboard + Stripe | Smart contract + admin auth |
| Reputation | Database counter | Persistent storage on-chain |
| Payment | Stripe Connect | SAC token transfers |

## Tranche 2 Demo Positioning

For SCF review, describe the demo as:

```text
The Tranche 2 testnet deployment demonstrates a complete Soroban B2B escrow
lifecycle with Privy wallet connection, testnet deal creation, milestone
funding/release with automatic multi-party payout split, Soroban RPC event
indexing into an isolated backend dashboard, and XLM-to-demo-test-USDC
multi-asset funding through a seeded Soroswap testnet route.
```

Avoid overclaiming the testnet route as production Circle USDC or a live
multi-venue aggregator path. The demo token and seeded pool are intentionally
testnet-only so reviewers can reproduce the flow even when public testnet
liquidity is empty.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design, integration patterns, security model
- [Smart Contract Reference](docs/SMART_CONTRACT.md) — Complete API with types and events
- [Frontend Architecture](docs/FRONTEND.md) — Component structure, hooks, design system
- [Demo Guide](docs/DEMO_GUIDE.md) — Step-by-step walkthrough test
- [Near Intents Integration Plan](docs/NEAR_INTENTS_BOUNDARY.md) — Required cross-chain payment adapter plan and source-of-truth rules
- [Payment Rail Boundary](docs/PAYMENT_RAIL_BOUNDARY.md) — Stripe, Stellar escrow, NEAR Intents, and marketplace ownership boundaries
- [Settlement Asset Policy](docs/SETTLEMENT_ASSET_POLICY.md) — Demo/mainnet asset policy, precision, minimums, and trustline notes
- [Operations and Security](docs/OPERATIONS_SECURITY.md) — Admin authority, dispute operations, secrets, monitoring, and production hardening gaps
- [UI Unhappy-Path QA](docs/scf/unhappy-path-qa-2026-07-01.md) — Dispute, role, wallet failure, and operator-resolution evidence plan
- [Submission Readiness](docs/scf/submission-readiness-2026-07-02.md) — Upload order, safe claims, final smoke checks, and remaining evidence gate
- [Final Tranche Evidence](docs/scf/final-tranche-evidence-2026-07-01.md) — Current test/build results, reviewer links, boundaries, and remaining capture tasks
- [Final Tranche Work Plan](docs/scf/final-tranche-workplan-2026-07-01.md) — Gap-by-gap execution plan for marketplace adapter, production readiness, unhappy-path QA, and evidence packaging

## License

MIT
