# Near Intents Integration Plan

Last updated: 2026-07-14 11:11 HKT

Scope: final-tranche integration plan for NEAR Intents as a required
cross-chain payment initiation path for the reusable Stellar escrow rail.

This document supersedes the earlier "external boundary only" wording. NEAR
Intents is no longer treated as something we can skip for the final tranche.
The correct direction is a staged adapter: integrate quote/status/payment
tracking while keeping Soroban escrow events as the source of truth for when
funds are actually locked in DealEscrow.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-01 10:25 HKT | Near Intents boundary | Documented NEAR Intents as an external payment initiation boundary and added optional marketplace binding metadata for cross-chain intent tracking. | Superseded by 10:28 HKT validation. |
| 2026-07-01 10:28 HKT | Near Intents boundary validation | Confirmed the optional binding metadata compiles in the indexer type model and kept executable payment flow explicitly out of scope for this tranche. | Superseded by 10:40 HKT direction change. |
| 2026-07-01 10:40 HKT | Near Intents required integration | Reopened Gap 5 as a required integration workstream. Added researched protocol flow, staged adapter plan, status mapping, API/env readiness, and acceptance criteria. | Static docs update using NEAR docs and NEAR sandbox 1Click interface reference; production endpoint contract still requires provider validation. |
| 2026-07-01 10:45 HKT | NEAR Intents SDK-first plan | Confirmed official 1Click SDK availability and changed implementation path to use `@defuse-protocol/one-click-sdk-typescript` behind the local adapter instead of hand-rolling the API client. | `npm view @defuse-protocol/one-click-sdk-typescript` returned latest `0.1.25`; static docs update only. |
| 2026-07-01 12:14 HKT | NEAR Intents server spine | Added the official SDK dependency, feature-flagged `nearIntentsProvider`, protected token/quote/status/deposit-tx/reconcile endpoints, and binding persistence for quote/deposit/status metadata. | `npm run build` passed in `indexer/`. Live execution remains disabled unless `NEAR_INTENTS_ENABLED=true`, `NEAR_INTENTS_ALLOW_LIVE=true`, JWT, and Stellar asset envs are configured. |
| 2026-07-01 13:39 HKT | NEAR Intents frontend panel | Added a Liquidity-tab funding panel with public readiness check, protected dry/live quote request, deposit address/memo display, provider status refresh, admin-auth recovery, and Soroban-funded source-of-truth warning. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. Live quote/status evidence still requires JWT, approved Stellar asset id, and no-testnet tiny-amount QA. |
| 2026-07-01 16:00 HKT | NEAR Intents integration research refresh | Rechecked official NEAR/1Click docs and tightened the required build path: token discovery, quote, origin-chain deposit, optional deposit tx submission, status polling, signed-intent future path, JWT/fee handling, and no-testnet live QA. | Static documentation update using official NEAR and NEAR Intents docs. No runtime behavior changed. |
| 2026-07-14 11:11 HKT | NEAR 1Click quote correctness | Reworked the adapter around the official 1Click shape: request-selected `originAsset` and `destinationAsset`, server-side destination allowlist/default, explicit refund target, quote signature verification via `verifyQuoteSignature`, frontend destination asset selection, and smoke/docs updates. | `npm run build` passed in `indexer/`; `npm run build` passed in `frontend/`; live non-strict `smoke:backend` passed reachable checks and reported NEAR envs/shadow bindings blocked. Live quote evidence still requires JWT, approved asset IDs from token discovery, admin auth, and tiny-amount no-testnet QA before enabling live execution. |
| 2026-07-20 23:06 BST | NEAR production UX cleanup | Removed the user-facing raw refund address field from the Liquidity panel, changed raw asset inputs into source/settlement selectors, and reframed the refund env as a dry-QA fallback rather than production refund behavior. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-21 13:26 BST | NEAR Stellar recipient preflight | Added server-side validation before 1Click quotes to ensure Stellar issued-asset recipients are valid G-addresses, exist on Horizon, and hold the destination asset trustline. This turns opaque provider errors for assets such as Stellar USDC into actionable recipient-readiness errors. | `npm run build` passed in `indexer/`; quote smoke with the seeded fallback recipient now blocks locally before provider submission until a USDC-ready Stellar recipient is configured. |
| 2026-07-21 16:34 BST | Cross-chain funding product UX | Reworked the Liquidity-tab NEAR panel into a production-facing **Pay from another chain** flow. The UI now shows source asset, approved Stellar settlement asset, amount, quote, payment instructions, and payment status while hiding binding id, raw asset ids, JWT/readiness internals, refund fallback envs, dry-quote terminology, and admin smoke language. | `npm run build` passed in `frontend/`. Backend/API behavior unchanged; Soroban `funded` remains the escrow source of truth. |
| 2026-07-21 21:13 BST | NEAR quote request compatibility | Removed forced `depositMode` from the public quote request path. 1Click now decides whether the selected route needs a deposit memo, and the UI still displays `depositMemo` when returned. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-21 23:50 BST | Stellar recipient quote guard | Added frontend validation so **Pay from another chain** requires a real connected Stellar G-address before requesting a quote, matching the server-side Stellar recipient preflight. This prevents the shadow binding placeholder wallet from being sent to 1Click. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-21 23:53 BST | Source-chain refund guard | Disabled Ethereum/Base source assets in the public panel until native source-wallet connection exists, and added backend validation so EVM source assets require an EVM refund address instead of falling back to the NEAR QA refund account. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-22 11:51 BST | NEAR quote evidence destination | Added an explicitly flagged demo destination allowlist so reviewers can request a signed 1Click quote for a liquid non-Stellar route when Stellar settlement liquidity is unavailable. The UI labels this as quote evidence only and never treats it as escrow funding. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. Live direct 1Click probe previously confirmed NEAR -> NEAR USDT dry quote succeeds while NEAR -> Stellar USDC returns no liquidity. |

