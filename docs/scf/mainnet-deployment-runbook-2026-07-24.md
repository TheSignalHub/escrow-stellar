# Mainnet Deployment Runbook - 2026-07-24 19:07 BST

Scope: controlled mainnet deployment and tiny real-deal smoke for the DealEscrow release candidate after the pre-mainnet audit gate in `docs/scf/mainnet-contract-audit-2026-07-24.md`.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-24 19:07 BST | Mainnet deployment runbook | Added operator checklist for production admin/protocol wallet selection, mainnet env configuration, deployment, initialization, tiny real-deal smoke, and evidence capture. | Documentation gate only. Depends on audit artifact hash `0095d331033b2f380b9cf1dda46dff098aa722774a0041da1cb18159e9f20382`; no mainnet transaction executed yet. |

## Deployment Status

Status: **not executed yet**.

Mainnet deployment must not start until these values are confirmed:

```text
Production admin wallet:      TBD
Production protocol wallet:   TBD
Mainnet RPC provider:         TBD
Mainnet DealEscrow contract:  TBD after deploy
Production USDC SAC/address:  TBD before USDC deal smoke
```

## Non-Negotiable Gate

Only deploy the audited optimized artifact:

```text
target/wasm32v1-none/release/deal_escrow.wasm
SHA-256: 0095d331033b2f380b9cf1dda46dff098aa722774a0041da1cb18159e9f20382
```

If the hash changes, stop and rerun the audit gate.

## Required Decisions

### 1. Admin Wallet

The contract admin can call:

- `resolve_dispute`
- `refund`

The contract has no admin rotation function. Choose carefully.

Preferred:

- Stellar multisig account
- policy-controlled signer
- dedicated ops wallet with limited exposure

Avoid:

- reusing the testnet `deployer`
- putting a long-lived mainnet admin secret directly in Coolify
- deploying before the dispute operator procedure is agreed

### 2. Protocol Wallet

The protocol wallet receives the protocol fee portion from normal milestone releases.

Confirm:

- public G-address
- custody owner
- accounting owner
- whether it differs from admin wallet

### 3. Settlement Assets

For the pilot, use one or both:

- Native XLM SAC
- Verified Stellar USDC SAC

USDC mainnet must not be guessed. Confirm:

- SAC contract address
- asset code
- issuer
- decimals
- trustline instructions
- minimum safe deal amount

## Local Preflight

Run from repo root:

```bash
git status --short
cargo test
stellar contract build
shasum -a 256 target/wasm32v1-none/release/deal_escrow.wasm
```

Expected hash:

```text
0095d331033b2f380b9cf1dda46dff098aa722774a0041da1cb18159e9f20382
```

## Mainnet Deploy

Use a dedicated mainnet deployer identity. Replace placeholders before running.

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/deal_escrow.wasm \
  --source-account <MAINNET_DEPLOYER_IDENTITY> \
  --network mainnet \
  --alias deal_escrow_mainnet
```

Capture:

```text
Mainnet contract ID:
Deploy tx hash:
Explorer link:
```

## Initialize Immediately

Initialize once, using the confirmed production wallets:

```bash
stellar contract invoke \
  --id <MAINNET_CONTRACT_ID> \
  --source-account <MAINNET_DEPLOYER_IDENTITY> \
  --network mainnet \
  -- initialize \
  --admin <PRODUCTION_ADMIN_G_ADDRESS> \
  --protocol_wallet <PRODUCTION_PROTOCOL_G_ADDRESS>
```

Capture:

```text
Initialize tx hash:
Admin wallet:
Protocol wallet:
Explorer link:
```

## Production Env

Set these after deploy:

```env
STELLAR_NETWORK=mainnet
VITE_STELLAR_NETWORK=mainnet
STELLAR_RPC_URL=<mainnet RPC>
VITE_STELLAR_RPC_URL=<mainnet RPC>
VITE_STELLAR_HORIZON_URL=https://horizon.stellar.org
VITE_STELLAR_EXPLORER_URL=https://stellar.expert/explorer/public
VITE_DEAL_ESCROW_CONTRACT=<MAINNET_CONTRACT_ID>
VITE_SETTLEMENT_TOKEN_SYMBOL=USDC
VITE_SETTLEMENT_TOKEN_NAME=Stellar USDC
VITE_SETTLEMENT_ASSET_POLICY=approved-mainnet
```

For mainnet admin execution, default to disabled:

```env
ADMIN_RESOLUTION_EXECUTION_ENABLED=false
ADMIN_RESOLUTION_ALLOW_MAINNET=false
```

Only enable server-side mainnet admin execution if the production security model explicitly accepts a hot-key operator path:

```env
ADMIN_RESOLUTION_EXECUTION_ENABLED=true
ADMIN_STELLAR_SECRET_KEY=<PRODUCTION_ADMIN_SECRET>
ADMIN_RESOLUTION_ALLOW_MAINNET=true
```

Preferred mainnet path remains external policy/multisig signing.

## Tiny Mainnet Smoke

Use tiny amounts only.

### Smoke A - Create

Create a small XLM deal from the frontend or CLI.

Capture:

```text
Create tx hash:
Deal ID:
Client:
Provider:
Connector:
Token:
```

### Smoke B - Fund Once

Call `fund_deal`.

Expected:

- one client transfer into contract
- one `funded` event per pending milestone
- deal becomes `Active`

Capture:

```text
Fund tx hash:
Funded event links:
```

### Smoke C - Release

Release one funded milestone.

Expected:

- provider, connector, protocol transfers happen atomically
- milestone becomes `Released`
- `funded_amount` decreases by milestone amount

Capture:

```text
Release tx hash:
Provider amount:
Connector amount:
Protocol amount:
```

### Smoke D - Optional Dispute

Only run if the production admin signer path is ready.

Expected:

- client/provider files dispute
- admin resolves with tiny amount
- `resolved` event indexed

Capture:

```text
Dispute tx hash:
Resolve tx hash:
Outcome:
```

## Evidence Package

Final submission should include:

- deploy tx
- initialize tx
- contract ID
- audited WASM hash
- create tx
- fund tx
- release tx
- optional dispute/resolve tx
- frontend mainnet screenshot
- `/market_dashboard` indexed events screenshot
- `/admin` dispute evidence screenshot if dispute smoke is run

## Stop Conditions

Stop immediately if:

- built WASM hash differs from audit hash
- admin/protocol wallets are not confirmed
- mainnet RPC is unstable
- frontend still points to testnet
- USDC SAC/issuer/trustline is not confirmed for a USDC smoke
- deploy succeeds but initialize fails
- any tiny smoke transaction fails with an unexpected auth/state/accounting error
