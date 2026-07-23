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
| 2026-07-21 15:09 BST | Hardened contract release-candidate smoke | Deployed hardened DealEscrow to Stellar Testnet, initialized it, and ran on-chain lifecycle/dispute smoke using tiny XLM milestones. | Contract `CD6RMOJUTNMHC6D6ODS4IJPCLZNUSH6BE6IRK2CZI47AVOCFJ7QRIRWJ`; WASM hash `c11baff93cd032889e952961b8bcdad9daffb6d0c4a87dfd845cee384b997722`; create/deposit/release/provider-win/client-refund/partial-settlement passed. |
| 2026-07-21 15:57 BST | Live backend smoke after RC env switch | Ran deployed backend smoke and direct health/dashboard/readiness checks against `https://stellar.thesignal.directory`. | Public checks passed. `/health` reports RC contract `CD6RMOJUTNMHC6D6ODS4IJPCLZNUSH6BE6IRK2CZI47AVOCFJ7QRIRWJ`; dashboard summary indexes 17 RC events including 3 disputes and 3 resolved events; NEAR readiness is enabled/configured with live execution disabled. Shadow bindings remain empty until seed/reconcile is run on the deployed DB. |
| 2026-07-21 16:01 BST | Live shadow binding reconciliation | Seeded two shadow marketplace bindings into the deployed demo DB and reconciled them against indexed RC events. | Seed returned two updated bindings; reconcile checked 2 bindings, scanned 9 events, inserted 9 binding-event rows, and updated 2 bindings. Live smoke then passed shadow bindings, protected binding lookup, binding event lookup, and NEAR token discovery. |
| 2026-07-21 16:34 BST | Cross-chain funding public UX cleanup | Reworked the Liquidity-tab NEAR flow into **Pay from another chain** so reviewers see source asset, settlement asset, quote, payment instructions, and payment status without binding ids, raw asset ids, JWT/readiness internals, refund fallback envs, dry-quote labels, or smoke/admin language. | `npm run build` passed in `frontend/`. Backend/API behavior unchanged; Soroban `funded` event remains the escrow funding source of truth. |
| 2026-07-23 14:50 BST | Full-deal funding release candidate | Added `fund_deal`, updated refund status handling for released + refunded deals, deployed the new contract to Stellar Testnet, and initialized it. | `cargo test` passed with 16 tests; `npm run build` passed in `frontend/`; contract `CCUOZRSDISJOF66YPNEGY7FDH7WTUZHI5TB55F4MOGED2UEKZXYRP6AP`; WASM hash `0095d331033b2f380b9cf1dda46dff098aa722774a0041da1cb18159e9f20382`; live smoke create/fund/release/refund passed and readback returned `Resolved`, `funded_amount=0`. |

## Reviewer Links

```text
Frontend:             https://stellar.thesignal.directory
Event dashboard:      https://stellar.thesignal.directory/market_dashboard
Internal admin:       https://stellar.thesignal.directory/admin
Contract explorer:    https://stellar.expert/explorer/testnet/contract/CCUOZRSDISJOF66YPNEGY7FDH7WTUZHI5TB55F4MOGED2UEKZXYRP6AP
```

## Current Testnet Configuration

```text
DealEscrow:        CCUOZRSDISJOF66YPNEGY7FDH7WTUZHI5TB55F4MOGED2UEKZXYRP6AP
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
| Contract | `cargo test` in repo root | Passed: 16 tests, 0 failed. Includes full-deal funding, provider-win, client-refund, partial-settlement, remaining-balance refund, and milestone-cap coverage. |
| Indexer | `npm run build` in `indexer/` | Passed: TypeScript compile succeeded. |
| Backend smoke | `BACKEND_BASE_URL=https://stellar.thesignal.directory npm run smoke:backend` in `indexer/` | Passed public checks after RC switch. NEAR readiness is enabled/configured with live execution disabled. Current blocker: no live shadow bindings in the deployed dashboard summary. |
| Frontend | `npm run build` in `frontend/` | Passed: TypeScript/Vite build succeeded. Existing Vite warning for chunks larger than 500 kB. |
| Testnet RC contract | Stellar CLI on release-candidate contract | Passed: deployed/initialized hardened WASM, created 4 smoke deals, verified release, dispute provider-win, dispute client-refund, partial settlement, `funded_amount=0`, and provider reputation `2`. |
| Full-deal funding RC contract | Stellar CLI on `CCUOZRSDISJOF66YPNEGY7FDH7WTUZHI5TB55F4MOGED2UEKZXYRP6AP` | Passed: create deal `0`, `fund_deal` emitted two `funded` events from one transfer, released milestone 0 with 90/4/6 split, refunded remaining milestone 1, and readback returned `Resolved` with `funded_amount=0`. |
| Live backend after RC switch | `BACKEND_BASE_URL=https://stellar.thesignal.directory npm run smoke:backend` in `indexer/` | Passed public checks: NEAR readiness JSON, NEAR enabled/env configured, live execution disabled, backend health on testnet RC contract, indexer ok, 17 indexed events, dispute evidence, and 2 shadow bindings. |
| Protected backend smoke | `DOTENV_CONFIG_PATH=../.env BACKEND_BASE_URL=https://stellar.thesignal.directory npx tsx -r dotenv/config src/backend-readiness-smoke.ts --tokens` in `indexer/` | Passed protected binding lookup for `mb_sig-demo-001`, 5 mapped binding events, and NEAR token discovery with 175 tokens. Dry quote still skipped unless `--quote` inputs are provided. |
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

