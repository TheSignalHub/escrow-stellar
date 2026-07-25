# Operations and Security Runbook

Last updated: 2026-07-21 14:29 BST

Scope: final-tranche operations posture for the Stellar escrow demo and the
path toward production-grade administration.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-26 00:06 BST | Admin milestone label clarity | Changed `/admin` dispute rows and resolution evidence to display human milestone number plus zero-based contract index, e.g. `Milestone 3 (index 2)`, so operator evidence matches the Deals UI while preserving the exact contract argument. | `npm run build` passed in `indexer/`. |
| 2026-07-25 23:43 BST | Admin execution readiness clarity | Updated the protected `/admin` dispute console to show whether server-side execution is ready, key-missing, command-only, or mainnet-locked. Execute buttons are disabled when required admin signer flags are not ready, and the README now calls out the mainnet allow flag. | `npm run build` passed in `indexer/`. |
| 2026-07-24 16:51 BST | Dispute note capture and gated admin execution | Added off-chain dispute notes for admin review and optional protected server-side `resolve_dispute` / `refund` execution when explicit admin signer envs are configured. | `npm run build` passed in `frontend/`; `npm run build` passed in `indexer/`. |
| 2026-07-24 16:45 BST | Admin dispute command clarity | Added visible preset/copy feedback and explicit unknown-settlement guidance for direct app-created disputes that do not have shadow binding metadata. | `npm run build` passed in `indexer/`. |
| 2026-07-24 15:38 BST | Protected dispute operations console | Replaced the `/admin` placeholder with an authenticated dispute queue that reads indexed dispute/resolution/refund evidence and provides admin-ready `resolve_dispute` / emergency `refund` CLI commands without storing signing keys. | `npm run build` passed in `indexer/`. |
| 2026-07-01 10:31 HKT | Gap 7 admin/security operations | Documented contract admin authority, rotation limitation, dispute operator flow, emergency refund criteria, secrets handling, monitoring, and production hardening gaps. | Static review of `contracts/deal_escrow/src/lib.rs`, admin dashboard routes, deployment docs, and package READMEs. No runtime behavior changed. |
| 2026-07-21 14:29 BST | Mainnet-candidate dispute operations | Updated dispute operations to reflect explicit provider-win, client-refund, and partial-settlement states in the contract. | `cargo test` passed with 13 tests; docs cross-check performed. |

## Current Admin Model

`DealEscrowContract.initialize(admin, protocol_wallet)` stores two instance
values:

- `Admin`: the only address authorized to call `resolve_dispute` and `refund`.
- `ProtocolWallet`: the address receiving protocol fee share on releases.

Current limitations:

- Admin can be set only once during `initialize`.
- There is no admin rotation function.
- There is no pause/emergency stop function.
- There is no contract upgrade proxy.
- There is no multisig enforcement in contract code; multisig must be achieved
  by initializing the admin address to a Stellar account or contract that
  enforces the desired policy.

For the SCF testnet demo, this is acceptable if disclosed. For production, use a
multisig or governance-controlled admin and deploy a new contract version if
rotation, pause, or upgrade controls are required.

## Dispute Operator Flow

Browser users can file disputes, but the public React app does not expose admin
split controls. Operator/admin resolution is contract-level and is supported by
the protected `/admin` dispute-operations console:

1. Sign in to `/admin` with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
2. Confirm the open dispute entry, dispute event tx, caller, milestone amount,
   client, provider, and any marketplace binding metadata.
3. Choose the refund split shown in the console:
   - `0`: all disputed funds to provider.
   - `5000`: 50/50 split.
   - `10000`: all disputed funds back to client.
4. Resolve the dispute:
   - Default/safest path: copy the generated `stellar contract invoke ...
     resolve_dispute` command and run it from the admin-controlled Stellar
     identity.
   - Optional operator path: when `ADMIN_RESOLUTION_EXECUTION_ENABLED=true` and
     `ADMIN_STELLAR_SECRET_KEY` are configured, click the protected `/admin`
     execution button. Mainnet server execution remains blocked unless
     `ADMIN_RESOLUTION_ALLOW_MAINNET=true`.
5. Run the indexer from `/admin` and marketplace binding reconciliation when
   bindings are in scope.
