# Fiat Onramp and Escrow Funding Flow

Last updated: 2026-07-28 02:41 BST

Scope: product and operations explanation for how fiat top-up, cross-chain
funding, and Stellar escrow state work together.

## Feature Log

| Timestamp | Feature / Area | Change Logged | Validation |
|---|---|---|---|
| 2026-07-29 23:33 BST | MoonPay sandbox route check | Added an isolated MoonPay sandbox test page for XLM wallet top-up route validation. Stripe remains the integrated hosted onramp path while MoonPay is evaluated as a regional fallback. | `npm run build -- --logLevel warn` passed with existing large-chunk warning. |
| 2026-07-29 16:20 BST | Stripe hosted onramp session hardening | Tightened Stripe hosted onramp launch behavior so one user action opens one hosted session, and added explicit XLM/Stellar destination list parameters to the backend session request. | `npm run build -- --logLevel warn` passed in `frontend/` with existing large-chunk warning; `npm run build` passed in `indexer/`. |
| 2026-07-28 12:20 BST | Public documentation cleanup | Reframed payment-rail boundaries as neutral product and operations behavior. | Targeted `rg` scans for private planning phrases. |
| 2026-07-28 02:41 BST | Stripe XLM hosted onramp | Added a server-side Stripe hosted onramp session adapter and Wallet Prep entry that locks destination to the connected Stellar wallet and buys native XLM before escrow funding. | `npm run build` passed in `indexer/`; `npm run build -- --logLevel warn` passed in `frontend/` with existing large-chunk warning. |

## What Is Implemented

The app supports fiat-to-crypto wallet top-up through Stripe hosted onramp. A
user can buy native XLM into the connected Stellar wallet, then fund a
DealEscrow deal from that wallet.

An isolated MoonPay sandbox route is available for evaluating alternate XLM
wallet top-up coverage. It is a route check only until production credentials,
domain allowlisting, and any required server-side URL signing are configured.

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

## Recommended Production Flow

For the simplest production path, use XLM settlement first:

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

## Operational Boundaries

Stripe onramp and NEAR Intents status represent wallet top-up progress. Escrow
funding still requires the connected Stellar wallet to call `fund_deal`.
DealEscrow contract events remain the source of truth for locked funds,
milestone releases, disputes, and refunds.

Stellar USDC payouts require active recipient accounts with XLM reserve and the
USDC trustline enabled before release. Native XLM remains the default path for
fresh Stellar wallets.