## Researched Protocol Notes

Primary NEAR documentation describes NEAR Intents as a multichain transaction
protocol where users specify desired outcomes and third-party market makers or
solvers compete to provide the best solution:

- Chain abstraction lets apps work across multiple blockchains while hiding
  chain complexity from users.
- Intents let a user or agent express an outcome, then broadcast that intent to
  market makers/solvers.
- Solvers compete off-chain and return a quote for user approval.
- After the quote is accepted, execution settles through a NEAR Verifier smart
  contract.

Research references:

- NEAR chain abstraction overview:
  https://docs.near.org/chain-abstraction/what-is
- NEAR Intents overview:
  https://docs.near.org/chain-abstraction/intents/overview
- NEAR Intents 1Click Swap API:
  https://docs.near-intents.org/integration/distribution-channels/1click-api/about-1click-api
- NEAR Intents Swap SDK:
  https://docs.near-intents.org/integration/distribution-channels/1click-api/sdk
- NEAR Intents Quickstart:
  https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart
- NEAR Intents API keys:
  https://docs.near-intents.org/integration/distribution-channels/1click-api/authentication
- NEAR Intents quote signature verification:
  https://docs.near-intents.org/integration/distribution-channels/1click-api/verify-quote-signature
- NEAR Intents supported chains:
  https://docs.near-intents.org/resources/chain-support
- NEAR Intents API reference index:
  https://docs.near-intents.org/llms.txt
- NEAR sandbox 1Click simulator interface reference:
  https://github.com/near-sandbox/near-intents-simulator
- TypeScript SDK package:
  https://www.npmjs.com/package/@defuse-protocol/one-click-sdk-typescript

## Official 1Click Integration Contract

The required integration is not "mention NEAR" or link to the public widget.
For this repo, the required integration is a server-side 1Click adapter with
frontend funding state and marketplace-binding reconciliation:

1. Token discovery: call the SDK `getTokens()` or REST `/v0/tokens` to fetch
   live `assetId` values. Do not hardcode the Stellar destination asset without
   confirming it exists in the current 1Click token list.
2. Quote request: call `getQuote()` / `POST /v0/quote` with `dry`, `swapType`,
   `slippageTolerance`, `originAsset`, `depositType`, `destinationAsset`,
   `amount`, `recipient`, `recipientType`, `refundTo`, `refundType`, and
   `deadline`.
3. Origin-chain funding: for `depositType: ORIGIN_CHAIN`, present the returned
   `depositAddress` and optional `depositMemo`. The user sends the source asset
   on the origin chain; 1Click starts processing after receipt.
4. Deposit tx submission: optionally call `submitDepositTx()` /
   `POST /v0/deposit/submit` with `depositAddress` and `txHash` to speed
   detection.
5. Status polling: call `getExecutionStatus()` / `GET /v0/status` using the
   quote `depositAddress` and `depositMemo` if one was returned.
6. Terminal handling: treat `SUCCESS`, `REFUNDED`, and `FAILED` as terminal
   provider states; treat `INCOMPLETE_DEPOSIT` as support review.
7. Escrow source of truth: even if provider status is `SUCCESS`, the local deal
   is not escrow-funded until the Stellar DealEscrow `funded` event is indexed.

