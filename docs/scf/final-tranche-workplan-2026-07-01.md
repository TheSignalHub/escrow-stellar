# Final Tranche Work Plan - 2026-07-01 06:13 HKT

Scope: turn the current Tranche 2 Stellar escrow demo into a final-tranche, reviewer-ready, marketplace-compatible escrow rail without mutating The Signal's production marketplace database.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-01 06:13 HKT | Final tranche execution plan | Created detailed work plan and started Gap 1 with marketplace-agnostic shadow binding spec. | Static review against README, architecture docs, indexer code, contract docs, and frontend dispute UI. |
| 2026-07-01 06:13 HKT | Gap 1 implementation start | Added `marketplace-bindings` and `marketplace-binding-events` data model/API plan to implementation scope; first code pass adds indexer types, Mongo collections, reconciliation helper, and protected API routes. | `npm run build` passed in `indexer/`. |
| 2026-07-01 06:20 HKT | Gap 1 fixture seed | Added idempotent `seed:marketplace-bindings` command for `SIG-DEMO-001` and `SIG-DEMO-002` shadow bindings. | `npm run build` passed; smoke seed inserted then updated both fixtures in `escrow-stellar-gap1-smoke`. |
| 2026-07-01 06:20 HKT | Gap 1 reviewer dashboard | Added read-only shadow marketplace binding panel to `/market_dashboard` summary output. | `npm run build` passed. Browser smoke still required. |
| 2026-07-01 06:29 HKT | Gap 1 smoke evidence | Recorded seed/idempotence proof for shadow bindings. | First seed returned `inserted`; second seed returned `updated` for `SIG-DEMO-001` and `SIG-DEMO-002`. |
| 2026-07-01 06:29 HKT | Gap 1 API validation | Hardened binding creation to reject unknown initial status strings. | `npm run build` passed; seed smoke still returned `updated` for both fixtures. |
| 2026-07-01 09:22 HKT | Gap 1 reconcile CLI | Added `npm run reconcile:marketplace-bindings` so reviewers can run binding reconciliation without booting the API server. | `npm run build` passed; live reconcile smoke mapped 5 events. |
| 2026-07-01 09:22 HKT | Gap 1 reconcile accuracy | Reconcile now skips binding updates when a binding has no matching indexed events, keeping `bindingsUpdated` meaningful. | Repeat reconcile returned 0 inserted, 5 deduped, 1 binding updated. |
| 2026-07-01 09:28 HKT | Coolify demo deployment | Added redacted Coolify deployment runbook and linked it from README surfaces. | Static documentation update. No runtime behavior changed. |
| 2026-07-01 10:12 HKT | Gap 2 network config | Added frontend `VITE_STELLAR_*` network envs, testnet defaults, dynamic explorer links, and Friendbot/testnet copy gating outside testnet. | `npm run build` passed; `VITE_STELLAR_NETWORK=mainnet npm run build` passed. |
| 2026-07-01 10:16 HKT | Gap 3 settlement asset policy | Added settlement asset policy doc and frontend envs for decimals, minimum amount, and policy label. | `npm run build` passed; `VITE_STELLAR_NETWORK=mainnet VITE_SETTLEMENT_MIN_UNITS=10 VITE_SETTLEMENT_ASSET_POLICY=approved-mainnet npm run build` passed. |
| 2026-07-01 10:23 HKT | Gap 4 broker provider interface | Added typed broker provider boundary with provider id, quote expiry, and slippage envs while preserving seeded Soroswap testnet adapter. | `npm run build` passed in `frontend/`. |
| 2026-07-01 10:23 HKT | Gap 4 broker QA notes | Added broker route QA note for no-route, slippage, expiry, simulation, submission, and timeout behavior. | Static docs update; build already passed. |
| 2026-07-01 10:25 HKT | Gap 5 Near Intents boundary | Documented Near Intents as an external payment initiation boundary and added optional marketplace binding metadata for cross-chain intent state. | Superseded by 10:28 HKT validation. |
| 2026-07-01 10:28 HKT | Gap 5 Near Intents validation | Promoted Near Intents to a documented external payment boundary with compile-checked binding metadata and reviewer-facing README links. | Superseded by 10:40 HKT required-integration direction. |
| 2026-07-01 10:29 HKT | Gap 6 unhappy-path QA | Added UI unhappy-path matrix for dispute, role mismatch, insufficient balance, signing cancellation, and admin/operator resolution; corrected demo guide to avoid claiming an admin refund-slider UI. | Static review of frontend dispute/error code and docs. Browser capture still required for final evidence. |
| 2026-07-01 10:31 HKT | Gap 7 admin/security operations | Added operations/security runbook for admin authority, dispute operator flow, emergency refunds, secrets, monitoring, and production hardening backlog. | Static review of contract/admin/deployment code and docs. No runtime behavior changed. |
| 2026-07-01 10:33 HKT | Gap 8 evidence package | Added final evidence package with fresh contract/indexer/frontend validation results and remaining capture tasks. | `cargo test`, `indexer npm run build`, and `frontend npm run build` passed. Root `docs:check` script does not exist. |
| 2026-07-01 10:40 HKT | Gap 5 Near Intents required integration | Reopened Near Intents as mandatory final-tranche work. Added researched adapter plan, status mapping, env/API readiness, and acceptance criteria. | Static docs update using NEAR protocol docs and sandbox 1Click interface reference; production endpoint contract still requires provider validation. |
| 2026-07-01 10:45 HKT | Gap 5 NEAR Intents SDK path | Updated Gap 5 to use the official `@defuse-protocol/one-click-sdk-typescript` package behind a local adapter instead of hand-rolled HTTP calls. | `npm view @defuse-protocol/one-click-sdk-typescript` returned latest `0.1.25`; docs-only update. |
| 2026-07-01 12:14 HKT | Gap 5 NEAR Intents server spine | Added SDK dependency, feature-flagged provider wrapper, protected token/quote/status/deposit-tx/reconcile endpoints, envs, and binding metadata persistence. | `npm run build` passed in `indexer/`. Live quote/status evidence still requires JWT and approved asset envs. |
| 2026-07-01 13:39 HKT | Gap 5 NEAR Intents frontend panel | Added Liquidity-tab readiness, dry quote, deposit instruction, and provider status UI using existing Card/Button/Tag primitives. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. Live source-chain execution evidence still pending. |