6. Verify the `resolved` event in `/admin`, `/market_dashboard`, and Stellar
   Expert.
7. Record the outcome in the marketplace/support system outside this repo.

Manual fallback if the console is unavailable:

1. Confirm the dispute event in `/market_dashboard`, Stellar Expert, or indexed
   `escrow-transfers`.
2. Confirm the caller, milestone amount, client, provider, and any marketplace
   binding metadata.
3. Decide `refund_bps`:
   - `0`: all disputed funds to provider.
   - `5000`: 50/50 split.
   - `10000`: all disputed funds back to client.
4. Submit `resolve_dispute(deal_id, milestone_idx, refund_bps)` from the admin
   address.
5. Run the indexer and marketplace binding reconciliation.
6. Verify the `resolved` event and mapped binding status.
7. Record the outcome in the marketplace/support system outside this repo.

Operator evidence for final review should include the transaction hash,
`resolved` event row, and before/after dashboard state.

Resolution outcomes are now explicit:

- `refund_bps = 0`: provider win, milestone `Released`; if all milestones are released, deal `Completed`.
- `refund_bps = 10000`: client win, milestone `Refunded`; if all milestones are refunded with no released work, deal `Cancelled`; if released work exists and the remaining locked balance is refunded, deal `Resolved`.
- `0 < refund_bps < 10000`: partial settlement, milestone `Resolved`; deal `Resolved` only when no pending/funded/disputed milestones remain.

## Emergency Refund Criteria

Use `refund(deal_id)` only when returning every funded or disputed unreleased
milestone to the client is the intended outcome.

Appropriate cases:

- Deal cancellation after both parties agree to unwind unreleased escrow.
- Admin/support confirms provider cannot deliver and client should recover all
  unreleased funds.
- Severe routing, compliance, or operational issue where continuing settlement
  is unsafe.

Do not use `refund(deal_id)` to handle normal partial disputes. Use
`resolve_dispute` for partial client/provider outcomes.

## Secrets and Deployment Controls

Keep these values only in Coolify or a secrets manager:

- `DATABASE_URI`
- `SOROSWAP_API_KEY`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `PAYLOAD_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_STELLAR_SECRET_KEY` if optional server-side admin execution is enabled

Rotate them if they appear in chat, screenshots, issue trackers, logs, or shared
documents. `VITE_*` values are public browser configuration and should not be
used for secrets.

Do not enable server-side admin execution with a production hot key unless the
deployment is explicitly operating with that risk profile. Prefer multisig,
policy-controlled signing, or CLI/hardware signing for mainnet.

## Monitoring Checklist

| Area | What to Watch | Current Tooling |
|---|---|---|
| Contract events | Missing `created`, `funded`, `released`, `dispute`, `resolved`, or `refund` events | `/market_dashboard`, `indexer:once`, Inngest schedule |
| Indexer health | Stale ledger cursor, RPC retention errors, repeated parse failures | `/health`, logs, `stellar-indexer-state` |
| Marketplace bindings | Bindings stuck in `intent_created`, `needs_review`, or missing mapped events | `/market_dashboard`, protected binding APIs |
| Admin actions | Unauthorized admin attempts, unexpected refunds, dispute backlog | Server logs and future operator system |
| Secrets | Leaked credentials, weak admin password, stale Inngest signing key | Coolify/secrets manager audit |

## Production Hardening Backlog

Before a mainnet production launch, decide whether to implement:

- Admin rotation or a new versioned contract with rotatable admin.
- Pause/emergency stop for deposits/releases during incident response.
- Multisig or governance-controlled admin address.
- Storage TTL/rent extension strategy and archival recovery plan.
- Formal threat model, external audit, and invariant/property tests.
- Alerting for indexer lag, binding reconciliation failures, and admin actions.

## Final-Tranche Positioning

For this tranche, describe operations honestly:

```text
The current testnet contract uses a single initialized admin address for
dispute resolution and emergency refunds. The mainnet-candidate contract
hardens dispute outcome states and escrow accounting, but admin split
resolution remains an operator/contract path. Production use should initialize
admin to a multisig or governance-controlled address and add rotation/pause
controls in a future contract version if operational policy requires them.
```
