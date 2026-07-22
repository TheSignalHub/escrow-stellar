# UI Unhappy-Path QA - 2026-07-01

Scope: final-tranche QA matrix for frontend escrow unhappy paths, especially
dispute behavior, role permissions, wallet failures, and operator-only dispute
resolution.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-01 10:29 HKT | Gap 6 unhappy-path QA | Added UI unhappy-path QA matrix and corrected demo expectations for dispute resolution. | Static review of `DealDashboard.tsx`, `useDealEscrow.ts`, `frontend/README.md`, and `docs/DEMO_GUIDE.md`. Browser evidence still required for final package. |
| 2026-07-01 13:39 HKT | NEAR Intents unhappy paths | Added NEAR readiness, auth, disabled feature, provider failure/refund, and provider/Soroban mismatch scenarios to the QA matrix. | Static review of `NearIntentsPanel.tsx`, `nearIntents.ts`, server routes, and NEAR boundary docs. Live provider evidence still required. |

## Current UI Coverage

| Scenario | Current Behavior | Source |
|---|---|---|
| Nonparticipant opens a deal | Shows read-only banner and no lifecycle action buttons. | `DealDashboard.tsx` role banner and milestone action gating |
| Connector opens a funded deal | Shows connector role copy; no fund, release, or dispute button. | `DealDashboard.tsx` `getRole()` and action gating |
| Provider opens a funded milestone | Shows provider copy and `Flag Dispute`; no release button. | `DealDashboard.tsx` funded/provider branch |
| Client opens pending milestone | Shows `Fund Escrow Node`. | `DealDashboard.tsx` pending/client branch |
| Client opens funded milestone | Shows dispute confirmation and release confirmation paths. | `DealDashboard.tsx` funded/client branch |
| Client or provider disputes | Confirmation modal explains funds freeze, then calls on-chain `dispute`. | `DealDashboard.tsx`, `useDealEscrow.ts` |
| Disputed milestone renders | Shows `Under review` banner. Client can choose `Accept & Release to Provider`. | `DealDashboard.tsx` disputed branch |
| Insufficient settlement balance | Error card shows contextual failure and `Fund Wallet` recovery button. | `DealDashboard.tsx`, `useDealEscrow.ts` |
| Wallet rejects signing | Error mapping surfaces cancellation/retry path from wallet/provider failure. | `useDealEscrow.ts`, `docs/DEMO_GUIDE.md` troubleshooting |
| Transaction timeout | Shows timeout text and Explorer check guidance. | `useDealEscrow.ts` polling guard |
| Contract unauthorized error | Maps to operation-specific messages for deposit, release, dispute, resolve, and refund. | `useDealEscrow.ts` contextual errors |
| NEAR Intents disabled | Liquidity panel shows disabled readiness; quote path surfaces provider/API error instead of implying payment availability. | `NearIntentsPanel.tsx`, `/api/near-intents/readiness` |
| NEAR Intents admin auth missing | Protected quote/status errors surface an `/admin` recovery link. | `NearIntentsPanel.tsx`, `nearIntents.ts` |
| NEAR status succeeds before Soroban funding | UI labels provider success separately and warns to reconcile Soroban `funded` before marking escrow funded. | `NearIntentsPanel.tsx`, `docs/NEAR_INTENTS_BOUNDARY.md` |

## Known Product Gaps

| Gap | Current Position | Required Before Production |
|---|---|---|
| Admin dispute split UI | Not exposed in React app. `resolveDispute()` exists in the hook and contract, but no admin dashboard slider is shipped. | Add an authenticated operator console or document CLI/operator-only resolution for staging. |
| Dispute outcome language | Contract now distinguishes provider win (`Released`), full client refund (`Refunded`), and partial settlement (`Resolved`). | Capture updated UI/admin evidence for each outcome before final submission. |
| Event ledger persistence | Browser event ledger uses local metadata, while chain/indexer events are authoritative. | Use indexed events for durable dispute/release history across browsers. |
| Wrong-wallet screenshots | Role gating exists, but screenshot/video evidence is not yet captured. | Capture client, provider, connector, and nonparticipant states. |
| Admin resolution evidence | Contract tests cover resolution; browser does not. | Add operator CLI/API smoke evidence or admin UI screenshot once built. |
| NEAR live execution evidence | UI and server adapter exist, but live NEAR has no testnet. | Capture tiny-amount live quote/deposit/status evidence only after JWT, Stellar destination asset id, refund path, and live execution flag are approved. |