The future signed-intent path is separate: when quotes use `depositType:
INTENTS` or `CONFIDENTIAL_INTENTS`, the app must generate an intent, get a user
wallet signature using the supported signing standard, submit the signed intent,
and then poll status by the quote deposit address. That is not the current
first-pass implementation.

The official 1Click TypeScript SDK is the preferred integration surface for
this repo. The local adapter should wrap the SDK so the rest of the codebase
depends on our product-level interface rather than raw vendor calls:

```ts
import {
  OpenAPI,
  OneClickService,
  QuoteRequest,
} from '@defuse-protocol/one-click-sdk-typescript';

OpenAPI.BASE = process.env.NEAR_INTENTS_API_BASE_URL ?? 'https://1click.chaindefuser.com';
OpenAPI.TOKEN = process.env.NEAR_INTENTS_JWT;

const quote = await OneClickService.getQuote({
  dry: false,
  swapType: QuoteRequest.swapType.EXACT_INPUT,
  slippageTolerance: 100,
  originAsset: 'nep141:wrap.near',
  depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
  destinationAsset: input.destinationAsset,
  amount: '1000000',
  refundTo: 'alice.near',
  refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
  recipient: 'G...',
  recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
  deadline: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
});

await OneClickService.getExecutionStatus(quote.quote.depositAddress!);
```

Important constraints from the current docs:

- There is no testnet version of NEAR Intents; use tiny live amounts for test
  swaps and keep the feature disabled by default.
- The SDK base URL defaults to `https://1click.chaindefuser.com`.
- A JWT from the Partner Dashboard avoids the unauthenticated 0.2% platform fee;
  store it server-side and never expose it through `VITE_*`.
- `getQuote`, `submitDepositTx`, and `getExecutionStatus` use the configured
  SDK token / bearer token when authenticated.
- Use `OneClickService.getTokens()` to confirm live `assetId` values before
  setting the Stellar destination asset allowlist/default.
- Verify quote signatures with `verifyQuoteSignature()` before consuming fields
  such as deposit address, memo, destination amount, or deadline.
- For `dry: true`, the quote validates and prices the route but does not return
  executable deposit instructions.
- Status polling uses the quote `depositAddress`; terminal statuses include
  `SUCCESS`, `REFUNDED`, and `FAILED`.
- Do not force `depositMode` in quote requests unless the provider requires a
  route-specific override. If a quote response includes `depositMemo`, status
  checks and deposit instructions must preserve it.
- NEAR Intents lists Stellar as supported, including SEP-53 signing support, but
  this repo still must validate the exact Stellar issued-asset id and recipient
  address requirements before enabling production execution.
- Stellar issued assets such as USDC require the destination account to exist
  and hold the asset trustline. XLM does not require a trustline. The adapter
  validates Stellar destination readiness through Horizon before requesting a
  1Click quote so the product can show a clear setup error instead of surfacing
  an opaque provider response.

## Product Decision

NEAR Intents is required, but it should be integrated as a pluggable payment
orchestration adapter instead of hardwiring this repo to a single marketplace.

```text
Marketplace deal
  -> escrow intent / marketplace binding
  -> NEAR Intents quote
  -> user approval and source-chain funding
  -> NEAR intent status tracking
  -> settlement asset arrives on Stellar
  -> DealEscrow deposit()
  -> Soroban funded event
  -> marketplace binding reconciliation
```

The escrow rail must not mark funds as locked from NEAR status alone. A Near
intent can prove that payment initiation is moving, but DealEscrow is funded
only after the Stellar settlement asset is deposited and the indexer observes
the Soroban `funded` event.

## Product-Facing Checkout Shape

The public flow should read like checkout, not an integration console:

1. User opens a deal and chooses a funding route.
2. The app offers **Stellar USDC**, **Swap into Stellar USDC**, and **Pay from
   another chain**.
3. **Pay from another chain** lets the user choose a source chain/asset, review
   the Stellar settlement asset, enter the amount due, and request a quote.
4. The quote view shows estimated received amount, minimum received amount,
   expiry, verification state, payment instructions when live execution is
   enabled, and the payment status timeline.
5. Status progresses through source payment, NEAR Intents routing, Stellar
   settlement, and then escrow funding only after a matching Soroban `funded`
   event is indexed.

Do not expose these implementation details in the public checkout surface:
binding ids, raw asset ids, JWT/readiness internals, refund fallback envs,
dry-quote labels, smoke/admin language, or marketplace shadow-binding jargon.
Those remain internal QA and operator concerns.

## Adapter Responsibilities

The adapter should be small and SDK-backed:

- Use `@defuse-protocol/one-click-sdk-typescript` for token lookup, quote
  creation, deposit transaction submission, and status polling.