## Live Smoke - 2026-07-21 15:57 BST

| Endpoint / Check | Result | Evidence Meaning |
|---|---|---|
| `BACKEND_BASE_URL=https://stellar.thesignal.directory npm run smoke:backend` | Passed public checks. Blocked only on empty shadow bindings; protected/admin checks skipped without admin credentials. | The deployed backend is healthy enough for public reviewer smoke against the hardened RC contract. |
| `/health` | `contractAddress:"CD6RMOJUTNMHC6D6ODS4IJPCLZNUSH6BE6IRK2CZI47AVOCFJ7QRIRWJ"`, `network:"testnet"`. | Coolify is now pointed at the hardened RC contract. |
| `/api/market-dashboard/summary` | `enabled:true`, `lastTickStatus:"ok"`, `totalEventsProcessed:17`; topic counts include `created:4`, `funded:4`, `resolved:3`, `dispute:3`, `done:2`, `released:1`. | The public dashboard read model indexed the RC lifecycle and dispute-resolution smoke events. |
| `/api/near-intents/readiness` | `enabled:true`, JWT/destination asset/default refund config present, live execution disabled. | NEAR adapter is configured for dry quote/readiness review; live execution remains intentionally off. |
| Shadow marketplace bindings | `marketplaceBindings` includes `mb_sig-demo-001 -> Soroban deal 1` and `mb_sig-demo-002 -> Soroban deal 2`, both `bindingMode:"shadow"` and `status:"needs_review"`. | Marketplace binding evidence is now present without writing to The Signal production marketplace database. |

## Implemented Evidence

| Deliverable / Gap | Evidence |
|---|---|
| Soroban escrow lifecycle | Contract tests cover happy path, multi-milestone flow, dispute/resolve, refund, auth, double deposit, release-unfunded, reputation, and deal count. |
| Event schema / indexer | `docs/EVENT_SCHEMA.md`, indexer build, `/market_dashboard`, and Gap 1 reconcile smoke notes. |
| Marketplace binding | Shadow binding collection/API/CLI, idempotent seed, reconcile CLI, dashboard panel, and docs in `indexer/README.md`. |
| Network config | Env-driven frontend Stellar network config, mainnet build smoke recorded in workplan/audit. |
| Settlement asset policy | `docs/SETTLEMENT_ASSET_POLICY.md` and frontend create-flow min/policy display. |
| Broker provider boundary | `frontend/src/lib/stellarBroker.ts`, broker envs, seeded Soroswap adapter, and `docs/scf/broker-route-qa-2026-07-01.md`. |
| Near Intents | SDK dependency, `nearIntentsProvider`, public readiness endpoint, protected token/quote/status/deposit-tx/reconcile endpoints, `nearIntent` binding metadata, product-facing **Pay from another chain** UI, browser client, env gates, and source-of-truth rules. Live readiness JSON, protected token discovery, and shadow binding evidence are now confirmed; dry/live quote evidence still needs final route inputs. |
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
  an SDK-backed server/API spine plus product-facing cross-chain quote, payment
  instruction, and status UI. The app should not claim end-user executable live
  NEAR payment support until source-chain wallet execution, no-testnet QA path,
  and live tiny-amount evidence are completed.
- Admin dispute split resolution is contract/operator-level today; the browser
  demo does not expose an admin refund-slider UI.
- `VITE_*` values are public frontend configuration. Live server secrets must
  stay in Coolify or a secrets manager and should be rotated if exposed.

## Remaining Capture Tasks

| Evidence | Status |
|---|---|
| Browser screenshots/video for client dispute, provider dispute, connector read-only, nonparticipant read-only, insufficient balance, and signing cancellation | Pending |
| Admin/operator `resolve_dispute` transaction hash and indexed `resolved` event | On-chain RC proof captured; indexer/dashboard capture still pending |
| `/market_dashboard` screenshot showing shadow marketplace bindings after seed/reconcile | API evidence complete; screenshot still pending |
| Live deployment `/health` and `/market_dashboard` screenshots after final deploy | API smoke complete on RC contract; screenshots still pending |
| Live deployment `/api/near-intents/readiness` JSON after redeploy | Complete for route deployment; current readiness shows NEAR enabled/configured with live execution disabled |
| Protected NEAR token discovery and dry quote against `mb_sig-demo-001` | Token discovery complete with 175 tokens; dry quote still pending quote inputs/admin QA |
| Optional optimized WASM hash / deployment transaction proof for the exact final contract artifact | Complete for testnet RC: WASM hash `c11baff93cd032889e952961b8bcdad9daffb6d0c4a87dfd845cee384b997722`; deploy tx `c4bacc4aef2b35f7b0d85adfd48566a738a2c18ed94e84daa2d138bd729b47ab`; initialize tx `efa947c7dfb8dbc09f3be5d123f2e586982a546592baaf3df67d03133f04f453` |

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
