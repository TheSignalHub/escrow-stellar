# Submission Readiness - 2026-07-02

Scope: final reviewer-facing gate for submitting the Stellar escrow rail package
without overstating demo, testnet, marketplace, or NEAR Intents readiness.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-02 04:23 HKT | Submission readiness gate | Added a single reviewer-facing submission checklist covering upload order, safe claims, do-not-claim boundaries, validation results, deployment checks, and final blockers. | `cargo test` passed; `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. Docs check still unavailable at root. |
| 2026-07-02 04:25 HKT | Live deploy smoke | Recorded current deployed endpoint smoke results and marked NEAR readiness as pending redeploy because the live domain still serves the previous frontend fallback for `/api/near-intents/readiness`. | `/health` passed; `/market_dashboard` returned 200; `/api/near-intents/readiness` returned frontend HTML and must be rechecked after Coolify redeploy. |
| 2026-07-11 23:07 HKT | Payment boundary and next QC flow | Added Stripe/payment-rail boundary to the submission package and defined the next clean QC build as NEAR readiness/dry-quote evidence plus final unhappy-path and dashboard capture. | Static documentation update. Runtime validation still required after redeploy, NEAR env configuration, and secret rotation. |
| 2026-07-13 14:54 HKT | Live QC execution | Re-ran local validation and public deployment smoke for the next clean QC flow. Confirmed the NEAR readiness route now returns JSON, but NEAR is disabled and missing JWT, Stellar destination asset, and refund envs, so dry quote/token discovery remains blocked until server-only envs are configured. | `cargo test` passed; `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`; `/health` returned ok; `/api/near-intents/readiness` returned JSON with `enabled:false`; `/market_dashboard` returned HTTP 200; `/api/market-dashboard/summary` showed indexer enabled, last tick ok, 16 total events, and no live marketplace bindings. |
| 2026-07-13 15:04 HKT | Backend readiness smoke script | Added `indexer` smoke command for health, NEAR readiness, dashboard/indexer summary, dispute evidence, shadow bindings, optional protected token discovery, optional dry quote, and optional protected indexer tick before starting frontend QA. | `npm run build` passed in `indexer/`; `BACKEND_BASE_URL=https://stellar.thesignal.directory npm run smoke:backend` passed in non-strict mode and reported health/indexer/dispute evidence passing, with NEAR envs and shadow bindings blocked. |

## Submit Status

Status: conditionally ready to submit as a **testnet final-tranche package**
after final deploy smoke and secret rotation.

This repo can be submitted as a reusable Stellar escrow rail with:

- deployed Soroban DealEscrow contract on Stellar Testnet
- React frontend for wallet connection, deal creation, funding, release,
  dispute, and reputation lookup
- seeded Soroswap testnet broker-style route for XLM -> demo test USDC
- isolated indexer and public reviewer dashboard
- shadow marketplace binding layer that does not mutate The Signal production
  marketplace database
- SDK-backed NEAR Intents server adapter and Liquidity-tab readiness/dry
  quote/status UI
- explicit payment rail boundary documenting that Stripe remains The Signal's
  production marketplace fiat rail and is not implemented in this repo
- operations, deployment, settlement asset, unhappy-path, and evidence docs

## Safe Submission Claims

Use this wording:

```text
The submission demonstrates a complete Stellar Testnet escrow rail for B2B
marketplace deals: milestone escrow, atomic provider/connector/protocol splits,
dispute and admin resolution paths, on-chain reputation, event indexing, a
reviewer dashboard, shadow marketplace bindings, and a feature-flagged NEAR
Intents adapter with SDK-backed quote/status APIs plus frontend readiness and
dry-quote UI.
```

Use this Stripe/payment boundary wording:

```text
Stripe Connect is intentionally not implemented inside the Stellar escrow
repository. Stripe remains The Signal production marketplace's fiat rail. This
repo implements the on-chain Stellar escrow rail and marketplace-compatible
binding layer that external marketplaces can plug into.
```

