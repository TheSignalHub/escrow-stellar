# Submission Readiness - 2026-07-02

Scope: final reviewer-facing gate for submitting the Stellar escrow rail package
without overstating demo, testnet, marketplace, or NEAR Intents readiness.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-02 04:23 HKT | Submission readiness gate | Added a single reviewer-facing submission checklist covering upload order, safe claims, do-not-claim boundaries, validation results, deployment checks, and final blockers. | `cargo test` passed; `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. Docs check still unavailable at root. |
| 2026-07-02 04:25 HKT | Live deploy smoke | Recorded current deployed endpoint smoke results and marked NEAR readiness as pending redeploy because the live domain still serves the previous frontend fallback for `/api/near-intents/readiness`. | `/health` passed; `/market_dashboard` returned 200; `/api/near-intents/readiness` returned frontend HTML and must be rechecked after Coolify redeploy. |

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
10. `docs/OPERATIONS_SECURITY.md`
11. `docs/COOLIFY_DEMO_DEPLOYMENT.md`

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

Current live smoke on 2026-07-02 04:25 HKT:

| Endpoint | Result | Submission Meaning |
|---|---|---|
| `/health` | Passed with `ok: true`, `network: testnet`, and the expected contract id. | Live backend is reachable. |
| `/market_dashboard` | HTTP 200. | Reviewer dashboard is reachable. |
| `/api/near-intents/readiness` | Returned frontend HTML instead of readiness JSON. | Current deployment has not picked up the new NEAR readiness route yet; redeploy before claiming live NEAR readiness. |

Then sign in to `/admin` and run one protected indexer tick, or call:

```bash
curl -u "$ADMIN_USERNAME:$ADMIN_PASSWORD" \
  -X POST https://stellar.thesignal.directory/api/indexer/run-once
```

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
| `/market_dashboard` screenshot with shadow marketplace bindings | Pending capture |
| Live NEAR tiny-amount quote/deposit/status proof | Pending JWT, assetId, and explicit live QA window |

## Submit Decision

Submit if:

- latest Coolify deploy smoke passes
- `/api/near-intents/readiness` returns JSON, not the frontend fallback HTML
- secrets are rotated or the deployment is explicitly marked temporary demo
- README and this submission gate are included
- NEAR is described as required staged integration, not skipped and not live
  production payment support

Do not wait for mainnet production hardening to submit this testnet tranche.