## NEAR Intents Unhappy-Path Matrix

| Scenario | Expected Behavior | Evidence Status |
|---|---|---|
| `NEAR_INTENTS_ENABLED=false` | Readiness shows disabled; quote requests fail clearly and no deposit instructions are shown. | Pending deployed/browser capture |
| Admin session missing | Quote/status call returns protected-route error; UI offers `/admin` sign-in recovery. | Pending browser capture |
| JWT or destination asset missing | Readiness shows missing config; protected quote path returns readiness/config error. | Pending API/browser capture |
| Dry quote has no deposit address | UI still shows quote metadata and does not instruct source-chain transfer without deposit details. | Pending provider/API capture |
| Provider `FAILED` | Binding status maps to `failed`; UI does not mark escrow funded. | Pending live/provider capture |
| Provider `REFUNDED` | Binding status maps to `refunded`; UI states no Stellar escrow refund is implied without Soroban event. | Pending live/provider capture |
| Provider `SUCCESS` but no Soroban `funded` | UI marks external settlement only and requires operator reconciliation before escrow status advances. | Pending live/provider plus indexer capture |
| Provider/Soroban mismatch | Binding enters or remains `needs_review`; operator investigates before product status advances. | Pending live/provider plus indexer capture |

## Final-Tranche Evidence Checklist

| Check | Required Evidence | Status |
|---|---|---|
| Client can dispute funded milestone | Screenshot/video of confirmation modal and resulting Disputed status. | Pending browser capture |
| Provider can dispute funded milestone | Screenshot/video using provider wallet. | Pending browser capture |
| Connector cannot dispute | Screenshot of connector role banner and no action button, or rejected contract call evidence. | Pending browser capture |
| Nonparticipant is read-only | Screenshot of read-only banner and no actions. | Pending browser capture |
| Insufficient balance recovery | Screenshot of error card with `Fund Wallet` path. | Pending browser capture |
| Signing cancellation | Screenshot/toast or QA note after rejecting wallet prompt. | Pending browser capture |
| Client release override on disputed milestone | Screenshot/video of `Accept & Release to Provider` path. | Pending browser capture |
| Admin dispute resolution | Contract/CLI/API evidence for `resolve_dispute` with refund split. | Pending operator smoke |
| Indexer reflects dispute/resolution | `/market_dashboard` or binding event evidence for `dispute` and `resolved`. | Pending indexed event smoke |
| NEAR disabled/auth/config errors | Screenshot/API proof that disabled and unauthenticated states are recoverable and not overstated. | Pending browser/API capture |
| NEAR provider failed/refunded/mismatch | Screenshot/API proof for external failure/refund/mismatch without Soroban-funded overclaim. | Pending live/provider capture |

## Suggested Demo Script

1. Create a two-milestone escrow with the Quick Start flow.
2. Fund milestone 1 as the client.
3. Connect as provider and confirm only `Flag Dispute` is available on funded
   milestone 1.
4. File dispute as provider and capture the Disputed state.
5. Reconnect as client and capture `Under review` plus `Accept & Release to
   Provider`.
6. Connect as connector and capture read-only connector state.
7. Connect with an unrelated wallet and capture nonparticipant read-only state.
8. Trigger an insufficient-balance deposit on a fresh wallet and capture the
   `Fund Wallet` recovery button.
9. Run indexer/reconcile and capture the dispute event in `/market_dashboard`.
10. Open the NEAR Intents panel and capture readiness plus one disabled,
    unauthenticated, dry quote, or provider-status unhappy path depending on the
    deployment configuration.

## Acceptance Notes

For this tranche, it is acceptable that admin dispute split resolution is not a
browser flow if the submission is explicit: the contract and hook support
`resolve_dispute`, while the current frontend exposes user dispute filing,
client release override, and operator-handled resolution messaging. Do not claim
an admin refund-slider UI until it exists.
