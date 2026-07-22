# Final Milestone Internal QC Runbook

Last updated: 2026-07-21 15:09 BST

Scope: internal team runbook for preparing the last SCF milestone submission.
This is not public product copy and should not be surfaced in the website UI.
The live site should remain production-facing: users see deals, funding,
release, dispute, reputation, and settlement status. Internal identifiers,
smoke-test instructions, reviewer checklists, and adapter diagnostics belong
in docs/admin tooling only.

## Feature Log

| Timestamp | Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-21 13:42 BST | Final milestone internal QC | Added an internal-only runbook for submission gaps, step-by-step test flow, pass/fail criteria, and evidence packaging. Clarified that public UI should not show internal QC guidance or require users to understand marketplace binding IDs. | Documentation-only change. Validated against current README, architecture, frontend, event schema, demo guide, and NEAR boundary docs. |
| 2026-07-21 14:29 BST | Mainnet contract gate | Mainnet deployment is now treated as a hard requirement. Updated internal QC to require the hardened contract, release-candidate testnet deployment, operator dispute evidence, and mainnet deploy evidence before final submission. | `cargo test`, frontend build, and indexer build passed locally before deployment evidence capture. |
| 2026-07-21 15:09 BST | Release-candidate testnet smoke | Deployed hardened DealEscrow RC to testnet and ran on-chain create/deposit/release/dispute-resolution smoke. | Contract `CD6RMOJUTNMHC6D6ODS4IJPCLZNUSH6BE6IRK2CZI47AVOCFJ7QRIRWJ`; create/deposit/release/provider-win/client-refund/partial-settlement passed. |

## Product Boundary

The website should feel like a product, not a test harness.

Public/client-facing surfaces may show:

- deal status and milestone status
- funding options
- quote status in user language
- deposit instructions only after user intent
- dispute or review state
- settlement warnings that affect user action

Public/client-facing surfaces should not require users to know:

- marketplace binding IDs such as `mb_sig-demo-001`
- indexer implementation details
- SCF tranche language
- raw env names
- internal smoke commands
- provider JWT/readiness internals
- reviewer instructions

Internal/admin surfaces may show those details when needed for operations.

## Current Readiness Snapshot

| Area | Status | Notes |
|---|---|---|
| Soroban contract | Testnet release-candidate deployed and smoke-tested | `cargo test` passes with 13 tests; RC contract `CD6RMOJUTNMHC6D6ODS4IJPCLZNUSH6BE6IRK2CZI47AVOCFJ7QRIRWJ` passed on-chain create/deposit/release/dispute outcome smoke. |
| Frontend build | Ready | Production build passes. Existing chunk-size warning is non-blocking. |
| Indexer build | Ready | TypeScript build passes. |
| Deployed backend | Mostly ready | Health, event dashboard, dispute evidence, token discovery, shadow binding lookup, and protected indexer tick pass. |
| Marketplace binding layer | Submission-ready as shadow adapter | Useful for proving reusable marketplace integration without writing into production marketplace collections. |
| NEAR Intents | Implemented, requires final env/data correctness | SDK-backed quote/status path works. Stellar USDC quotes require a real Stellar recipient with USDC trustline. |
| Public UI clarity | Needs product decision | Do not add internal guide text to website. If changed, hide implementation IDs and keep copy user-level. |
| Mainnet | Required release gate, not optional | Needs hardened contract deployment, admin/protocol wallets, verified mainnet asset policy, live tiny-amount QA, and evidence capture. |

## Missing Work And Gaps

### 1. Internal Binding Is Still A QA Concept

`bindingId` links marketplace deal metadata to the Soroban deal, NEAR quote
metadata, and indexed event reconciliation. It is an adapter key, not a user
concept.

Current acceptable submission position:

- Use binding IDs in internal docs, admin routes, smoke scripts, and dashboard
  diagnostics.
- Do not explain binding IDs as part of the public user journey.
- If the UI keeps a QA panel for the grant demo, label it clearly as internal
  or operator-only before using it in production.

Production expectation:

```text
Selected deal + selected milestone
  -> backend resolves hidden binding
  -> quote/funding status is shown in product language
```

### 2. NEAR USDC Requires Recipient Readiness

The previous 1Click `HTTP 400 Internal server error` was caused by trying to
quote Stellar USDC to a recipient that was not ready for issued-asset receipt.
Stellar XLM needs no trustline; Stellar USDC does.

Required for USDC quote QA:

- A real Stellar mainnet G-address.
- Account exists on Horizon.
- Account has a trustline for 1Click's current Stellar USDC issuer:
  `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`.
- `MARKETPLACE_BINDING_CLIENT_WALLET` set to that account before seeding or
  updating demo bindings.

Do not paste private keys into `.env` or docs. Only a public receiving address
is required for quote validation.

### 3. Live Execution Must Be Deliberate

Reviewer deployment should normally use:

```env
NEAR_INTENTS_ALLOW_LIVE=false
```

Enable live execution only for a controlled tiny-amount QA window, then disable
it again. A dry quote proving SDK integration and quote signature verification
is enough for most reviewer validation unless the milestone explicitly requires
live settlement evidence.

### 4. Dispute Evidence Needs To Be Easy To Verify

The contract supports dispute and admin resolution. The indexer has dispute
event evidence. The final submission should include:

- a dispute test result
- dashboard evidence showing at least one `dispute` event
- explanation that user dispute freezes the milestone
- explanation that admin/operator `resolve_dispute` is not a normal client
  action

### 5. Mainnet Deployment Is A Required Release Gate

Do not submit final milestone as complete until a hardened contract deployment
path has been exercised. Current public testnet env still points at the older
contract ID, so the deployment path is:

1. Build the updated contract WASM.
2. Deploy a fresh release-candidate contract to testnet.
3. Initialize it with the intended admin and protocol wallet policy.
4. Run create, deposit, release, dispute, provider-win, client-refund, and
   partial-settlement smoke checks.
5. Point staging/frontend/indexer env to the release-candidate contract ID.
6. Capture reviewer evidence.
7. Deploy the same audited artifact to mainnet.

Mainnet production deployment requires:

- external contract review or audit
- admin multisig or equivalent operational control
- finalized protocol wallet
- verified mainnet USDC SAC/issuer/decimals
- Horizon/RPC provider selection
- trustline onboarding
- minimum deal amount and dust policy
- incident/dispute/admin runbook
- tiny live NEAR-to-Stellar USDC QA

## Internal QC Pipeline

Run from repo root unless otherwise specified.

### Step 0. Protect Secrets

Checklist:

- `.env` exists only locally or in deployment secret manager.
- `.env` is ignored by git.
- No JWT/API keys/database passwords appear in docs, README, screenshots, or
  issue comments.

Commands:

```bash
git status --short --ignored .env
git check-ignore -v .env
rg -n "sk_|signkey-|mongodb\\+srv|NEAR_INTENTS_JWT=ey|DATABASE_URI=.*@" README.md docs frontend indexer
```

Pass:

- `.env` appears ignored.
- secret scan returns no committed secrets.

### Step 1. Static Product/Legacy Review

Commands:

```bash
rg -n "legacy|demo|testnet|TODO|FIXME|mock|stub|placeholder|out of scope|Tranche|binding id|LIVE ALLOWED" README.md docs frontend/src indexer/src
```

Pass:

- Testnet/demo language is accurate in docs.
- Public product UI does not force users to understand internal binding IDs.
- No stale "out of scope" wording contradicts current required NEAR workstream.
- Any raw internal language is restricted to internal docs or admin tooling.

### Step 2. Contract Validation

Command:

```bash
cargo test
```

Pass:

- All tests pass.
- Dispute and refund/release tests pass.
- Provider-win, client-refund, partial-settlement, and milestone-cap tests pass.
- No unused-variable warnings remain in the contract test run.

### Step 3. Frontend Build

Command:

```bash
cd frontend
npm run build
```

Pass:

- TypeScript and Vite build pass.
- Existing chunk-size warning is acceptable for submission unless performance
  becomes a reviewer blocker.

Manual frontend QC:

- Connect wallet.
- Use Friendbot on testnet.
- Create deal from quick-start scenario.
- Fund a milestone.
- Release a funded milestone.
- Create or inspect a disputed milestone.
- Confirm no client-facing path requires knowledge of env vars or backend
  record IDs.

### Step 4. Indexer Build

Command:

```bash
cd indexer
npm run build
```

Pass:

- TypeScript build passes.

### Step 5. Backend Readiness Smoke

Command:

```bash
cd indexer
BACKEND_BASE_URL=https://stellar.thesignal.directory \
DOTENV_CONFIG_PATH=../.env \
node -r dotenv/config dist/backend-readiness-smoke.js --tokens --json
```

Pass:

- backend health passes
- NEAR readiness route passes
- NEAR env config passes
- indexer state is `ok`
- escrow events are indexed
- dispute evidence exists
- shadow bindings exist
- protected binding lookup passes
- NEAR token discovery passes

Warning to resolve before reviewer deployment:

- `NEAR live execution` should be disabled unless performing controlled live QA.

### Step 6. Protected Indexer Tick

Command:

```bash
cd indexer
BACKEND_BASE_URL=https://stellar.thesignal.directory \
DOTENV_CONFIG_PATH=../.env \
node -r dotenv/config dist/backend-readiness-smoke.js --run-indexer --json
```

Pass:

- protected indexer tick passes.
- `fetched=0 parsed=0 inserted=0` is acceptable when there are no new events.
- Follow with the normal smoke command if state briefly shows `running`.

### Step 7. NEAR Token Discovery

Command:

```bash
curl -s https://1click.chaindefuser.com/v0/tokens
```

Pass:

- Stellar assets include XLM and USDC.
- Use returned `assetId`, not Stellar contract address, in
  `NEAR_INTENTS_STELLAR_DESTINATION_ASSET_ALLOWLIST`.

Current observed Stellar USDC issuer:

```text
GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
```

### Step 8. NEAR USDC Quote Smoke

Precondition:

- `NEAR_SMOKE_RECIPIENT` is a public Stellar mainnet account with USDC
  trustline.

Command:

```bash
cd indexer
BACKEND_BASE_URL=<deployed-or-local-backend> \
DOTENV_CONFIG_PATH=../.env \
NEAR_SMOKE_ORIGIN_ASSET=nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1 \
NEAR_SMOKE_AMOUNT=1000000 \
NEAR_SMOKE_RECIPIENT=<stellar-g-address-with-usdc-trustline> \
node -r dotenv/config dist/backend-readiness-smoke.js --quote --tokens --json
```

Pass:

- NEAR dry quote passes.
- Quote metadata is stored.
- Quote signature is verified by backend.

Expected failure if recipient is not ready:

```text
Stellar destination recipient must exist and have a USDC trustline before requesting a NEAR Intents quote.
```

This is a product-correct failure, not a provider mystery.

### Step 9. Evidence Capture

Capture:

- Contract test output.
- Frontend build output.
- Indexer build output.
- Backend smoke JSON.
- NEAR token discovery summary.
- NEAR USDC quote smoke JSON.
- `/market_dashboard` screenshot with event counts and dispute evidence.
- Frontend screenshots of create/fund/release/dispute states.
- Admin route screenshot only if it does not expose secrets.

Do not capture:

- JWT values
- database URI
- admin password
- API keys
- private wallet keys

## Submission Checklist

Minimum for last milestone:

- [ ] Root README accurately describes shipped scope.
- [ ] NEAR boundary doc reflects current implementation and recipient
      trustline requirement.
- [ ] Demo guide matches the actual reviewer flow.
- [ ] Final tranche evidence doc contains latest command results.
- [ ] Contract tests pass.
- [ ] Frontend build passes.
- [ ] Indexer build passes.
- [ ] Backend readiness smoke passes.
- [ ] Protected indexer tick passes.
- [ ] Dispute evidence exists and is easy to verify.
- [ ] NEAR token discovery passes.
- [ ] NEAR USDC quote passes with a USDC-ready recipient, or the submission
      explicitly states USDC recipient readiness as the remaining operator
      setup task.
- [ ] Reviewer deployment has `NEAR_INTENTS_ALLOW_LIVE=false` unless the team
      is actively doing tiny live QA.
- [ ] No public UI copy tells users to follow internal smoke-test steps.
- [ ] No internal secrets appear in docs, screenshots, commits, or issue text.

## Mainnet Deployment Gate

Mainnet deployment should not be part of the final milestone unless the team is
ready to treat it as real funds infrastructure.

Mainnet checklist:

- [ ] External contract review/audit complete.
- [ ] Contract admin is multisig or equivalent controlled account.
- [ ] Protocol wallet is finalized.
- [ ] Mainnet settlement asset SAC, issuer, decimals, and trustline flow are
      documented.
- [ ] Minimum deal amount and dust policy approved.
- [ ] Production RPC and Horizon providers selected.
- [ ] Indexer retention/replay/monitoring plan approved.
- [ ] Dispute and emergency refund runbook approved.
- [ ] Tiny live NEAR-to-Stellar USDC QA completed.
- [ ] Public UI has no demo/testnet-only language in mainnet profile.

Mainnet deployment command shape:

```bash
stellar contract build
stellar contract optimize --wasm target/wasm32v1-none/release/deal_escrow.wasm

stellar contract deploy \
  --wasm target/wasm32v1-none/release/deal_escrow.optimized.wasm \
  --source-account <mainnet-deployer> \
  --network mainnet

stellar contract invoke \
  --id <mainnet-contract-id> \
  --source-account <mainnet-deployer> \
  --network mainnet \
  -- initialize \
  --admin <mainnet-admin-or-multisig> \
  --protocol_wallet <protocol-wallet>
```

Mainnet env shape:

```env
STELLAR_NETWORK=mainnet
STELLAR_RPC_URL=<mainnet-rpc>
NEAR_INTENTS_STELLAR_HORIZON_URL=https://horizon.stellar.org
VITE_STELLAR_NETWORK=mainnet
VITE_DEAL_ESCROW_CONTRACT=<mainnet-contract-id>
VITE_USDC_TOKEN_ADDRESS=<mainnet-usdc-sac>
VITE_SETTLEMENT_ASSET_POLICY=approved-mainnet
NEAR_INTENTS_ALLOW_LIVE=false
```

Keep live execution disabled until the operations team explicitly opens a
tiny-amount QA window.
