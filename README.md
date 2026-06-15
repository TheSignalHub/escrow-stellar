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

Reviewer links:

```text
Frontend:             https://stellar.thesignal.directory
Event dashboard:      https://stellar.thesignal.directory/market_dashboard
Internal admin:       https://stellar.thesignal.directory/admin
Contract explorer:    https://stellar.expert/explorer/testnet/contract/CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC
```

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

## Key Features

- **Milestone-Based Escrow** — Deals split into milestones (e.g., 30/50/20). Each funded independently, released only on client approval.
- **Atomic 3-Way Splits** — Every release executes three transfers in one atomic transaction: Provider, Connector (BD), and Protocol.
- **On-Chain Reputation** — Providers accumulate a verifiable deal completion counter on-chain. Cannot be faked.
- **Dispute Resolution** — Either party raises a dispute to freeze funds. Admin resolves with configurable refund percentage.
- **Broker-Style Funding Step** — Pay with XLM and settle escrow in the configured USDC-compatible testnet asset.
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
# and VITE_SOROSWAP_POOL_ADDRESS

npm run dev
```

### 4. Try It

1. Open `http://localhost:5173` — the landing page shows "Trust Engine." with a live glitch effect
2. Click **Connect Wallet** and use Privy or a Stellar testnet wallet
3. Fund your wallet with 10,000 XLM via Friendbot
4. Use the **Fund** tab to swap XLM into demo test USDC through the seeded Soroswap testnet route
5. Create a deal using a Quick Start scenario
6. Fund milestones, release them, and watch the 3-way split visualization
7. Check synced events in `/market_dashboard`
8. Check the provider's on-chain reputation in the Oracle tab

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
│       │   ├── soroswapOnchain.ts  # Testnet route adapter via seeded Soroswap pool
│       │   └── dealMetadata.ts     # Local milestone naming + event log
│       └── components/
│           ├── ui/
│           │   ├── Components.tsx  # Card, Button, Tag shared components
│           │   └── Branding.tsx    # SignalLogo, GlowingBackground
│           ├── ConnectWallet.tsx   # Multi-wallet connect UI
│           ├── CreateDeal.tsx      # Deal creation with review + success screens
│           ├── DealDashboard.tsx   # Full deal lifecycle (split-panel, search, filters)
│           ├── SoroswapWidget.tsx  # Friendbot + Stellar Broker testnet funding
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

## License

MIT
