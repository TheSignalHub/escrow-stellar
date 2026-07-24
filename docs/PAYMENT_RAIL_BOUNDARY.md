# Payment Rail Boundary

Last updated: 2026-07-24 19:32 BST

Scope: reviewer-facing boundary for Stripe, Stellar escrow, NEAR Intents, and
marketplace payment responsibilities in the final-tranche submission.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-24 19:32 BST | Privy fiat top-up boundary | Added Privy fiat onramp as a wallet top-up route while keeping direct Stripe checkout/webhooks outside this repo and keeping Soroban `funded` events as escrow source of truth. | `npm run build` passed in `frontend/`. |
| 2026-07-11 23:07 HKT | Payment rail boundary | Added a dedicated boundary doc clarifying that Stripe remains The Signal marketplace's fiat rail while this repo owns the Stellar/Soroban escrow rail and staged NEAR Intents adapter. | Static review against README, architecture, workplan, submission readiness, and NEAR Intents docs. Runtime validation not required for documentation-only change. |

## Decision

Do not add direct Stripe checkout, Connect transfers, Stripe webhooks, or Stripe
refund reconciliation to this repository for the final-tranche build.

Stripe Connect remains part of The Signal's production marketplace payment
system. Privy fiat onramp is acceptable here because it is a wallet top-up
entry: fiat buys crypto into a supported source wallet, then Stellar escrow
funding still happens through the on-chain `fund_deal` path. This repository
demonstrates the reusable Stellar escrow rail:

- wallet-based funding
- Soroban escrow creation
- milestone deposits
- atomic provider / connector / protocol splits
- dispute and refund events
- on-chain reputation
- indexer read model
- shadow marketplace bindings
- staged NEAR Intents payment initiation metadata
- Privy fiat-to-crypto wallet top-up before cross-chain/Stellar funding

The clean grant posture is to keep direct fiat marketplace payments and
on-chain escrow payments as separate rails, while allowing fiat onramp to
prepare a crypto wallet for the same on-chain flow.

## Why Stripe Is Not Implemented Here

Adding Stripe directly to `escrow-stellar` would expand the submission into a
fiat payment system and create unnecessary review surface:

- Stripe Connect onboarding, KYC, account links, payout schedules, and refund
  webhooks belong to the production marketplace.
- Stripe secrets and webhook signing keys should not be introduced into the
  Stellar escrow demo service.
- A direct Stripe implementation would blur the source of truth for escrow
  funding. In this repo, Soroban `funded`, `released`, `dispute`, `resolved`,
  and `refund` events are the settlement source of truth.
- The current final-tranche gap is not "missing Stripe"; it is proving that an
  external marketplace can bind its own deal IDs to Soroban escrow state without
  mutating production marketplace collections.

## Rails And Ownership

| Rail | Owner | Source of Truth | This Repo's Role |
|---|---|---|---|
| Stripe Connect fiat marketplace payments | The Signal production marketplace | Stripe charges, transfers, payouts, refunds, and marketplace DB records | Boundary only; no code or secrets here |
| Privy fiat onramp top-up | `escrow-stellar` frontend + Privy providers | Onramp provider status until crypto reaches the destination wallet | Wallet top-up only; no Soroban escrow state until `fund_deal` |
| Stellar/Soroban escrow | `escrow-stellar` | DealEscrow contract events and contract storage | Primary grant implementation |
| NEAR Intents payment initiation | `escrow-stellar` adapter plus NEAR/1Click provider | Provider quote/status until Stellar settlement; Soroban event after escrow deposit | Staged adapter with metadata and readiness/dry quote UI |
| Marketplace deal workflow | External marketplace | External deal/milestone/user records | Shadow binding/API compatibility layer |

## Reviewer-Safe Claim

Use this wording:

```text
The submission does not implement direct Stripe checkout inside the Stellar
escrow repository. Stripe Connect remains the production marketplace's fiat
rail. This repo implements Privy fiat onramp as a wallet top-up route, then
uses the on-chain Stellar escrow rail and marketplace-compatible binding layer
so external marketplaces can map their own deal records to Soroban escrow state.
```

## Do Not Claim

Do not claim:

- Stripe Connect is integrated in this repository.
- Stripe payments automatically create Soroban escrow deposits.
- Stripe refund state is reconciled by this indexer.
- Privy onramp status means escrow is funded.
- NEAR Intents status alone means Soroban escrow is funded.
- The demo test USDC token is production Circle USDC.

## Next Clean Build

The next grant-focused build should be:

1. Redeploy the current server so `/api/near-intents/readiness` returns JSON.
2. Configure NEAR Intents readiness envs in a demo/staging environment without
   exposing JWTs through frontend variables.
3. Run a protected token-list check to confirm the current Stellar destination
   `assetId`.
4. Run a dry quote against a shadow marketplace binding.
5. Capture the quote/status UI and binding metadata evidence.
6. Keep live execution disabled unless JWT, approved asset id, refund handling,
   and tiny-amount no-testnet QA are approved.

This closes the most important review gap without polluting the Stellar escrow
rail with production Stripe payment code.