## Product Direction

The final tranche should position this repository as a reusable Stellar escrow rail for marketplaces:

- The Signal is the reference marketplace and first adopter.
- The escrow rail remains generic enough for other service marketplaces.
- Production marketplace systems keep ownership of users, KYB, matching, messaging, CRM, and commercial workflow.
- This repo owns wallet funding, Soroban escrow creation, milestone settlement, payout split events, dispute events, indexing, and marketplace-compatible reconciliation.
- Final validation uses shadow marketplace bindings and sanitized Signal-style deal records, not direct writes into production marketplace collections.

## Workstream Status

| # | Workstream | Status | Goal | Primary Artifacts |
|---|---|---|---|---|
| 1 | Marketplace adapter / shadow binding | In progress | Prove external marketplace deal IDs can map to Soroban deal IDs safely. | This doc, `indexer/src/marketplaceBindings.ts`, `marketplace-bindings` collection/API, `/market_dashboard` binding panel |
| 2 | Environment-driven network config | Done | Remove hardcoded testnet assumptions from production-facing paths. | `frontend/src/lib/stellar.ts`, frontend/indexer env docs |
| 3 | Settlement asset policy | Done | Define production USDC/asset allowlist, trustline, min amount, and dust behavior. | README, `.env.example`, `docs/SETTLEMENT_ASSET_POLICY.md` |
| 4 | Broker provider interface | Done | Keep Soroswap testnet adapter, add production-facing broker interface semantics. | `stellarBroker.ts`, broker docs, route QA |
| 5 | Near Intents integration adapter | Server + UI first pass done; live evidence pending | Add a feature-flagged quote/status/reconcile adapter while keeping Soroban `funded` as escrow source of truth. | `nearIntentsProvider.ts`, protected indexer routes, `NearIntentsPanel.tsx`, `nearIntents.ts`, `docs/NEAR_INTENTS_BOUNDARY.md`, binding types |
| 6 | UI unhappy-path QA | Done for matrix; evidence pending | Produce evidence plan for dispute, role mismatch, insufficient balance, cancellation, admin resolution. | `docs/scf/unhappy-path-qa-2026-07-01.md`, demo guide corrections |
| 7 | Admin/security operations | Done for runbook; code hardening pending | Define admin key, dispute resolver, pause/upgrade posture, incident runbook. | `docs/OPERATIONS_SECURITY.md` |
| 8 | Final evidence package | Done for command evidence; screenshots pending | Compile reviewer proof: tests, build, smoke, screenshots, explorer links. | `docs/scf/final-tranche-evidence-2026-07-01.md` |

## Gap 1 - Marketplace Adapter / Shadow Binding

### Decision

Do not integrate directly with The Signal's live marketplace database for final tranche. Use a shadow binding layer in this repo's isolated demo/staging database.

