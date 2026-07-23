# Frontend Architecture

## Overview

The frontend is a React 19 single-page application built with TypeScript 5.9, Vite 8, and Tailwind CSS v4. It provides a complete interface for interacting with the DealEscrow smart contract on Stellar Testnet — from the landing page through wallet connection, deal creation, milestone management, and reputation lookup.

Most signed escrow interactions happen directly between the browser and Stellar's Soroban RPC via `@stellar/stellar-sdk`. The deployed review stack can also run the small `indexer` backend for `/market_dashboard`, Inngest indexing, and the optional server-side Soroswap public aggregator quote check. The executable broker-style demo route in the frontend uses the on-chain Soroswap router adapter, not the public aggregator proxy.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-24 00:54 BST | Add Funds route-quality UX | Ranked discovered 1Click source assets with recommended routes first, auto-estimated source amounts from live token prices when available, added friendly no-route copy, remembered successful preview routes, and surfaced a quote-evidence checklist after signed dry quotes. | `npm run build` passed in `frontend/`. |
| 2026-07-23 21:07 BST | Add Funds quote amount display | Formatted 1Click destination quote amounts in human Stellar units for XLM/USDC instead of showing raw base-unit labels in the quote summary. | `npm run build` passed in `frontend/`. |
| 2026-07-23 17:39 BST | 1Click source token discovery | Replaced hardcoded Add Funds source-token cards with live 1Click token discovery. Users now choose source chain, source asset, and source amount from supported non-Stellar routes while the destination remains locked to the deal settlement asset. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-23 17:25 BST | Multi-chain Add Funds quote previews | Enabled dry quote previews for Ethereum USDC, Base USDC, and Solana USDC using current 1Click token discovery IDs, while keeping live source-wallet execution gated until native wallet signing and refund routing are wired. | `npm run build` passed in `frontend/`. |
| 2026-07-23 17:18 BST | Add Funds dry quote amount | Split deal amount due from the 1Click dry quote source amount in deal funding mode. The modal now keeps the escrow target visible while using a fixed 1 NEAR preview amount for route evidence, avoiding false `No liquidity available` errors caused by sending Stellar base-unit amounts as NEAR base units. | `npm run build` passed in `frontend/`. |
| 2026-07-23 17:05 BST | Add Funds quote-source guard | Disabled Stellar XLM as a 1Click source inside the cross-chain Add Funds modal, because connected Stellar balances should use direct Fund Deal or Wallet Prep. NEAR without a connected source wallet now remains a dry quote preview path instead of a live source-payment path. | `npm run build` passed in `frontend/`. |
| 2026-07-23 16:34 BST | Source-wallet refund routing | Added product/API guardrails so enabled source routes derive refunds from the connected source wallet when available, hide refund fields from users, and block live source routes without source-wallet refund plumbing while preserving dry/demo quote evidence fallback. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-23 16:27 BST | Add Funds source-wallet UX | Reframed the deal-level cross-chain flow as **Add Funds from Another Chain**, clarified that NEAR Intents/1Click is the top-up quote/routing provider, and replaced disabled source-card copy with coming-next source wallet language for Ethereum/Base until those native wallet/refund paths are wired. | `npm run build` passed in `frontend/`. |
| 2026-07-23 16:19 BST | Settlement-route allowlist | Tightened deal-tied NEAR top-up routing so destination assets are limited to the deal's approved settlement currency: Stellar USDC for USDC deals or Stellar XLM for XLM deals. Source assets remain user-selectable where supported by 1Click and wallet/refund handling. | `npm run build` passed in `frontend/`. |
| 2026-07-23 15:47 BST | NEAR top-up amount and settlement matching | Updated the Deals top-up modal to display the remaining deal balance in human Stellar units instead of raw base units, pass the selected deal token into the NEAR Intents panel, and prefer a matching Stellar destination route when the configured 1Click allowlist supports the deal settlement asset. | `npm run build` passed in `frontend/`. |
| 2026-07-23 14:55 BST | NEAR Intents top-up semantics | Clarified the Deals NEAR Intents path as cross-chain wallet top-up rather than direct escrow funding. The UI now labels the action **Top Up from Another Chain** and tells users to confirm **Fund Deal** after the Stellar wallet receives funds. | `npm run build` passed in `frontend/`. |
| 2026-07-23 14:43 BST | Deal-level funding checkout | Updated the Deals tab to use `fund_deal` as the primary client funding action: the first pending milestone shows the remaining deal balance, funds all pending milestones in one transaction, and keeps releases/disputes per milestone. Cross-chain funding modal now quotes the remaining deal balance. | `cargo test` passed with 16 tests; `npm run build` passed in `frontend/`. |
| 2026-07-23 13:42 BST | Cross-chain funding modal UX | Moved pending-milestone NEAR Intents funding from inline card rendering into a focused modal overlay with Escape/backdrop close and page scroll lock, preserving selected deal/milestone/amount locking. | `npm run build` passed in `frontend/`. |
| 2026-07-23 13:33 BST | Cross-chain funding panel visibility | Moved the NEAR Intents funding panel to render directly under the clicked pending milestone and added console/toast guard logs when the flow is blocked by missing deal context or a non-pending milestone. | `npm run build` passed in `frontend/`. |
| 2026-07-23 12:08 BST | Deal-page wallet balance UX | Kept the connected wallet header compact and added a Deals sidebar wallet-balance card showing XLM and the configured settlement token beside Vault Analytics. | `npm run build` passed in `frontend/`. |
| 2026-07-23 11:46 BST | Wallet balance and ledger refresh UX | Updated the connected wallet header to expose balance context and changed Deals auto-sync to refresh silently so the left ledger list does not show loading skeletons on each polling interval. | `npm run build` passed in `frontend/`. |
| 2026-07-23 11:30 BST | Create Deal settlement-only flow | Removed the create-time XLM -> configured-settlement-token swap route from Create Deal. Create Deal now only selects the escrow settlement asset; swaps/top-ups/cross-chain payment remain in Wallet Prep or pending milestone funding. | `npm run build` passed in `frontend/`. |
| 2026-07-23 11:14 BST | Funding-time settlement balance UX | Added a pending-milestone settlement-balance check in Deals for XLM and configured settlement-token deals, disabled direct Stellar funding when the known balance is short, and kept Wallet Prep / Pay from Another Chain as recovery paths. | `npm run build` passed in `frontend/`. |
| 2026-07-23 10:54 BST | Create Deal settlement asset naming | Renamed the Create Deal financial selector from source-asset language to **Escrow Settlement Asset** language and added an internal code comment clarifying that the existing `sourceAsset` state is a funding/settlement mode selector. | `npm run build` passed in `frontend/`. |
| 2026-07-23 10:44 BST | Wallet prep boundary cleanup | Removed standalone NEAR quote UI from the wallet-prep tab, kept NEAR Intents inside pending milestone funding, renamed the support tab to **Wallet Prep**, and replaced remaining create-deal deployment copy with deal-language. | `npm run build` passed in `frontend/`. Backend/API behavior unchanged; Soroban `funded` remains the escrow source of truth. |
| 2026-07-23 10:33 BST | Deal-level NEAR funding UX | Reused `NearIntentsPanel` inside pending milestone funding so users start cross-chain payment from a selected deal/milestone with the amount locked, while keeping Wallet Prep as testnet settlement preparation. | `npm run build` passed in `frontend/`. Backend/API behavior unchanged; Soroban `funded` remains the escrow source of truth. |
| 2026-07-22 18:51 BST | Product flow naming | Renamed the public app flow from **Liquidity / Deploy Contract** to **Payment Routes / Create Deal**, updated pending milestone actions to distinguish payment-route preparation from direct Stellar funding, and forced quote-only NEAR demo destinations to remain preview-only even when live execution is enabled. | `npm run build` passed in `frontend/`. Backend behavior unchanged. |