Use this NEAR wording:

```text
NEAR Intents is implemented as a required staged adapter. The code includes the
official 1Click SDK, server-side token/quote/status/deposit/reconcile endpoints,
binding metadata persistence, and a frontend panel. Live NEAR execution remains
disabled until JWT provisioning, exact Stellar assetId validation, refund path,
and tiny live-amount no-testnet evidence are complete. Escrow funding is still
recognized only after the Stellar DealEscrow `funded` event.
```

## Do Not Claim

Do not claim:

- production mainnet deployment
- production Circle USDC settlement
- direct writes into The Signal production marketplace collections
- Stripe Connect integration in this repository
- automatic Stripe-to-Soroban escrow deposits or Stripe refund reconciliation
- live executable NEAR payment support
- NEAR status as escrow-funded proof
- browser admin refund-slider UI
- completed independent security audit

These are documented boundaries, not hidden gaps.

## Upload Order

1. `README.md`
2. `docs/scf/submission-readiness-2026-07-02.md`
3. `docs/scf/final-tranche-evidence-2026-07-01.md`
4. `docs/scf/last-tranche-audit-2026-07-01.md`
5. `docs/scf/final-tranche-workplan-2026-07-01.md`
6. `docs/DEMO_GUIDE.md`
7. `docs/EVENT_SCHEMA.md`
8. `docs/SETTLEMENT_ASSET_POLICY.md`
9. `docs/NEAR_INTENTS_BOUNDARY.md`
10. `docs/PAYMENT_RAIL_BOUNDARY.md`
11. `docs/OPERATIONS_SECURITY.md`
12. `docs/COOLIFY_DEMO_DEPLOYMENT.md`

## Reviewer Links

```text
Frontend:             https://stellar.thesignal.directory
Event dashboard:      https://stellar.thesignal.directory/market_dashboard
Internal admin:       https://stellar.thesignal.directory/admin
Contract explorer:    https://stellar.expert/explorer/testnet/contract/CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC
```

## Current Validation

| Area | Command | Result |
|---|---|---|
| Contract | `cargo test` in `contracts/deal_escrow/` | Passed: 10 tests, 0 failed. Existing 13 unused-variable warnings in tests. |
| Frontend | `npm run build` in `frontend/` | Passed. Existing Vite warning for chunks larger than 500 kB. |
| Indexer | `npm run build` in `indexer/` | Passed. TypeScript compile succeeded. |
| Docs check | `npm run docs:check` at repo root | Not available: root package has no `docs:check` script. Use manual doc consistency scan. |

## Final Deploy Smoke Before Submit

Run these after the Coolify deployment is updated:

```bash
curl https://stellar.thesignal.directory/health
curl https://stellar.thesignal.directory/api/near-intents/readiness
curl https://stellar.thesignal.directory/market_dashboard
```

Expected:

- `/health` returns `ok: true` and the testnet contract id.
- `/api/near-intents/readiness` returns non-secret NEAR readiness booleans.
- `/market_dashboard` loads without requiring auth.

Current live smoke on 2026-07-13 14:54 HKT:

| Endpoint | Result | Submission Meaning |
|---|---|---|
| `/health` | Passed with `ok: true`, `network: testnet`, and the expected contract id. | Live backend is reachable. |
| `/market_dashboard` | HTTP 200. | Reviewer dashboard is reachable. |
| `/api/near-intents/readiness` | Returned JSON: `enabled:false`, `liveExecutionEnabled:false`, JWT false, Stellar destination asset false, default refund account false. | NEAR route is deployed, but NEAR dry quote/token discovery evidence is blocked until server-only envs are configured. |
| `/api/market-dashboard/summary` | Returned indexer `enabled:true`, `lastTickStatus:"ok"`, `totalEventsProcessed:16`, counts including `created`, `funded`, `released`, and `dispute`; `marketplaceBindings:[]`. | Event dashboard has live indexed escrow evidence, but shadow binding seed/reconcile evidence is not present on the deployed dashboard yet. |

