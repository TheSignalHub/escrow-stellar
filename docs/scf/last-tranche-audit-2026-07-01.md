# Last Tranche Audit - 2026-07-01 05:52 HKT

Scope: full repository audit against the attached Signal Marketplace grant brief, current README/docs, smart contract, frontend, and indexer code. This document separates what is already implemented for Tranche 2 from the gaps to close for the final tranche / production readiness.

## Executive Summary

The repository is a strong Tranche 2 testnet delivery: Soroban DealEscrow exists, is documented, connected to a React frontend, has Privy and Stellar Wallets Kit wallet paths, demonstrates broker-style XLM-to-demo-settlement-token funding through a seeded Soroswap testnet route, and includes an isolated Mongo-backed event indexer plus reviewer dashboard.

The largest remaining gap is not basic escrow functionality. It is productization depth: this repo currently operates as an isolated Stellar escrow rail and read model rather than a direct writer into The Signal's production marketplace database. That isolation is acceptable and strategically preferable for final-tranche validation if it is framed as a production-safe, marketplace-compatible adapter boundary. The missing work becomes pluggable marketplace binding, production identity/KYB handoff boundaries, mainnet-grade settlement assets and liquidity routing, cross-chain Near Intents, operational controls, API contracts, QA evidence, and security/incident readiness.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-01 05:52 HKT | Last tranche readiness | Audited current repo against SCF brief and docs; documented shipped state, gaps, risks, and next work plan. | Static docs/code review. No tests run for this documentation-only audit. |
| 2026-07-01 05:52 HKT | Local agent skill | Added `.agents/skills/sva-product-stewardship/SKILL.md` for future product/schema/UI/data/API/QA behavior changes in this repo. | Skill content reviewed against user rules. |
| 2026-07-01 05:58 HKT | Documentation freshness | Updated stale frontend, architecture, demo, and event-schema wording to match the current Privy-first wallet modal, indexer-backed review stack, on-chain Soroswap demo route, and Inngest indexer schedule. | Static docs/code cross-check. No runtime behavior changed. |
| 2026-07-01 06:09 HKT | Marketplace adapter direction | Reframed marketplace binding from direct production DB integration to a production-safe, marketplace-agnostic adapter/shadow binding layer; reviewed unhappy-path dispute UI coverage. | Static docs/code review of `README.md`, frontend docs, `DealDashboard.tsx`, `useDealEscrow.ts`, contract docs, and indexer docs. |
| 2026-07-01 06:13 HKT | Final tranche execution plan | Added detailed work plan and started Gap 1 as a marketplace adapter/shadow binding spec with collections, API shape, reconciliation rules, and acceptance criteria. | Static docs/code review. No runtime behavior changed. |
| 2026-07-01 06:13 HKT | Gap 1 implementation start | Added isolated marketplace binding types, Mongo collections, reconciliation helper, and protected API endpoints in the indexer. | `npm run build` passed in `indexer/`. |
| 2026-07-01 06:20 HKT | Gap 1 fixture seed | Added idempotent indexer seed command for two sanitized Signal-style shadow bindings. | `npm run build` passed; smoke seed inserted then updated both fixtures in `escrow-stellar-gap1-smoke`. |
| 2026-07-01 06:20 HKT | Gap 1 reviewer dashboard | Added read-only marketplace binding panel to the public reviewer dashboard without exposing production marketplace writes. | `npm run build` passed. Browser smoke still required. |
| 2026-07-01 06:29 HKT | Gap 1 smoke evidence | Recorded seed/idempotence proof for shadow marketplace binding. | First seed returned `inserted`; second seed returned `updated` for both Signal-style fixtures. |
| 2026-07-01 06:29 HKT | Gap 1 API validation | Hardened marketplace binding create path to reject unknown initial status strings. | `npm run build` passed; seed smoke still returned `updated` for both fixtures. |
| 2026-07-01 09:22 HKT | Gap 1 reconcile CLI | Added `npm run reconcile:marketplace-bindings` for reviewer-friendly binding reconciliation. | `npm run build` passed; live reconcile smoke mapped 5 events. |
| 2026-07-01 09:22 HKT | Gap 1 reconcile accuracy | Reconcile now skips no-event bindings so update counts reflect actual mapped event work. | Repeat reconcile returned 0 inserted, 5 deduped, 1 binding updated. |
| 2026-07-01 09:28 HKT | Coolify demo deployment | Added redacted deployment runbook for current Coolify demo env and operations. | Static documentation update. No runtime behavior changed. |
| 2026-07-01 10:12 HKT | Gap 2 network config | Added frontend network envs, testnet defaults, dynamic explorer links, and Friendbot/testnet copy gating outside testnet. | `npm run build` passed; `VITE_STELLAR_NETWORK=mainnet npm run build` passed. |
| 2026-07-01 10:16 HKT | Gap 3 settlement asset policy | Added settlement asset policy doc and frontend envs for decimals, minimum amount, and policy label. | `npm run build` passed; mainnet policy-profile build passed. |
| 2026-07-01 10:23 HKT | Gap 4 broker provider interface | Added typed broker provider boundary with provider id, quote expiry, and slippage envs while preserving seeded Soroswap testnet adapter. | `npm run build` passed in `frontend/`. |
| 2026-07-01 10:23 HKT | Gap 4 broker QA notes | Added broker route QA note for no-route, slippage, expiry, simulation, submission, and timeout behavior. | Static docs update; build already passed. |
| 2026-07-01 10:25 HKT | Gap 5 Near Intents boundary | Documented Near Intents as an external payment initiation boundary and added optional marketplace binding metadata for cross-chain intent state. | Superseded by 10:28 HKT validation. |
| 2026-07-01 10:28 HKT | Gap 5 Near Intents validation | Confirmed Near Intents remains an external payment initiation boundary, with compile-checked optional marketplace binding metadata and no executable Near payment claim. | Superseded by 10:40 HKT required-integration direction. |
| 2026-07-01 10:29 HKT | Gap 6 unhappy-path QA | Added UI unhappy-path QA matrix and corrected the demo guide so admin dispute resolution is documented as operator/contract-level, not an existing browser slider. | Static review of frontend dispute/error code and docs. Browser evidence still pending. |
| 2026-07-01 10:31 HKT | Gap 7 admin/security operations | Added operations/security runbook covering single-admin authority, lack of rotation/pause, dispute operator flow, emergency refunds, secrets, monitoring, and production hardening backlog. | Static review of contract/admin/deployment code and docs. No runtime behavior changed. |
| 2026-07-01 10:33 HKT | Gap 8 evidence package | Added final evidence package with current test/build results, reviewer links, demo boundaries, and remaining screenshot/operator capture tasks. | `cargo test`, `indexer npm run build`, and `frontend npm run build` passed. Root `docs:check` script does not exist. |
| 2026-07-01 10:40 HKT | Gap 5 Near Intents required integration | Reopened Near Intents as mandatory final-tranche work and replaced the bypass/boundary stance with a staged adapter plan. | Static docs update using NEAR docs and NEAR sandbox 1Click interface reference; executable client still pending. |
| 2026-07-01 10:45 HKT | Gap 5 NEAR Intents SDK path | Updated the required Near Intents plan to use the official 1Click TypeScript SDK behind a local adapter. | `npm view @defuse-protocol/one-click-sdk-typescript` returned latest `0.1.25`; docs-only update. |
| 2026-07-01 12:14 HKT | Gap 5 NEAR Intents server spine | Added the SDK-backed provider wrapper, protected token/quote/status/deposit-tx/reconcile endpoints, `nearIntent` binding metadata, and env gates. | `npm run build` passed in `indexer/`. Live quote evidence still requires JWT and approved asset envs. |
| 2026-07-01 13:39 HKT | Gap 5 NEAR Intents frontend panel | Added Liquidity-tab UI for readiness, dry quote request, deposit instructions, status refresh, and explicit Soroban-funded source-of-truth messaging. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. Live tiny-amount QA still pending. |
| 2026-07-11 23:07 HKT | Payment rail boundary and next build | Clarified that Stripe Connect remains The Signal production marketplace rail and should not be implemented in this repo; next clean build is NEAR readiness/dry-quote evidence plus final QC capture. | Static review against README, architecture, workplan, submission readiness, and NEAR docs. Runtime validation pending redeploy and NEAR envs. |

