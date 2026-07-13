# Final Tranche Evidence Package - 2026-07-01

Scope: reviewer-facing evidence index for the final-tranche readiness pass.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-01 10:33 HKT | Gap 8 evidence package | Added final evidence index with current build/test results, shipped artifacts, demo boundaries, and remaining capture tasks. | `cargo test` passed in `contracts/deal_escrow`; `npm run build` passed in `indexer/`; `npm run build` passed in `frontend/` with existing Vite chunk-size warning. |
| 2026-07-01 12:14 HKT | NEAR Intents server spine | Added SDK-backed protected token/quote/status/deposit-tx/reconcile endpoints and binding metadata persistence. | `npm run build` passed in `indexer/`. Live quote/status evidence still requires JWT and approved Stellar asset envs. |
| 2026-07-01 13:39 HKT | NEAR Intents frontend panel | Added Liquidity-tab UI for readiness, dry quote request, deposit instructions, provider status refresh, and Soroban-funded warning. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. Live execution evidence still pending. |
| 2026-07-02 04:23 HKT | Submission readiness refresh | Added a dedicated submission-readiness gate with upload order, safe claims, do-not-claim boundaries, deploy smoke, and secret rotation checklist. | `cargo test` passed; `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-02 04:25 HKT | Live endpoint smoke | Checked deployed `/health`, `/market_dashboard`, and `/api/near-intents/readiness`. | `/health` passed; `/market_dashboard` returned 200; `/api/near-intents/readiness` returned frontend HTML, so the new NEAR readiness route still requires Coolify redeploy before live submission claim. |
| 2026-07-13 14:54 HKT | Live QC refresh | Re-ran the final validation matrix and public live endpoint smoke. | `cargo test` passed with 10 tests and existing warnings; `npm run build` passed in `frontend/` with existing chunk-size warning; `npm run build` passed in `indexer/`; `/health` passed; `/market_dashboard` returned 200; `/api/near-intents/readiness` returned JSON with NEAR disabled and missing JWT, Stellar destination asset, and refund envs; `/api/market-dashboard/summary` showed 16 indexed events and no live marketplace bindings. |
| 2026-07-13 15:04 HKT | Backend readiness smoke command | Added and ran `npm run smoke:backend` from `indexer/` against the live deployment. | Smoke passed in non-strict mode: health, readiness route, live-execution disabled gate, indexer state, indexed events, and dispute evidence passed; NEAR enabled/env config and shadow bindings were reported as blocked; protected checks were skipped without admin credentials. |

## Reviewer Links

```text
Frontend:             https://stellar.thesignal.directory
Event dashboard:      https://stellar.thesignal.directory/market_dashboard
Internal admin:       https://stellar.thesignal.directory/admin
Contract explorer:    https://stellar.expert/explorer/testnet/contract/CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC
```

## Current Testnet Configuration

```text
DealEscrow:        CASW4L3WIFJDL2ZOBKBEMO6GV5O34DRBURRUF2EPRFFIQLJHZMSUK7IC
test USDC:         CAHJQG77XDPFZAC7JJSRGAVYWKGEUDWOQ5O33VK4VTR2ZKOBCZAIVLFX
XLM SAC:           CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
Soroswap router:   CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD
Seeded pool:       CA4ASYDOCOJXZFB3H7O6QJ5PTDAMXORCRZN5HNE3KI7TBGS5PGR53XZ5
```

The settlement token is demo-only test USDC on Stellar Testnet, not production
Circle USDC.

## Fresh Validation

| Area | Command | Result |
|---|---|---|
| Contract | `cargo test` in `contracts/deal_escrow/` | Passed: 10 tests, 0 failed. Existing 13 unused-variable warnings in tests. |
| Indexer | `npm run build` in `indexer/` | Passed: TypeScript compile succeeded. |
| Backend smoke | `BACKEND_BASE_URL=https://stellar.thesignal.directory npm run smoke:backend` in `indexer/` | Passed in non-strict mode. Reported current blockers: NEAR disabled/missing envs and no live shadow bindings. |
| Frontend | `npm run build` in `frontend/` | Passed: TypeScript/Vite build succeeded. Existing Vite warning for chunks larger than 500 kB. |
| Docs check | `npm run docs:check` at repo root | Not available: root package has no `docs:check` script. Manual consistency scan performed. |

Latest refresh on 2026-07-13 14:54 HKT repeated the contract, frontend, and
indexer validations with the same results. The frontend build still emits the
known Vite chunk-size warning; no new runtime errors were observed.

## Live Smoke - 2026-07-13 14:54 HKT

