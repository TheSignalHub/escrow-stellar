# Fiat Onramp and Escrow Funding Flow

Last updated: 2026-07-28 02:41 BST

Scope: reviewer-facing explanation for how fiat top-up, cross-chain funding,
and Stellar escrow state work together in the final-tranche submission.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-28 02:41 BST | Stripe XLM hosted onramp | Added a server-side Stripe hosted onramp session adapter and Wallet Prep entry that locks destination to the connected Stellar wallet and buys native XLM before escrow funding. | `npm run build` passed in `indexer/`; `npm run build -- --logLevel warn` passed in `frontend/` with existing large-chunk warning. |

## What Is Implemented

The app supports fiat-to-crypto wallet top-up through Stripe hosted onramp. A
user can buy native XLM into the connected Stellar wallet, then fund a
DealEscrow deal from that wallet.

The user flow is:

```text
Buy XLM with fiat through Stripe hosted onramp
-> receive XLM in the connected Stellar wallet
-> click Fund Deal from the Stellar wallet
-> DealEscrow emits funded events on Soroban
```

Fiat onramp status is wallet-funding progress. The escrow is considered funded
only after the Stellar transaction calls `fund_deal` and the DealEscrow contract
emits funded events.

## User-Facing Funding Paths

| Path | User Action | Escrow State |
|---|---|---|
| Direct Stellar | User funds the deal from the connected Stellar wallet. | Funded after Soroban `fund_deal` succeeds. |
| Convert on Stellar | User swaps Stellar wallet balances into the chosen settlement asset, then funds the deal. | Conversion is wallet prep; escrow state changes only after `fund_deal`. |
| NEAR Intents / 1Click | User pays from a supported source chain, 1Click routes settlement into Stellar, then user funds the deal. | Cross-chain status is top-up state; escrow state changes only after `fund_deal`. |
| Stripe XLM onramp | User buys native XLM into the connected Stellar wallet, then funds the deal. | Onramp is wallet prep; escrow state changes only after `fund_deal`. |

## Recommended Demo Flow

For the final grant demo, use XLM settlement first:

1. Connect with Privy or a supported Stellar wallet.
2. Confirm the Stellar wallet has XLM.
3. Create a small XLM-settled deal.
4. Fund the deal once from the Stellar wallet.
5. Release one milestone and show the split.
6. File and resolve one dispute.
7. Show Stripe hosted XLM onramp as the fiat top-up entry.
8. Show NEAR Intents / 1Click as the cross-chain add-funds entry.

XLM is the cleanest default because native XLM can activate fresh Stellar
accounts. Stellar USDC remains available when the wallet and payout recipients
have XLM reserve and the required USDC trustline.

## Safe Submission Claim

Use this wording:

```text
The final-tranche app supports Stripe hosted crypto onramp as a wallet top-up
path. Users can buy native XLM into their connected Stellar wallet and fund the
same Soroban DealEscrow workflow from that wallet. Escrow state remains anchored
to DealEscrow contract events.
```

## Do Not Claim

Do not claim:

- Stripe onramp status means escrow is funded.
- NEAR Intents status alone means escrow is funded.
- A source-wallet transfer can bypass `fund_deal`.
- Stellar USDC works for fresh payout wallets without XLM reserve and a USDC
  trustline.