## What Is Shipped

### Smart Contract

- `contracts/deal_escrow/src/lib.rs` implements `initialize`, `create_deal`, `deposit`, `release_milestone`, `dispute`, `resolve_dispute`, `refund`, `get_deal`, `get_deal_count`, and `get_reputation`.
- Milestone escrow and atomic provider / connector / protocol payout split are implemented on-chain.
- Client authorization protects creation, deposit, and release; client or provider can dispute; admin resolves or refunds.
- Contract events cover created, funded, released, done, dispute, resolved, and refund.
- Contract tests and snapshots exist for happy path, multi-milestone flow, reputation, dispute, refund, auth, double deposit, release-unfunded, deal count, and variable connector share.

### Frontend

- `frontend` is a React 19 + TypeScript + Vite app.
- Privy embedded Stellar wallet path exists, with Stellar Wallets Kit fallback.
- UI covers connection, liquidity/funding, deal creation, deal lifecycle, dispute actions, and reputation lookup.
- `frontend/src/components/ui/Components.tsx` and `Branding.tsx` provide reusable UI primitives.
- Broker-style funding is exposed, but currently through a Soroswap on-chain testnet adapter.

### Indexer / Data Product

- `indexer` reads Soroban RPC events, parses DealEscrow topics, dedupes by event id, and writes an isolated Mongo read model.
- `/market_dashboard` is public/read-only for reviewer visibility.
- `/admin` and manual indexer controls are protected by basic admin credentials.
- Inngest endpoint support exists for scheduled sync.

