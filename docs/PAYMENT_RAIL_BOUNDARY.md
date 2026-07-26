# Fiat Onramp and Escrow Funding Flow

Last updated: 2026-07-26 01:32 BST

Scope: reviewer-facing explanation for how fiat top-up, cross-chain funding,
and Stellar escrow state work together in the final-tranche submission.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-26 01:32 BST | Fiat onramp framing | Reframed the payment rail doc around the implemented Privy onramp top-up path and removed defensive internal implementation boundaries from public-facing docs. | Static documentation review against README and Architecture docs. |
| 2026-07-24 19:32 BST | Privy fiat top-up | Added Privy fiat onramp as a wallet top-up route before Stellar escrow funding. | `npm run build` passed in `frontend/`. |

## What Is Implemented

The app supports fiat-to-crypto wallet top-up through Privy. A user can buy
crypto into a supported source wallet, route value into Stellar when needed, and
then fund a DealEscrow deal from the connected Stellar wallet.

The user flow is:

```text
Buy crypto with fiat through Privy
-> receive funds in the source wallet
-> route/top up into the connected Stellar wallet when needed
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
| Privy fiat onramp | User buys crypto into a source wallet, then routes/top-ups into Stellar when needed. | Onramp is wallet prep; escrow state changes only after `fund_deal`. |

## Recommended Demo Flow

For the final grant demo, use XLM settlement first:

1. Connect with Privy or a supported Stellar wallet.
2. Confirm the Stellar wallet has XLM.
3. Create a small XLM-settled deal.
4. Fund the deal once from the Stellar wallet.
5. Release one milestone and show the split.
6. File and resolve one dispute.
7. Show Privy onramp as the fiat top-up entry.
8. Show NEAR Intents / 1Click as the cross-chain add-funds entry.

XLM is the cleanest default because native XLM can activate fresh Stellar
accounts. Stellar USDC remains available when the wallet and payout recipients
have XLM reserve and the required USDC trustline.

## Safe Submission Claim

Use this wording:

```text
The final-tranche app supports Privy fiat onramp as a wallet top-up path. Users
can buy crypto, route value into Stellar when needed, and fund the same Soroban
DealEscrow workflow from their connected Stellar wallet. Escrow state remains
anchored to DealEscrow contract events.
```

## Do Not Claim

Do not claim:

- Privy onramp status means escrow is funded.
- NEAR Intents status alone means escrow is funded.
- A source-wallet transfer can bypass `fund_deal`.
- Stellar USDC works for fresh payout wallets without XLM reserve and a USDC
  trustline.