Then sign in to `/admin` and run one protected indexer tick, or call:

```bash
curl -u "$ADMIN_USERNAME:$ADMIN_PASSWORD" \
  -X POST https://stellar.thesignal.directory/api/indexer/run-once
```

## Next Clean QC Flow

Run this as the next reviewer-focused build, before adding any new product
surface:

0. Run the backend readiness smoke from `indexer/`:

   ```bash
   BACKEND_BASE_URL=https://stellar.thesignal.directory npm run smoke:backend
   ```

   Use `--strict`, `--tokens`, `--quote`, and `--run-indexer` only when admin
   credentials and NEAR server-only envs are configured.

1. Redeploy the latest server image from the current main branch. Status:
   complete as of 2026-07-13; the NEAR readiness route is live.
2. Verify `/api/near-intents/readiness` returns JSON. Status: complete.
3. Set server-only NEAR envs for readiness/dry quote. Keep
   `NEAR_INTENTS_ALLOW_LIVE=false` unless a tiny live QA window is approved.
   Status: pending; current live readiness reports JWT, Stellar destination
   asset, and default refund account missing.
4. Run protected token discovery and record the validated Stellar destination
   asset id. Status: blocked until NEAR envs and admin session are ready.
5. Run one dry quote against `mb_sig-demo-001` and confirm quote metadata is
   stored on the marketplace binding. Status: blocked until NEAR envs and
   shadow binding are present on the deployed database.
6. Capture Liquidity-tab NEAR readiness/dry-quote/status UI.
   Status: readiness disabled-state can be captured now; dry-quote capture
   remains blocked.
7. Capture unhappy-path screenshots for dispute, role denial, insufficient
   balance, signing cancellation, and NEAR provider failure/disabled states.
8. Capture `/market_dashboard` with shadow bindings and an indexed event.
   Status: indexed events are live; shadow bindings are not currently present
   in the public dashboard summary.
9. Run the validation matrix below again and update timestamps. Status:
   complete for contract/frontend/indexer builds on 2026-07-13.

Do not add Stripe code for this QC pass. Stripe belongs to the external
marketplace rail and is covered by `docs/PAYMENT_RAIL_BOUNDARY.md`.

## Secret Rotation Gate

Secrets pasted outside Coolify should be treated as exposed. Rotate before
relying on the deployment beyond temporary review:

- MongoDB Atlas password
- Soroswap API key
- Inngest event key
- Inngest signing key
- Payload secret
- admin password

The `VITE_*` values are public frontend config and do not need secret handling.

## Remaining Evidence

These are acceptable to list as remaining evidence if submission timing is tight:

| Evidence | Status |
|---|---|
| Browser screenshots/video for dispute, role mismatch, insufficient balance, and signing cancellation | Pending capture |
| Operator/admin `resolve_dispute` transaction hash and indexed `resolved` event | Pending capture |
| `/market_dashboard` screenshot with shadow marketplace bindings | Pending; live summary currently has indexed events but `marketplaceBindings:[]` |
| NEAR readiness JSON | Complete for route deployment; current readiness shows disabled/missing JWT, asset, and refund envs |
| NEAR dry quote/token discovery proof | Pending NEAR server-only envs and protected admin session |
| Live NEAR tiny-amount quote/deposit/status proof | Pending JWT, assetId, refund path, and explicit live QA window |

## Submit Decision

Submit if:

- latest Coolify deploy smoke passes
- `/api/near-intents/readiness` returns JSON, not the frontend fallback HTML
- secrets are rotated or the deployment is explicitly marked temporary demo
- README and this submission gate are included
- NEAR is described as required staged integration, not skipped and not live
  production payment support

Do not wait for mainnet production hardening to submit this testnet tranche.