### Documentation

- README and docs are clear about Tranche 2 positioning.
- Docs explicitly warn that the settlement token is demo-only test USDC, not production Circle USDC.
- D5 smoke test procedure exists for isolated indexer verification.

## Gap Analysis

### P0 - Final Tranche Blockers

1. Pluggable marketplace binding is implemented as a shadow adapter, but not as
   direct production marketplace writes.
   This was intentionally solved without writing into the current production
   marketplace database. The safer and more valuable direction is the
   marketplace-agnostic binding layer now present in the indexer/server: it maps
   external marketplace records to Soroban escrow IDs, supports sanitized
   Signal-style fixtures, reconciles DealEscrow events into binding events, and
   exposes read-only dashboard evidence. Remaining work is browser screenshot
   evidence and a stable external API contract if another marketplace plugs in.

2. Mainnet/payment asset readiness is incomplete.
   `frontend/src/lib/stellar.ts` now supports env-driven network RPC, Horizon, explorer, and Friendbot configuration with testnet defaults. The remaining gap is production asset policy: the settlement token defaults to demo `tUSDC`, and docs correctly warn it is not Circle-issued USDC. Final tranche still needs production USDC/asset configuration, allowlists, and trustline/dust policy.

3. Stellar Broker is represented by an adapter, not a production broker integration.
   The current `stellarBrokerClient` delegates to `soroswapOnchainClient`. This proves the flow, but final tranche needs the real broker/aggregator contract or API contract, route failure handling, quote expiry semantics, asset allowlists, and production liquidity assumptions.

4. Near Intents is now a required integration gap, not an acceptable bypass.
   The attached brief includes Near Intents for cross-chain payment initiation. This repo now includes the 1Click SDK dependency, a feature-flagged provider wrapper, protected quote/status/deposit-tx/reconcile APIs, persisted `nearIntent` metadata on marketplace bindings, and a Liquidity-tab readiness/dry-quote/status panel. Remaining gaps are JWT provisioning, live Stellar asset validation, source-chain wallet execution, no-testnet tiny-amount QA evidence, webhook support if needed, and refund/support execution.

5. Stripe/payment rail boundary must remain explicit.
   Stripe Connect is not integrated in this repository and should not be added
   for the final-tranche build. It remains The Signal production marketplace's
   fiat rail. This repo owns the Stellar/Soroban escrow rail, shadow binding
   adapter, and staged NEAR Intents payment-initiation metadata. The reviewer
   package must not claim Stripe payment support, Stripe refunds, or automatic
   Stripe-to-Soroban deposits. See `docs/PAYMENT_RAIL_BOUNDARY.md`.

6. Production authorization and admin governance need hardening.
   The contract has a single stored admin address and no admin rotation, pause, or role separation. `docs/OPERATIONS_SECURITY.md` now documents the current single-admin model, dispute operator flow, emergency refund criteria, secrets handling, monitoring, and production hardening backlog. Mainnet use still needs multisig/governance admin and likely contract-level rotation/pause/versioning controls.

7. API readiness contract is missing.
   There is no stable API spec for external marketplaces to create escrow intents, map their own deal IDs to Soroban deal IDs, ingest event updates, reconcile payment state, or expose provider/connector payout status.

### Product Direction - Marketplace-Agnostic Escrow Rail

The stronger long-term direction is to make this repo a reusable Stellar escrow rail for marketplaces, with The Signal as the reference implementation rather than the only integration target.

Recommended positioning:

```text
The Signal keeps its production marketplace workflow isolated from settlement
risk. This repository provides the reusable Stellar escrow rail: wallet
funding, Soroban deal creation, milestone settlement, dispute events, payout
splits, event indexing, and marketplace-compatible reconciliation. Final
tranche validation uses a shadow binding layer with sanitized Signal-style deal
records to prove how any marketplace can map external deal records to Soroban
escrow state without mutating production marketplace collections.
```