## Component Architecture

```text
App.tsx (Root)
├── GlowingBackground          — Animated ambient background (fixed, z-0)
├── ToastContainer             — Global notification system
├── LiveTicker                 — Real-time on-chain marquee (homepage only)
├── Header
│   ├── SignalLogo             — logo.png, click-to-home when connected
│   ├── "THE SIGNAL" wordmark  — Space Grotesk 800, font-display class
│   └── ConnectWallet / Nav    — Wallet info + tab navigation when connected
├── LandingView (when disconnected)
│   ├── "Trust Engine." hero   — Glitch effect, always-on RGB aberration
│   ├── Connect Wallet CTA     — Opens unified Privy-first wallet modal
│   └── Read the Docs CTA      — Links to GitHub repo
└── App Tabs (when connected)
    ├── Wallet Prep            — SoroswapWidget (Friendbot + broker-style testnet settlement-asset prep)
    ├── Create Deal            — CreateDeal (form + review + success)
    ├── Deals                  — DealDashboard (split-panel lifecycle + deal-level settlement-balance check + NEAR funding entry)
    └── Oracle                 — ReputationBadge (on-chain reputation)
```

## Design System

### Tailwind CSS v4

Styling uses Tailwind v4 with custom properties defined in `src/index.css` via the `@theme` block (no `tailwind.config.js`):