| Endpoint | Result | Evidence Meaning |
|---|---|---|
| `/health` | JSON returned `ok:true`, `service:"escrow-stellar-indexer"`, `network:"testnet"`, and the expected contract id. | Live backend and contract configuration are reachable. |
| `/api/near-intents/readiness` | JSON returned `enabled:false`, `liveExecutionEnabled:false`, API base `https://1click.chaindefuser.com`, JWT false, Stellar destination asset false, default refund account false. | The NEAR readiness route is deployed; dry quote/token discovery is blocked until server-only NEAR envs are configured. |
| `/market_dashboard` | HTTP 200 with HTML response. | Public reviewer dashboard is reachable. |
| `/api/market-dashboard/summary` | JSON returned indexer `enabled:true`, `lastTickStatus:"ok"`, `totalEventsProcessed:16`, topic counts for `created`, `funded`, `released`, and `dispute`, and `marketplaceBindings:[]`. | Live indexer evidence exists, including dispute event coverage; shadow binding seed/reconcile evidence still needs to be run on the deployed database. |

## Implemented Evidence

| Deliverable / Gap | Evidence |
|---|---|
| Soroban escrow lifecycle | Contract tests cover happy path, multi-milestone flow, dispute/resolve, refund, auth, double deposit, release-unfunded, reputation, and deal count. |
| Event schema / indexer | `docs/EVENT_SCHEMA.md`, indexer build, `/market_dashboard`, and Gap 1 reconcile smoke notes. |
| Marketplace binding | Shadow binding collection/API/CLI, idempotent seed, reconcile CLI, dashboard panel, and docs in `indexer/README.md`. |
| Network config | Env-driven frontend Stellar network config, mainnet build smoke recorded in workplan/audit. |
| Settlement asset policy | `docs/SETTLEMENT_ASSET_POLICY.md` and frontend create-flow min/policy display. |
| Broker provider boundary | `frontend/src/lib/stellarBroker.ts`, broker envs, seeded Soroswap adapter, and `docs/scf/broker-route-qa-2026-07-01.md`. |
| Near Intents | SDK dependency, `nearIntentsProvider`, public readiness endpoint, protected token/quote/status/deposit-tx/reconcile endpoints, `nearIntent` binding metadata, `NearIntentsPanel`, browser client, env gates, and source-of-truth rules. Live readiness JSON is now confirmed; live token discovery and dry quote evidence are still pending NEAR envs and admin session. |
| Backend readiness | `indexer/src/backend-readiness-smoke.ts` plus `npm run smoke:backend` checks health, NEAR readiness, indexer summary, dispute evidence, shadow bindings, optional protected token discovery, optional dry quote, and optional protected indexer tick before frontend QA. |
| UI unhappy paths | `docs/scf/unhappy-path-qa-2026-07-01.md` documents current coverage and remaining screenshot/operator evidence. |
| Operations/security | `docs/OPERATIONS_SECURITY.md` documents single-admin authority, dispute operator flow, emergency refunds, secrets, monitoring, and production hardening gaps. |
| Coolify deployment | `docs/COOLIFY_DEMO_DEPLOYMENT.md` documents redacted env shape and deployment checks. |

## Boundary Statements

- This is a Stellar Testnet demo and reusable escrow rail, not a production
  mainnet deployment.
- The indexer database is an isolated read model; it does not mutate The Signal
  production marketplace collections.
- Shadow marketplace bindings prove adapter compatibility without polluting the
  live marketplace.
- Near Intents is required for the final tranche, and current evidence includes
  an SDK-backed server/API spine plus frontend readiness, dry quote, deposit
  instruction, and status UI. The app should not claim end-user executable live
  NEAR payment support until JWT provisioning, Stellar asset id validation,
  source-chain wallet execution, no-testnet QA path, and live tiny-amount
  evidence are completed.
- Admin dispute split resolution is contract/operator-level today; the browser
  demo does not expose an admin refund-slider UI.
- `VITE_*` values are public frontend configuration. Live server secrets must
  stay in Coolify or a secrets manager and should be rotated if exposed.

## Remaining Capture Tasks

| Evidence | Status |
|---|---|
| Browser screenshots/video for client dispute, provider dispute, connector read-only, nonparticipant read-only, insufficient balance, and signing cancellation | Pending |
| Admin/operator `resolve_dispute` transaction hash and indexed `resolved` event | Pending |
| `/market_dashboard` screenshot showing shadow marketplace bindings after seed/reconcile | Pending |
| Live deployment `/health` and `/market_dashboard` screenshots after final deploy | API smoke complete; screenshots still pending |
| Live deployment `/api/near-intents/readiness` JSON after redeploy | Complete for route deployment; current readiness shows NEAR disabled and missing JWT, Stellar asset, and refund envs |
| Protected NEAR token discovery and dry quote against `mb_sig-demo-001` | Pending NEAR env configuration and admin session |
| Optional optimized WASM hash / deployment transaction proof for the exact final contract artifact | Pending |

## Suggested Submission Order

1. Root `README.md`.
2. `docs/scf/submission-readiness-2026-07-02.md`.
3. `docs/scf/last-tranche-audit-2026-07-01.md`.
4. `docs/scf/final-tranche-workplan-2026-07-01.md`.
5. This evidence package.
6. `docs/DEMO_GUIDE.md`.
7. `docs/EVENT_SCHEMA.md`.
8. `docs/SETTLEMENT_ASSET_POLICY.md`, `docs/NEAR_INTENTS_BOUNDARY.md`, and
   `docs/OPERATIONS_SECURITY.md`.