This turns the current isolation into an asset: production systems are protected, reviewers can still verify the integration path, and the final product is broader than one marketplace.

### UI Unhappy-Path Coverage

Current frontend coverage is stronger than the happy path only, but it is not complete for all operator scenarios.

Covered in `DealDashboard.tsx` and `useDealEscrow.ts`:

- Role-aware action states: client can fund/release/dispute, provider can dispute funded milestones, connector is read-only for lifecycle actions, and non-participants are read-only.
- Balance failure on configured settlement-token deposits shows a contextual error and a `Fund Wallet` path back to the Liquidity tab.
- Transaction failures display contextual error cards, toasts, role context, suggested next steps, and a refresh action.
- Dispute filing has a confirmation modal and sends the on-chain `dispute` call.
- Disputed milestones show an "Under review" state.
- Client can choose "Accept & Release to Provider" on a disputed milestone, which is a useful settlement override path.
- Contract-level error mapping exists for unauthorized actions, wrong milestone states, missing deals, invalid splits, insufficient balance, transaction timeout, and rejected transactions.

Still incomplete / should be clarified for final tranche:

- Admin/operator dispute split resolution is implemented in the contract and hook, but not exposed as a complete React dashboard flow. The frontend currently points to The Signal/operator handling rather than providing an admin slider.
- `docs/scf/unhappy-path-qa-2026-07-01.md` now tracks the required browser/operator evidence for dispute, role mismatch, insufficient balance, signing cancellation, NEAR provider failure/refund/mismatch states, and indexer reflection.
- The `frontend/README.md` previously described an arbiter address set at deal creation; the contract actually uses a global admin set during initialization. This was corrected in the docs.
- Event ledger metadata is local-only, so dispute/release UI history can be lost across devices or browsers.
- There is no dedicated QA evidence for wrong-wallet dispute attempts, connector dispute denial, provider dispute success, disputed milestone release override, admin resolution, or indexer/dashboard reflection of dispute/resolved/refund events.
- The contract marks dispute resolutions as `Refunded` even when part of the funds go to the provider; final tranche should define clearer product language for `Resolved`, partial refund, cancelled, and completed-with-dispute outcomes.

### P1 - High Priority Gaps

1. Deal metadata is local-only.
   Milestone names and event ledger metadata live in `localStorage` via `dealMetadata.ts`, so they are not portable across devices, wallets, or production support workflows.

2. Indexer cursor and retention strategy need production recovery.
   Docs acknowledge Soroban Testnet RPC event retention. Production needs replay/backfill strategy, monitoring, alerting, checkpoint migration, and dead-letter handling.

3. Contract lifecycle semantics need product review.
   `resolve_dispute` sets the milestone to `Refunded` even when a portion goes to provider, and a deal can become `Cancelled` when no active milestones remain after a dispute resolution. That may be acceptable for the demo, but final tranche should define product language for partial settlement, cancelled, resolved, and completed states.

4. Contract storage rent / TTL plan is not implemented.
   Docs mention storage rent as a mainnet concern. The contract does not expose TTL extension, archival recovery, or rent reserve handling.

5. Fee and rounding policy needs production signoff.
   Split math is deterministic, but final tranche should document rounding behavior, minimum amounts, dust handling, and fee policy across assets.

6. Wallet UX needs production unsupported-state handling.
   Privy and SWK paths exist, but production needs explicit handling for wrong network, unsupported wallet, missing trustline/asset, pending wallet creation, failed OAuth, and account funding without Friendbot.

7. Security review evidence is missing.
   There is no audit report, threat model, invariant/property tests, fuzzing, or mainnet deployment checklist in this repo.

8. Deployment/ops docs are now partially covered for final tranche.
   `docs/COOLIFY_DEMO_DEPLOYMENT.md` covers redacted demo deployment env and `docs/OPERATIONS_SECURITY.md` covers secrets, monitoring, admin, and incident posture. Rollback automation, uptime alerting, and production incident tooling remain future work.

### P2 - Polish / Cleanup

1. Generated local folders exist in the working tree.
   `node_modules`, `dist`, `build`, and `target` are ignored and not tracked, so they are local noise rather than a repository publication issue. Keep them out of review diffs.

2. README still frames the repo as a demo.
   This is accurate today. Once final tranche production work lands, update positioning to distinguish deployed demo, staging integration, and production rail.