- Keep JWT/API credentials only in the indexer/server process.
- Create a quote for source asset, request-selected destination Stellar asset
  id, amount, recipient, refund target, slippage tolerance, deadline, and
  marketplace correlation id.
- Validate the destination asset against a server-side allowlist derived from
  1Click token discovery before requesting a quote.
- Persist the quote id / intent id on `MarketplaceBinding.externalPaymentIntent`.
- Persist `depositAddress` and `depositMemo` when the quote returns them; these
  are required for deposit instructions and status polling.
- Show quote expiry, expected output, fees/slippage if provided, and refund
  target before user approval.
- Poll SDK status or receive provider updates when webhook support is enabled.
- Map external states into the local status model.
- Trigger or instruct the Stellar `deposit()` step only after the settlement
  asset is available for the client/escrow funding route.
- Preserve idempotency so repeated status updates do not double-deposit or
  double-reconcile.
- Verify quote signatures before trusting provider payloads in a production
  path; status signature support should be added if the provider SDK exposes it.
- Record enough redacted raw provider metadata for support to diagnose
  `FAILED`, `REFUNDED`, and `INCOMPLETE_DEPOSIT` cases without logging JWTs.

## Local Status Model

Marketplace bindings may carry optional external intent metadata:

```ts
externalPaymentIntent?: {
  provider: 'near-intents' | 'external';
  intentId?: string;
  status:
    | 'not_applicable'
    | 'intent_created'
    | 'funded'
    | 'routed'
    | 'settled_on_stellar'
    | 'expired'
    | 'failed'
    | 'refunded'
    | 'needs_review';
  refundRef?: string;
  updatedAt?: Date;
}
```

Recommended extension before executable integration:

```ts
  nearIntent?: {
    quoteId: string;
    intentId?: string;
    depositAddress?: string;
    depositMemo?: string;
    sourceAsset: string;
    destinationAsset: string;
    sourceAmount: string;
  minDestinationAmount?: string;
  recipient: string;
  refundTo: string;
  expiresAt?: Date;
  providerStatusRaw?: string;
  providerStatusUpdatedAt?: Date;
}
```

## State Mapping

| NEAR / Payment State | Local Status | Stellar Escrow Meaning |
|---|---|---|
| Quote returned with `depositAddress` | `intent_created` | No escrow funds yet. |
| `PENDING_DEPOSIT` | `intent_created` | Awaiting user/source-chain transfer. |
| `KNOWN_DEPOSIT_TX` | `funded` | External deposit detected, but Stellar escrow is still not funded. |
| `PROCESSING` | `routed` | Payment is being converted or bridged toward the Stellar settlement asset. |
| `SUCCESS` | `settled_on_stellar` | Destination transfer completed; eligible to call DealEscrow `deposit()` if the settlement asset reached the expected Stellar account. |
| Quote/deadline expired before deposit | `expired` | No escrow state change; marketplace should prompt retry. |
| `INCOMPLETE_DEPOSIT` | `needs_review` | Deposit below expected amount; support must decide retry, top-up, or refund path. |
| `FAILED` | `failed` | No escrow state change; user/support needs retry or refund handling. |
| `REFUNDED` | `refunded` | No Stellar escrow refund implied unless a Soroban `refund` event exists. |
| Provider status and Soroban state disagree | `needs_review` | Operator must reconcile before advancing product status. |

## API And Env Readiness

Implemented environment variables:

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

Implemented backend endpoints:

```text
GET  /api/near-intents/readiness
GET  /api/near-intents/tokens
POST /api/marketplace-bindings/:bindingId/near-intents/quote
GET  /api/marketplace-bindings/:bindingId/near-intents/status
POST /api/marketplace-bindings/:bindingId/near-intents/deposit-tx
POST /api/marketplace-bindings/:bindingId/near-intents/reconcile
```

`GET /api/near-intents/readiness` is public and returns only non-secret config
booleans plus feature flag state. Current write/status endpoints require admin
auth and keep JWTs server-side. Production hardening still needs idempotency
keys, replay protection, provider signature verification if webhooks are
enabled, and raw provider payload logging with JWTs/secrets redacted.

`NEAR_INTENTS_DEMO_DESTINATIONS_ENABLED` and
`NEAR_INTENTS_DEMO_DESTINATION_ASSET_ALLOWLIST` are reviewer-evidence flags for
quote-only destinations. Use them only when the configured Stellar settlement
asset has no current 1Click liquidity and the team needs to demonstrate
successful SDK quote creation plus signature verification through another
liquid 1Click asset such as `nep141:usdt.tether-token.near`. These routes are
not Stellar escrow settlement routes and must not mark a deal funded.