This is acceptable because the submitted integration proves the settlement rail and reconciliation contract while protecting production dealflow. It also turns the product into a pluggable escrow rail that other marketplaces can use.

### Expected Behavior

A marketplace can create or provide a deal record externally, then bind it to a Soroban escrow deal:

```text
External marketplace deal
  -> escrow intent / binding record
  -> Soroban create_deal()
  -> Soroban event indexer
  -> marketplace-compatible reconciliation state
```

The binding layer never mutates The Signal production collections. It only records the relationship between external IDs and on-chain IDs in an isolated read model.

### Proposed Collection: `marketplace-bindings`

```ts
interface MarketplaceBinding {
  bindingId: string;
  bindingMode: 'shadow' | 'staging' | 'production-adapter';
  externalMarketplaceId: string;        // e.g. "the-signal"
  externalDealId: string;               // e.g. "SIG-DEMO-001"
  externalDealUrl?: string;
  sorobanContractAddress: string;
  sorobanDealId: number;
  network: 'testnet' | 'mainnet';
  rail: 'stellar';
  settlementAsset: {
    contractAddress: string;
    symbol: string;
    decimals: number;
  };
  participants: {
    clientWallet: string;
    providerWallet: string;
    connectorWallet: string;
    protocolWallet?: string;
  };
  milestoneMap: Array<{
    externalMilestoneId: string;
    sorobanMilestoneIdx: number;
    label?: string;
    expectedAmountStroops: string;
  }>;
  status: 'intent_created' | 'onchain_created' | 'funding' | 'active' | 'disputed' | 'completed' | 'cancelled' | 'needs_review';
  lastIndexedEventId?: string;
  lastOnchainTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Proposed Collection: `marketplace-binding-events`

```ts
interface MarketplaceBindingEvent {
  bindingId: string;
  externalDealId: string;
  sorobanDealId: number;
  sorobanMilestoneIdx?: number;
  sorobanEventTopic: 'created' | 'funded' | 'released' | 'done' | 'dispute' | 'resolved' | 'refund';
  sorobanEventId: string;
  onchainTxHash?: string;
  mappedStatus: string;
  rawEventRef: string; // escrow-transfers.sorobanEventId
  createdAt: Date;
}
```

### Adapter API Shape

These endpoints can live in the indexer/server layer for final-tranche validation:

```text
POST /api/marketplace-bindings
GET  /api/marketplace-bindings/:bindingId
GET  /api/marketplace-bindings/by-external/:externalMarketplaceId/:externalDealId
POST /api/marketplace-bindings/reconcile
GET  /api/marketplace-bindings/:bindingId/events
```

Minimum `POST /api/marketplace-bindings` request:

```json
{
  "bindingMode": "shadow",
  "externalMarketplaceId": "the-signal",
  "externalDealId": "SIG-DEMO-001",
  "sorobanDealId": 12,
  "participants": {
    "clientWallet": "G...",
    "providerWallet": "G...",
    "connectorWallet": "G..."
  },
  "milestoneMap": [
    {
      "externalMilestoneId": "SIG-DEMO-001-M1",
      "sorobanMilestoneIdx": 0,
      "label": "Audit kickoff",
      "expectedAmountStroops": "1500000000"
    }
  ]
}
```

### Reconciliation Rules

| Soroban Event | Binding Update |
|---|---|
| `created` | Mark binding `onchain_created` if `sorobanDealId` matches. |
| `funded` | Mark matching milestone funded; binding status `funding` or `active`. |
| `released` | Mark matching milestone released; record provider/connector/protocol split. |
| `done` | Mark binding `completed`. |
| `dispute` | Mark matching milestone and binding `disputed`; flag `needs_review` for ops if no resolution path exists. |
| `resolved` | Mark milestone resolved/settled; decide final status based on remaining milestones. |
| `refund` | Mark binding `cancelled` or `needs_review` depending on funded/released state. |

### Acceptance Criteria

- A reviewer can see at least one Signal-style external deal ID mapped to a Soroban deal ID.
- Mapping data lives in the isolated escrow/indexer database, not in production marketplace collections.
- Reconciliation is idempotent: running the indexer twice does not duplicate binding events.
- Dispute and refund events map into a readable status, not only raw event rows.
- README and indexer docs explicitly state the production marketplace boundary.

### Implementation Steps

1. Add TypeScript types for marketplace bindings. Status: done.
2. Add Mongo collections and indexes in `indexer/src/db.ts`. Status: done.
3. Add binding reconciliation helper that maps `escrow-transfers` events to `marketplace-binding-events`. Status: done.
4. Add protected API endpoints for creating/listing bindings and running reconciliation. Status: done.
5. Add a small fixture/seed script for `SIG-DEMO-001` and `SIG-DEMO-002`. Status: done.
6. Add dashboard read-only display for bound deals, clearly labeled `shadow binding`. Status: done.
7. Add smoke test notes to prove create -> index -> bind -> reconcile. Status: done for existing testnet event reconciliation; browser dashboard screenshot still required for final evidence package.

### Gap 1 Smoke Notes

Validation performed:

```bash
cd indexer
npm run build
DATABASE_URI=mongodb://127.0.0.1:27017/escrow-stellar-gap1-smoke \
  VITE_DEAL_ESCROW_CONTRACT=CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC \
  npm run seed:marketplace-bindings