3. Frontend docs previously overemphasized `soroswap.ts` public aggregator behavior while the active broker client uses `soroswapOnchain.ts`.
   Resolved in the 2026-07-01 05:58 HKT docs freshness update; keep future docs clear that the public aggregator check is informational and the executable demo route calls the seeded on-chain router path.

4. UX copy should reduce "Deploy Contract" ambiguity.
   The tab creates a deal, not a new contract deployment. For production users, "Create Deal" or "New Escrow" would be clearer.

## Expected Final Tranche Work

1. Define the production integration contract.
   Add docs/API spec for external marketplace deal ID to Soroban deal ID mapping, escrow intent creation, event ingestion, reconciliation, and payout status. Use a shadow binding layer for validation instead of writing to The Signal production collections.

2. Add environment-driven network configuration.
   Replace hardcoded testnet constants with safe config for testnet/staging/mainnet, including explorer URLs, RPC/Horizon URLs, settlement assets, and feature flags.

3. Implement production settlement asset policy.
   Configure Circle USDC or approved Stellar assets, asset allowlists, trustline guidance, and minimum amount/dust rules.

4. Replace the broker demo adapter or clearly wrap it behind a production provider interface.
   Keep the existing Soroswap testnet adapter for demos, but add a real broker provider path and route/quote lifecycle semantics.

5. Implement NEAR Intents as a required SDK-backed staged adapter.
   Cross-chain payment initiation, quote creation, deposit submission, status polling/webhooks, failure/refund behavior, and frontend steps are now partially implemented behind a feature flag using `@defuse-protocol/one-click-sdk-typescript`. The app must still claim escrow funding only after Soroban `funded` is indexed. Remaining work is live execution credentials, approved Stellar asset id, source-chain wallet execution, and no-testnet evidence.

6. Add marketplace adapter/shadow binding support.
   Add mapping from Soroban events to external deal/milestone records through a safe adapter model, with idempotent updates and reconciliation reports. For final-tranche validation, use sanitized Signal-style fixtures or an isolated shadow collection.

7. Harden contract/admin operations.
   Decide whether to add admin rotation, pause/emergency controls, multisig admin deployment, TTL extension, and clearer dispute-resolution states.

8. Produce QA and security evidence.
   Add final tranche QA checklist, screenshots/video script, contract test results, frontend build/lint evidence, indexer smoke evidence, and security review notes.

9. Preserve the Stripe boundary.
   Do not add Stripe Connect to this repo for grant submission. If Stripe-backed
   marketplace payments need to trigger Stellar escrow in a later product, build
   that as an external marketplace adapter with explicit idempotency,
   reconciliation, and ownership boundaries.

## Recommended Validation Matrix

| Area | Minimum Final Tranche Evidence |
|---|---|
| Contract | `cargo test`, optimized WASM hash, deployment transaction, admin address policy, storage/TTL plan |
| Frontend | `npm run build`, wallet connect tests, wrong-network tests, asset/trustline tests, mobile screenshots |
| UI unhappy paths | Dispute filed by client/provider, connector dispute denied, nonparticipant read-only, insufficient balance, cancelled signing, disputed milestone release override, admin/operator resolution evidence |
| Broker | Quote expiry test, no-route test, slippage test, production asset route test |
| Near Intents | SDK-backed integration plan, quote/status/deposit adapter, frontend readiness/dry quote/status panel, persisted quote/intent/deposit metadata, timeout/refund/failure state mapping, Stellar asset id validation, no-testnet QA path, and proof that escrow funding still depends on Soroban `funded` |
| Indexer | Fresh event sync, dedupe, replay/backfill, shadow marketplace mapping, dashboard/API state match |
| API | Request/response examples, idempotency keys, auth model, webhook signature verification |
| Ops | Env var checklist, secret rotation, monitoring, alerting, rollback, incident response |

## Immediate Next Steps

1. Redeploy the latest server build and confirm `/api/near-intents/readiness`
   returns JSON, not the frontend fallback HTML.
2. Configure server-only NEAR envs, run token discovery, and capture a dry quote
   against `mb_sig-demo-001` with persisted binding metadata.
3. Capture browser screenshots/video for the unhappy-path QA matrix.
4. Capture an operator/admin `resolve_dispute` transaction and indexed
   `resolved` event.
5. Capture `/market_dashboard` after shadow binding seed/reconcile.
6. Run final deployment smoke on Coolify: `/health`, `/market_dashboard`,
   `/api/near-intents/readiness`, and protected indexer tick.
7. Rotate any live secrets that were pasted into chat or screenshots before
   treating the deployment as production-grade.