```css
@theme {
  --animate-marquee: marquee 120s linear infinite;
  --animate-radar: radar 3s linear infinite;
  --animate-pulse-ring: pulse-ring 2s ease-in-out infinite;
  /* ... additional custom animations */
}
```

### Typography

| Usage | Font | Weight | Class |
|-------|------|--------|-------|
| "THE SIGNAL" header | Space Grotesk | 800 | `.font-display` |
| "Trust Engine." hero | Space Grotesk | 900 (font-black) | `font-black` |
| Code / addresses | JetBrains Mono | 400 | `font-mono` |
| Body | Inter | 400 | default |

Space Grotesk is loaded from Google Fonts with weights 700 and 800. JetBrains Mono and Inter are loaded via the same stylesheet.

### Glitch Effect

The "Trust Engine." heading uses a CSS-only RGB chromatic aberration effect defined in `@layer base`:

- **Always active** — `::before` (red layer) and `::after` (cyan layer) run two desynchronized keyframe animations (`glitch-1` at 4s, `glitch-2` at 3.5s)
- **Organic bursts** — Animations use `steps(1)` and have long quiet periods (85% of cycle is invisible) with sudden clip-path bursts
- **`mix-blend-mode: screen`** — Layers blend with white text for true chromatic aberration rather than plain text-shadow offsets
- **Hover pauses** — `::before` and `::after` set to `clip-path: inset(0 0 100% 0)` on hover, cleanly freezing the effect

### Shared UI Components

**`src/components/ui/Components.tsx`**

| Component | Props | Description |
|-----------|-------|-------------|
| `Card` | `className`, `hoverEffect`, `glowOnHover`, `onClick` | Dark bordered container with internal `relative z-10 h-full` wrapper. Apply flex/centering on inner content, not the Card itself. |
| `Button` | `variant`, `icon`, `disabled`, `onClick` | `primary` (emerald gradient) or `secondary` (zinc border). |
| `Tag` | `color` | Colored status badge: `emerald`, `amber`, `blue`, `red`, `zinc`. |

**`src/components/ui/Branding.tsx`**

| Component | Description |
|-----------|-------------|
| `SignalLogo` | Renders `public/logo.png` with configurable `className`. No glow effects. |
| `GlowingBackground` | Fixed full-screen layer: deep black base, architectural grid, emerald neon orbs, CRT scanline texture. |

### Live Network Ticker

**`App.tsx` — `LiveTicker` component**

A full-width marquee bar showing real on-chain deal data:

- **Read-only fetch on mount** — Calls `getDealCount()` and `getDeal()` via `useDealEscrow` without requiring wallet authentication (view functions are permissionless on Soroban)
- **Homepage only** — Hidden when `wallet.isConnected`. Disappears when the user connects and enters the app.
- **No fallback data** — If the chain is unreachable or there are no deals, the ticker is simply hidden
- **Data per deal**: Contract ID, status label (`ESCROW_ACTIVE`, `DEAL_COMPLETED`, etc.), total amount, plus per-milestone entries for funded/released milestones
- **Color coding**: Emerald = completed/released, Blue = active/funded, Amber = awaiting funding, Red = disputed
- **Scroll speed**: 120s per full cycle (very slow, cinematic)

## Custom Hooks

### `useUnifiedWallet`, `usePrivyWallet`, and `useStellarWallet`

**Files**: `src/hooks/useUnifiedWallet.ts`, `src/hooks/usePrivyWallet.ts`, `src/hooks/useStellarWallet.ts`

`useUnifiedWallet` is the app-facing wallet hook. It prefers Privy embedded Stellar wallets and falls back to Stellar Wallets Kit extension wallets while exposing a single wallet-state interface to the rest of the app.

```typescript
interface WalletState {
  address: string;
  isConnected: boolean;
  xlmBalance: string;
  usdcBalance: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  signTransaction: (xdr: string, opts?: any) => Promise<string>;
}
```

**Key features**:
- **Privy-first wallet support**: Uses Privy embedded Stellar wallets for the main demo path, with Freighter, xBull, and Albedo retained through Stellar Wallets Kit as fallbacks.
- **Auto-refresh balances**: Polls XLM and test USDC balances every 15 seconds using ref-based intervals.
- **Error-categorized signing**: Catches wallet errors and provides user-friendly messages (cancelled, unavailable, or generic failure).
- **Event-driven state**: Listens to `STATE_UPDATED` and `DISCONNECT` events from the wallet kit.
- **Disconnect resets app**: `disconnect()` clears address + balances, returning the user to the landing page (logo click when connected also calls `disconnect()`).

### `useDealEscrow`

**File**: `src/hooks/useDealEscrow.ts`

All contract interaction methods with robust error handling and transaction lifecycle management.

```typescript
function useDealEscrow(walletAddress: string, signTransaction: Function) {
  return {
    createDeal,         // Create a new escrow deal
    deposit,            // Fund a specific milestone
    releaseMilestone,   // Execute atomic 3-way split
    dispute,            // Freeze a funded milestone
    resolveDispute,     // Admin: resolve with configurable refund %
    getDeal,            // Read deal state (simulation, no signing)
    getReputation,      // Read provider reputation (simulation, no signing)
    getDealCount,       // Read total deal count (simulation, no signing)
    contractId,         // Current contract address
  };
}
```

**Transaction pipeline** (`submitContractCall`):

```text
1. Build Transaction
   └── TransactionBuilder with Stellar base fee; simulation/assembly sets the final Soroban fee

2. Simulate
   └── sorobanServer.simulateTransaction()
   └── Parse errors via friendlyError() helper

3. Assemble
   └── rpc.assembleTransaction() attaches footprint + auth

4. Sign
   └── Wallet signs via signTransaction()

5. Submit
   └── sorobanServer.sendTransaction()

6. Poll for Confirmation
   └── Max 30 retries × 2s = 60s timeout
   └── Throws on timeout or on-chain failure
```

**Safety mechanisms**:
- **Transaction mutex**: `useRef` boolean prevents concurrent/double-click transactions
- **Confirmation timeout**: Hard limit of 30 retries (60 seconds)
- **Friendly error messages**: Soroban simulation errors translated to actionable messages
- **Deal ID extraction fallback**: Checks both `returnValue` and `resultMetaXdr.v3.sorobanMeta.returnValue`

## Components

### ConnectWallet