```

Observed result:

- First seed inserted `mb_sig-demo-001` and `mb_sig-demo-002`.
- Second seed updated the same two bindings, confirming the fixture seed is idempotent.
- Live indexer smoke from `INDEXER_START_LEDGER=3250000` fetched and parsed 5 contract events for Soroban deal `51`.
- `SIG-DEMO-001` was reseeded to Soroban deal `51`.
- First reconcile inserted 5 mapped binding events.
- Repeat reconcile returned `eventsInserted: 0`, `eventsDeduped: 5`, and `bindingsUpdated: 1`.
- Final binding status: `SIG-DEMO-001` -> `active`; `SIG-DEMO-002` -> `intent_created` because it intentionally has no matching indexed events.

## Gap 2 - Environment-Driven Network Config

Goal: preserve the testnet demo while making production/staging intent explicit.

Steps:

1. Introduce network env variables for frontend RPC, Horizon, explorer, Friendbot visibility, and settlement assets. Status: done for network endpoints; settlement asset policy continues in Gap 3.
2. Default to current testnet values for reviewer demo. Status: done.
3. Hide Friendbot and demo-only pool language outside testnet mode. Status: done for Liquidity and create/swap copy.
4. Update README and `.env.example` with testnet/staging/mainnet profiles. Status: done for testnet and mainnet notes.

Acceptance criteria: no production-facing docs imply Friendbot, demo tUSDC, or seeded testnet liquidity are mainnet-ready.

## Gap 3 - Settlement Asset Policy

Goal: define which assets a marketplace can safely use.

Steps:

1. Document supported settlement assets: demo tUSDC for testnet, production USDC or approved stable assets for mainnet. Status: done as policy boundary; exact mainnet asset address still must be verified before claiming production USDC.
2. Define min amount, decimal handling, dust/rounding behavior, and trustline expectations. Status: done.
3. Add UI copy for unsupported asset/trustline states. Status: partially done; create flow now shows min amount/policy label, trustline-specific runtime detection remains future work.

Acceptance criteria: reviewers can tell exactly what is demo-only versus production asset policy.

## Gap 4 - Broker Provider Interface

Goal: keep the current Soroswap router path but make the production provider boundary explicit.

Steps:

1. Formalize `stellarBrokerClient` as the provider interface. Status: done.
2. Keep `soroswapOnchainClient` as `testnetSeededSoroswapProvider`. Status: done via provider id `testnet-soroswap-seeded`.
3. Define quote expiry, slippage, no-route, and status-polling semantics. Status: done for envs and docs; no-route/status errors remain surfaced through existing UI states.
4. Add tests or QA notes for no-route and slippage failure. Status: done with QA note; automated tests remain future work.

Acceptance criteria: the app can honestly claim a broker-style route today and a clear provider interface for production.

## Gap 5 - Near Intents Integration Adapter

Goal: implement NEAR Intents as a required, feature-flagged payment initiation
adapter for marketplace bindings without overstating escrow funding before the
Soroban `funded` event exists.

Steps:

1. Research NEAR Intents architecture and 1Click SDK. Status: done for protocol
   flow and SDK shape. The official package is
   `@defuse-protocol/one-click-sdk-typescript`; exact Stellar destination
   `assetId`, JWT provisioning, and no-testnet QA path still need confirmation.
2. Define cross-chain payment states: quote created, intent funded, routed,
   settled on Stellar, expired, failed, refunded, needs review. Status: done in
   `docs/NEAR_INTENTS_BOUNDARY.md`.
3. Store NEAR quote/intent/deposit metadata in the marketplace binding record.
   Status: done in `MarketplaceBinding.nearIntent`.
4. Add SDK-backed protected quote/status/webhook-or-poll/reconcile API
   endpoints. Status: done for token list, quote, status polling, deposit tx
   submission, and per-binding reconcile; webhook remains future work.
5. Add a frontend funding option that shows quote expiry, settlement progress,
   failed/refunded states, and "escrow funded" only after Soroban `funded`.
   Status: first pass done in `NearIntentsPanel.tsx`; live source-chain deposit
   execution and no-testnet evidence remain pending.
6. Add failure/refund behavior to QA matrix. Status: partial; docs define
   required paths and NEAR-specific unhappy paths, browser/API evidence still
   pending.

Acceptance criteria: Near Intents is no longer a bypassed or merely advisory
claim. A reviewer can request a quote, see quote/intent metadata persisted on a
marketplace binding, track status changes, and verify that escrow funding still
requires the DealEscrow `funded` event.

Validation:

- `npm run build` passed in `indexer/` after adding optional
  `externalPaymentIntent` marketplace binding metadata.
- `docs/NEAR_INTENTS_BOUNDARY.md` now documents the required SDK-first
  integration path, sourced from NEAR docs and the 1Click TypeScript SDK.
- `npm run build` passed in `indexer/` after adding the SDK-backed provider,
  metadata, envs, and protected endpoints.
- `npm run build` passed in `frontend/` after adding the NEAR Intents panel and
  browser API client.
- JWT provisioning, webhook verification if used, supported Stellar destination
  asset id, no-testnet QA approach, and refund semantics remain required before
  enabling live execution with `NEAR_INTENTS_ALLOW_LIVE=true`.

## Gap 6 - UI Unhappy-Path QA

Goal: make the dispute and failure behavior reviewable without overstating what
the browser UI ships today.

Steps:

1. Review dispute, role mismatch, insufficient balance, signing cancellation,
   timeout, and unauthorized action handling. Status: done.
2. Correct docs that implied a browser admin refund-slider UI exists. Status:
   done in `docs/DEMO_GUIDE.md`.
3. Add QA evidence checklist and demo script for final screenshots/video.
   Status: done in `docs/scf/unhappy-path-qa-2026-07-01.md`.
4. Capture browser and operator evidence. Status: pending; belongs to final
   evidence packaging.

Acceptance criteria: reviewers can see which unhappy paths are implemented in
the UI, which are contract/operator-only, and what evidence remains to capture.

## Gap 6 - UI Unhappy-Path QA

Goal: prove the UI handles non-happy paths reviewers will naturally test.

Required scenarios:

- Client files dispute on funded milestone.
- Provider files dispute on funded milestone.
- Connector tries to dispute and is denied/read-only.
- Nonparticipant sees read-only mode.
- Client lacks settlement token and is routed to Liquidity.
- User cancels signing.
- Disputed milestone shows under-review state.
- Client accepts and releases disputed milestone.
- Admin/operator resolves dispute through contract/admin path.
- Indexer/dashboard reflects `dispute`, `resolved`, and `refund` events.

Acceptance criteria: each scenario has a screenshot/video note or command proof.

## Gap 7 - Admin / Security Operations

Goal: avoid mainnet ambiguity around who can resolve disputes and operate the contract.

Steps:

1. Document admin address, rotation limitation, and recommended multisig. Status:
   done in `docs/OPERATIONS_SECURITY.md`.
2. Define dispute operator runbook. Status: done.
3. Define emergency refund criteria. Status: done.
4. Decide whether code changes are needed for admin rotation/pause. Status:
   future contract hardening; not changed in this tranche pass.

Acceptance criteria: final submission has a credible operator story, even if mainnet controls are future work.

## Gap 8 - Final Evidence Package

Goal: make the submission easy to review.

Required evidence:

- Contract ID and explorer links.
- Testnet settlement asset and seeded pool disclosure.
- `cargo test` result.
- Frontend build result.
- Indexer smoke result.
- At least one happy-path walkthrough.
- At least one dispute/unhappy-path walkthrough.
- Shadow marketplace binding walkthrough.

Status:

- Command evidence is captured in
  `docs/scf/final-tranche-evidence-2026-07-01.md`.
- Remaining evidence is browser/operator capture: unhappy-path screenshots,
  admin `resolve_dispute` proof, `/market_dashboard` shadow binding screenshot,
  and final deployed `/health` smoke.

## Current Next Action

Capture final visual/operator evidence:

1. Browser screenshots/video for client dispute, provider dispute, connector
   read-only, nonparticipant read-only, insufficient balance, and signing
   cancellation.
2. Operator/admin `resolve_dispute` transaction hash plus indexed `resolved`
   event.
3. `/market_dashboard` screenshot showing shadow marketplace bindings after
   seed/reconcile.
4. Live deployment screenshots for `/health` and `/market_dashboard`.