Webhook support is not implemented yet. If we add it later, add
`NEAR_INTENTS_WEBHOOK_SECRET` and signature verification before accepting
provider-pushed state changes.

## UI Requirements

The frontend now includes **Pay from another chain** in the Liquidity tab
alongside Friendbot and the Stellar broker route:

- Shows source asset, approved Stellar settlement asset, amount due, route
  summary, quote result, payment instructions when live execution returns them,
  and a payment status timeline.
- Hides binding id, raw 1Click asset ids, JWT/readiness internals, refund
  fallback envs, dry-quote labels, and smoke/admin terminology from the public
  product surface.
- Keeps refund handling product-facing: production refunds route to the
  connected source wallet; the server default refund account remains an
  operator-controlled internal QA fallback.
- Uses product language for protected/disabled route errors instead of exposing
  server configuration details.
- Shows provider/payment status and keeps `SUCCESS`, `FAILED`, `REFUNDED`, and
  pending states separate from Soroban escrow funding.
- Continues to warn that "escrow funded" only means a DealEscrow `funded` event
  was indexed on Stellar.

Remaining UI hardening before production: add wallet-specific source-chain
deposit execution, hide preview-only copy once live execution is permanently
enabled, improve provider status labels after live QA, and capture unhappy-path
evidence for expired quote, user cancellation, provider failure, delayed
settlement, refund, and provider/Soroban state mismatch.

## Acceptance Criteria

- A reviewer can create a marketplace binding, request a NEAR Intents quote
  through the official SDK, and see quote/intent/deposit metadata persisted
  against that binding. Status: server API implemented; live quote evidence
  still needs final route evidence. Frontend panel is implemented as a
  product-facing cross-chain quote, payment instruction, and status display.
- Status updates are idempotent and mapped into the local state model. Status:
  server API implemented for SDK polling by stored deposit address/memo.
- Failed, expired, refunded, and delayed settlement states are visible in API
  output and QA docs.
- The app never claims escrow funding until DealEscrow emits `funded`.
- JWT provisioning, webhook signature rules if used, supported Stellar
  destination asset id, no-testnet testing approach, and managed source-wallet
  refund semantics are validated before enabling live execution.

## Must-Build Next Checklist

Before this can be called a complete NEAR Intents integration, finish these in
order:

1. Obtain partner JWT and store it only as `NEAR_INTENTS_JWT` in Coolify or a
   secrets manager.
2. Run the protected token-list endpoint and record the exact Stellar
   destination `assetId` for the settlement asset.
3. Set `NEAR_INTENTS_STELLAR_DESTINATION_ASSET_ALLOWLIST`,
   `NEAR_INTENTS_DEFAULT_STELLAR_DESTINATION_ASSET`, and an
   operator-controlled `NEAR_INTENTS_DEFAULT_REFUND_ACCOUNT` fallback in a
   staging/demo environment.
4. Request a dry quote through the frontend panel for a shadow marketplace
   binding and capture the persisted `nearIntent` metadata.
5. Enable `NEAR_INTENTS_ALLOW_LIVE=true` only for a tiny live-amount QA window.
6. Execute one origin-chain deposit to the returned `depositAddress` and
   preserve `depositMemo` if present.
7. Submit the deposit tx hash through the protected endpoint.
8. Poll status through the UI/API until terminal or support-review state.
9. Reconcile Stellar settlement into DealEscrow only after the settlement asset
   is present and the Soroban `deposit()` path emits `funded`.
10. Capture failure/refund/no-fill evidence or a written provider-support note
    if live route failure cannot be safely induced.

## Remaining Implementation Tasks

1. Add `@defuse-protocol/one-click-sdk-typescript` to the indexer/server package. Status: done.
2. Add a typed `nearIntentsProvider` wrapper behind a feature flag. Status: done.
3. Confirm live Stellar destination `assetId` through `OneClickService.getTokens()`. Status: endpoint added; live env/JWT evidence pending.
4. Extend marketplace binding persistence with quote/status/deposit fields. Status: done for `nearIntent` metadata.
5. Add protected quote/status/webhook-or-poll/reconcile endpoints. Status: done for token list, quote, status polling, deposit tx submission, and per-binding reconcile; webhook remains future work.
6. Add frontend funding state for NEAR Intents using existing UI components. Status: first pass done in the Liquidity tab; live wallet deposit execution remains future work.
7. Add unhappy-path QA and evidence capture for quote expiry, failed route,
   delayed settlement, refund, dispute-after-Near-funded, and mismatch review.