**File**: `src/components/ConnectWallet.tsx`

Wallet connection button displayed in the header when disconnected. Opens the unified connect modal with Privy as the primary path and extension wallets as fallback.

### SoroswapWidget

**File**: `src/components/SoroswapWidget.tsx`

Two-part support interface (Wallet Prep tab):

**Section 1 — Friendbot**: One-click 10,000 XLM testnet funding with duplicate-funding detection.

**Section 2 — Stellar Broker Funding**: Quote → Sign → Swap for XLM -> test USDC through the Stellar Broker testnet route. The current testnet adapter executes against the seeded Soroswap router pool and uses 1% slippage tolerance.

**NEAR Intents top-up lives in Deals**: The first pending client milestone opens the reusable `NearIntentsPanel` in a focused top-up modal, where the deal and remaining pending balance are already selected and locked. The NEAR route is not the escrow funding transaction: it prepares the connected Stellar wallet, then the user confirms **Fund Deal** to call `fund_deal`. Browser code calls local backend APIs through `src/lib/nearIntents.ts`; the NEAR JWT, refund fallback, and binding id stay server-side or internal. Source chain/token options come from public 1Click token discovery, while deal-tied destination assets remain limited to the backend-approved Stellar settlement allowlist. Quote requests require a connected Stellar G-address so the settlement recipient is real before the server calls 1Click. Quote/status routes require the protected session, while `/api/near-intents/readiness` is public and returns only non-secret availability booleans plus approved settlement asset labels/defaults. Refund routing is managed through the connected source wallet in the production flow; the server fallback exists only for internal quote QA. Quote-only demo destinations remain forced dry previews and never show executable payment instructions. The panel shows signature-verified quote state in product terms and explicitly warns that payment status does not mark escrow funded until the user confirms `fund_deal` and Stellar DealEscrow `funded` events exist.

### CreateDeal

**File**: `src/components/CreateDeal.tsx`

Three-step deal creation:

**Step 1 — Configuration**: Provider/Connector address inputs (real-time G-address validation), escrow settlement-asset selection, total amount, fee percentages, dynamic milestone editor (percentages must sum to 100%), live split preview. Create Deal does not run swaps; payment preparation happens from Wallet Prep or pending milestones.

**Step 2 — Review**: Full deal summary before signing. Transaction progress: Signing → Submitting → Confirming.

**Step 3 — Success**: Centered animated checkmark, Deal ID, transaction hash, Explorer link, "View Deal Dashboard" navigation.

**Quick Start scenarios**: Security Audit (500 XLM / 3 milestones), Dev Sprint (1,200 XLM / 2 milestones), Advisory Retainer (3,000 XLM / 4 milestones). Auto-fills demo testnet addresses.

### DealDashboard

**File**: `src/components/DealDashboard.tsx`

Split-panel deal lifecycle management:

**Left panel — Deal List**:
- Search bar with clear button (×), dynamic icon color, and result counter showing `N results for "query"`
- Segmented filter tabs (`All` / `In Progress` / `Awaiting Funding` / `Completed` / `Disputed` / `Resolved` / `Cancelled`) — pill-track container with color-coded active states and status dots
- Per-deal cards: title, status tag, total amount, milestone progress, role badge (Client/Provider/Connector)
- Auto-refresh every 30 seconds via ref-based interval

**Deal-level funding**: The Deals tab receives the connected wallet's XLM and configured settlement-token balances from `useUnifiedWallet`. The first pending client milestone acts as the checkout entry, shows the remaining pending deal amount, disables direct Stellar funding if the known balance is short, and leaves Wallet Prep / Top Up from Another Chain as the recovery paths. The direct Stellar action calls `fund_deal`, locking all pending milestones in one payment. Create Deal selects the escrow settlement asset; funding-time UI decides whether the user can fund directly or should prepare/swap/top up first.

