# NEAR Intents Integration

Last updated: 2026-07-28 12:35 BST

Scope: NEAR Intents / 1Click integration for cross-chain wallet top-ups into
the connected Stellar wallet. The route prepares funds for escrow, but it does
not fund escrow by itself. DealEscrow remains the source of truth for locked
funds.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-28 12:35 BST | Public NEAR Intents documentation cleanup | Replaced older implementation-history notes with the current product flow, API boundary, and operational rules for wallet top-ups. | Targeted docs scan and `git diff --check`. |
| 2026-07-26 13:58 BST | Public user quote/status routes | User-facing 1Click quote, status, and source-transaction submission endpoints no longer require operator login. Admin reconciliation remains protected. | `npm run build` passed in `indexer/`. |
| 2026-07-25 16:18 BST | EVM source payment | Supported EVM routes can switch to the selected chain and submit native/ERC-20 payments from the browser wallet to the returned 1Click deposit address. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-23 14:55 BST | Top-up boundary | The Deals flow labels NEAR Intents as cross-chain wallet top-up. The user still confirms **Fund Deal** after settlement arrives in the Stellar wallet. | `npm run build` passed in `frontend/`. |

## Current Product Flow

```text
Connect Stellar wallet
-> open Wallet Prep or a pending deal funding action
-> choose source chain, source asset, and source amount
-> request a 1Click quote
-> send the source-chain payment from the connected source wallet
-> 1Click routes settlement into the connected Stellar wallet
-> user returns to Deals
-> user clicks Fund Deal from the Stellar wallet
-> DealEscrow emits funded events
```

Wallet Prep exposes this as a general cross-chain wallet top-up surface. Deals
exposes the same route in a deal-aware funding modal where the selected deal,
remaining amount, and settlement asset are already known.

## User-Facing Rules

- The source asset is user-selected from live 1Click token discovery.
- The destination is constrained to an approved Stellar settlement asset.
- For XLM-settled deals, the destination is Stellar XLM.
- For USDC-settled deals, the destination is Stellar USDC, and the Stellar
  wallet must already be active with the relevant USDC trustline.
- A successful 1Click route means the Stellar wallet was topped up. It does not
  mean escrow is funded.
- Escrow is funded only after the user signs **Fund Deal** and the DealEscrow
  contract emits `funded` events.

## API Boundary

The backend wraps `@defuse-protocol/one-click-sdk-typescript` and keeps partner
credentials server-side.

Implemented endpoints:

```text
GET  /api/near-intents/readiness
GET  /api/near-intents/tokens
POST /api/marketplace-bindings/:bindingId/near-intents/quote
GET  /api/marketplace-bindings/:bindingId/near-intents/status
POST /api/marketplace-bindings/:bindingId/near-intents/deposit-tx
POST /api/marketplace-bindings/:bindingId/near-intents/reconcile
```

The public quote/status/source-transaction routes support the product checkout
flow. Reconciliation and operator controls remain protected.

## Environment

```env
NEAR_INTENTS_ENABLED=false
NEAR_INTENTS_ALLOW_LIVE=false
NEAR_INTENTS_API_BASE_URL=
NEAR_INTENTS_JWT=
NEAR_INTENTS_STELLAR_DESTINATION_ASSET_ALLOWLIST=
NEAR_INTENTS_DEFAULT_STELLAR_DESTINATION_ASSET=
NEAR_INTENTS_STELLAR_HORIZON_URL=https://horizon.stellar.org
NEAR_INTENTS_DEFAULT_REFUND_ACCOUNT=
NEAR_INTENTS_DEMO_DESTINATIONS_ENABLED=false
NEAR_INTENTS_DEMO_DESTINATION_ASSET_ALLOWLIST=
NEAR_INTENTS_QUOTE_TTL_SECONDS=300
NEAR_INTENTS_POLL_INTERVAL_SECONDS=15
```

`NEAR_INTENTS_JWT` must never be exposed through `VITE_*`. The allowlist should
contain 1Click `assetId` values from token discovery, not Stellar contract IDs.

`NEAR_INTENTS_DEFAULT_REFUND_ACCOUNT` is a server fallback for controlled routes.
For live browser-wallet payments, refunds should route to the same source
wallet that paid.

## Quote And Status Handling

The adapter is responsible for:

- Fetching supported tokens from 1Click.
- Creating exact-input quotes with source asset, destination asset, amount,
  recipient, refund target, slippage tolerance, and deadline.
- Verifying quote signatures before using payment instructions.
- Persisting quote id, deposit address, optional deposit memo, expiry,
  expected output, and provider status.
- Submitting the source transaction hash when available so 1Click can detect
  the deposit faster.
- Polling provider status until success, failure, refund, expiry, or review
  state.
- Keeping provider status separate from DealEscrow lifecycle events.

## Status Mapping

| 1Click / Payment State | Local Status | Escrow Meaning |
|---|---|---|
| Quote returned | `intent_created` | No escrow funds yet. |
| Source deposit pending | `intent_created` | Awaiting source-chain payment detection. |
| Source deposit detected | `funded` | Source payment detected; escrow is still not funded. |
| Routing in progress | `routed` | Payment is moving toward Stellar settlement. |
| Settlement complete | `settled_on_stellar` | Stellar wallet should be ready for **Fund Deal**. |
| Expired | `expired` | No escrow state change. |
| Failed | `failed` | No escrow state change. |
| Refunded | `refunded` | No escrow refund unless DealEscrow emits `refund` or `resolved`. |
| Provider/Soroban mismatch | `needs_review` | Operator reconciliation required. |

## Stellar Settlement Readiness

XLM can activate a fresh Stellar account when enough native XLM is delivered.
Issued assets such as USDC require:

- an active destination account,
- enough XLM reserve,
- the relevant asset trustline.

The backend preflights issued-asset destinations before requesting a 1Click
quote so the UI can show a setup action instead of a provider-side failure.

## Operational Notes

- 1Click does not provide a separate Stellar testnet route; small live routes
  are used for end-to-end payment validation.
- Quote previews can be enabled for route verification, but preview routes do
  not produce escrow state.
- EVM source-wallet execution is implemented through the browser wallet.
- NEAR and Solana source-wallet execution remain connector-specific additions;
  their routes can still be previewed when supported by 1Click.
- Webhook support is not enabled. Status is currently tracked by polling.