**Right panel — Deal Detail**:
- Empty state: centered Activity icon + "Select a Deal" prompt (uses inner flex wrapper to bypass Card's internal wrapper)
- Deal header: status badge, escrow protection indicator, title, Deal ID copy, participant addresses with "YOU" badge, fee breakdown
- Milestone timeline: numbered nodes, color-coded status, context-aware action buttons
- The first pending client milestone exposes **Top Up from Another Chain**, opening the reusable NEAR Intents top-up panel with the selected deal and remaining pending balance locked
- 3-Way Split Visualization: animated bar chart after release, exact amounts + percentages per party
- Vault Analytics sidebar: Unlocked / Secured / Pending amounts
- Event Ledger sidebar: chronological milestone events with transaction trace links

**Confirmation modals**:
- Release: shows exact 3-way split before execution
- Dispute: freeze warning
- Resolve: interactive 0-100% slider with real-time client/provider preview
- All modals: ESC dismiss, backdrop click dismiss, scroll lock

### ReputationBadge

**File**: `src/components/ReputationBadge.tsx`

On-chain reputation lookup with radar animation and animated count-up display. Badge tiers: New Provider (0) → Verified (1+) → Trusted (5+) → Elite (10+).

## Library Modules

### `nearIntents.ts`

**File**: `src/lib/nearIntents.ts`

Small browser client for the local NEAR Intents adapter:

- `readiness()` calls the public backend readiness endpoint.
- `createQuote(bindingId, body)` calls the protected quote endpoint.
- `getStatus(bindingId)` calls the protected status endpoint.
- Errors are wrapped as `NearIntentsApiError` so the UI can distinguish admin
  auth, disabled feature flags, validation errors, and provider failures.

### stellar.ts

Core Stellar SDK configuration and utilities:

| Export | Description |
|--------|-------------|
| `STELLAR_NETWORK` | From `VITE_STELLAR_NETWORK`; defaults to `testnet` |
| `SOROBAN_RPC_URL` | From `VITE_STELLAR_RPC_URL`; defaults to Stellar public testnet RPC in testnet mode |
| `HORIZON_URL` | From `VITE_STELLAR_HORIZON_URL`; defaults to Stellar public testnet Horizon in testnet mode |
| `EXPLORER_URL` | From `VITE_STELLAR_EXPLORER_URL`; defaults to Stellar Expert testnet/public URL by network |
| `FRIENDBOT_URL` | Testnet-only; empty outside testnet |
| `XLM_SAC_ADDRESS` | Native XLM as Stellar Asset Contract |
| `DEAL_ESCROW_CONTRACT` | From `VITE_DEAL_ESCROW_CONTRACT` |
| `DEMO_ACCOUNTS` | Pre-generated provider/connector testnet addresses |
| `sorobanServer` | Soroban RPC Server instance |
| `horizonServer` | Horizon Server instance |
| `formatAmount()` | 7-decimal to human-readable |
| `toContractAmount()` | Human-readable to 7-decimal BigInt |
| `isValidStellarAddress()` | G-address regex validation |
| `truncateAddress()` | `GABCD...WXYZ` display format |

### stellarBroker.ts and soroswapOnchain.ts

`stellarBroker.ts` exposes the broker-facing `StellarBrokerProvider` interface
used by `SoroswapWidget` and the create-deal swap step:

```ts
getQuote(assetIn, assetOut, amount, tradeType, sourceAddress)
buildTransaction(quote, fromAddress)
sendTransaction(signedXdr)
```

Quotes carry provider metadata:

- `providerId`
- `quoteExpiresAt`
- `slippageBps`

In the current testnet demo the provider delegates to `soroswapOnchain.ts`,
which calls the seeded Soroswap router path directly because public indexed
testnet liquidity may be unavailable after resets.

### soroswap.ts

Optional public aggregator quote client used by `SoroswapWidget` as an informational route-discovery check. It calls the local backend proxy at `/api/soroswap/quote`; the Soroswap API key stays server-side in `SOROSWAP_API_KEY`. It is not the executable swap path for the current demo.

### dealMetadata.ts

Local (localStorage) milestone naming and event log. Stores custom milestone names and records funded/released/disputed events per deal for the Event Ledger sidebar.

## UX Patterns

### Toast Notification System

React Context-based global toasts. Three types: `success`, `error`, `info`. Auto-dismiss after 3s, click to dismiss. Max 3 concurrent. Accessible via `aria-live="polite"`.

### Transaction Progress

```text
[Signing] → [Submitting] → [Confirming]
```

Step indicator during the ~5-10 second confirmation window.

### Keyboard Navigation

| Shortcut | Action |
|----------|--------|
| `Alt+1` | Wallet Prep tab |
| `Alt+2` | Create Deal tab |
| `Alt+3` | Deals tab |
| `Alt+4` | Oracle tab |
| `Escape` | Close confirmation modals |

Only active when wallet is connected.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_DEAL_ESCROW_CONTRACT` | Yes | Deployed DealEscrow contract address |
| `VITE_STELLAR_NETWORK` | No | `testnet` or `mainnet`; defaults to `testnet` |
| `VITE_STELLAR_RPC_URL` | No | Soroban RPC URL for the selected network |
| `VITE_STELLAR_HORIZON_URL` | No | Horizon URL for balance/account reads |
| `VITE_STELLAR_EXPLORER_URL` | No | Explorer base URL for tx/contract/account links |
| `VITE_FRIENDBOT_URL` | No | Testnet-only Friendbot URL; ignored outside testnet |
| `VITE_USDC_TOKEN_ADDRESS` | No | Demo test USDC SAC address |
| `VITE_SETTLEMENT_TOKEN_SYMBOL` | No | Display symbol for configured settlement asset |
| `VITE_SETTLEMENT_TOKEN_NAME` | No | Display name for configured settlement asset |
| `VITE_SETTLEMENT_TOKEN_DECIMALS` | No | Settlement precision; defaults to `7` |
| `VITE_SETTLEMENT_MIN_UNITS` | No | Minimum whole-unit deal amount enforced by the create flow; defaults to `1` |
| `VITE_SETTLEMENT_ASSET_POLICY` | No | Policy label shown in create flow, e.g. `demo-testnet` or `approved-mainnet` |
| `VITE_STELLAR_BROKER_PROVIDER` | No | Broker provider id shown in the UI; defaults to `testnet-soroswap-seeded` on testnet |
| `VITE_STELLAR_BROKER_SLIPPAGE_BPS` | No | Swap slippage tolerance in basis points; defaults to `100` |
| `VITE_STELLAR_BROKER_QUOTE_TTL_SECONDS` | No | Quote/deadline window; defaults to `3600` |
| `VITE_SOROSWAP_ROUTER_ADDRESS` | No | Soroswap router used by the Stellar Broker testnet adapter |

The public aggregator API key belongs on the backend as `SOROSWAP_API_KEY`,
not as a `VITE_` variable.

When `VITE_STELLAR_NETWORK=mainnet`, Friendbot UI is hidden and seeded
testnet pool language is replaced with generic provider/broker copy. The
current executable broker adapter is still the seeded Soroswap route until the
Gap 4 provider interface is completed.

Settlement asset policy is documented in
[`SETTLEMENT_ASSET_POLICY.md`](SETTLEMENT_ASSET_POLICY.md).

## Build and Development

```bash
cd frontend
npm install
npm run dev      # Development server on :5173
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19.x | UI framework |
| `@stellar/stellar-sdk` | 14.6.1 | Stellar/Soroban interaction |
| `@creit.tech/stellar-wallets-kit` | 2.0.1 | Multi-wallet connection |
| `lucide-react` | 0.577+ | Icon library |
| `tailwindcss` | 4.2.x | Utility-first CSS (v4) |
| `typescript` | 5.9 | Type safety |
| `vite` | 8.0 | Build tool |
